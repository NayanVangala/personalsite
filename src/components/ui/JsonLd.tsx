import { SITE } from '@/lib/site';

// Structured data. Only facts Nayan provided. No invented awards or employers.
export function JsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: SITE.name,
    url: SITE.url,
    jobTitle: 'Student, builder',
    description: SITE.description,
    address: { '@type': 'PostalAddress', addressLocality: 'Fremont', addressRegion: 'CA', addressCountry: 'US' },
    knowsAbout: ['Artificial intelligence', 'Embedded hardware', 'Computer vision', 'Web development', 'Game development'],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
