// Shared helpers for the generated artworks and icons. Pure ESM, no dependencies.
// Everything is seeded so `npm run assets` is reproducible byte for byte.
import zlib from 'node:zlib';

/** Raw palette (docs/DESIGN.md). Illustrations use the fixed light-theme hues. */
export const C = {
  paper: '#F4EFE6',
  paper2: '#EBE3D4',
  paper3: '#E0D6C3',
  ink: '#1F1A17',
  inkSoft: '#3A312B',
  clay: '#D97757',
  clayDeep: '#A4452B',
  coral: '#E8896B',
  sand: '#C9B79C',
  sandDeep: '#A8926F',
  moss: '#6B7B5E',
  mossDeep: '#4D5B42',
  sky: '#A9C4D6',
  skyDeep: '#7D9FB5',
  hl: '#F2C14E',
};

/* ------------------------------------------------------------------ rng */

function hashStr(seed, label) {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  for (let i = 0; i < label.length; i++) h = Math.imul(h ^ label.charCodeAt(i), 0x85ebca6b) >>> 0;
  return (h ^ (h >>> 13)) >>> 0;
}

/** mulberry32 with a friendly surface. */
export function makeRng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const r = () => next();
  r.range = (lo, hi) => lo + (hi - lo) * next();
  r.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * next()); // inclusive
  r.pick = (arr) => arr[Math.floor(next() * arr.length)];
  r.chance = (p) => next() < p;
  r.sign = () => (next() < 0.5 ? -1 : 1);
  r.gauss = () => {
    let u = 0, v = 0;
    while (!u) u = next();
    while (!v) v = next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  r.shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  r.fork = (label) => makeRng(hashStr(seed, label));
  r.seed = seed;
  return r;
}

/* ------------------------------------------------------------------ noise */

/** 2D gradient noise in about [-1, 1]. Pass `period` (lattice units, power of two friendly) for a tileable field. */
export function makeNoise(rng) {
  const perm = new Uint8Array(256);
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  const gx = new Float32Array(256);
  const gy = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const a = rng() * Math.PI * 2;
    gx[i] = Math.cos(a);
    gy[i] = Math.sin(a);
  }
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const wrap = (i, p) => (p ? ((i % p) + p) % p : i);

  function noise(x, y, per = 0) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const x0 = wrap(xi, per) & 255, x1 = wrap(xi + 1, per) & 255;
    const y0 = wrap(yi, per) & 255, y1 = wrap(yi + 1, per) & 255;
    const g = (ix, iy) => perm[(perm[ix] + iy) & 255];
    const h00 = g(x0, y0), h10 = g(x1, y0), h01 = g(x0, y1), h11 = g(x1, y1);
    const d00 = gx[h00] * xf + gy[h00] * yf;
    const d10 = gx[h10] * (xf - 1) + gy[h10] * yf;
    const d01 = gx[h01] * xf + gy[h01] * (yf - 1);
    const d11 = gx[h11] * (xf - 1) + gy[h11] * (yf - 1);
    const u = fade(xf), v = fade(yf);
    const a = d00 + (d10 - d00) * u;
    const b = d01 + (d11 - d01) * u;
    return (a + (b - a) * v) * 1.41;
  }
  noise.fbm = (x, y, oct = 4, gain = 0.5, per = 0) => {
    let s = 0, amp = 1, f = 1, norm = 0;
    for (let i = 0; i < oct; i++) {
      s += amp * noise(x * f, y * f, per ? per * f : 0);
      norm += amp;
      amp *= gain;
      f *= 2;
    }
    return s / norm;
  };
  noise.ridged = (x, y, oct = 4, gain = 0.5) => {
    let s = 0, amp = 1, f = 1, norm = 0;
    for (let i = 0; i < oct; i++) {
      const n = 1 - Math.abs(noise(x * f, y * f));
      s += amp * n * n;
      norm += amp;
      amp *= gain;
      f *= 2;
    }
    return s / norm;
  };
  return noise;
}

/* ------------------------------------------------------------------ math */

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const TAU = Math.PI * 2;

/** Short number formatting for path data. */
export const n1 = (v) => {
  const s = (Math.round(v * 10) / 10).toString();
  return s === '-0' ? '0' : s;
};
export const n2 = (v) => {
  const s = (Math.round(v * 100) / 100).toString();
  return s === '-0' ? '0' : s;
};

