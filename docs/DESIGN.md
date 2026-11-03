# Nayan Vangala. Portfolio design doc

Owner: Nayan Vangala (high school student, Fremont CA, builds AI + hardware, Hack Club Stardance Ambassador).
Mood: a warm, human, thoughtful AI-lab editorial. Hand-drawn ink on cream paper. Not affiliated with anyone. No third-party logos or marks.
The one memorable thing: **the star**. A hand-drawn radiating asterisk is the sun in the Universe, the cursor, the loader, the hero mark, the confetti, the top of the tallest commit bar. Everything else stays quiet so the star can carry it.

## 1. Voice and copy rules

- Casual, clipped, funny, direct. Short sentences. First person. Reads like Nayan talking, not a LinkedIn post.
- No em-dashes (use a period or comma). No buzzwords ("leverage", "synergy", "passionate", "cutting-edge"). No lorem ipsum.
- No spaced "WORD — fragment" labels. Keep "·" joins rare. Sentence case for UI text. Mono uppercase is for HUD labels only.
- Never invent awards, numbers, metrics, press, links, emails, dates, or team members. Anything unknown is a visible, greppable `TODO:` marker, in code as `TODO:` and in UI as a quiet "TODO" tag. Every TODO is collected in README.
- Facts we have (the only ones): Nayan Vangala. High school student. Fremont, CA. Builds AI + hardware. Hack Club Stardance Ambassador. Funny. Projects: Lexia (real-time reading assistant on smart glasses + Raspberry Pi), Findr (AI memory assistant on Meta Ray-Ban glasses, built at MarinHacks), MediScan (first Stardance project), Hecate (AI wearable trust/permissions layer, hackathon), Steal a Huss (Roblox game), Conrad Challenge (post-quantum encryption for satellites, team of 4), Roommap (3D web map of people met at networking events). Stack words we may use: Raspberry Pi, MediaPipe-style hand tracking, LLMs, Roblox/Luau, Three.js, Next.js, TypeScript. Anything beyond this is TODO.

## 2. Palette

Raw constants (`--c-*`, never change) and semantic vars (`--bg --fg ...`, flip in dark). Components use semantic vars. All defined in `src/app/globals.css`.

| Token | Light | Dark (warm charcoal) | Use |
|---|---|---|---|
| `--bg` paper | #F4EFE6 | #1B1714 | page |
| `--bg-2` paper-2 | #EBE3D4 | #25201B | panels, bands |
| `--fg` ink | #1F1A17 | #F2EBDD | text, linework |
| `--fg-muted` | #5E5249 | #BDB1A0 | secondary text (AA) |
| `--accent` clay | #D97757 | #E5805E | fills, strokes, large display only |
| `--accent-ink` | #A4452B | #F0987A | accent TEXT (AA on bg) |
| `--coral` | #E8896B | #EE9577 | gradient partner, sparks |
| `--sand` | #C9B79C | #7D705E | rules, soft fills |
| `--moss` | #6B7B5E | #93A784 | "ok/live" and plant life |
| `--sky` | #A9C4D6 | #86A6BC | cool counterpoint, water, glass |
| `--hl` highlight | #F2C14E | #F2C14E | sparks, the sun core, hover glints |

Rules: clay text on paper must use `--accent-ink`. Never pure black or pure white. Grain: SVG feTurbulence overlay (`body::before`) plus faint horizontal paper fibers (`body::after`). Dark mode uses `screen` blend so grain becomes a faint ember dust. Illustrations get ink-bleed edges (SVG `feTurbulence` + `feDisplacementMap` at scale 1.5 to 3 on strokes) and a slightly wobbled, hand-drawn path style (tiny jitter on vertices, round caps, stroke width varying 1.5 to 3px).

## 3. Type

| Role | Family | Notes |
|---|---|---|
| Display | Fraunces variable (axes wght 100-900, opsz 9-144, SOFT 0-100, WONK 0-1) | `.display` + `--wght --opsz --soft --wonk` CSS vars, animated by hover (`.vf`) and scroll via GSAP |
| Body | Inter Tight variable | 1rem to 1.18rem, line-height 1.55 |
| HUD | JetBrains Mono variable | `.label`: 0.68 to 0.78rem, tracking .14em, uppercase |

