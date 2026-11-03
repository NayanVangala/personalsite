// 01 Flow field. Evenly spaced curl-noise streamlines (Jobard-Lefer) circling a clay sun-star.
import { C, makeNoise, smoothstep, svgDoc, inkFilter, paperBase, finishLayer, starPath, handCircle, smooth, n1, TAU } from './lib.mjs';

export default function art01(rng, { w, h }) {
  const noise = makeNoise(rng.fork('field'));
  const fx = w * 0.56, fy = h * 0.4;
  const R0 = w * 0.118; // void radius, the sun lives here

  // stream function. velocity = curl(psi). Wind blowing up and to the right, bending around the sun
  // (potential flow past a cylinder, plus a little circulation) with soft noise on top so it never feels ruled.
  const th = -0.42; // flow direction, radians
  const cth = Math.cos(th), sth = Math.sin(th);
  const psi = (x, y) => {
    const dx = x - fx, dy = y - fy;
    const along = dx * cth + dy * sth;
    const across = -dx * sth + dy * cth;
    const r2 = Math.max(dx * dx + dy * dy, R0 * R0 * 0.5);
    const cyl = across * (1 - (R0 * R0) / r2);
    const swirl = 0.55 * R0 * Math.log(Math.sqrt(r2) / R0);
    return cyl + swirl * 1.0 + 230 * noise.fbm(x * 0.0013 + 3.1, y * 0.0013 + 7.7, 3, 0.5);
  };
  const E = 1.5;
  const vel = (x, y) => {
    const vx = (psi(x, y + E) - psi(x, y - E)) / (2 * E);
    const vy = -(psi(x + E, y) - psi(x - E, y)) / (2 * E);
    const m = Math.hypot(vx, vy) || 1;
    return [vx / m, vy / m];
  };

  // ---- evenly spaced streamlines
  const dsep = 15, dtest = dsep * 0.56, ds = 3;
  const cell = dsep;
  const gw = Math.ceil(w / cell) + 3, gh = Math.ceil(h / cell) + 3;
  const grid = Array.from({ length: gw * gh }, () => []);
  const px = [], py = [], owner = [], idxIn = [];
  const cidx = (x, y) => (Math.floor(y / cell) + 1) * gw + Math.floor(x / cell) + 1;
  const MARG = 10;
  const inBounds = (x, y) => x > -MARG && x < w + MARG && y > -MARG && y < h + MARG;

  const near = (x, y, d, who, k) => {
    const cx = Math.floor(x / cell) + 1, cy = Math.floor(y / cell) + 1;
    const d2 = d * d;
    for (let j = cy - 1; j <= cy + 1; j++) {
      if (j < 0 || j >= gh) continue;
      for (let i = cx - 1; i <= cx + 1; i++) {
        if (i < 0 || i >= gw) continue;
        const arr = grid[j * gw + i];
        for (let m = 0; m < arr.length; m++) {
          const p = arr[m];
          if (owner[p] === who && Math.abs(idxIn[p] - k) < 28) continue; // skip my own recent trail
          const ddx = px[p] - x, ddy = py[p] - y;
          if (ddx * ddx + ddy * ddy < d2) return true;
        }
      }
    }
    return false;
  };

  const lines = [];
  const queue = [];
  const addPoint = (x, y, who, k) => {
    const id = px.length;
    px.push(x); py.push(y); owner.push(who); idxIn.push(k);
    if (x > -cell && x < w + cell && y > -cell && y < h + cell) grid[cidx(x, y)].push(id);
  };

  const trace = (x0, y0, who, dir, kStart) => {
    const pts = [];
    let x = x0, y = y0, k = kStart;
    for (let step = 0; step < 900; step++) {
      const [ax, ay] = vel(x, y);
      const [bx, by] = vel(x + ax * ds * 0.5 * dir, y + ay * ds * 0.5 * dir);
      x += bx * ds * dir; y += by * ds * dir;
      k += dir;
      if (!inBounds(x, y)) { pts.push([x, y]); break; }
      if (Math.hypot(x - fx, y - fy) < R0) break;
      if (near(x, y, dtest, who, k)) break;
      pts.push([x, y]);
      addPoint(x, y, who, k);
    }
    return pts;
  };

  const trySeed = (x, y) => {
    if (!inBounds(x, y) || Math.hypot(x - fx, y - fy) < R0 + dsep * 0.6) return;
    if (near(x, y, dsep, -1, 0)) return;
    const who = lines.length;
    addPoint(x, y, who, 0);
    const fwd = trace(x, y, who, 1, 0);
    const back = trace(x, y, who, -1, 0);
    const pts = [...back.reverse(), [x, y], ...fwd];
    if (pts.length < 9) return;
    lines.push({ pts, x0: x, y0: y });
    for (let i = 3; i < pts.length - 3; i += 4) {
      const [ax, ay] = vel(pts[i][0], pts[i][1]);
      queue.push([pts[i][0] - ay * dsep, pts[i][1] + ax * dsep]);
      queue.push([pts[i][0] + ay * dsep, pts[i][1] - ax * dsep]);
    }
  };

  // seeds: a ring hugging the void, then scattered
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU;
    queue.push([fx + Math.cos(a) * (R0 + dsep), fy + Math.sin(a) * (R0 + dsep)]);
  }
  for (let i = 0; i < 16; i++) queue.push([rng.range(0, w), rng.range(0, h)]);
  while (queue.length) {
    const j = Math.floor(rng() * Math.min(queue.length, 40)); // semi-random pop keeps growth organic
    const q = queue.splice(queue.length - 1 - j, 1)[0];
    trySeed(q[0], q[1]);
  }

  // ---- colour + width buckets. Lines that pass closest to the sun run warm and heavy, the rest are quiet ink.
  const buckets = new Map();
  const add = (key, color, sw, op, pts) => {
    if (!buckets.has(key)) buckets.set(key, { color, sw, op, d: '' });
    const dec = [];
    for (let i = 0; i < pts.length; i += 2) dec.push(pts[i]);
    if (dec[dec.length - 1] !== pts[pts.length - 1]) dec.push(pts[pts.length - 1]);
    let lx = Math.round(dec[0][0] * 10) / 10, ly = Math.round(dec[0][1] * 10) / 10;
    let d = `M${n1(lx)} ${n1(ly)}l`;
    for (let i = 1; i < dec.length; i++) {
      const nx = Math.round(dec[i][0] * 10) / 10, ny = Math.round(dec[i][1] * 10) / 10;
      d += `${n1(nx - lx)} ${n1(ny - ly)} `;
      lx = nx; ly = ny;
    }
    buckets.get(key).d += d.trimEnd();
  };

  const cr = rng.fork('color');
  for (const L of lines) {
    let dmin = 1e9;
    for (let i = 0; i < L.pts.length; i += 3) dmin = Math.min(dmin, Math.hypot(L.pts[i][0] - fx, L.pts[i][1] - fy));
    const heat = smoothstep(R0 * 4.6, R0 * 1.15, dmin); // 1 next to the sun
    const u = noise(L.x0 * 0.0027 + 40, L.y0 * 0.0027);
    const r = cr();
    if (r < heat * 0.82) add(r < heat * 0.34 ? 'clayB' : 'clay', C.clay, r < heat * 0.34 ? 3 : 2, 0.95, L.pts);
    else if (r < heat * 1.0) add('coral', C.coral, 2, 0.92, L.pts);
    else if (dmin < R0 * 3.2 && cr() < 0.06) add('hl', C.hl, 2.2, 1, L.pts);
    else if (u > 0.22 && cr() < 0.3) add('sky', C.skyDeep, 1.4, 0.85, L.pts);
    else if (u < -0.22 && cr() < 0.22) add('moss', C.moss, 1.3, 0.8, L.pts);
    else add(cr() < 0.7 ? 'ink0' : 'ink1', C.ink, cr() < 0.5 ? 1.15 : 1.8, 0.85, L.pts);
  }
  const order = ['sky', 'moss', 'ink0', 'ink1', 'coral', 'clay', 'hl', 'clayB'];
  let flow = '';
  for (const k of order) {
    const b = buckets.get(k);
    if (b) flow += `<path d="${b.d}" fill="none" stroke="${b.color}" stroke-width="${b.sw}" stroke-opacity="${b.op}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  // ---- the sun in the void: clay disc, grain-shaded toward the rim, paper star
  const sr = rng.fork('sun');
  const rd = R0 * 0.9;
  let paperDots = '';
  let darkDots = '';
  for (let i = 0; i < 5200; i++) {
    const a = sr() * TAU, rr = Math.sqrt(sr()) * rd;
    const x = fx + Math.cos(a) * rr, y = fy + Math.sin(a) * rr;
    const lit = ((x - fx) * -0.62 + (y - fy) * -0.78) / rd; // 1 toward upper left
    const shade = smoothstep(0.1, -1.0, lit) * smoothstep(0.35, 1, rr / rd);
    if (sr() < shade * 0.55) darkDots += `M${n1(x)} ${n1(y)}h.1`;
    else if (sr() < smoothstep(0.2, 1, lit) * 0.1) paperDots += `M${n1(x)} ${n1(y)}h.1`;
  }
  const ring = smooth(handCircle(sr, fx, fy, R0 * 0.99, 1.4, 64), true);
  const ring2 = smooth(handCircle(sr, fx, fy, R0 * 1.12, 1.8, 72), true);
  const star = starPath(sr, fx, fy, rd * 0.66, { rays: 10, w: 0.2, inner: 0.05 });

  const paper = paperBase(w, h, { seed: 5, mottle: 0.2, fibers: 0.3 });
  const fin = finishLayer(w, h, { grain: 0.13, light: 0.0, vignette: 0.07 });
  const defs =
    inkFilter('ink', { scale: 2.2, freq: 0.06, seed: 4, blur: 0.35 }) +
    `<radialGradient id="sun" cx="36%" cy="32%" r="85%"><stop offset="0" stop-color="${C.coral}"/><stop offset=".55" stop-color="${C.clay}"/><stop offset="1" stop-color="#C4603F"/></radialGradient>` +
    paper.defs + fin.defs;

  const body =
    paper.body +
    `<g filter="url(#ink)">${flow}</g>` +
    `<g filter="url(#ink)">` +
    `<circle cx="${n1(fx)}" cy="${n1(fy)}" r="${n1(R0 * 1.0)}" fill="${C.paper}"/>` +
    `<circle cx="${n1(fx)}" cy="${n1(fy)}" r="${n1(rd)}" fill="url(#sun)"/>` +
    `<path d="${darkDots}" stroke="${C.clayDeep}" stroke-opacity=".7" stroke-width="2" stroke-linecap="round"/>` +
    `<path d="${paperDots}" stroke="${C.hl}" stroke-opacity=".8" stroke-width="2" stroke-linecap="round"/>` +
    `<path d="${star}" fill="${C.paper}" opacity=".96"/>` +
    `<path d="${ring}" fill="none" stroke="${C.ink}" stroke-width="1.8" stroke-linecap="round"/>` +
    `<path d="${ring2}" fill="none" stroke="${C.ink}" stroke-opacity=".5" stroke-width="1" stroke-dasharray="2 7" stroke-linecap="round"/>` +
    `</g>` +
    `<g font-family="JetBrains Mono, Menlo, Consolas, monospace" font-size="13" letter-spacing="2.2" fill="${C.ink}" fill-opacity=".72">` +
    `<text x="36" y="${h - 34}">NV-ID-I01</text><text x="${w - 36}" y="${h - 34}" text-anchor="end">CURL NOISE / SEED ${rng.seed}</text></g>` +
    fin.body;
  return svgDoc(w, h, body, defs);
}