/** "#rrggbb" mixed with another by t. */
export function mix(a, b, t) {
  const pa = hexRgb(a), pb = hexRgb(b);
  return rgbHex([0, 1, 2].map((i) => pa[i] + (pb[i] - pa[i]) * t));
}
export function hexRgb(h) {
  const v = parseInt(h.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
export function rgbHex(rgb) {
  return '#' + rgb.map((c) => Math.round(clamp(c, 0, 255)).toString(16).padStart(2, '0')).join('');
}

/* ------------------------------------------------------------------ paths */

/** Plain polyline path data. */
export function poly(pts, closed = false) {
  if (!pts.length) return '';
  let d = `M${n1(pts[0][0])} ${n1(pts[0][1])}L`;
  for (let i = 1; i < pts.length; i++) d += `${n1(pts[i][0])} ${n1(pts[i][1])} `;
  return d.trimEnd() + (closed ? 'Z' : '');
}

/** Catmull-Rom spline through the points, written as cubic beziers. */
export function smooth(pts, closed = false, dec = 1) {
  const f = dec === 2 ? n2 : n1;
  const n = pts.length;
  if (n < 3) return poly(pts, closed);
  const P = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + (closed ? 'Z' : '');
}

/** A slightly shaky line between two points. Returns points, feed to smooth(). */
export function handLine(rng, a, b, wob = 1.4, step = 36) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const segs = Math.max(2, Math.round(len / step));
  const nx = -(b[1] - a[1]) / (len || 1), ny = (b[0] - a[0]) / (len || 1);
  const pts = [];
  let off = 0;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    off = off * 0.55 + rng.gauss() * wob * 0.7;
    const edge = i === 0 || i === segs ? 0.35 : 1;
    pts.push([lerp(a[0], b[0], t) + nx * off * edge, lerp(a[1], b[1], t) + ny * off * edge]);
  }
  return pts;
}

/** Wobbled circle points. */
export function handCircle(rng, cx, cy, r, wob = 1.2, nPts = 0) {
  const n = nPts || Math.max(10, Math.round(r / 5));
  const ph = rng() * TAU;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const rr = r + Math.sin(a * 2 + ph) * wob * 0.5 + rng.gauss() * wob * 0.35;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return pts;
}

/** Tapered, round-tipped ray as a closed path. ang in radians, r0 inner radius, r1 tip radius, w base width. */
export function rayPath(cx, cy, ang, r0, r1, w, { bend = 0, blunt = 0.35 } = {}) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const T = (x, y) => [cx + x * ca - y * sa, cy + x * sa + y * ca];
  const L = r1 - r0;
  const tip = T(r1, bend * L);
  const pts = [
    T(r0, -w / 2),
    T(r0 + L * 0.5, -w * 0.4 + bend * L * 0.35),
    T(r1 - w * blunt, -w * 0.2 + bend * L * 0.9),
    tip,
    T(r1 - w * blunt, w * 0.2 + bend * L * 0.9),
    T(r0 + L * 0.5, w * 0.4 + bend * L * 0.35),
    T(r0, w / 2),
  ];
  const [a, b, c, d, e, f, g] = pts;
  return `M${n1(a[0])} ${n1(a[1])}C${n1(b[0])} ${n1(b[1])} ${n1(c[0])} ${n1(c[1])} ${n1(d[0])} ${n1(d[1])}C${n1(e[0])} ${n1(e[1])} ${n1(f[0])} ${n1(f[1])} ${n1(g[0])} ${n1(g[1])}Z`;
}

/**
 * The star. A hand-drawn radiating asterisk: n tapered rays of uneven length, tiny angle jitter.
 * Returns one path string (fill it).
 */
export function starPath(rng, cx, cy, R, { rays = 10, w = 0.2, inner = 0.04, lenVar = 0.22, jitter = 0.07, bend = 0.03 } = {}) {
  let d = '';
  const phase = -Math.PI / 2 + rng.range(-0.1, 0.1);
  for (let i = 0; i < rays; i++) {
    const a = phase + (i / rays) * TAU + rng.range(-jitter, jitter);
    const len = R * (1 - lenVar * (i % 2 ? rng.range(0.4, 1) : rng.range(0, 0.45)));
    d += rayPath(cx, cy, a, R * inner, len, R * w * rng.range(0.85, 1.12), { bend: rng.range(-bend, bend) });
  }
  return d;
}

