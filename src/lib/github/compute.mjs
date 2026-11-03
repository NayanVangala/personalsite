// Pure GitHub logic shared by src/lib/github/index.ts (server, fetch) and scripts/refresh-github.mjs (node, fetch or gh).
// No imports, no I/O except through the `gql` transport the caller hands in. Types live in compute.d.mts.
// Privacy: only PUBLIC repos are ever queried by name. Private work reaches us as calendar and aggregate counts only.

export const PROJECT_SLUGS = ['lexia', 'findr', 'mediscan', 'hecate', 'steal-a-huss', 'conrad-challenge', 'roommap'];
export const DEFAULT_TZ = 'America/Los_Angeles';
const DAY = 86400000;
const YEARS = 6; // lifetime totals are summed from up to 6 one-year windows (GitHub caps a collection at one year)
const SPARK_WEEKS = 26;
const REPO_NAME_OK = /^[A-Za-z0-9._-]+$/;
const FALLBACK_COLOR = '#C9B79C';

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const dayNum = (s) => Math.floor(Date.parse(`${s}T00:00:00Z`) / DAY);
const weekdayOf = (s) => new Date(`${s}T00:00:00Z`).getUTCDay();

// ---------------------------------------------------------------- pure stats

/** weeks -> flat ascending list of days */
export function flattenDays(weeks) {
  return weeks.flat().slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** GitHub-ish quartile level for synthetic data. 0 stays 0. */
export function levelFor(count, max) {
  if (count <= 0 || max <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil((count / max) * 4)));
}

/**
 * Consecutive days with count > 0 ending today, or yesterday if today is still empty.
 * `today` defaults to the last day in the calendar. Pass a real date to zero out stale data.
 */
export function currentStreak(days, today) {
  if (!days.length) return 0;
  let i = days.length - 1;
  if (today && dayNum(today) - dayNum(days[i].date) > 1) return 0;
  if (days[i].count === 0) i--;
  let n = 0;
  while (i >= 0 && days[i].count > 0) {
    if (i < days.length - 1 && dayNum(days[i + 1].date) - dayNum(days[i].date) !== 1) break;
    n++;
    i--;
  }
  return n;
}

/** Longest run of days with count > 0. Ties go to the most recent run. */
export function longestStreak(days) {
  let best = 0, bestEnd = -1, run = 0;
  for (let i = 0; i < days.length; i++) {
    const contiguous = i > 0 && dayNum(days[i].date) - dayNum(days[i - 1].date) === 1;
    run = days[i].count > 0 ? (run > 0 && contiguous ? run + 1 : 1) : 0;
    if (run > 0 && run >= best) { best = run; bestEnd = i; }
  }
  return { length: best, range: best ? [days[bestEnd - best + 1].date, days[bestEnd].date] : null };
}

/** Day with the most contributions. Ties go to the most recent. null when the year is empty. */
export function busiestDay(days) {
  let b = null;
  for (const d of days) if (d.count > 0 && (!b || d.count >= b.count)) b = { date: d.date, count: d.count };
  return b;
}

export function avgPerDay(days) {
  if (!days.length) return 0;
  return Math.round((days.reduce((s, d) => s + d.count, 0) / days.length) * 100) / 100;
}

export function weekdayTotals(days) {
  const t = [0, 0, 0, 0, 0, 0, 0];
  for (const d of days) t[d.weekday ?? weekdayOf(d.date)] += d.count;
  return t;
}

export function argmax(arr) {
  let bi = -1, bv = 0;
  arr.forEach((v, i) => { if (v > bv) { bv = v; bi = i; } });
  return bi < 0 ? null : bi;
}

/** Most common hour (0-23) of the given ISO timestamps in tz. null when there are none. */
export function mostActiveHour(isoTimes, tz = DEFAULT_TZ) {
  if (!isoTimes.length) return null;
  const fmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: tz });
  const h = new Array(24).fill(0);
  for (const t of isoTimes) h[Number(fmt.format(new Date(t))) % 24]++;
  return argmax(h);
}

/** repoByDate: { 'YYYY-MM-DD': { repoName: commitCount } } built from public commits only */
export function dominantRepo(counts) {
  let best = null, bv = 0;
  for (const [k, v] of Object.entries(counts ?? {})) if (v > bv) { best = k; bv = v; }
  return best;
}

export function topDays(days, repoByDate = {}, n = 8) {
  return days
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count || (a.date < b.date ? 1 : -1))
    .slice(0, n)
    .map((d) => ({ date: d.date, count: d.count, repo: dominantRepo(repoByDate[d.date]) }));
}

