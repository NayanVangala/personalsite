// Motion language. See docs/DESIGN.md "Motion language".
// One vocabulary: three easings, four durations, one stagger rule. Do not invent new ones.

export const ease = {
  // GSAP strings
  out: 'expo.out', // arrivals, reveals, anything that "lands"
  inOut: 'power3.inOut', // wipes, transitions, scroll-linked scrubs
  spring: 'back.out(1.1)', // playful pops (stars, sparks, buttons), one soft settle, never bouncy
  // CSS / Framer Motion cubic-beziers (match globals.css vars)
  outBezier: [0.22, 1, 0.36, 1] as [number, number, number, number],
  inOutBezier: [0.65, 0, 0.35, 1] as [number, number, number, number],
  springBezier: [0.22, 1.1, 0.36, 1] as [number, number, number, number],
};

// seconds
export const dur = { fast: 0.18, base: 0.42, slow: 0.9, epic: 1.6 };

// Stagger rule: ~0.035s per letter, ~0.08s per word/line, ~0.1s per card. Cap total stagger at 0.9s.
export const stagger = { letter: 0.035, word: 0.08, item: 0.1, maxTotal: 0.9 };

export function staggerEach(count: number, per: number) {
  return Math.min(per, stagger.maxTotal / Math.max(1, count - 1));
}

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const mapRange = (v: number, a: number, b: number, c: number, d: number) => c + ((v - a) / (b - a)) * (d - c);
