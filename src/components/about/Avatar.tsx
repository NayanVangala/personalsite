'use client';
// Layered, hand-drawn SVG self-portrait. A stylized drawing, not a likeness.
// Static art is memoized React; every animated piece is tagged data-a="name" and driven by one rAF loop
// (createSim below). Layers: bg blob, wall, figure (torso, head, hood), desk, arms, items.
import { memo, useEffect, useId, useRef, type CSSProperties } from 'react';
import { useCoarsePointer, useInView, useMounted, usePageVisible, useReducedMotion } from '@/lib/hooks';
import { SITE } from '@/lib/site';
import { arrow, blobPath, ellPts, f, poly, rng, smoothPath, spikes, wob, type P } from './hand';

const W = 720;
const H = 760;

/* ------------------------------------------------------------------ css (scoped by .nvav) */

const CSS = `
.nvav{--ink:var(--c-ink);--paper:var(--c-paper);
--skin:color-mix(in srgb,var(--c-clay) 30%,var(--c-paper));
--skin2:color-mix(in srgb,var(--c-clay) 52%,var(--c-paper));
--hair:color-mix(in srgb,var(--c-ink) 82%,var(--c-clay));
--hood:var(--c-clay);
--hood2:color-mix(in srgb,var(--c-clay) 76%,var(--c-ink));
--hood3:color-mix(in srgb,var(--c-clay) 54%,var(--c-ink));
--deskc:color-mix(in srgb,var(--c-sand) 52%,var(--c-paper));
--scr:color-mix(in srgb,var(--c-ink) 88%,var(--c-sky));
--moss2:color-mix(in srgb,var(--c-moss) 68%,var(--c-ink));
--lid:color-mix(in srgb,var(--c-ink) 74%,var(--c-sand));
font-family:var(--font-mono)}
.nvav .ln{fill:none;stroke:var(--ink);stroke-linecap:round;stroke-linejoin:round}
.nvav .nf{fill:none}
.nvav .fs{fill:var(--skin)}.nvav .fs2{fill:var(--skin2)}.nvav .fh{fill:var(--hair)}
.nvav .fo{fill:var(--hood)}.nvav .fo2{fill:var(--hood2)}.nvav .fo3{fill:var(--hood3)}.nvav .fo4{fill:var(--c-coral)}
.nvav .fp{fill:var(--paper)}.nvav .fi{fill:var(--ink)}.nvav .fsand{fill:var(--c-sand)}.nvav .fdesk{fill:var(--deskc)}
.nvav .fmoss{fill:var(--c-moss)}.nvav .fmoss2{fill:var(--moss2)}.nvav .fhl{fill:var(--c-highlight)}.nvav .fsky{fill:var(--c-sky)}
.nvav .fcoral{fill:var(--c-coral)}.nvav .fscr{fill:var(--scr)}.nvav .flid{fill:var(--lid)}
.nvav .blobA{fill:var(--bg-2);stroke:var(--line-strong);stroke-width:1.6;stroke-dasharray:2 7;stroke-linecap:round}
.nvav .blobB{fill:var(--sand);opacity:.5}
.nvav .orbit{fill:none;stroke:var(--fg-muted);stroke-width:1.3;stroke-dasharray:1 8;stroke-linecap:round;opacity:.7}
.nvav .soft{stroke:var(--fg-muted);fill:none;stroke-linecap:round;stroke-linejoin:round}
.nvav .tx{font-size:9px;letter-spacing:.06em;fill:var(--ink)}
.nvav [data-a]{will-change:transform}
.nvav .sa{fill:var(--c-clay)}.nvav .sb{fill:var(--c-sky)}.nvav .sc{fill:var(--c-moss)}.nvav .sd{fill:var(--c-highlight)}.nvav .se{fill:var(--c-paper);opacity:.72}
`;

/* ------------------------------------------------------------------ small drawing helpers */

type SkProps = {
  pts: P[]; fill?: string; w?: number; seed: number; j?: number;
  sharp?: boolean; dbl?: boolean; closed?: boolean; stroke?: boolean;
};

/** One outlined shape: wobbly main stroke plus a thinner, looser second pass (sketchy double line). */
function Sk({ pts, fill, w = 3, seed, j = 1, sharp = false, dbl = true, closed = true, stroke = true }: SkProps) {
  const make = (s: number, jj: number) => (sharp ? poly(pts, s, jj, closed) : wob(pts, s, jj, closed));
  return (
    <>
      <path d={make(seed, j)} className={`${stroke ? 'ln' : 'nf'} ${fill ?? ''}`} strokeWidth={w} />
      {dbl && stroke && <path d={make(seed + 71, j * 1.6)} className="ln" strokeWidth={Math.max(0.8, w * 0.3)} opacity={0.42} />}
    </>
  );
}

const Ln = ({ d, w = 3, o = 1, dash, cls = 'ln' }: { d: string; w?: number; o?: number; dash?: string; cls?: string }) => (
  <path d={d} className={cls} strokeWidth={w} opacity={o} strokeDasharray={dash} />
);

/** point on a ray, used for asterisks and sparkles */
function Asterisk({ x, y, r, rays = 4, w = 2.6, cls = 'ln', o = 1 }: { x: number; y: number; r: number; rays?: number; w?: number; cls?: string; o?: number }) {
  let d = '';
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI;
    d += `M${f(x - Math.cos(a) * r)} ${f(y - Math.sin(a) * r)}L${f(x + Math.cos(a) * r)} ${f(y + Math.sin(a) * r)}`;
  }
  return <path d={d} className={cls} strokeWidth={w} opacity={o} />;
}

const org = (x: number, y: number): CSSProperties => ({ transformOrigin: `${x}px ${y}px` });

/* ------------------------------------------------------------------ static art */

const LENS: P[] = [[233, 256], [307, 256]];

// code lines on the laptop: [indent, [width, colorClass][]]
const CODE: [number, [number, string][]][] = [
  [0, [[26, 'sa'], [44, 'se']]],
  [8, [[18, 'sb'], [30, 'se'], [14, 'sd']]],
  [16, [[36, 'sc'], [24, 'se']]],
  [16, [[14, 'sa'], [46, 'se'], [12, 'sb']]],
  [8, [[22, 'sd'], [28, 'se']]],
  [0, [[12, 'sb'], [38, 'sc']]],
  [8, [[20, 'se'], [30, 'sa']]],
];
export const CODE_W = CODE.map(([ind, segs]) => 12 + ind + segs.reduce((a, [w]) => a + w + 5, 0));

function leafPath(len: number, wd: number, ang: number, ox: number, oy: number): string {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const pt = (u: number, v: number): P => [ox + u * ca - v * sa, oy + u * sa + v * ca];
  const a = pt(0, 0), b = pt(len * 0.45, -wd), c = pt(len, 0), d = pt(len * 0.45, wd);
  return smoothPath([a, b, c, d], true);
}

