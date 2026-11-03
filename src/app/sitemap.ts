import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

// Keep in sync with slugs in src/lib/projects.ts (docs/DESIGN.md "Project slugs").
const PROJECT_SLUGS = ['lexia', 'findr', 'mediscan', 'hecate', 'steal-a-huss', 'conrad-challenge', 'roommap'];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE.url, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    ...PROJECT_SLUGS.map((slug) => ({
      url: `${SITE.url}/work/${slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];
}