/** repos: [{ languages: [{ name, color, size }] }]. Top `max` by bytes, remainder folded into "Other". */
export function languageSlices(repos, max = 8) {
  const m = new Map();
  let total = 0;
  for (const r of repos) {
    for (const l of r.languages ?? []) {
      total += l.size;
      const e = m.get(l.name) ?? { name: l.name, color: l.color || FALLBACK_COLOR, bytes: 0 };
      e.bytes += l.size;
      m.set(l.name, e);
    }
  }
  const all = [...m.values()].sort((a, b) => b.bytes - a.bytes);
  const out = all.slice(0, max);
  const rest = all.slice(max).reduce((s, e) => s + e.bytes, 0);
  if (rest > 0) out.push({ name: 'Other', color: FALLBACK_COLOR, bytes: rest });
  return out.map((e) => ({ ...e, ratio: total ? Math.round((e.bytes / total) * 10000) / 10000 : 0 }));
}

export const normalizeName = (s) => String(s).toLowerCase().replace(/[\s_-]+/g, '');

/** Match project slugs to repo names (exact after normalizing, else name contains the slug). First hit wins, repos are pushed-desc. */
export function matchProjectRepos(repos, slugs = PROJECT_SLUGS) {
  const out = {};
  for (const slug of slugs) {
    const key = normalizeName(slug);
    const hit = repos.find((r) => normalizeName(r.name) === key) ?? repos.find((r) => normalizeName(r.name).includes(key));
    if (hit) out[slug] = hit;
  }
  return out;
}

export function computeStats(weeks, { repoByDate = {}, commitTimes = [], lastPushAt = null, today, tz = DEFAULT_TZ } = {}) {
  const days = flattenDays(weeks);
  const wt = weekdayTotals(days);
  const ls = longestStreak(days);
  return {
    currentStreak: currentStreak(days, today),
    longestStreak: ls.length,
    longestStreakRange: ls.range,
    busiest: busiestDay(days),
    avgPerDay: avgPerDay(days),
    mostActiveWeekday: argmax(wt),
    mostActiveHour: mostActiveHour(commitTimes, tz),
    weekdayTotals: wt,
    lastPushAt,
    topDays: topDays(days, repoByDate),
  };
}

// ---------------------------------------------------------------- GraphQL

const REPO_FIELDS = `fragment RepoFields on Repository {
  name description url stargazerCount forkCount pushedAt createdAt isPrivate
  primaryLanguage { name color }
}`;

/** One year per window, newest first, contiguous 364-day windows (always legal for contributionsCollection). */
export function yearWindows(now, years = YEARS) {
  return Array.from({ length: years }, (_, i) => ({
    from: new Date(now.getTime() - (i + 1) * 364 * DAY).toISOString(),
    to: new Date(now.getTime() - i * 364 * DAY).toISOString(),
  }));
}

export function mainQuery(years = YEARS) {
  const vars = Array.from({ length: years }, (_, i) => `$f${i}: DateTime!, $t${i}: DateTime!`).join(', ');
  const counts = 'totalCommitContributions totalPullRequestContributions totalIssueContributions';
  const wins = Array.from({ length: years }, (_, i) =>
    i === 0
      ? `y0: contributionsCollection(from: $f0, to: $t0) { ${counts}
          contributionCalendar { totalContributions weeks { contributionDays { date contributionCount contributionLevel weekday } } } }`
      : `y${i}: contributionsCollection(from: $f${i}, to: $t${i}) { ${counts} }`,
  ).join('\n    ');
  return `query Pulse($login: String!, ${vars}) {
  rateLimit { cost remaining resetAt }
  user(login: $login) {
    id login name url
    followers { totalCount }
    publicRepoCount: repositories(privacy: PUBLIC, ownerAffiliations: OWNER) { totalCount }
    ${wins}
    pinnedItems(first: 6, types: REPOSITORY) { nodes { ... on Repository { ...RepoFields } } }
    repositories(first: 100, ownerAffiliations: OWNER, privacy: PUBLIC, isFork: false, orderBy: { field: PUSHED_AT, direction: DESC }) {
      nodes { ...RepoFields languages(first: 8, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name color } } } }
    }
    pullRequests(first: 12, orderBy: { field: CREATED_AT, direction: DESC }) {
      nodes { title url createdAt repository { name isPrivate owner { login } } }
    }
  }
}
${REPO_FIELDS}`;
}

