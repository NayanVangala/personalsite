import { NextResponse } from 'next/server';
import { getGithubData } from '@/lib/github';

export const revalidate = 3600;

/** Sanitized GithubData as JSON. Public repos and aggregate counts only, no token, ever. */
export async function GET() {
  const data = await getGithubData();
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
  });
}