Fluid scale (all clamp): label, small, body, lead, h3, h2, h1 (hero name, up to 16rem), mega (footer, up to 22rem). Tokens `--fs-*`. Measure ≤ 62ch for body. Display line-height .92, tracking -0.02em. Axes: idle display text sits at wght 380 / opsz 144 / SOFT 40. Hover goes wght 720 / SOFT 100 / opsz 36 (softer, rounder, heavier). Scroll can drive wght 300 to 800.

Effects on type: (1) letter-by-letter reveal (SplitText-like, written by hand, aria-label on the parent, letters aria-hidden). (2) Glitch/stretch: scaleX stretch + RGB-split clones + clip-path slices that resolve to clean text. Use on exactly: the hero name entrance, one word in the quote block, and the 404. Nowhere else.

## 4. Motion language

- Easings (three only): `expo.out` (arrivals), `power3.inOut` (wipes, scrubs), `back.out(1.1)` (playful pops, one soft settle, never bouncy). CSS equivalents `--ease-out`, `--ease-in-out`, `--ease-spring`. Constants in `src/lib/motion.ts`.
- Durations: fast .18s (hover), base .42s (UI), slow .9s (reveals), epic 1.6s (page wipes, loader exit).
- Stagger: .035s per letter, .08s per word/line, .1s per card, total capped at .9s.
- Scroll reveals are rare and purposeful. No fade-up on every block. Each section gets ONE signature motion (listed below) and the rest sits still.
- Everything pointer-driven uses a shared rAF-smoothed lerp (0.08 to 0.14). No per-event layout reads.
- Reduced motion: no autoplay loops, no parallax, no shader animation (render one frame), no marquee scroll (static wrapped line), loader skipped to a 400ms fade, all `data-reveal` visible. WebGL scenes show a static illustrated fallback.
- Perf: DPR capped at 2 (`MAX_DPR`), WebGL lazy-loaded with `next/dynamic` + IntersectionObserver, `frameloop="demand"` or paused when offscreen/hidden tab, no layout thrash, transforms and opacity only.

## 5. Components (owner in brackets, see section 9)

Chrome [A]: `Chrome` (mounts all below), `OverlayMenu` (full-screen, staggered reveal), `Cursor` (hand-drawn star, morphs on links/buttons, off on coarse pointers), `ScrollRing` (progress ring), `SoundToggle`, `ThemeToggle`, `PageTransition`, `BackToTop` (rocket ink trail).
UI primitives [A]: `Marquee`, `SplitText`/`Reveal`, `GlitchText`, `MagneticButton`, `Tag`, `HudLabel`, `Counter` (rolling digits), `Star` (SVG, many variants).
Loader [B]: boot sequence. Hero [B]: shader backdrop, name, HUD corners, ticker.
About [C]: layered SVG avatar. Disciplines [C]: 4 procedural cards + draggable orbit constellation. Imagery [C]: 8 generated artworks, masonry, hover distortion, lightbox.
Universe [D]: floating-island R3F world, day/night, commit-city mode.
Works [E]: pinned horizontal gallery, covers, hover mini-animations, `/work/[slug]` case-study pages with architecture diagrams.
GitHub [G]: heatmap, stats HUD, languages ribbon, activity feed ticker, timeline, per-project repo stats. Route [G]: animated map + milestone timeline.
Contact [A]: oversized headline, magnetic button, validated form, footer strip, konami easter egg.

## 6. Section storyboard (page order)