export const VIEWER_QUERY = 'query { viewer { login } }';

/** [[since, until], ...] oldest first, `weeks` windows of 7 days ending at now */
export function weekRanges(now, weeks = SPARK_WEEKS) {
  return Array.from({ length: weeks }, (_, k) => [
    new Date(now.getTime() - (weeks - k) * 7 * DAY).toISOString(),
    new Date(now.getTime() - (weeks - k - 1) * 7 * DAY).toISOString(),
  ]);
}

/** repos: [{ name, project: boolean }]. Names must already be validated (see isSafeRepoName). */
export function historyQuery(repos, now) {
  const weeks = weekRanges(now);
  const body = repos
    .map(({ name, project }, i) => {
      const extra = project
        ? `latest: history(first: 1, author: { id: $author }) { nodes { committedDate messageHeadline url } }
           ${weeks.map(([s, u], j) => `w${j}: history(first: 1, since: "${s}", until: "${u}", author: { id: $author }) { totalCount }`).join(' ')}`
        : '';
      return `r${i}: repository(owner: $login, name: ${JSON.stringify(name)}) {
        defaultBranchRef { target { ... on Commit {
          recent: history(first: 100, since: $since, author: { id: $author }) { nodes { committedDate messageHeadline url } }
          ${extra}
        } } }
      }`;
    })
    .join('\n');
  return `query History($login: String!, $author: ID!, $since: GitTimestamp!) {
  rateLimit { cost remaining resetAt }
  ${body}
}`;
}

export const isSafeRepoName = (n) => typeof n === 'string' && n.length < 101 && REPO_NAME_OK.test(n);

const LEVELS = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };
const clip = (s, n = 140) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };

function toRepoLite(n, pinned = false) {
  return {
    name: n.name,
    description: n.description ? clip(n.description, 160) : null,
    url: n.url,
    stars: n.stargazerCount ?? 0,
    forks: n.forkCount ?? 0,
    language: n.primaryLanguage?.name ?? null,
    languageColor: n.primaryLanguage?.color ?? null,
    pushedAt: n.pushedAt,
    ...(pinned ? { isPinned: true } : {}),
  };
}

function gqlError(res, what) {
  const errs = res?.errors;
  if (!errs?.length) return null;
  const limited = errs.some((e) => e.type === 'RATE_LIMITED' || /rate limit/i.test(e.message ?? ''));
  return new Error(limited ? 'rate limited by GitHub' : `${what}: ${errs.map((e) => e.type || e.message).join(', ').slice(0, 160)}`);
}

/**
 * Live collection. `gql(query, variables)` is a transport returning the parsed JSON body ({ data, errors }).
 * Throws on failure (callers fall back). Never logs secrets: it never sees the token.
 */