const Art = memo(function Art({ id, ink }: { id: string; ink: boolean }) {
  const fl = ink ? `url(#${id}ink)` : undefined;
  const fl2 = ink ? `url(#${id}ink2)` : undefined;

  // spiky back hair + fringe geometry
  const hairBack: P[] = [[186, 292], ...spikes(270, 224, 98, 104, 15, 15, 11, Math.PI * 0.93, Math.PI * 2.07), [354, 292]];
  const fringeLow: P[] = [[198, 244], [203, 216], [215, 226], [225, 196], [240, 224], [253, 192], [268, 220], [283, 190], [298, 222], [312, 194], [327, 224], [337, 206], [344, 244]];
  const fringeFill: P[] = [...fringeLow, [352, 196], [340, 150], [304, 128], [262, 122], [222, 130], [194, 160], [190, 204]];
  const faceTop = 164;

  return (
    <>
      <defs>
        <filter id={`${id}ink`} x="-4%" y="-4%" width="108%" height="108%">
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id={`${id}ink2`} x="-6%" y="-6%" width="112%" height="112%">
          <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="1" seed="3" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="1.7" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <radialGradient id={`${id}glow`}>
          <stop offset="0" style={{ stopColor: 'var(--c-highlight)', stopOpacity: 0.55 }} />
          <stop offset="1" style={{ stopColor: 'var(--c-highlight)', stopOpacity: 0 }} />
        </radialGradient>
        <pattern id={`${id}scan`} width="4" height="3" patternUnits="userSpaceOnUse">
          <rect width="4" height="1" style={{ fill: 'var(--c-paper)' }} opacity="0.5" />
        </pattern>
        <clipPath id={`${id}scr`}><rect x="0" y="0" width="186" height="105" rx="3" /></clipPath>
        <clipPath id={`${id}type`}>
          {CODE.map((_, i) => <rect key={i} data-a={`cl${i}`} x="0" y={7 + i * 13} width="190" height="12" />)}
        </clipPath>
      </defs>

      {/* ---------------- layer: backdrop (slowest parallax) */}
      <g data-a="parBg">
        <path data-a="blobB" d={blobPath(356, 380, 292, 0, 3)} className="blobB" />
        <path data-a="blobA" d={blobPath(350, 372, 276, 0, 1)} className="blobA" />
        <g transform="rotate(-16 350 330)">
          <ellipse cx="350" cy="330" rx="336" ry="120" className="orbit" />
          <g data-a="sat">
            <rect x="-4" y="-2.5" width="8" height="5" rx="1" className="fp" stroke="var(--c-ink)" strokeWidth="1.3" />
            <rect x="-13" y="-1.5" width="7" height="3" className="fsky" stroke="var(--c-ink)" strokeWidth="1" />
            <rect x="6" y="-1.5" width="7" height="3" className="fsky" stroke="var(--c-ink)" strokeWidth="1" />
          </g>
        </g>
        <g data-a="star" style={org(660, 300)}>
          <Asterisk x={660} y={300} r={17} rays={4} w={3} />
          <Asterisk x={660} y={300} r={13} rays={4} w={2.2} cls="soft" o={0.0} />
          <path d={wob(ellPts(660, 300, 4, 4, 6), 5, 0.4)} className="fhl" stroke="var(--c-ink)" strokeWidth="1.5" />
        </g>
        <g opacity="0.75">
          <Asterisk x={74} y={344} r={7} rays={2} w={2} />
          <Asterisk x={670} y={398} r={6} rays={2} w={2} />
          <Asterisk x={44} y={58} r={5} rays={2} w={1.8} />
          <circle cx="116" cy="62" r="3" className="ln" strokeWidth="1.6" />
          <circle cx="690" cy="238" r="2.5" className="ln" strokeWidth="1.5" />
          <circle cx="36" cy="500" r="3.5" className="ln" strokeWidth="1.6" />
          <path d="M600 354l10 0M605 349l0 10" className="ln" strokeWidth="1.7" />
          <path d="M28 280l9 0M32.5 275.5l0 9" className="ln" strokeWidth="1.7" />
          <path d="M120 440q6 -5 12 0" className="ln" strokeWidth="1.6" />
        </g>
      </g>

      {/* ---------------- layer: wall (clock, notes, plant) */}
      <g data-a="parWall">
        {/* wall clock, Fremont time */}
        <g>
          <path d="M600 60l0 8" className="ln" strokeWidth="1.5" />
          <path d={wob(ellPts(600, 98, 30, 30, 10), 21, 0.7)} className="fp ln" strokeWidth="3.2" />
          <path d={wob(ellPts(600, 98, 33.5, 33.5, 10), 22, 1.1)} className="ln" strokeWidth="1" opacity="0.4" />
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            const r1 = i % 3 === 0 ? 21 : 24.5;
            return <path key={i} d={`M${f(600 + Math.sin(a) * r1)} ${f(98 - Math.cos(a) * r1)}L${f(600 + Math.sin(a) * 27)} ${f(98 - Math.cos(a) * 27)}`} className="ln" strokeWidth={i % 3 === 0 ? 2.2 : 1.2} />;
          })}
          <g data-a="clkH" style={org(600, 98)}><path d="M600 98L600 85" className="ln" strokeWidth="3.2" transform="rotate(300 600 98)" /></g>
          <g data-a="clkM" style={org(600, 98)}><path d="M600 98L600 78" className="ln" strokeWidth="2.2" transform="rotate(60 600 98)" /></g>
          <g data-a="clkS" style={org(600, 98)}><path d="M600 104L600 74" className="ln" strokeWidth="1.1" style={{ stroke: 'var(--c-clay)' }} /></g>
          <circle cx="600" cy="98" r="2.6" className="fi" />
        </g>

        {/* sticky notes */}
        <g>
          <g transform="rotate(-7 80 150)">
            <path d={poly([[56, 126], [104, 124], [106, 172], [58, 174]], 31, 0.8)} className="fhl ln" strokeWidth="1.8" />
            <path d="M66 112l22 -2l1 11l-22 2z" className="fp" opacity="0.7" stroke="var(--c-ink)" strokeWidth="0.8" />
            <text x="64" y="148" className="tx" fontSize="9.5">ship it</text>
            <path d="M64 156q14 -3 30 0" className="ln" strokeWidth="1.3" />
          </g>
          <g transform="rotate(6 132 168)">
            <path d={poly([[112, 144], [160, 146], [158, 194], [110, 192]], 32, 0.8)} className="fcoral ln" strokeWidth="1.8" />
            <path d="M122 130l22 2l-1 11l-22 -2z" className="fp" opacity="0.7" stroke="var(--c-ink)" strokeWidth="0.8" />
            <text x="119" y="170" className="tx" fontSize="9.5">fix it</text>
            <path d="M119 178q14 3 30 0M119 184l18 0" className="ln" strokeWidth="1.2" />
          </g>
          <g transform="rotate(-3 90 210)">
            <path d={poly([[62, 188], [108, 187], [110, 232], [62, 233]], 33, 0.8)} className="fsky ln" strokeWidth="1.8" />
            <text x="69" y="212" className="tx" fontSize="9.5">sleep?</text>
            <path d="M69 220l22 0" className="ln" strokeWidth="1.2" />
          </g>
        </g>

        {/* shelf + plant */}
        <g>
          <path d="M470 222l6 12l6 -12M600 222l6 12l6 -12" className="ln" strokeWidth="2" />
          <path d={poly([[462, 214], [622, 214], [622, 224], [462, 224]], 41, 0.7)} className="fdesk ln" strokeWidth="2.4" />
          <g data-a="plant" style={org(540, 192)}>
            {[[-1.95, 54, 11], [-1.5, 62, 13], [-1.1, 50, 11], [-2.45, 40, 10], [-0.7, 40, 10]].map(([ang, len, wd], i) => (
              <g key={i}>
                <path d={leafPath(len, wd, ang, 540, 194)} className="fmoss ln" strokeWidth="2.2" />
                <path d={`M540 194L${f(540 + Math.cos(ang) * len * 0.82)} ${f(194 + Math.sin(ang) * len * 0.82)}`} className="ln" strokeWidth="1" opacity="0.5" />
              </g>
            ))}
          </g>
          <path d={poly([[520, 192], [560, 192], [554, 214], [526, 214]], 42, 0.6)} className="fo ln" strokeWidth="2.4" />
          <path d="M522 198l36 0" className="ln" strokeWidth="1.4" opacity="0.5" />
        </g>
      </g>

      {/* ---------------- layer: figure */}
      <g data-a="parFig">
        <g data-a="breath" style={org(270, 650)}>
          {/* hood bunched behind the head, torso, folds */}
          <g filter={fl}>
            <Sk pts={ellPts(270, 356, 98, 52, 9)} fill="fo2" w={3} seed={51} />
            <path d={wob(ellPts(270, 364, 58, 24, 8), 52, 0.8)} className="fo3" />
            <Sk
              pts={[[116, 650], [110, 560], [118, 484], [146, 430], [206, 398], [236, 372], [270, 394], [304, 372], [334, 398], [394, 430], [422, 484], [430, 560], [424, 650]]}
              fill="fo" w={3.4} seed={53} j={1.2}
            />
            <Ln d="M162 440Q182 484 174 538" w={2.2} o={0.6} />
            <Ln d="M378 440Q360 486 368 540" w={2.2} o={0.6} />
            <Ln d="M236 478Q228 526 244 566" w={2.2} o={0.5} />
            <Ln d="M308 478Q318 526 298 566" w={2.2} o={0.5} />
            <Ln d="M184 470l8 14M190 462l8 14M356 472l-8 14M362 464l-8 14" w={1.4} o={0.4} />
            <Ln d="M214 400Q176 420 154 430" w={1.6} dash="4 5" o={0.7} />
            <Ln d="M326 400Q364 420 386 430" w={1.6} dash="4 5" o={0.7} />
          </g>

          {/* head */}
          <g data-a="head" style={org(270, 352)}>
            <g filter={fl}>
              <g data-a="hairBack">
                <Sk pts={hairBack} sharp fill="fh" w={3} seed={61} j={1.6} dbl />
                <Ln d="M214 144q-16 -12 -26 -2M330 138q14 -10 24 -2" w={2.4} />
              </g>
              <g data-a="ears">
                <Sk pts={ellPts(196, 264, 10, 15, 7)} fill="fs" w={2.6} seed={62} j={0.5} />
                <Sk pts={ellPts(344, 264, 10, 15, 7)} fill="fs" w={2.6} seed={63} j={0.5} />
                <Ln d="M193 258q4 4 0 10M347 258q-4 4 0 10" w={1.4} o={0.6} />
              </g>
              <g data-a="neck">
                <path d={wob([[246, 308], [294, 308], [296, 372], [244, 372]], 64, 1)} className="fs ln" strokeWidth="3" />
                <path d={wob(ellPts(270, 336, 34, 16, 8), 65, 0.7)} className="fs2" opacity="0.8" />
              </g>
              <g data-a="face">
                <Sk
                  pts={[[270, faceTop], [320, 180], [344, 232], [338, 282], [314, 316], [270, 332], [226, 316], [202, 282], [196, 232], [220, 180]]}
                  fill="fs" w={3.2} seed={66} j={1.1}
                />
              </g>
            </g>

            {/* features: nose, mouth, cheeks slide a bit more than the skull */}
            <g data-a="features">
              <g data-a="blush" opacity="0.34">
                <ellipse cx="222" cy="288" rx="15" ry="8" className="fcoral" />
                <ellipse cx="318" cy="288" rx="15" ry="8" className="fcoral" />
              </g>
              <g opacity="0.45">
                {[[215, 280], [224, 285], [213, 289], [325, 280], [316, 285], [327, 289]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.1" className="fi" />)}
              </g>
              <Ln d="M269 276Q262 292 268 295Q274 296 278 291" w={2.2} />
              <g data-a="mouth" style={org(272, 306)}>
                <Ln d="M248 305Q270 324 297 303" w={3} />
                <Ln d="M297 303q5 -1 7 -8" w={2} />
                <Ln d="M246 303q-3 -2 -3 -6" w={1.8} o={0.6} />
              </g>
            </g>

            {/* eyes: whites, pupils, lids (blink = lid scaleY) */}
            <g data-a="eyewear">
              {LENS.map(([cx, cy], i) => (
                <g key={i}>
                  <ellipse cx={cx} cy={cy} rx="13.5" ry="11.5" className="fp ln" strokeWidth="1.8" />
                  <g data-a={i ? 'pupR' : 'pupL'}>
                    <circle cx={cx} cy={cy} r="6.6" className="fi" />
                    <circle cx={cx + 2.2} cy={cy - 2.4} r="2" className="fp" />
                    <circle cx={cx - 2} cy={cy + 2.4} r="0.9" className="fp" opacity="0.7" />
                  </g>
                  <g data-a={i ? 'lidR' : 'lidL'} style={{ ...org(cx, cy - 13), transform: 'scaleY(0.1)' }}>
                    <ellipse cx={cx} cy={cy} rx="16" ry="14" className="fs" />
                    <path d={`M${cx - 13} ${cy + 9}Q${cx} ${cy + 16} ${cx + 13} ${cy + 9}`} className="ln" strokeWidth="2.2" />
                  </g>
                </g>
              ))}
              <g data-a="glasses" filter={fl2}>
                {LENS.map(([cx, cy], i) => (
                  <g key={i}>
                    <path d={wob(ellPts(cx, cy, 31, 30, 10), 70 + i, 0.6)} className="ln" strokeWidth="4.2" />
                    <path d={wob(ellPts(cx, cy, 31, 30, 10), 80 + i, 1.1)} className="ln" strokeWidth="1.2" opacity="0.4" />
                    <path d={`M${cx - 20} ${cy - 13}Q${cx - 13} ${cy - 21} ${cx - 3} ${cy - 22}`} className="ln" strokeWidth="2.2" style={{ stroke: 'var(--c-paper)' }} opacity="0.85" />
                  </g>
                ))}
                <Ln d="M263 249Q270 242 277 249" w={3.6} />
                <Ln d="M203 252L191 247M337 252L349 247" w={3.4} />
              </g>
              <g data-a="lensG" opacity="0.4">
                {LENS.map(([cx, cy], i) => <ellipse key={i} cx={cx + 8} cy={cy + 8} rx="7" ry="4" className="fhl" transform={`rotate(-30 ${cx + 8} ${cy + 8})`} />)}
              </g>
              <g data-a="brows">
                <Ln d="M207 219Q224 209 247 216" w={5} />
                <Ln d="M293 216Q316 209 333 219" w={5} />
              </g>
            </g>

            {/* hair in front */}
            <g data-a="fringe" filter={fl}>
              <path d={poly(fringeFill, 91, 1.2)} className="fh" />
              <path d={poly(fringeLow, 91, 1.2, false)} className="ln" strokeWidth="3" />
              <Ln d={poly(fringeLow, 97, 2, false)} w={1} o={0.4} />
              <Ln d="M232 160Q222 176 228 192M262 140Q254 160 262 180M296 146Q304 164 296 182M322 160Q330 178 324 194" w={2} o={0.0} />
              <path d="M236 150Q228 168 232 184M268 134Q260 154 266 172M302 142Q312 158 306 174" className="soft" strokeWidth="2.4" style={{ stroke: 'var(--c-sand)' }} opacity="0.45" />
            </g>
            <g data-a="ahoge" style={org(272, 128)}>
              <path d="M272 132C264 110 282 94 294 104C303 112 294 124 285 118" className="ln" strokeWidth="9" />
              <path d="M272 132C264 110 282 94 294 104C303 112 294 124 285 118" className="nf" strokeWidth="5" style={{ stroke: 'var(--hair)' }} />
              <path d="M300 134Q312 118 308 104" className="ln" strokeWidth="5" />
              <path d="M300 134Q312 118 308 104" className="nf" strokeWidth="2" style={{ stroke: 'var(--hair)' }} />
            </g>
          </g>

          {/* hood rim in front of the neck, drawstrings */}
          <g data-a="hoodFront" filter={fl}>
            <Sk
              pts={[[196, 364], [214, 394], [240, 412], [270, 418], [300, 412], [326, 394], [344, 364], [326, 382], [300, 396], [270, 400], [240, 396], [214, 382]]}
              fill="fo4" w={3.2} seed={95} j={0.8}
            />
            <Ln d="M214 392Q242 410 270 412Q298 410 326 392" w={1.4} dash="3 4" o={0.7} />
            <circle cx="245" cy="406" r="3.6" className="fi" />
            <circle cx="295" cy="406" r="3.6" className="fi" />
            <g data-a="strL" style={org(245, 408)}>
              <path d="M245 408C240 440 252 474 245 510" className="ln" strokeWidth="7" />
              <path d="M245 408C240 440 252 474 245 510" className="nf" strokeWidth="4" style={{ stroke: 'var(--c-paper)' }} />
              <rect x="241.5" y="508" width="7" height="14" rx="2" className="fi" />
            </g>
            <g data-a="strR" style={org(295, 408)}>
              <path d="M295 408C300 440 290 484 298 522" className="ln" strokeWidth="7" />
              <path d="M295 408C300 440 290 484 298 522" className="nf" strokeWidth="4" style={{ stroke: 'var(--c-paper)' }} />
              <rect x="294.5" y="520" width="7" height="14" rx="2" className="fi" />
            </g>
          </g>
        </g>
      </g>

      {/* ---------------- layer: desk + arms (no parallax, they connect to the figure) */}
      <g data-a="parDesk">
        <g filter={fl}>
          <path d={poly([[26, 586], [694, 586], [716, 662], [4, 662]], 101, 1)} className="fdesk ln" strokeWidth="3" />
          <path d={poly([[4, 662], [716, 662], [716, 694], [4, 694]], 102, 1)} className="fsand ln" strokeWidth="3" />
          <Ln d="M30 612Q220 606 400 614T690 610" w={1.2} o={0.28} />
          <Ln d="M20 636Q180 630 340 638T704 634" w={1.2} o={0.22} />
          <Ln d="M60 676l120 0M300 676l90 0M520 676l140 0" w={1.4} o={0.28} />
          <Ln d="M40 662l0 32M680 662l0 32" w={1.2} o={0.2} />
        </g>

        {/* sleeves */}
        <g data-a="armB" style={org(270, 650)} filter={fl}>
          <g>
            <path d="M170 446C128 480 100 530 110 568C118 596 142 606 172 606" className="ln" strokeWidth="58" />
            <path d="M170 446C128 480 100 530 110 568C118 596 142 606 172 606" className="nf" strokeWidth="52" style={{ stroke: 'var(--hood)' }} />
            <path d="M126 500Q112 530 118 560M146 580Q160 590 176 590" className="ln" strokeWidth="1.8" opacity="0.5" />
            <path d="M158 590l-6 28M170 592l-4 26M182 594l-2 24" className="ln" strokeWidth="1.5" opacity="0.5" />
            <path d="M154 584Q166 612 198 610" className="ln" strokeWidth="54" style={{ stroke: 'var(--hood2)' }} opacity="0" />
          </g>
          <g data-a="armR">
            <path d="M370 446C412 480 440 530 432 570C428 592 436 604 460 602" className="ln" strokeWidth="58" />
            <path d="M370 446C412 480 440 530 432 570C428 592 436 604 460 602" className="nf" strokeWidth="52" style={{ stroke: 'var(--hood)' }} />
            <path d="M414 500Q428 530 420 560M392 470l8 14" className="ln" strokeWidth="1.8" opacity="0.5" />
          </g>
        </g>

        {/* notebook with a smart-glasses sketch */}
        <g transform="translate(214 604) rotate(-4)" filter={fl}>
          <ellipse cx="62" cy="58" rx="66" ry="5" className="fi" opacity="0.14" />
          <rect x="0" y="0" width="126" height="56" rx="2.5" className="fp ln" strokeWidth="2.2" />
          <rect x="3" y="3" width="126" height="56" rx="2.5" className="ln" strokeWidth="0.9" opacity="0.35" />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => <circle key={i} cx="3" cy={7 + i * 7.2} r="2" className="fsand ln" strokeWidth="1" />)}
          <path d="M14 46l108 0M14 38l40 0" className="soft" strokeWidth="0.8" opacity="0.35" />
          {/* glasses sketch */}
          <path d={wob(ellPts(42, 25, 10, 9.5, 8), 111, 0.4)} className="ln" strokeWidth="1.6" />
          <path d={wob(ellPts(68, 25, 10, 9.5, 8), 112, 0.4)} className="ln" strokeWidth="1.6" />
          <path d="M52 23q3 -3 6 0M32 22l-10 -3M78 22l12 -2" className="ln" strokeWidth="1.5" />
          <path d="M92 20l12 -2M100 15l6 3l-5 4" className="ln" strokeWidth="1.3" />
          <rect x="106" y="10" width="12" height="9" rx="1.5" className="ln" strokeWidth="1.4" />
          <path d="M109 10l0 -3M112 10l0 -3M115 10l0 -3" className="ln" strokeWidth="1" />
          <path d="M20 40l22 0M46 40l8 0" className="ln" strokeWidth="1.2" opacity="0.7" />
          <Asterisk x={14} y={14} r={3.4} rays={4} w={1.1} />
        </g>

        {/* left hand with pencil */}
        <g>
          <g transform="rotate(26 244 640)">
            <path d="M210 630l56 0" className="ln" strokeWidth="9" />
            <path d="M210 630l56 0" className="nf" strokeWidth="6" style={{ stroke: 'var(--c-highlight)' }} />
            <path d="M266 626l10 4l-10 4z" className="fp ln" strokeWidth="1.2" />
            <path d="M273 628.8l3 1.2l-3 1.2z" className="fi" />
            <rect x="203" y="626" width="8" height="8" rx="2.5" className="fcoral ln" strokeWidth="1.6" />
          </g>
          <g filter={fl2}>
            <Sk pts={[[172, 604], [194, 598], [214, 606], [224, 622], [216, 636], [192, 640], [172, 632]]} fill="fs" w={2.8} seed={121} j={0.8} />
            <path d="M206 604q12 4 14 16q-8 -2 -14 -6" className="fs ln" strokeWidth="2.4" />
            <Ln d="M192 616q8 4 16 2M190 624q8 4 16 2" w={1.5} o={0.55} />
          </g>
        </g>

        <g data-a="parItems">
          {/* Raspberry-Pi-ish board, in board space 100 x 56, skewed onto the desk */}
          <g filter={fl2}>
            <ellipse cx="86" cy="650" rx="74" ry="8" className="fi" opacity="0.13" />
            <path d="M20 634L122 622L147 644L45 656z" className="fmoss2 ln" strokeWidth="2.4" transform="translate(0 5)" />
            <g transform="matrix(1.02 -0.12 0.45 0.4 20 630)">
              <rect x="0" y="0" width="100" height="56" rx="5" className="fmoss ln" strokeWidth="2.4" />
              <rect x="6" y="2.6" width="56" height="8" rx="1" className="fi" />
              {Array.from({ length: 20 }, (_, i) => (
                <g key={i}>
                  <rect x={7.4 + i * 2.7} y="3.6" width="1.5" height="1.6" className="fhl" />
                  <rect x={7.4 + i * 2.7} y="7" width="1.5" height="1.6" className="fhl" />
                </g>
              ))}
              <rect x="34" y="20" width="16" height="16" rx="2" className="fi" />
              <rect x="36.5" y="22.5" width="11" height="11" rx="1" className="fsand" />
              <rect x="82" y="5" width="18" height="13" rx="1" className="fsand ln" strokeWidth="1.2" />
              <rect x="82" y="21" width="18" height="13" rx="1" className="fsand ln" strokeWidth="1.2" />
              <rect x="78" y="38" width="22" height="16" rx="1" className="fsky ln" strokeWidth="1.2" />
              <rect x="14" y="51" width="11" height="5" rx="1" className="fsand ln" strokeWidth="1" />
              {[[5, 5], [5, 51], [95, 51], [66, 20]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2" className="fp ln" strokeWidth="1" />)}
              <circle cx="9" cy="42" r="1.7" className="fmoss" style={{ fill: 'var(--c-highlight)' }} />
              <circle data-a="piLed" cx="14" cy="42" r="1.7" className="fcoral" />
              <path d="M56 40l14 0l0 10l8 0M56 44l10 0" className="ln" strokeWidth="0.9" opacity="0.7" style={{ stroke: 'var(--c-paper)' }} />
            </g>
          </g>

          {/* mug */}
          <g filter={fl2}>
            <ellipse cx="388" cy="624" rx="42" ry="7" className="fi" opacity="0.15" />
            <path d="M406 584C430 580 432 612 406 612" className="ln" strokeWidth="9" />
            <path d="M406 584C430 580 432 612 406 612" className="nf" strokeWidth="5" style={{ stroke: 'var(--c-paper)' }} />
            <path d="M352 574L354 612Q356 624 388 624Q420 624 422 612L424 574z" className="fp ln" strokeWidth="3.2" />
            <ellipse cx="388" cy="574" rx="36" ry="9" className="fp ln" strokeWidth="3" />
            <ellipse cx="388" cy="575" rx="31" ry="6.4" style={{ fill: 'color-mix(in srgb, var(--c-ink) 52%, var(--c-clay))' }} />
            <ellipse cx="380" cy="574" rx="12" ry="2" className="fp" opacity="0.28" />
            <Asterisk x={388} y={601} r={9} rays={4} w={2.4} cls="ln" />
            <path d="M388 601m-9 0l18 0M388 592l0 18M382 595l12 12M394 595l-12 12" style={{ stroke: 'var(--c-clay)' }} className="nf" strokeWidth="1.2" opacity="0" />
            <path d="M362 584Q360 600 364 612" className="ln" strokeWidth="1.6" opacity="0.4" />
          </g>
          <g>
            {[0, 1, 2].map((i) => (
              <g key={i} data-a={`st${i}`} style={{ transform: `translate(${370 + i * 17}px, 566px)` }}>
                <path d="M0 0C-7 -10 7 -18 0 -28S-7 -46 0 -56" className="nf" strokeWidth="3.4" strokeLinecap="round" style={{ stroke: 'var(--c-paper)' }} opacity="0.55" />
              </g>
            ))}
          </g>

          {/* screen spill onto the desk */}
          <ellipse data-a="glow" cx="548" cy="560" rx="230" ry="130" fill={`url(#${id}glow)`} opacity="0.6" />

          {/* laptop */}
          <g transform="translate(436 476) rotate(-4)">
            <g filter={fl2}>
              <ellipse cx="102" cy="150" rx="128" ry="9" className="fi" opacity="0.15" />
              <path d={poly([[-16, 132], [220, 132], [232, 148], [-28, 148]], 131, 0.5)} className="fsand ln" strokeWidth="2.6" />
              <path d="M84 132l36 0l-4 5l-28 0z" className="fi" opacity="0.45" />
              <rect x="0" y="0" width="204" height="134" rx="9" className="flid ln" strokeWidth="3" />
              <rect x="9" y="9" width="186" height="105" rx="3" className="fscr" />
              <circle cx="102" cy="5" r="1.6" className="fi" />
              <path d="M62 126l80 0" className="ln" strokeWidth="1.2" opacity="0.25" style={{ stroke: 'var(--c-paper)' }} />
            </g>
            <g transform="translate(9 9)">
              <g clipPath={`url(#${id}scr)`}>
                <g data-a="fr0">
                  <g clipPath={`url(#${id}type)`}>
                    {CODE.map(([ind, segs], i) => {
                      let x = 8 + ind;
                      return (
                        <g key={i}>
                          {segs.map(([w, c], k) => {
                            const el = <rect key={k} x={x} y={9 + i * 13} width={w} height="6" rx="3" className={c} />;
                            x += w + 5;
                            return el;
                          })}
                        </g>
                      );
                    })}
                  </g>
                  <rect data-a="caret" x="0" y="8" width="3.2" height="8" className="sd" />
                </g>
                <g data-a="fr1" opacity="0">
                  {[[34, 30], [34, 54], [34, 78], [92, 20], [92, 42], [92, 64], [92, 86], [150, 38], [150, 70]].map(([x, y], i, a) => (
                    <g key={i}>
                      {a.slice(i + 1).filter(([x2]) => x2 - x === 58).map(([x2, y2], k) => (
                        <path key={k} d={`M${x} ${y}L${x2} ${y2}`} className="nf" strokeWidth="0.9" style={{ stroke: 'var(--c-sky)' }} opacity="0.55" />
                      ))}
                    </g>
                  ))}
                  {[[34, 30], [34, 54], [34, 78], [92, 20], [92, 42], [92, 64], [92, 86], [150, 38], [150, 70]].map(([x, y], i) => (
                    <circle key={i} cx={x} cy={y} r="5.4" className={i < 3 ? 'sd' : i < 7 ? 'sb' : 'sa'} />
                  ))}
                  {[0, 1, 2].map((i) => <circle key={i} data-a={`pl${i}`} r="2.4" className="se" style={{ opacity: 1 }} />)}
                </g>
                <g data-a="fr2" opacity="0">
                  <path d="M93 92L58 70M93 92L74 40M93 92L96 22M93 92L116 34M93 92L132 56" className="nf" strokeWidth="1.4" style={{ stroke: 'var(--c-paper)' }} opacity="0.75" />
                  {[[58, 70], [74, 40], [96, 22], [116, 34], [132, 56], [84, 64], [96, 62], [106, 62]].map(([x, y], i) => (
                    <circle key={i} cx={x} cy={y} r={i < 5 ? 3.6 : 2.4} className={i < 5 ? 'sa' : 'sd'} />
                  ))}
                  <path d="M93 92m-12 0a12 12 0 0 1 24 0" className="nf" strokeWidth="1.4" style={{ stroke: 'var(--c-paper)' }} opacity="0.5" />
                  <circle cx="93" cy="92" r="3.6" className="sd" />
                </g>
                <rect width="186" height="105" fill={`url(#${id}scan)`} opacity="0.12" />
                <path d="M0 0L70 0L20 105L0 105z" className="fp" opacity="0.05" />
              </g>
            </g>
          </g>
        </g>
      </g>
    </>
  );
});

