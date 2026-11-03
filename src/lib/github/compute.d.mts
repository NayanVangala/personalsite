import type { ActivityItem, ContributionDay, GithubData, GithubStats, LanguageSlice, ProjectRepoStats } from './types';

export const PROJECT_SLUGS: string[];
export const DEFAULT_TZ: string;
export const VIEWER_QUERY: string;

export type RepoByDate = Record<string, Record<string, number>>;
/** Transport: takes a query + string variables, returns the parsed JSON body of the GraphQL response. */
export type Gql = (query: string, variables: Record<string, string>) => Promise<{ data?: any; errors?: { type?: string; message?: string }[] }>;

export function flattenDays(weeks: ContributionDay[][]): ContributionDay[];
export function levelFor(count: number, max: number): 0 | 1 | 2 | 3 | 4;
export function currentStreak(days: Pick<ContributionDay, 'date' | 'count'>[], today?: string): number;
export function longestStreak(days: Pick<ContributionDay, 'date' | 'count'>[]): { length: number; range: [string, string] | null };
export function busiestDay(days: Pick<ContributionDay, 'date' | 'count'>[]): { date: string; count: number } | null;
export function avgPerDay(days: Pick<ContributionDay, 'count'>[]): number;
export function weekdayTotals(days: Pick<ContributionDay, 'date' | 'count' | 'weekday'>[]): number[];
export function argmax(arr: number[]): number | null;
export function mostActiveHour(isoTimes: string[], tz?: string): number | null;
export function dominantRepo(counts?: Record<string, number>): string | null;
export function topDays(days: Pick<ContributionDay, 'date' | 'count'>[], repoByDate?: RepoByDate, n?: number): GithubStats['topDays'];
export function languageSlices(repos: { languages?: { name: string; color: string | null; size: number }[] }[], max?: number): LanguageSlice[];
export function normalizeName(s: string): string;
export function matchProjectRepos<T extends { name: string }>(repos: T[], slugs?: string[]): Record<string, T>;
export function computeStats(
  weeks: ContributionDay[][],
  opts?: { repoByDate?: RepoByDate; commitTimes?: string[]; lastPushAt?: string | null; today?: string; tz?: string },
): GithubStats;

export function yearWindows(now: Date, years?: number): { from: string; to: string }[];
export function mainQuery(years?: number): string;
export function weekRanges(now: Date, weeks?: number): [string, string][];
export function historyQuery(repos: { name: string; project: boolean }[], now: Date): string;
export function isSafeRepoName(n: unknown): n is string;

export function collectGithubData(
  gql: Gql,
  opts?: { username?: string | null; now?: Date; tz?: string; log?: (msg: string) => void },
): Promise<GithubData>;
export function sampleData(opts?: { now?: Date; username?: string | null; tz?: string }): GithubData;

export type { ActivityItem, ProjectRepoStats };