export async function collectGithubData(gql, { username = null, now = new Date(), tz = DEFAULT_TZ, log = () => {} } = {}) {
  let login = username;
  if (!login) {
    const v = await gql(VIEWER_QUERY, {});
    login = v?.data?.viewer?.login ?? null;
    if (!login) throw gqlError(v, 'viewer') ?? new Error('no username and no viewer');
  }

  const wins = yearWindows(now);
  const vars = { login };
  wins.forEach((w, i) => { vars[`f${i}`] = w.from; vars[`t${i}`] = w.to; });
  const r1 = await gql(mainQuery(wins.length), vars);
  const e1 = gqlError(r1, 'main query');
  const u = r1?.data?.user;
  if (!u) throw e1 ?? new Error(`user "${login}" not found`);
  if (e1) log(`partial main query errors ignored (${e1.message})`);
  const rl1 = r1.data.rateLimit;
  if (rl1 && rl1.remaining < 20) log(`rate limit low, ${rl1.remaining} left until ${rl1.resetAt}`);

  // ---- repos (public only, forks excluded)
  const repoNodes = (u.repositories?.nodes ?? []).filter((n) => n && !n.isPrivate);
  const repos = repoNodes.map((n) => ({
    ...toRepoLite(n),
    createdAt: n.createdAt,
    languages: (n.languages?.edges ?? []).map((e) => ({ name: e.node.name, color: e.node.color, size: e.size })),
  }));
  const pinned = (u.pinnedItems?.nodes ?? []).filter((n) => n && n.name && !n.isPrivate).map((n) => toRepoLite(n, true));

  // ---- stage 2: public commit history for the recently pushed repos and the project repos
  const matches = matchProjectRepos(repos);
  const wanted = new Map();
  for (const r of repos.slice(0, 8)) wanted.set(r.name, { name: r.name, project: false });
  for (const r of Object.values(matches)) wanted.set(r.name, { name: r.name, project: true });
  const list = [...wanted.values()].filter((w) => isSafeRepoName(w.name));
  const hist = {};
  const recentCommits = [];
  const repoByDate = {};
  const commitTimes = [];
  if (list.length && u.id && (rl1?.remaining ?? 1000) > 30) {
    try {
      const r2 = await gql(historyQuery(list, now), {
        login, author: u.id, since: new Date(now.getTime() - SPARK_WEEKS * 7 * DAY).toISOString(),
      });
      const e2 = gqlError(r2, 'history query');
      if (!r2?.data) throw e2 ?? new Error('empty history response');
      if (e2) log(`partial history errors ignored (${e2.message})`);
      list.forEach((w, i) => {
        const t = r2.data[`r${i}`]?.defaultBranchRef?.target;
        if (!t) return;
        const nodes = (t.recent?.nodes ?? []).filter(Boolean);
        for (const c of nodes) {
          commitTimes.push(c.committedDate);
          const d = c.committedDate.slice(0, 10);
          (repoByDate[d] ??= {})[w.name] = (repoByDate[d][w.name] ?? 0) + 1;
          recentCommits.push({ kind: 'commit', repo: w.name, url: c.url, title: clip(c.messageHeadline), at: c.committedDate });
        }
        hist[w.name] = {
          latest: t.latest?.nodes?.[0] ?? nodes[0] ?? null,
          sparkline: t.latest ? Array.from({ length: SPARK_WEEKS }, (_, j) => t[`w${j}`]?.totalCount ?? 0) : null,
        };
      });
    } catch (e) {
      log(`commit history skipped (${e.message})`);
    }
  }

  // ---- calendar, totals
  const y0 = u.y0;
  const weeks = (y0?.contributionCalendar?.weeks ?? []).map((w) =>
    w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount, level: LEVELS[d.contributionLevel] ?? 0, weekday: d.weekday })),
  );
  const sum = (k) => wins.reduce((s, _, i) => s + (u[`y${i}`]?.[k] ?? 0), 0);
  const lastYear = y0?.contributionCalendar?.totalContributions ?? 0;
  const publicRepos = u.publicRepoCount?.totalCount ?? repos.length;
  const followers = u.followers?.totalCount ?? 0;

  // ---- activity: public commits, public PRs, newly created public repos
  const prs = (u.pullRequests?.nodes ?? [])
    .filter((p) => p && !p.repository?.isPrivate)
    .map((p) => ({
      kind: 'pr',
      repo: p.repository.owner?.login === login ? p.repository.name : `${p.repository.owner?.login}/${p.repository.name}`,
      url: p.url, title: clip(p.title), at: p.createdAt,
    }));
  const created = [...repos].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 4)
    .map((r) => ({ kind: 'repo', repo: r.name, url: r.url, title: 'created repo', at: r.createdAt }));
  const activity = [...recentCommits, ...prs, ...created].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 30);

  // ---- per-project stats
  const projects = {};
  for (const [slug, r] of Object.entries(matches)) {
    const h = hist[r.name];
    projects[slug] = {
      slug, repo: r.name, url: r.url, stars: r.stars,
      lastCommitAt: h?.latest?.committedDate ?? null,
      lastCommitMessage: h?.latest ? clip(h.latest.messageHeadline) : null,
      languages: languageSlices([r], 5),
      sparkline: h?.sparkline ?? new Array(SPARK_WEEKS).fill(0),
    };
  }

  const topRepos = [...repos].sort((a, b) => b.stars - a.stars || (a.pushedAt < b.pushedAt ? 1 : -1)).slice(0, 6)
    .map(({ createdAt, languages, ...lite }) => lite);

  return {
    source: 'live',
    fetchedAt: now.toISOString(),
    username: login,
    profile: { name: u.name ?? null, url: u.url ?? null, followers, publicRepos },
    totals: {
      commits: sum('totalCommitContributions'),
      prs: sum('totalPullRequestContributions'),
      issues: sum('totalIssueContributions'),
      repos: publicRepos,
      starsReceived: repos.reduce((s, r) => s + r.stars, 0),
      followers,
      contributionsLastYear: lastYear,
    },
    calendar: { total: lastYear, weeks },
    stats: computeStats(weeks, { repoByDate, commitTimes, lastPushAt: repos[0]?.pushedAt ?? null, tz }),
    pinned,
    topRepos,
    languages: languageSlices(repos),
    activity,
    projects,
  };
}

