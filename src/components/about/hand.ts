// Tiny hand-drawn path helpers. Seeded so server and client render identical markup.
export type P = [number, number];

/** mulberry32 */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** one decimal, stable across engines */
export const f = (n: number) => String(Math.round(n * 10) / 10);

function jitter(pts: P[], seed: number, j: number): P[] {
  const r = rng(seed);
  return pts.map(([x, y]) => [x + (r() - 0.5) * 2 * j, y + (r() - 0.5) * 2 * j] as P);
}

/** Catmull-Rom through points, as cubic Beziers */
export function smoothPath(p: P[], closed: boolean): string {
  const n = p.length;
  const at = (i: number) => (closed ? p[(i + n * 4) % n] : p[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${f(p[0][0])} ${f(p[0][1])}`;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + (closed ? 'Z' : '');
}

/** wobbly smooth path: vertices get a little jitter, like a hand that is not a plotter */
export function wob(pts: P[], seed: number, j = 1, closed = true): string {
  return smoothPath(jitter(pts, seed, j), closed);
}

/** wobbly straight-segment path (spikes, hair, paper corners) */
export function poly(pts: P[], seed: number, j = 1, closed = true): string {
  const p = jitter(pts, seed, j);
  return `M${p.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}${closed ? 'Z' : ''}`;
}

export function ellPts(cx: number, cy: number, rx: number, ry: number, n = 8, rot = 0): P[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + rot;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] as P;
  });
}

/** zigzag silhouette between two angles (radians, SVG space, top is -PI/2) */
export function spikes(cx: number, cy: number, rx: number, ry: number, n: number, amp: number, seed: number, a0: number, a1: number): P[] {
  const r = rng(seed);
  const out: P[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    const k = i % 2 === 0 ? 1 + (amp / 100) * (0.6 + r() * 0.8) : 1 - (amp / 100) * 0.15 * r();
    out.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return out;
}

/** slowly breathing blob, used for the animated backdrop */
export function blobPath(cx: number, cy: number, r: number, t: number, seed: number, n = 9): string {
  const pts: P[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + 0.075 * Math.sin(t * 0.5 + i * 1.7 + seed) + 0.045 * Math.sin(t * 0.33 + i * 2.9 + seed * 2.3);
    pts.push([cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k * 0.97]);
  }
  return smoothPath(pts, true);
}

/** hand-drawn arrow: a bowed curve plus a loose arrowhead */
export function arrow(ax: number, ay: number, cx: number, cy: number, bx: number, by: number, seed: number): string {
  const r = rng(seed);
  const jx = (r() - 0.5) * 3, jy = (r() - 0.5) * 3;
  const ang = Math.atan2(by - cy, bx - cx);
  const hl = 9;
  const h1: P = [bx - Math.cos(ang - 0.5) * hl, by - Math.sin(ang - 0.5) * hl];
  const h2: P = [bx - Math.cos(ang + 0.5) * hl * 0.9, by - Math.sin(ang + 0.5) * hl * 0.9];
  return `M${f(ax)} ${f(ay)}Q${f(cx + jx)} ${f(cy + jy)} ${f(bx)} ${f(by)}M${f(h1[0])} ${f(h1[1])}L${f(bx)} ${f(by)}L${f(h2[0])} ${f(h2[1])}`;
}
