// Site-wide constants. Anything marked TODO is info Nayan has not provided yet. Never invent values.

export const SITE = {
  name: 'Nayan Vangala',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  title: 'Nayan Vangala | AI + hardware, built by a high schooler',
  description:
    'Nayan Vangala is a high school student in Fremont, CA who builds AI and hardware projects and is a Hack Club Stardance Ambassador.',
  location: 'Fremont, CA',
  coords: { lat: 37.5485, lon: -121.9886, tz: 'America/Los_Angeles' },
  role: 'Hack Club Stardance Ambassador',
} as const;

/** Section registry. Codes follow NV-ID-A## and appear in HUD labels everywhere. */
export const SECTIONS = {
  hero: { id: 'hero', code: 'NV-ID-A01', label: 'Home' },
  about: { id: 'about', code: 'NV-ID-A02', label: 'About', module: '01' },
  works: { id: 'works', code: 'NV-ID-A03', label: 'Work', module: '02' },
  disciplines: { id: 'disciplines', code: 'NV-ID-A04', label: 'Disciplines', module: '03' },
  universe: { id: 'universe', code: 'NV-ID-A05', label: 'Universe', module: '04' },
  route: { id: 'route', code: 'NV-ID-A06', label: 'Route', module: '05' },
  imagery: { id: 'imagery', code: 'NV-ID-A07', label: 'Imagery' },
  quote: { id: 'quote', code: 'NV-ID-A08', label: 'Quote' },
  contact: { id: 'contact', code: 'NV-ID-A09', label: 'Contact' },
} as const;

export type SectionKey = keyof typeof SECTIONS;

/** Overlay menu entries. */
export const NAV = [
  { label: 'Home', href: '#hero', code: 'A01' },
  { label: 'Work', href: '#works', code: 'A03' },
  { label: 'About', href: '#about', code: 'A02' },
  { label: 'Universe', href: '#universe', code: 'A05' },
  { label: 'Contact', href: '#contact', code: 'A09' },
] as const;

/** Socials. href: null means TODO, render as a disabled "coming soon" item, never a dead link. */
export const SOCIALS: { label: string; href: string | null; todo?: string }[] = [
  { label: 'GitHub', href: null, todo: 'TODO: set GITHUB_USERNAME in .env.local, link is derived from it' },
  { label: 'LinkedIn', href: null, todo: 'TODO: LinkedIn URL' },
  { label: 'Instagram', href: null, todo: 'TODO: Instagram URL' },
  { label: 'Hack Club', href: null, todo: 'TODO: Hack Club profile URL' },
];

/** TODO: real contact email. The form posts to NEXT_PUBLIC_FORM_ENDPOINT (see .env.example). */
export const CONTACT_EMAIL: string | null = null;

/** Rotating "now building" statuses for HUD labels. Facts only, from the brief. */
export const NOW_BUILDING = [
  'smart glasses that read with you',
  'an AI memory for Ray-Ban glasses',
  'a trust layer for AI wearables',
  'a 3D map of people I have met',
  'post-quantum crypto for satellites',
];

/** Marquee strings used by the hero ticker. */
export const TICKER = ['BUILDING THINGS THAT HELP PEOPLE', 'AI × HARDWARE', "LET'S WORK"];

export const KONAMI_MESSAGE = 'You found it. Nobody reads the source. Respect.';