| # | Section | Code | Signature interaction |
|---|---|---|---|
| L | Loader | NV-ID-L00 | mono boot lines type out, star assembles stroke by stroke, % counter, ink-bloom wipe. Skippable (button + Esc + click). Plays once per session. "LOADING COMMITS (n)" uses real total when known. |
| 1 | Hero | A01 | WebGL warm cloud shader + flowing line-field particles reacting to cursor. Giant "Nayan Vangala" with glitch/stretch entrance then variable-font hover. Rotating star. HUD corners (Fremont local time ticking, coords, cycling "now building"). Ticker below. |
| 2 | About, Module 01 | A02 | Layered SVG self-portrait (hoodie, laptop, glasses, coffee) that blinks, breathes, follows the cursor. Status rows 01-07. Funny short copy. |
| 3 | Works, Module 02 | A03 | Pinned horizontal scroll gallery. Seven procedural covers. Hover plays a looping mini-animation. Click opens `/work/[slug]`. |
| 4 | Disciplines, Module 03 | A04 | 4 big cards with procedural animated art (neural graph, circuit traces drawing, hand skeleton, pixel world). Draggable orbiting tech constellation. |
| 4b | GitHub pulse | (within A04 to A05 band) | Contribution heatmap, streak HUD, languages, activity ticker. Warm clay ramp. |
| 5 | Universe, Module 04 | A05 | Full-screen floating-island world, scroll + drag, landmarks per project, day/night, toon + outline + bloom. Toggle to commit-city skyline. Static illustrated fallback on weak devices. |
| 6 | Route, Module 05 | A06 | Hand-drawn path Fremont to college TBD, moving dot, ticking coords, compass, milestone timeline, building-log commit days. |
| 7 | Imagery | A07 | 8 generative artworks, masonry, hover distortion, lightbox. |
| 8 | Quote | A08 | One huge line, glitch/stretch that resolves on scroll. |
| 9 | Contact + footer | A09 | "Let's build something", magnetic button, validated form, socials (TODO), status strip, last commit line, rocket back-to-top, konami confetti. |

Global: overlay menu (Home, Work, About, Universe, Contact), cursor, progress ring, sound toggle (default OFF), theme toggle, section ID codes in HUD labels, page transitions.

## 7. Asset generation plan (no assets exist, everything is code)

All generators live in `scripts/` and write into `public/`. `npm run assets` regenerates images, `npm run videos` regenerates clips, `npm run refresh:github` regenerates `data/github.json`.

