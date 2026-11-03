// Server-only entry. Live GraphQL (ISR, 1h) -> data/github.json snapshot -> deterministic SAMPLE data.
// Contract: getGithubData() NEVER throws and always returns a GithubData. summarize() derives GithubSummary.
// The token stays on the server: it is read here, sent to api.github.com, and never logged or returned.
import 'server-only';
import { cache } from 'react';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { collectGithubData, sampleData, type Gql } from './compute.mjs';
import type { GithubData, GithubSummary } from './types';

export type { GithubData, GithubSummary } from './types';

const ENDPOINT = 'https://api.github.com/graphql';
const REVALIDATE = 3600;

export function emptyGithubData(): GithubData {
  return {
    source: 'sample',
    fetchedAt: new Date(0).toISOString(),
    username: null,
    profile: { name: null, url: null, followers: 0, publicRepos: 0 },
    totals: { commits: 0, prs: 0, issues: 0, repos: 0, starsReceived: 0, followers: 0, contributionsLastYear: 0 },
    calendar: { total: 0, weeks: [] },
    stats: {
      currentStreak: 0, longestStreak: 0, longestStreakRange: null, busiest: null, avgPerDay: 0,
      mostActiveWeekday: null, mostActiveHour: null, weekdayTotals: [0, 0, 0, 0, 0, 0, 0], lastPushAt: null, topDays: [],
    },
    pinned: [], topRepos: [], languages: [], activity: [], projects: {},
  };
}

function scrub(msg: unknown, token: string): string {
  const s = msg instanceof Error ? msg.message : String(msg);
  return (token ? s.split(token).join('***') : s).slice(0, 200);
}

function transport(token: string): Gql {
  return async (query, variables) => {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'nv-portfolio' },
      body: JSON.stringify({ query, variables }),
      next: { revalidate: REVALIDATE },
      signal: AbortSignal.timeout(15000),
    });
    if (res.status === 401) throw new Error('bad credentials (HTTP 401)');
    if (res.status === 403 || res.status === 429) throw new Error(`rate limited or forbidden (HTTP ${res.status})`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };
}

async function readSnapshot(): Promise<GithubData | null> {
  try {
    const d = JSON.parse(await readFile(join(process.cwd(), 'data/github.json'), 'utf8')) as GithubData;
    if (!Array.isArray(d?.calendar?.weeks) || !d.stats || !d.totals) return null;
    return d.source === 'sample' ? d : { ...d, source: 'snapshot' };
  } catch {
    return null;
  }
}

/** Memoized per request. */
export const getGithubData = cache(async (): Promise<GithubData> => {
  const token = process.env.GITHUB_TOKEN?.trim() ?? '';
  const username = process.env.GITHUB_USERNAME?.trim() || null;
  if (token) {
    try {
      return (await collectGithubData(transport(token), {
        username, log: (m: string) => console.warn(`[github] ${scrub(m, token)}`),
      })) as GithubData;
    } catch (e) {
      console.warn(`[github] live fetch failed (${scrub(e, token)}), using snapshot`);
    }
  } else {
    console.warn('[github] GITHUB_TOKEN not set, using snapshot');
  }
  const snap = await readSnapshot();
  if (snap) return snap;
  console.warn('[github] no data/github.json, using sample data. Run npm run refresh:github');
  return sampleData({ username }) as GithubData;
});

export function summarize(d: GithubData): GithubSummary {
  const last = d.activity.find((a) => a.kind === 'commit') ?? null;
  return {
    source: d.source,
    totalCommits: d.totals.commits > 0 ? d.totals.commits : null,
    lastCommit: last ? { message: last.title, repo: last.repo, at: last.at, url: last.url } : null,
    username: d.username,
  };
}