/* ------------------------------------------------------------------ annotations */

type Note = { text: string; x: number; y: number; a: 'l' | 'c' | 'r'; arrow: [number, number, number, number, number, number]; mobile?: boolean };

const NOTES: Note[] = [
  { text: 'hair: unsupervised', x: 266, y: 22, a: 'c', arrow: [266, 54, 250, 86, 258, 118], mobile: true },
  { text: 'glasses: for seeing bugs', x: 6, y: 262, a: 'l', arrow: [96, 280, 150, 296, 197, 268] },
  { text: 'hoodie: legally required', x: 4, y: 396, a: 'l', arrow: [40, 442, 44, 482, 92, 504] },
  { text: 'laptop: always open', x: 714, y: 408, a: 'r', arrow: [632, 440, 612, 450, 596, 462], mobile: true },
  { text: 'mug: debugging fluid', x: 408, y: 708, a: 'c', arrow: [400, 702, 388, 678, 390, 634], mobile: true },
  { text: 'notebook: glasses on paper first', x: 262, y: 708, a: 'c', arrow: [262, 702, 262, 684, 270, 664] },
  { text: 'pi: small computer, big plans', x: 8, y: 708, a: 'l', arrow: [58, 702, 54, 682, 72, 662] },
];

function Annotations({ show }: { show: boolean }) {
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        {NOTES.map((n, i) => (
          <path
            key={n.text}
            d={arrow(...n.arrow, 200 + i)}
            pathLength={1}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.9}
            className={n.mobile ? '' : 'hidden sm:block'}
            style={{
              stroke: 'var(--fg-muted)',
              strokeDasharray: 1,
              strokeDashoffset: show ? 0 : 1,
              transition: `stroke-dashoffset 900ms var(--ease-out) ${300 + i * 140}ms`,
            }}
          />
        ))}
      </svg>
      {NOTES.map((n, i) => (
        <span
          key={n.text}
          className={`${n.mobile ? '' : 'hidden sm:block'} absolute whitespace-nowrap`}
          style={{
            left: `${(n.x / W) * 100}%`,
            top: `${(n.y / H) * 100}%`,
            transform: n.a === 'c' ? 'translateX(-50%)' : n.a === 'r' ? 'translateX(-100%)' : undefined,
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontVariationSettings: "'wght' 420, 'opsz' 14, 'SOFT' 100, 'WONK' 1",
            fontSize: 'clamp(10px, 1.55vw, 15px)',
            lineHeight: 1.15,
            color: 'var(--fg-muted)',
            opacity: show ? 1 : 0,
            transition: `opacity 600ms var(--ease-out) ${420 + i * 140}ms`,
            textShadow: '0 0 6px var(--bg-2), 0 0 2px var(--bg-2)',
          }}
        >
          {n.text}
        </span>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ animation */

const LOOKS: P[] = [[0.75, 0.5], [0, 0.05], [0.3, 0.6], [-0.7, -0.2], [0.45, 0.2], [0.85, 0.42], [-0.3, -0.35], [0.1, 0.4]];
const FR = 3.8; // seconds per laptop screen frame
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth = (x: number) => { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); };

function createSim(svg: SVGSVGElement, wrap: HTMLElement) {
  const els: Record<string, SVGElement> = {};
  svg.querySelectorAll<SVGElement>('[data-a]').forEach((el) => { els[el.dataset.a as string] = el; });
  const T = (k: string, v: string) => { const el = els[k]; if (el) el.style.transform = v; };
  const px = (n: number) => `${n.toFixed(2)}px`;

  const s = {
    gx: 0.35, gy: 0.2, hx: 0.35, hy: 0.2, ax: 0.35, ay: 0.2, tx: 0.35, ty: 0.2, ix: 0, iy: 0, hxPrev: 0.35,
    lastInput: -1e9, idleUntil: 0, idleX: 0.35, idleY: 0.2,
    blinks: [] as number[], nextBlink: 1800,
    hover: 0, hoverT: 0,
    tap: 0, tapT: 0, nextTap: 0,
    flick: 0, nextFlick: 0,
    lastClock: -1e9, lastBlob: 0,
    rect: null as DOMRect | null, dirty: true,
    tilt0: null as [number, number] | null,
  };
  let fmt: Intl.DateTimeFormat | null = null;
  try { fmt = new Intl.DateTimeFormat('en-US', { timeZone: SITE.coords.tz, hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' }); } catch { fmt = null; }

  const setClock = () => {
    if (!fmt) return;
    const p = Object.fromEntries(fmt.formatToParts(new Date()).map((x) => [x.type, x.value]));
    const h = Number(p.hour) % 12, m = Number(p.minute), sec = Number(p.second);
    T('clkH', `rotate(${h * 30 + m * 0.5}deg)`);
    T('clkM', `rotate(${m * 6 + sec * 0.1}deg)`);
    T('clkS', `rotate(${sec * 6}deg)`);
  };

  const lookFrom = (cx: number, cy: number) => {
    if (s.dirty || !s.rect) { s.rect = wrap.getBoundingClientRect(); s.dirty = false; }
    const r = s.rect;
    const hx = r.left + r.width * 0.375, hy = r.top + r.height * 0.34;
    s.ix = clamp((cx - hx) / (Math.max(r.width, 360) * 1.05), -1, 1);
    s.iy = clamp((cy - hy) / (Math.max(r.height, 360) * 0.85), -1, 1);
    s.lastInput = performance.now();
  };

  function frame(now: number, dt: number, still = false) {
    const t = still ? 6.2 : now / 1000;
    const k = (b: number) => 1 - Math.pow(1 - b, Math.min(dt, 50) / 16.67);

    if (!still) {
      if (now - s.lastInput < 4200) { s.tx = s.ix; s.ty = s.iy; }
      else {
        if (now > s.idleUntil) {
          const L = LOOKS[Math.floor(Math.random() * LOOKS.length)];
          s.idleX = L[0]; s.idleY = L[1]; s.idleUntil = now + 1500 + Math.random() * 2300;
        }
        s.tx = s.idleX; s.ty = s.idleY;
      }
      const ke = k(0.17), kh = k(0.07), ka = k(0.045);
      s.gx += (s.tx - s.gx) * ke; s.gy += (s.ty - s.gy) * ke;
      s.hxPrev = s.hx;
      s.hx += (s.tx - s.hx) * kh; s.hy += (s.ty - s.hy) * kh;
      s.ax += (s.tx - s.ax) * ka; s.ay += (s.ty - s.ay) * ka;
      s.hover += (s.hoverT - s.hover) * k(0.12);
    }

    // breathing
    const br = still ? 0 : Math.sin(t * 1.65);
    T('breath', `translate(0px, ${px(-br * 1.1)}) scale(1, ${(1 + br * 0.009).toFixed(4)})`);
    T('armB', `translate(0px, ${px(-br * 0.4)}) scale(1, ${(1 + br * 0.006).toFixed(4)})`);

    // head follows with lag, features slide a bit further than the skull
    const sway = still ? 0 : Math.sin(t * 0.6) * 0.6;
    T('head', `translate(${px(s.hx * 3.6)}, ${px(s.hy * 2 - br * 0.6)}) rotate(${(s.hx * 3.4 + sway).toFixed(2)}deg)`);
    T('features', `translate(${px(s.hx * 4.4)}, ${px(s.hy * 2.8)})`);
    T('eyewear', `translate(${px(s.hx * 2.8)}, ${px(s.hy * 1.7)})`);
    T('fringe', `translate(${px(s.hx * 1.3)}, ${px(s.hy * 0.9)})`);
    T('ahoge', `rotate(${((still ? 3 : Math.sin(t * 1.9) * 3.5) - (s.hx - s.hxPrev) * 160).toFixed(2)}deg)`);
    T('pupL', `translate(${px(s.gx * 5.2 + (still ? 0 : Math.sin(t * 3.1) * 0.25))}, ${px(s.gy * 3.8)})`);
    T('pupR', `translate(${px(s.gx * 5.2 + (still ? 0 : Math.sin(t * 3.1) * 0.25))}, ${px(s.gy * 3.8)})`);
    T('brows', `translate(0px, ${px(-s.hover * 3.4 - Math.max(0, -s.gy) * 2 + Math.max(0, s.gy) * 0.6)})`);
    T('mouth', `scale(${(1 + s.hover * 0.1).toFixed(3)}, ${(1 + s.hover * 0.18).toFixed(3)})`);
    els.blush?.setAttribute('opacity', (0.34 + s.hover * 0.26).toFixed(2));

    // blinks (sometimes two in a row)
    let b = 0;
    if (!still) {
      if (now > s.nextBlink) {
        s.blinks.push(now);
        const dbl = Math.random() < 0.24;
        if (dbl) s.blinks.push(now + 230);
        s.nextBlink = now + 3000 + Math.random() * 3000 + (dbl ? 300 : 0);
      }
      for (const st of s.blinks) {
        const d = now - st;
        if (d < 0) continue;
        const v = d < 70 ? d / 70 : d < 100 ? 1 : d < 230 ? 1 - (d - 100) / 130 : 0;
        if (v > b) b = v;
      }
      s.blinks = s.blinks.filter((st) => now - st < 400);
    }
    const base = 0.1 + Math.max(0, s.gy) * 0.22;
    const lid = base + (1 - base) * smooth(b);
    T('lidL', `scaleY(${lid.toFixed(3)})`);
    T('lidR', `scaleY(${lid.toFixed(3)})`);

    // parallax by depth
    T('parBg', `translate(${px(s.ax * 7)}, ${px(s.ay * 4)})`);
    T('parWall', `translate(${px(s.ax * 3.5)}, ${px(s.ay * 2)})`);
    T('parItems', `translate(${px(-s.ax * 5)}, ${px(-s.ay * 3)})`);

    // drawstrings, plant, star, satellite, blob
    T('strL', `rotate(${((still ? 0 : Math.sin(t * 1.6 + 0.5) * 2.4) - s.hx * 2.2).toFixed(2)}deg)`);
    T('strR', `rotate(${((still ? 0 : Math.sin(t * 1.55 + 1.9) * 2.6) - s.hx * 2.2).toFixed(2)}deg)`);
    T('plant', `rotate(${(still ? 0 : Math.sin(t * 0.9) * 1.6).toFixed(2)}deg)`);
    T('star', `rotate(${(t * 7).toFixed(1)}deg)`);
    const u = still ? 0.62 * Math.PI : t * 0.22;
    T('sat', `translate(${px(350 + Math.cos(u) * 336)}, ${px(330 + Math.sin(u) * 120)}) rotate(${((u * 180) / Math.PI + 90).toFixed(1)}deg)`);
    if (!still && now - s.lastBlob > 50) {
      s.lastBlob = now;
      els.blobA?.setAttribute('d', blobPath(350, 372, 276, t, 1));
      els.blobB?.setAttribute('d', blobPath(356, 380, 292, t * 0.8, 3));
    }

    // laptop screen: code types itself, then a neural doodle, then a hand skeleton
    const idx = still ? 0 : Math.floor(t / FR) % 3;
    const local = still ? FR * 0.9 : t % FR;
    const prev = (idx + 2) % 3;
    const cur = smooth(local / 0.45);
    for (let i = 0; i < 3; i++) {
      const o = i === idx ? cur : i === prev ? 1 - cur : 0;
      els[`fr${i}`]?.setAttribute('opacity', o.toFixed(2));
    }
    const typeT = idx === 0 ? local : prev === 0 ? FR + local : 0;
    let caretLine = 0, caretP = 0;
    for (let i = 0; i < CODE.length; i++) {
      const p = clamp((typeT - 0.2 - i * 0.36) / 0.7, 0, 1);
      els[`cl${i}`]?.setAttribute('width', (190 * p).toFixed(1));
      if (p > 0) { caretLine = i; caretP = p; }
    }
    const cw = CODE_W[caretLine] * caretP;
    T('caret', `translate(${px(8 + cw)}, ${px(caretLine * 13)})`);
    els.caret?.setAttribute('opacity', still ? '0' : ((t * 2.2) % 1 < 0.55 ? '1' : '0'));
    const NN: [number, number, number, number][] = [[34, 30, 92, 42], [34, 78, 92, 64], [92, 20, 150, 38]];
    for (let i = 0; i < 3; i++) {
      const [x1, y1, x2, y2] = NN[i];
      const p = (t * 0.7 + i / 3) % 1;
      const el = els[`pl${i}`];
      if (el) { el.setAttribute('cx', (x1 + (x2 - x1) * p).toFixed(1)); el.setAttribute('cy', (y1 + (y2 - y1) * p).toFixed(1)); }
    }

    // screen light flickers on the desk and in the lenses
    if (!still && now > s.nextFlick) { s.flick = (Math.random() < 0.5 ? -1 : 1) * 0.16; s.nextFlick = now + 700 + Math.random() * 1800; }
    s.flick *= 0.88;
    const glow = clamp(0.62 + 0.09 * Math.sin(t * 2.1) + 0.06 * Math.sin(t * 5.3 + 1.2) + 0.04 * Math.sin(t * 11.7) + s.flick, 0, 1);
    els.glow?.setAttribute('opacity', glow.toFixed(3));
    els.lensG?.setAttribute('opacity', (glow * 0.62).toFixed(3));

    // typing hand, LED
    if (!still) {
      if (idx === 0 && now > s.nextTap) { s.tapT = Math.random() < 0.45 ? 0 : 1 + Math.random() * 1.6; s.nextTap = now + 80 + Math.random() * 120; }
      if (idx !== 0) s.tapT = 0;
      s.tap += (s.tapT - s.tap) * k(0.4);
    }
    T('armR', `translate(0px, ${px(s.tap)})`);
    els.piLed?.setAttribute('opacity', still ? '1' : (Math.sin(t * 5) > 0.55 ? '1' : '0.3'));

    // steam wisps
    for (let i = 0; i < 3; i++) {
      const ph = still ? 0.25 + i * 0.3 : (t * 0.3 + i / 3) % 1;
      const x = 370 + i * 17 + Math.sin(ph * 6.5 + i * 2) * 6;
      const y = 566 - ph * 74;
      T(`st${i}`, `translate(${px(x)}, ${px(y)})`);
      els[`st${i}`]?.setAttribute('opacity', (Math.pow(Math.sin(ph * Math.PI), 1.1) * 0.85).toFixed(2));
    }

    // clock: Fremont time, ticks once a second
    if (still ? s.lastClock < 0 : now - s.lastClock > 1000) { s.lastClock = still ? 0 : now; setClock(); }
  }

  return {
    frame,
    markDirty: () => { s.dirty = true; },
    onPointer: (e: PointerEvent) => {
      if (e.pointerType === 'touch') { if (wrap.contains(e.target as Node)) lookFrom(e.clientX, e.clientY); return; }
      lookFrom(e.clientX, e.clientY);
    },
    onHover: (v: boolean) => { s.hoverT = v ? 1 : 0; if (v) s.lastInput = performance.now(); },
    onTilt: (gamma: number, beta: number) => {
      if (!s.tilt0) s.tilt0 = [gamma, beta];
      s.ix = clamp((gamma - s.tilt0[0]) / 22, -1, 1);
      s.iy = clamp((beta - s.tilt0[1]) / 22, -1, 1);
      s.lastInput = performance.now();
    },
  };
}

/* ------------------------------------------------------------------ component */

export function AvatarPortrait({ className = '', annotate = true }: { className?: string; annotate?: boolean }) {
  const reduced = useReducedMotion();
  const coarse = useCoarsePointer();
  const visible = usePageVisible();
  const mounted = useMounted();
  const [wrapRef, inView] = useInView<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const sim = useRef<ReturnType<typeof createSim> | null>(null);
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');

  // build the sim once the static art is in the DOM
  useEffect(() => {
    if (!svgRef.current || !wrapRef.current) return;
    sim.current = createSim(svgRef.current, wrapRef.current);
    return () => { sim.current = null; };
  }, [wrapRef]);

  // reduced motion: one still pose, no loops
  useEffect(() => {
    if (reduced) sim.current?.frame(0, 16, true);
  }, [reduced]);

  // input: cursor on desktop, touch point + device tilt on phones, idle look-around otherwise
  useEffect(() => {
    if (reduced) return;
    const s = sim.current;
    const wrap = wrapRef.current;
    if (!s || !wrap) return;
    const dirty = () => s.markDirty();
    const move = (e: PointerEvent) => s.onPointer(e);
    const enter = () => s.onHover(true);
    const leave = () => s.onHover(false);
    const tilt = (e: DeviceOrientationEvent) => { if (e.gamma != null && e.beta != null) s.onTilt(e.gamma, e.beta); };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('scroll', dirty, { passive: true });
    window.addEventListener('resize', dirty);
    wrap.addEventListener('pointerenter', enter);
    wrap.addEventListener('pointerleave', leave);
    if (coarse) window.addEventListener('deviceorientation', tilt);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('scroll', dirty);
      window.removeEventListener('resize', dirty);
      wrap.removeEventListener('pointerenter', enter);
      wrap.removeEventListener('pointerleave', leave);
      window.removeEventListener('deviceorientation', tilt);
    };
  }, [reduced, coarse, wrapRef]);

  // the loop only runs while the portrait is on screen and the tab is visible
  useEffect(() => {
    if (reduced || !inView || !visible) return;
    let raf = 0;
    let last = performance.now();
    const loop = (ts: number) => {
      raf = requestAnimationFrame(loop);
      const dt = ts - last;
      last = ts;
      sim.current?.frame(ts, dt);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduced, inView, visible]);

  const show = !mounted || reduced || inView;

  return (
    <div ref={wrapRef} className={`relative w-full ${className}`} style={{ aspectRatio: `${W} / ${H}` }}>
      <style>{CSS}</style>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="nvav absolute inset-0 h-full w-full overflow-visible"
        role="img"
        aria-labelledby={`${id}t ${id}d`}
      >
        <title id={`${id}t`}>Hand-drawn self-portrait of Nayan</title>
        <desc id={`${id}d`}>
          A stylized ink drawing of a teenager with messy hair and round glasses, wearing a clay-colored hoodie with drawstrings, at a desk with an open glowing laptop, a steaming mug, a Raspberry Pi board and a notebook sketch of smart glasses.
        </desc>
        <Art id={id} ink={!coarse} />
      </svg>
      {annotate && <Annotations show={show} />}
    </div>
  );
}