| Output | Generator | Notes |
|---|---|---|
| favicon.svg, icons/*.png (16/32/180/192/512), manifest | `scripts/generate-assets.mjs` | star mark, sharp for PNG |
| og.png 1200x630 | same | cream paper, name, star, grain |
| textures: grain, fibers, noise tiles | same | PNG/WebP in `public/textures/` |
| 8 artworks `public/art/art-01..08.webp` + `.svg` sources | `scripts/art/*.mjs` called by generate-assets | flow field, grain gradient, ink-wash landscape, constellation map, circuit botanical, paper-cut layers, etc. Seeded RNG so builds are reproducible. |
| Reel `public/video/reel.mp4/.webm/-poster.webp` (10-20s loop) | `scripts/render-videos.mjs` | headless Chrome (playwright, system Chrome) frame-captures `scripts/video-scenes/*.html`, ffmpeg encodes. Each file < ~3MB. |
| Teasers `teaser-lexia`, `teaser-findr`, `teaser-roommap` (.mp4 .webm -poster.webp) | same | 4-6s loops |
| Sounds | runtime Web Audio in `src/lib/audio.ts` | no files |

Fonts: self-hosted variable via `scripts/copy-fonts.mjs` (runs automatically on dev/build).

## 8. Quality bar (non-negotiable)

60fps on MacBook Air and a mid phone. DPR ≤ 2. Lazy WebGL. Pause offscreen + hidden tab. Preloaded critical fonts. No layout shift (reserve every box, aspect-ratio on media, fixed heights for skeletons). Reduced motion respected. Keyboard navigable, visible focus. AA contrast in both themes. Alt text, semantic HTML, core content visible without JS. Lighthouse ≥ 90 perf/a11y/SEO. Responsive 360px to ultrawide, mobile gets purpose-built interactions (tap/swipe versions, not shrunken desktop). Meta, OG image, sitemap, robots, JSON-LD.

## 9. Engineering contracts and file ownership

Stack: Next 16 App Router, TS strict, Tailwind v4 (`@theme`, utilities like `text-(--accent-ink)`), GSAP + ScrollTrigger (import ONLY from `@/lib/gsap`), Lenis (provider in `chrome/Providers.tsx`), R3F v9 + drei + postprocessing, Framer Motion for UI transitions, Web Audio for sound. Path aliases `@/*` to `src/*`, `@data/*` to `data/*`.

Shared files written by the lead, **read-only for agents** unless noted: `src/app/layout.tsx`, `src/app/page.tsx`, `src/lib/{gsap,motion,hooks,site}.ts`, `src/lib/github/types.ts`, `src/components/ui/Section.tsx`, `src/components/chrome/Providers.tsx`, `docs/DESIGN.md`. If you need a change to a shared file, put the exact request in your final report. Exception: you may append (never rewrite) to `src/app/globals.css` inside a clearly commented block named for your area, and add to `src/lib/site.ts` only inside a block you own.

| Agent | Owns (create/modify freely) |
|---|---|
| A chrome + UI kit + contact + quote | `src/components/chrome/*` (except Providers.tsx), `src/components/ui/*` (except Section.tsx), `src/components/contact/*`, `src/components/quote/*`, `src/app/not-found.tsx`, `src/app/work/layout.tsx` is NOT yours |
| B loader + hero | `src/components/loader/*`, `src/components/hero/*`, `src/shaders/*` |
| C illustration + art | `src/components/about/*`, `src/components/disciplines/*`, `src/components/imagery/*`, `scripts/generate-assets.mjs`, `scripts/art/*`, `public/{art,textures,icons}/*`, `public/{favicon.svg,og.png,manifest.webmanifest}` |
| D universe | `src/components/universe/*` |
| E works + case studies | `src/components/works/*`, `src/app/work/**`, `src/lib/projects.ts` |
| F video + audio | `scripts/render-videos.mjs`, `scripts/video-scenes/*`, `public/video/*`, `src/lib/audio.ts` |
| G github + route | `src/lib/github/*` (except types.ts), `src/app/api/github/*`, `scripts/refresh-github.mjs`, `data/github.json`, `src/components/github/*`, `src/components/route/*` |
| Lead | everything else, merging, builds, screenshots, QA, README, sitemap, robots |

Hard rules for agents:
1. Do NOT run `next build` or `next dev` (they share `.next`). Typecheck with `npx tsc --noEmit --incremental false 2>&1 | grep -E "<your paths>"`. Other agents' WIP errors are not yours.
2. Do NOT `npm install` anything. All deps already installed (three, @react-three/*, postprocessing, framer-motion, gsap, lenis, sharp, playwright, server-only). Sandbox note: if you must call npm use `NPM_CONFIG_CACHE=$TMPDIR/npm-cache`.
3. Keep exported component names and props exactly as the stubs in `src/components/*` (page.tsx imports them).
4. Server vs client: sections that animate are `'use client'`. Data fetching stays server-side (page.tsx passes props down).
5. Heavy WebGL: `next/dynamic(..., { ssr: false })`, mount only when `useCapability().tier !== 'none'` and in view. Provide a static fallback.
6. Every animation: provide a `useReducedMotion()` branch.
7. Colors only via CSS vars. No hardcoded hexes in components (WebGL uniforms read the vars via `getComputedStyle` or take a palette object from the raw constants).
8. Use `<Section>` + `<SectionHead>` from `@/components/ui/Section`. IDs and codes come from `SECTIONS` in `site.ts`.
9. Copy follows section 1. Unknown facts become `TODO:` markers.
10. Final report: files created, public API, anything you need from another agent, TODOs you left. Under 200 words.

Cross-agent file names (agree by convention):
- Videos: `/video/reel.{mp4,webm}`, `/video/reel-poster.webp`, `/video/teaser-{lexia,findr,roommap}.{mp4,webm}`, `/video/teaser-{slug}-poster.webp`.
- Art: `/art/art-01.webp` to `/art/art-08.webp` (+ `.svg` sources where vector).
- Icons: `/favicon.svg`, `/icons/icon-32.png`, `/icons/apple-touch-icon.png`, `/og.png`, `/manifest.webmanifest`.
- Project slugs: `lexia`, `findr`, `mediscan`, `hecate`, `steal-a-huss`, `conrad-challenge`, `roommap`.
- Audio: import `{ sfx, useSound, audio }` from `@/lib/audio`.
- Stars: `Star` component from `@/components/ui/Star` (A). Until it exists, agents inline their own tiny SVG star.
- Theme: `data-theme` on `<html>`, localStorage key `nv-theme`. Toggle lives in chrome. Universe has its own day/night that may sync but is independent.
