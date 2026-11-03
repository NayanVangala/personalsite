# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Four audiences, all deciding whether Nayan builds real things and is worth talking to:
- College admissions reviewers skimming for proof of real building.
- Hack Club and hackathon community: peers, organizers, Stardance people.
- Recruiters and internship hosts scanning projects and stack.
- Collaborators in AI and hardware who might reach out or team up.

## Product Purpose

Personal portfolio of Nayan Vangala, a high school student in Fremont, CA who builds AI and hardware and is a Hack Club Stardance Ambassador. It shows the seven projects, the person behind them, and live GitHub activity. Success is a visitor sending a message through the contact form.

## Positioning

A teenager's portfolio that is itself built like a project: live GitHub data, generated art, a small 3D world, procedural motion. The work and the voice are first person and funny, not a LinkedIn résumé.

## Operating Context

Visited cold from a link: an application, a hackathon page, a recruiter email, a social bio. Visitors skim fast and may be on phones. Content must read without JavaScript. Live data comes from the owner's GitHub account (`GITHUB_USERNAME`, `GITHUB_TOKEN` in `.env.local`), with snapshot and sample fallbacks.

## Capabilities and Constraints

- Next.js App Router, TypeScript, Tailwind v4, GSAP, R3F. Deploy target: Vercel (free `*.vercel.app` URL for now).
- Sections: loader, hero, about, work (7 case-study pages), disciplines, GitHub pulse, universe, route, imagery, quote, contact.
- Projects (the only facts we have): Lexia (real-time reading assistant on smart glasses + Raspberry Pi), Findr (AI memory assistant on Meta Ray-Ban glasses, built at MarinHacks), MediScan (first Stardance project), Hecate (AI wearable trust/permissions layer, hackathon), Steal a Huss (Roblox game), Conrad Challenge (post-quantum encryption for satellites, team of 4), Roommap (3D web map of people met at networking events).
- Undecided and shown as visible `TODO:` markers: contact email, social URLs, project links, dates, results, metrics, college destination.
- Performance bar: 60fps on MacBook Air and a mid phone, Lighthouse 90+.

## Brand Commitments

- Name: Nayan Vangala. No third-party logos or marks; not affiliated with anyone.
- Voice: casual, clipped, funny, direct, first person. No em-dashes, no buzzwords, no lorem ipsum.
- The hand-drawn radiating star is the personal mark, used sparingly.

## Evidence on Hand

- Public GitHub repos with real commit data (`data/github.json` is a snapshot or sample until a token is set).
- Owner will supply project demos, screenshots and videos for the seven projects.
- Owner will supply awards and hackathon results. None are recorded yet; never invent awards, numbers, press, or testimonials.

## Product Principles

1. Proof over polish: every claim points to something real, or is a visible TODO.
2. The site is itself a demo of what Nayan builds.
3. One clear action: contact. Everything else supports trust in that message.
4. Personality is the differentiator, but it never blocks skimming.
5. Fast and accessible on a phone before it is impressive on a desktop.

## Accessibility & Inclusion

Keyboard navigable with visible focus, AA contrast in both themes, reduced-motion respected, semantic HTML, alt text, core content visible without JS.
