// Single source of truth for the eight artworks.
// generate-assets.mjs renders them, writes scripts/art/manifest.json and
// src/components/imagery/artworks.ts from this list. Edit here, then `npm run assets`.
// Voice: casual, clipped, no em-dashes. Facts only (project names, Fremont, route to TBD).

export const ARTWORKS = [
  {
    id: 'art-01', n: 1, file: 'art01', seed: 1101, w: 1280, h: 1600, vector: true,
    title: 'Flow field',
    alt: 'Thousands of thin ink and clay lines curl around a pale circle with a small hand-drawn star at its center, like wind bending around a sun.',
    tone: 'var(--c-clay)',
    caption: 'Thousands of lines. Not one of them asked for directions.',
  },
  {
    id: 'art-02', n: 2, file: 'art02', seed: 1202, w: 1600, h: 1600, vector: true,
    title: 'Dot sun',
    alt: 'A soft sun built from tiny dots rises over layered sand and moss hills under a pale blue wash, shaded with paper grain.',
    tone: 'var(--c-coral)',
    caption: 'A sun made of dots. Squint and it is warm.',
  },
  {
    id: 'art-03', n: 3, file: 'art03', seed: 1303, w: 1600, h: 1200, vector: true,
    title: 'Ink-wash ridges',
    alt: 'Layered ink-wash mountains fade into blue-grey mist beneath a pale sky, with a clay-colored star hanging where the sun should be and a few birds.',
    tone: 'var(--c-sky)',
    caption: 'Mountains in layers. The sun is a star because everything is.',
  },
  {
    id: 'art-04', n: 4, file: 'art04', seed: 1404, w: 1066, h: 1600, vector: true,
    title: 'Star map',
    alt: 'A hand-drawn star map on blue-washed paper. Stars are joined by wobbly lines into seven small constellations named after my projects, with a compass rose and a clay North star.',
    tone: 'var(--c-sky)',
    caption: 'Seven projects, seven little constellations. Fremont is the middle of the map.',
  },
  {
    id: 'art-05', n: 5, file: 'art05', seed: 1505, w: 1280, h: 1600, vector: true,
    title: 'Chip garden',
    alt: 'A plant growing out of a microchip. Its stems and leaves are green circuit traces ending in round solder pads, with a clay flower at the top.',
    tone: 'var(--c-moss)',
    caption: 'A plant that grew out of a chip. Needs no water. Needs 3.3 volts.',
  },
  {
    id: 'art-06', n: 6, file: 'art06', seed: 1606, w: 1600, h: 1200, vector: true,
    title: 'Paper layers',
    alt: 'Stacked torn-paper hills in blue, sand, coral, clay and green, each casting a soft shadow on the next, under a cut-paper sun.',
    tone: 'var(--c-sand)',
    caption: 'Paper layers, except the paper is math and the scissors are a displacement map.',
  },
  {
    id: 'art-07', n: 7, file: 'art07', seed: 1707, w: 1600, h: 1600, vector: true,
    title: 'Bloom',
    alt: 'A radiating asterisk bloom. Clay, coral and gold petals unfold around a paper-colored center, wrapped in fine ink rays.',
    tone: 'var(--c-highlight)',
    caption: 'The star, but louder. Same asterisk, more rays, zero chill.',
  },
  {
    id: 'art-08', n: 8, file: 'art08', seed: 1808, w: 1066, h: 1600, vector: false,
    title: 'Route map',
    alt: 'A topographic contour map in soft blue, green and sand. A dashed clay route starts at Fremont and ends at a star marked TBD.',
    tone: 'var(--c-moss)',
    caption: 'A route from Fremont to TBD. The map has a plan. I am still working on mine.',
  },
];
