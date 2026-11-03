// GitHub data contract. Shared by server fetchers (src/lib/github/*), scripts/refresh-github.mjs
// (which must write this exact shape to data/github.json) and every client visualization.
// Privacy rule: private repos contribute ONLY to aggregate counts. Never put a private repo name,
// commit message, or file path anywhere in this shape.

export type ContributionDay = {
  date: string; // YYYY-MM-DD
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  weekday: number; // 0 = Sunday
};

export type RepoLite = {
  name: string;
  description: string | null;
  url: string;
  stars: number;
  forks: number;
  language: string | null;
  languageColor: string | null;
  pushedAt: string; // ISO
  isPinned?: boolean;
};

export type ActivityItem = {
  kind: 'commit' | 'pr' | 'repo';
  repo: string; // public repos only
  url: string;
  title: string; // commit message first line / PR title / "created repo"
  at: string; // ISO
};

export type LanguageSlice = { name: string; color: string; bytes: number; ratio: number };

export type ProjectRepoStats = {
  slug: string; // matches src/lib/projects.ts slug
  repo: string;
  url: string;
  stars: number;
  lastCommitAt: string | null;
  lastCommitMessage: string | null;
  languages: LanguageSlice[];
  sparkline: number[]; // commits per week, oldest first, up to 26 values
};

export type GithubStats = {
  currentStreak: number;
  longestStreak: number;
  longestStreakRange: [string, string] | null;
  busiest: { date: string; count: number } | null;
  avgPerDay: number;
  mostActiveWeekday: number | null; // 0 = Sunday
  mostActiveHour: number | null; // 0-23, from public commit timestamps only
  weekdayTotals: number[]; // length 7
  lastPushAt: string | null;
  /** biggest commit days with the public repo that dominated that day, for the Route timeline */
  topDays: { date: string; count: number; repo: string | null }[];
};

export type GithubData = {
  /** 'live' = fresh API result, 'snapshot' = data/github.json, 'sample' = synthetic placeholder (UI must label it) */
  source: 'live' | 'snapshot' | 'sample';
  fetchedAt: string;
  username: string | null;
  profile: { name: string | null; url: string | null; followers: number; publicRepos: number };
  totals: {
    commits: number;
    prs: number;
    issues: number;
    repos: number;
    starsReceived: number;
    followers: number;
    contributionsLastYear: number;
  };
  calendar: { total: number; weeks: ContributionDay[][] };
  stats: GithubStats;
  pinned: RepoLite[];
  topRepos: RepoLite[];
  languages: LanguageSlice[];
  activity: ActivityItem[];
  projects: Record<string, ProjectRepoStats>;
};

/** Small slice passed to loader, footer, and HUD labels. */
export type GithubSummary = {
  source: GithubData['source'];
  totalCommits: number | null;
  lastCommit: { message: string; repo: string; at: string; url: string } | null;
  username: string | null;
};
