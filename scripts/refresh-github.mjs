#!/usr/bin/env node
// Writes data/github.json (source "snapshot") from the GitHub GraphQL API.
//   npm run refresh:github            live data (GITHUB_TOKEN, or the gh CLI's own auth if no token)
//   npm run refresh:github -- --sample  write the deterministic SAMPLE dataset instead (source "sample")
// Reads GITHUB_TOKEN / GITHUB_USERNAME from the environment or .env.local. Never prints or stores the token.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectGithubData, sampleData } from '../src/lib/github/compute.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'data/github.json');

function loadEnv(file) {
  const p = join(root, file);
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2];
    if (/^(['"]).*\1$/.test(v)) v = v.slice(1, -1);
    else v = v.replace(/\s+#.*$/, '');
    if (process.env[m[1]] === undefined || process.env[m[1]] === '') process.env[m[1]] = v;
  }
}
loadEnv('.env.local');
loadEnv('.env');

const fail = (msg) => { console.error(`[refresh:github] ${msg}`); process.exit(1); };
const token = (process.env.GITHUB_TOKEN ?? '').trim();
const scrub = (s) => (token ? String(s).split(token).join('***') : String(s));

function save(data) {
  mkdirSync(dirname(out), { recursive: true });
  // keep each calendar day on one line so the file diffs like a table, not a novel
  const json = JSON.stringify(data, null, 2).replace(
    /\{\s+"date": "([\d-]+)",\s+"count": (\d+),\s+"level": (\d),\s+"weekday": (\d)\s+\}/g,
    '{ "date": "$1", "count": $2, "level": $3, "weekday": $4 }',
  );
  writeFileSync(out, `${json}\n`);
}

function summary(d) {
  const days = d.calendar.weeks.flat().length;
  return [
    `source        ${d.source}`,
    `username      ${d.username ?? '(none)'}`,
    `calendar      ${d.calendar.weeks.length} weeks, ${days} days, ${d.calendar.total} contributions`,
    `totals        ${d.totals.commits} commits, ${d.totals.prs} PRs, ${d.totals.issues} issues, ${d.totals.repos} public repos, ${d.totals.starsReceived} stars, ${d.totals.followers} followers`,
    `streaks       current ${d.stats.currentStreak}, longest ${d.stats.longestStreak}`,
    `top days      ${d.stats.topDays.length}`,
    `repos         ${d.pinned.length} pinned, ${d.topRepos.length} top, ${d.languages.length} languages, ${d.activity.length} activity rows`,
    `projects      ${Object.keys(d.projects).join(', ') || '(none matched)'}`,
    `wrote         data/github.json`,
  ].join('\n');
}

if (process.argv.includes('--sample')) {
  const d = sampleData({ username: process.env.GITHUB_USERNAME || null });
  save(d);
  console.log(`[refresh:github] wrote SAMPLE data (not real, UI will label it)\n${summary(d)}`);
  process.exit(0);
}

// ---- transports
function ghCli(args) {
  return execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
}
const ghTransport = async (query, variables) => {
  const args = ['api', 'graphql', '-f', `query=${query}`];
  for (const [k, v] of Object.entries(variables)) args.push('-f', `${k}=${v}`);
  try {
    return JSON.parse(ghCli(args));
  } catch (e) {
    if (e.stdout) { try { return JSON.parse(e.stdout); } catch { /* fall through */ } }
    throw new Error(`gh api graphql failed: ${String(e.stderr || e.message).trim().split('\n')[0]}`);
  }
};
const fetchTransport = async (query, variables) => {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'nv-portfolio-refresh' },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(30000),
  });
  if (res.status === 401) throw new Error('GitHub says bad credentials (HTTP 401). Check GITHUB_TOKEN.');
  if (!res.ok) throw new Error(`HTTP ${res.status} from api.github.com`);
  return res.json();
};

let transport, how;
if (token) { transport = fetchTransport; how = 'GITHUB_TOKEN'; }
else { transport = ghTransport; how = 'gh CLI auth'; }

let username = (process.env.GITHUB_USERNAME ?? '').trim();
if (!username && !token) {
  try { username = ghCli(['api', 'user', '--jq', '.login']).trim(); }
  catch (e) { fail(`no GITHUB_USERNAME, no GITHUB_TOKEN, and \`gh api user\` failed: ${scrub(String(e.stderr || e.message).trim().split('\n')[0])}\nSet GITHUB_USERNAME (and GITHUB_TOKEN) in .env.local, or run \`gh auth login\`.`); }
}

console.log(`[refresh:github] fetching via ${how}${username ? ` for ${username}` : ' (username from token)'}...`);
try {
  const data = await collectGithubData(transport, { username: username || null, log: (m) => console.warn(`[refresh:github] ${scrub(m)}`) });
  data.source = 'snapshot';
  data.fetchedAt = new Date().toISOString();
  save(data);
  console.log(summary(data));
} catch (e) {
  fail(`${scrub(e instanceof Error ? e.message : e)}\nNothing was written. The site will use the existing snapshot or sample data.`);
}