// ---------------------------------------------------------------- sample dataset

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SAMPLE_REPOS = ['sample-repo-alpha', 'sample-repo-beta', 'sample-repo-gamma', 'sample-repo-delta', 'sample-repo-epsilon'];
const SAMPLE_MSGS = ['fix the thing', 'make it less broken', 'wip, do not judge', 'it works on my machine', 'rename stuff again', 'add a TODO and move on', 'tiny tweak', 'delete the dead code'];
const SAMPLE_LANGS = [
  ['TypeScript', '#3178c6', 0.38], ['Python', '#3572A5', 0.24], ['Lua', '#000080', 0.14],
  ['JavaScript', '#f1e05a', 0.1], ['C++', '#f34b7d', 0.07], ['HTML', '#e34c22', 0.04], ['CSS', '#563d7c', 0.03],
];

/** Deterministic synthetic dataset. Same date in, same data out. UI must label it "sample data". */
export function sampleData({ now = new Date(), username = null, tz = DEFAULT_TZ } = {}) {
  const r = rng(0x5eed1);
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(today.getTime() - 364 * DAY);
  start.setTime(start.getTime() - start.getUTCDay() * DAY); // back to Sunday
  const raw = [];
  let cool = 0;
  for (let t = start.getTime(); t <= today.getTime(); t += DAY) {
    const dt = new Date(t);
    const wd = dt.getUTCDay();
    if (cool > 0) { cool--; raw.push({ t, wd, c: 0 }); continue; }
    if (r() < 0.04) cool = 2 + Math.floor(r() * 5);
    const weekendBoost = wd === 0 || wd === 6 ? 1.35 : 0.9;
    let c = r() < 0.34 ? 0 : Math.floor(r() * r() * 9 * weekendBoost);
    if (r() < 0.025) c += 8 + Math.floor(r() * 14);
    raw.push({ t, wd, c });
  }
  const max = Math.max(...raw.map((d) => d.c));
  const flat = raw.map(({ t, wd, c }) => ({ date: ymd(new Date(t)), count: c, level: levelFor(c, max), weekday: wd }));
  const weeks = [];
  for (let i = 0; i < flat.length; i += 7) weeks.push(flat.slice(i, i + 7));
  const total = flat.reduce((s, d) => s + d.count, 0);

  const ago = (h) => new Date(now.getTime() - h * 3600000).toISOString();
  const repoByDate = {};
  for (const d of flat) if (d.count > 0) repoByDate[d.date] = { [SAMPLE_REPOS[Math.floor(r() * SAMPLE_REPOS.length)]]: d.count };
  const activity = Array.from({ length: 14 }, (_, i) => {
    const repo = SAMPLE_REPOS[i % SAMPLE_REPOS.length];
    return { kind: i % 5 === 3 ? 'pr' : 'commit', repo, url: 'https://github.com', title: SAMPLE_MSGS[i % SAMPLE_MSGS.length], at: ago(2 + i * 9) };
  });
  const repoLite = (name, i) => ({
    name, description: 'Sample repo. Not real.', url: 'https://github.com', stars: [4, 2, 0, 1, 0][i % 5], forks: 0,
    language: SAMPLE_LANGS[i % 4][0], languageColor: SAMPLE_LANGS[i % 4][1], pushedAt: ago(5 + i * 31),
  });
  const topRepos = SAMPLE_REPOS.map(repoLite);
  const times = activity.map((a) => a.at);
  return {
    source: 'sample',
    fetchedAt: now.toISOString(),
    username,
    profile: { name: null, url: null, followers: 0, publicRepos: SAMPLE_REPOS.length },
    totals: { commits: total, prs: 12, issues: 3, repos: SAMPLE_REPOS.length, starsReceived: 7, followers: 0, contributionsLastYear: total },
    calendar: { total, weeks },
    stats: computeStats(weeks, { repoByDate, commitTimes: times, lastPushAt: activity[0].at, tz }),
    pinned: topRepos.slice(0, 3).map((x) => ({ ...x, isPinned: true })),
    topRepos,
    languages: SAMPLE_LANGS.map(([name, color, ratio]) => ({ name, color, ratio, bytes: Math.round(ratio * 400000) })),
    activity,
    projects: {},
  };
}