/** Stroked variant for tiny icons: round caps, slightly curved. Use stroke + stroke-linecap round. */
export function starStrokes(rng, cx, cy, R, { rays = 8, lenVar = 0.18, inner = 0.12, jitter = 0.06 } = {}) {
  let d = '';
  const phase = -Math.PI / 2 + rng.range(-0.06, 0.06);
  for (let i = 0; i < rays; i++) {
    const a = phase + (i / rays) * TAU + rng.range(-jitter, jitter);
    const len = R * (1 - lenVar * (i % 2 ? rng.range(0.5, 1) : rng.range(0, 0.4)));
    const r0 = R * inner;
    const ca = Math.cos(a), sa = Math.sin(a);
    const bend = rng.range(-0.05, 0.05) * len;
    const mx = cx + ca * (r0 + len) * 0.5 - sa * bend, my = cy + sa * (r0 + len) * 0.5 + ca * bend;
    d += `M${n1(cx + ca * r0)} ${n1(cy + sa * r0)}Q${n1(mx)} ${n1(my)} ${n1(cx + ca * len)} ${n1(cy + sa * len)}`;
  }
  return d;
}

/* ------------------------------------------------------------------ svg + filters */

export const svgDoc = (w, h, body, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${defs ? `<defs>${defs}</defs>` : ''}${body}</svg>`;

/** Ink-bleed: displace the edges a touch, soften, then re-harden so strokes feel like wet ink on paper. */
export const inkFilter = (id = 'ink', { scale = 2.4, freq = 0.05, seed = 3, blur = 0.4, oct = 2 } = {}) =>
  `<filter id="${id}" x="-3%" y="-3%" width="106%" height="106%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="${oct}" seed="${seed}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${scale}" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="${blur}" result="b"/><feComponentTransfer in="b"><feFuncA type="linear" slope="1.8" intercept="-0.3"/></feComponentTransfer></filter>`;

/** Soft paper: warm low-frequency mottling plus a whisper of horizontal fibers. Returns {defs, body}. */
export function paperBase(w, h, { color = C.paper, mottle = 0.55, fibers = 0.5, seed = 11, tint = null } = {}) {
  const defs =
    `<filter id="pm" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.0032 0.0046" numOctaves="4" seed="${seed}"/><feColorMatrix values="0 0 0 0 0.62  0 0 0 0 0.5  0 0 0 0 0.36  1.7 0 0 0 -0.62"/></filter>` +
    `<filter id="pf" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.006 0.55" numOctaves="2" seed="${seed + 5}"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.34  0 0 0 0 0.24  1.9 0 0 0 -0.95"/></filter>`;
  const body =
    `<rect width="${w}" height="${h}" fill="${color}"/>` +
    (tint ? `<rect width="${w}" height="${h}" fill="${tint}"/>` : '') +
    `<rect width="${w}" height="${h}" filter="url(#pm)" opacity="${mottle}"/>` +
    `<rect width="${w}" height="${h}" filter="url(#pf)" opacity="${fibers * 0.45}"/>`;
  return { defs, body };
}

/** Final pass: paper grain (dark + light specks) and a soft print vignette. Append last. */
export function finishLayer(w, h, { grain = 0.4, light = 0.35, vignette = 0.14, seed = 21 } = {}) {
  const defs =
    `<filter id="gd" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="2" seed="${seed}" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.12  0 0 0 0 0.09  0 0 0 0 0.07  2.4 0 0 0 -1.12"/></filter>` +
    `<filter id="gl" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="2" seed="${seed + 9}" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 0.98  0 0 0 0 0.93  -2.4 0 0 0 1.2"/></filter>` +
    `<radialGradient id="vg" cx="50%" cy="48%" r="75%"><stop offset="0.55" stop-color="#3a2410" stop-opacity="0"/><stop offset="1" stop-color="#3a2410" stop-opacity="${vignette}"/></radialGradient>`;
  const body =
    `<rect width="${w}" height="${h}" fill="url(#vg)"/>` +
    `<rect width="${w}" height="${h}" filter="url(#gl)" opacity="${light}"/>` +
    `<rect width="${w}" height="${h}" filter="url(#gd)" opacity="${grain}"/>`;
  return { defs, body };
}

/* ------------------------------------------------------------------ png data uri (no deps) */

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/** Encode raw RGBA (w*h*4) as a PNG buffer. */
export function encodePng(w, h, rgba) {
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
export const pngDataUri = (w, h, rgba) => 'data:image/png;base64,' + encodePng(w, h, rgba).toString('base64');
