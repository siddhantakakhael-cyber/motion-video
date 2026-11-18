// The film itself. One deterministic function: drawFrame(g, W, H, t, project).
// No video model, no stock footage — every pixel is drawn in code. The same
// module runs in the browser (live preview) and in Node (frame-by-frame export).

import {
  clamp, lerp, seg, ss, eio, eo, ei, back, hash, mulberry, TAU,
  withAlpha, lighten, darken, mix, complement, fontFor, setFont,
  drawFitted, roundRect, line, lineGrow, dot, arrow,
} from './lib.js';
import { normalizeProject, timeline, atTime, STYLES } from './project.js';

const TEXT_IN = 0.46;
const TEXT_OUT = 0.34;

function fill(g, W, H, color) { g.fillStyle = color; g.fillRect(0, 0, W, H); }

function label(g, text, x, y, size, color, weight = 600, family = 'Inter', align = 'left') {
  setFont(g, size, weight, family);
  g.fillStyle = color; g.textAlign = align; g.fillText(text, x, y); g.textAlign = 'left';
}

function content(ctx) {
  const { P, A } = ctx;
  if (A.kind === 'intro') return {
    heading: P.title,
    detail: P.lang === 'hi' ? 'कोड से बनी एक रील' : 'A REEL MADE ENTIRELY IN CODE',
    kicker: 'OPENING', num: '00',
  };
  if (A.kind === 'outro') return {
    heading: P.lang === 'hi' ? 'और चाहिए?' : 'WANT MORE?',
    detail: P.handle,
    kicker: 'END CARD', num: String(P.scenes.length + 1).padStart(2, '0'),
  };
  return {
    heading: A.scene.heading,
    detail: A.scene.detail,
    kicker: 'SHOT', num: String(A.index + 1).padStart(2, '0'),
  };
}

function appearance(A) {
  return {
    reveal: eio(clamp(A.enter)),
    alpha: clamp(A.exit * 2.2),
    pulse: 1 - eo(clamp((A.beat - Math.floor(A.beat)) / 0.28)),
    beatIndex: Math.floor(A.beat),
  };
}

function chrome(ctx, opt = {}) {
  const { g, W, H, u, M, P, A, t } = ctx;
  const color = opt.color || '#ffffff';
  const dim = opt.dim || withAlpha(color, 0.42);
  const family = fontFor(P.handle);
  label(g, P.handle, M, H * 0.055, 22 * u, dim, 600, family);
  label(g, `${String(A.shotNumber).padStart(2, '0')} / ${String(A.totalShots).padStart(2, '0')}`, W - M, H * 0.055, 22 * u, dim, 600, 'DejaVu Sans Mono', 'right');
  if (opt.rail !== false) {
    const y = H - M * 0.58, h = Math.max(2, 4 * u), w = W - 2 * M;
    g.fillStyle = withAlpha(color, 0.22); g.fillRect(M, y, w, h);
    g.fillStyle = color; g.fillRect(M, y, w * clamp(t / P.duration), h);
    for (const win of timeline(P).slice(1, -1)) {
      const x = M + w * clamp(win.start / P.duration);
      g.fillStyle = color; g.fillRect(x - u, y - 3 * u, 2 * u, h + 6 * u);
    }
  }
}

function makeCtx(g, W, H, t, P, A) {
  return { g, W, H, t, P, A, u: W / 1080, v: H / 1920, M: W * 0.075, accent: P.accent, style: STYLES.find(s => s.id === P.style) || STYLES[0] };
}

// ---------------------------------------------------------------- 1. SWISS ---
function swiss(ctx) {
  const { g, W, H, u, M, P, A, t, accent } = ctx;
  const paper = '#F1EFE9', ink = '#141414', mute = '#78766F', grid = '#D8D6CF';
  fill(g, W, H, paper);

  // A 12-column / 24-row modular grid. It breathes by one column per shot.
  const shift = (A.index >= 0 ? A.index : 0) * (W - 2 * M) / 12 * 0.12;
  g.save(); g.strokeStyle = grid; g.lineWidth = Math.max(1, u);
  for (let i = 0; i <= 12; i++) {
    const x = M + i * (W - 2 * M) / 12 + shift;
    line(g, x, 0, x, H, grid, u);
  }
  for (let j = 0; j <= 24; j++) line(g, 0, H * j / 24, W, H * j / 24, grid, u);
  g.restore();

  const C = content(ctx), ap = appearance(A);
  const bh = H * 0.105, by = H * 0.115, bw = (W - 2 * M) * 0.19;
  // Signal colour: exactly one block, wiping in along the baseline.
  g.fillStyle = accent; g.fillRect(M, by, bw * ap.reveal, bh);
  label(g, C.num, M + 12 * u, by + bh * 0.76, 92 * u, ink, 800, 'Inter');
  label(g, `${C.kicker}  ·  INTERNATIONAL STYLE`, M + bw + 24 * u, by + 34 * u, 20 * u, mute, 600, 'DejaVu Sans Mono');
  label(g, `12 COL / 24 ROW / ${P.bpm} BPM`, M + bw + 24 * u, by + 66 * u, 20 * u, mute, 600, 'DejaVu Sans Mono');

  const hy = H * 0.30, hh = H * 0.285, hw = W - 2 * M;
  drawFitted(g, C.heading, {
    x: M, y: hy, w: hw, h: hh, size: 122 * u, minSize: 38 * u, weight: 800,
    family: fontFor(C.heading), color: ink, reveal: ap.reveal, alpha: ap.alpha,
  });
  lineGrow(g, M, hy + hh + 26 * u, W - M, hy + hh + 26 * u, ap.reveal, ink, 2 * u);
  drawFitted(g, C.detail, {
    x: M, y: hy + hh + 54 * u, w: (W - 2 * M) * 0.8, h: H * 0.115,
    size: 34 * u, minSize: 17 * u, weight: 500, family: fontFor(C.detail),
    color: mute, reveal: eio(clamp(A.enter - 0.12)), alpha: ap.alpha,
  });

  // The one exception: a small off-grid square moving linearly, not on a beat.
  const ex = lerp(W - M - 54 * u, M + 8 * u, seg(t, P.intro, P.duration - P.outro));
  g.fillStyle = withAlpha(accent, 0.9); g.fillRect(ex, H * 0.79, 46 * u, 46 * u);
  label(g, 'OFF GRID ↗', ex, H * 0.79 - 14 * u, 18 * u, accent, 700, 'DejaVu Sans Mono');

  label(g, `SNAP  CUBIC-BEZIER(.7,0,.2,1)   ·   ${A.shotNumber}/${A.totalShots}`, M, H - M * 0.9, 19 * u, mute, 500, 'DejaVu Sans Mono');
  chrome(ctx, { color: ink, dim: '#9A9891' });
}

// ----------------------------------------------------------------- 2. NEON ---
function neon(ctx) {
  const { g, W, H, u, M, P, A, t, accent } = ctx;
  const C = content(ctx), ap = appearance(A);
  const second = complement(accent);
  fill(g, W, H, '#05070E');

  const rg = g.createRadialGradient(W * 0.5, H * 0.42, 0, W * 0.5, H * 0.42, W * 0.82);
  rg.addColorStop(0, withAlpha(accent, 0.20)); rg.addColorStop(0.55, withAlpha(accent, 0.05)); rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg; g.fillRect(0, 0, W, H);

  // Rain and wet asphalt.
  g.save();
  for (let i = 0; i < 70; i++) {
    const x = hash(i * 3.1) * W;
    const speed = 600 + hash(i * 7.7) * 900;
    const y = (hash(i * 5.3) * H + t * speed * u) % (H * 1.2) - H * 0.1;
    const len = (30 + hash(i * 2.9) * 90) * u;
    line(g, x, y, x - 8 * u, y + len, withAlpha('#BFD8FF', 0.05 + hash(i) * 0.07), 1.4 * u);
  }
  g.fillStyle = withAlpha(accent, 0.045); g.fillRect(0, H * 0.79, W, H * 0.21);
  for (let i = 0; i < 22; i++) {
    const y = H * 0.79 + hash(i * 11) * H * 0.21;
    line(g, 0, y, W, y, withAlpha(accent, 0.05), u);
  }
  g.restore();

  // Sign board with a flickering tube frame.
  const fx = M * 0.8, fy = H * 0.115, fw = W - fx * 2, fh = H * 0.66;
  g.save();
  g.fillStyle = withAlpha(darken(accent, 0.72), 0.35);
  roundRect(g, fx, fy, fw, fh, 26 * u); g.fill();
  const flick = 0.78 + 0.22 * hash(ap.beatIndex * 3.7 + 1);
  g.globalAlpha = flick * clamp(A.exit * 3);
  g.strokeStyle = accent; g.lineWidth = 6 * u; g.shadowColor = accent; g.shadowBlur = 30 * u;
  roundRect(g, fx, fy, fw, fh, 26 * u); g.stroke();
  // a chasing border on 16ths
  g.strokeStyle = second; g.lineWidth = 3 * u; g.shadowColor = second; g.shadowBlur = 18 * u;
  const chase = (A.beat * 4) % 1;
  g.setLineDash([fw * 0.12, fw * 0.88]); g.lineDashOffset = -fw * chase;
  roundRect(g, fx + 10 * u, fy + 10 * u, fw - 20 * u, fh - 20 * u, 20 * u); g.stroke();
  g.setLineDash([]);
  g.restore();

  // Tube lettering: coloured stroke + halo + white-hot core.
  const tube = (text, x, y, w, h, size, color) => drawFitted(g, text, {
    x, y, w, h, size, minSize: 30 * u, weight: 800, family: fontFor(text),
    color: '#F3FFFD', stroke: true, strokeColor: color, strokeWidth: 7 * u,
    shadowColor: color, shadowBlur: 26 * u, reveal: ap.reveal, alpha: ap.alpha,
  });
  label(g, `SIGN ${C.num}  /  ${C.kicker}`, fx + 34 * u, fy + 62 * u, 22 * u, withAlpha(second, 0.85), 600, 'DejaVu Sans Mono');
  tube(C.heading, fx + 34 * u, fy + fh * 0.20, fw - 68 * u, fh * 0.42, 116 * u, accent);
  drawFitted(g, C.detail, {
    x: fx + 34 * u, y: fy + fh * 0.68, w: fw - 68 * u, h: fh * 0.18,
    size: 32 * u, minSize: 17 * u, weight: 500, family: fontFor(C.detail),
    color: withAlpha('#D8F7FF', 0.86), reveal: eio(clamp(A.enter - 0.1)), alpha: ap.alpha,
  });

  // Electrodes.
  [fx, fx + fw].forEach((x, i) => {
    dot(g, x, fy + fh * 0.5, 7 * u, i ? second : accent);
    dot(g, x, fy + fh * 0.5, 15 * u, withAlpha(i ? second : accent, 0.18));
  });
  label(g, 'GLASS / GAS / 30 FPS', M, H - M * 0.9, 19 * u, withAlpha('#9FB6CC', 0.7), 500, 'DejaVu Sans Mono');
  chrome(ctx, { color: '#E8FBFF', dim: withAlpha('#BBD8E8', 0.5) });
}

// -------------------------------------------------------------- 3. KEYNOTE ---
function keynote(ctx) {
  const { g, W, H, u, M, P, A, accent } = ctx;
  const C = content(ctx), ap = appearance(A);
  fill(g, W, H, '#08090D');

  const g1 = g.createRadialGradient(W * 0.78, H * 0.18, 0, W * 0.78, H * 0.18, W * 0.95);
  g1.addColorStop(0, withAlpha(accent, 0.34)); g1.addColorStop(1, 'rgba(0,0,0,0)');
  const g2 = g.createRadialGradient(W * 0.12, H * 0.82, 0, W * 0.12, H * 0.82, W * 0.9);
  g2.addColorStop(0, withAlpha(complement(accent), 0.18)); g2.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = g1; g.fillRect(0, 0, W, H);
  g.fillStyle = g2; g.fillRect(0, 0, W, H);

  // Fine dot grid.
  g.save(); g.fillStyle = withAlpha('#ffffff', 0.055);
  for (let x = M; x < W - M; x += 42 * u) for (let y = H * 0.1; y < H * 0.9; y += 42 * u) dot(g, x, y, 1.1 * u, withAlpha('#ffffff', 0.06));
  g.restore();

  // Gentle push-in over each shot.
  g.save();
  const zoom = 1 + 0.035 * eio(clamp(A.local));
  g.translate(W / 2, H / 2); g.scale(zoom, zoom); g.translate(-W / 2, -H / 2);

  dot(g, M + 8 * u, H * 0.155, 7 * u, accent);
  label(g, C.kicker + '  ·  ' + C.num, M + 28 * u, H * 0.155 + 8 * u, 21 * u, withAlpha('#ffffff', 0.62), 600, 'DejaVu Sans Mono');

  drawFitted(g, C.heading, {
    x: M, y: H * 0.205, w: W - 2 * M, h: H * 0.30, size: 112 * u, minSize: 36 * u,
    weight: 800, family: fontFor(C.heading), color: '#FFFFFF', reveal: ap.reveal, alpha: ap.alpha,
  });
  drawFitted(g, C.detail, {
    x: M, y: H * 0.535, w: (W - 2 * M) * 0.86, h: H * 0.11, size: 33 * u, minSize: 17 * u,
    weight: 400, family: fontFor(C.detail), color: withAlpha('#FFFFFF', 0.68),
    reveal: eio(clamp(A.enter - 0.1)), alpha: ap.alpha,
  });

  // Spec card.
  const cx = M, cy = H * 0.665, cw = W - 2 * M, ch = H * 0.185;
  g.save();
  g.fillStyle = withAlpha('#FFFFFF', 0.055); g.strokeStyle = withAlpha('#FFFFFF', 0.14); g.lineWidth = 1.5 * u;
  roundRect(g, cx, cy, cw, ch, 24 * u); g.fill(); g.stroke();
  g.restore();
  label(g, `0${C.num}`, cx + 34 * u, cy + ch * 0.62, 84 * u, withAlpha(accent, 0.95), 800, 'Inter');
  label(g, 'SHOT / BUILD', cx + 34 * u, cy + ch * 0.88, 19 * u, withAlpha('#ffffff', 0.5), 600, 'DejaVu Sans Mono');
  const bx = cx + cw * 0.42, bw = cw * 0.5, by = cy + ch * 0.55;
  g.fillStyle = withAlpha('#ffffff', 0.13); g.fillRect(bx, by, bw, 8 * u);
  g.fillStyle = accent; g.fillRect(bx, by, bw * eio(clamp(A.local * 1.05)), 8 * u);
  label(g, `${Math.round(eio(clamp(A.local)) * 100)}%`, bx, by - 16 * u, 20 * u, withAlpha('#ffffff', 0.7), 600, 'DejaVu Sans Mono');
  g.restore();

  chrome(ctx, { color: '#FFFFFF', dim: withAlpha('#FFFFFF', 0.52) });
}

// ------------------------------------------------------------- 4. BLUEPRINT ---
function blueprint(ctx) {
  const { g, W, H, u, M, P, A, accent } = ctx;
  const C = content(ctx), ap = appearance(A);
  const paper = '#0A2942', cyan = accent, pale = '#C7EEFF', dim = withAlpha(cyan, 0.32);
  fill(g, W, H, paper);

  // Drafting grid: minor 40px, major 200px.
  const step = 40 * u;
  g.save();
  for (let x = 0; x <= W; x += step) line(g, x, 0, x, H, withAlpha(cyan, 0.075), u);
  for (let y = 0; y <= H; y += step) line(g, 0, y, W, y, withAlpha(cyan, 0.075), u);
  for (let x = 0; x <= W; x += step * 5) line(g, x, 0, x, H, withAlpha(cyan, 0.17), u);
  for (let y = 0; y <= H; y += step * 5) line(g, 0, y, W, y, withAlpha(cyan, 0.17), u);
  g.restore();

  // Corner brackets + crosshair.
  const b = 26 * u;
  [[M, H * 0.10, 1, 1], [W - M, H * 0.10, -1, 1], [M, H * 0.86, 1, -1], [W - M, H * 0.86, -1, -1]].forEach(([x, y, sx, sy]) => {
    line(g, x, y, x + sx * b, y, cyan, 2 * u); line(g, x, y, x, y + sy * b, cyan, 2 * u);
  });
  line(g, W / 2, H * 0.42 - 16 * u, W / 2, H * 0.42 + 16 * u, dim, u);
  line(g, W / 2 - 16 * u, H * 0.42, W / 2 + 16 * u, H * 0.42, dim, u);

  label(g, `FIG. ${C.num}   ·   ${C.kicker}`, M, H * 0.125, 21 * u, pale, 600, 'DejaVu Sans Mono');
  label(g, 'SCALE 1:1  /  REV B', W - M, H * 0.125, 21 * u, dim, 600, 'DejaVu Sans Mono', 'right');

  // Dimension line that draws itself.
  const dy = H * 0.205;
  lineGrow(g, M, dy, W - M, dy, ap.reveal, cyan, 2 * u);
  arrow(g, M, dy, -1, 10 * u, cyan); arrow(g, W - M, dy, 1, 10 * u, cyan);
  label(g, `${Math.round(W)} PX`, W / 2, dy - 12 * u, 19 * u, dim, 600, 'DejaVu Sans Mono', 'center');

  // Outline heading: cyan stroke, almost-transparent fill.
  drawFitted(g, C.heading, {
    x: M, y: H * 0.27, w: W - 2 * M, h: H * 0.30, size: 112 * u, minSize: 36 * u,
    weight: 800, family: fontFor(C.heading), color: withAlpha(cyan, 0.055),
    stroke: true, strokeColor: cyan, strokeWidth: 2.2 * u, reveal: ap.reveal, alpha: ap.alpha,
  });
  lineGrow(g, M, H * 0.585, W - M, H * 0.585, ap.reveal, withAlpha(cyan, 0.6), 1.5 * u, [10 * u, 8 * u]);
  drawFitted(g, C.detail, {
    x: M, y: H * 0.615, w: W - 2 * M, h: H * 0.12, size: 32 * u, minSize: 17 * u,
    weight: 500, family: fontFor(C.detail), color: pale,
    reveal: eio(clamp(A.enter - 0.1)), alpha: ap.alpha,
  });

  // A little technical callout box.
  const cy = H * 0.755, ch = H * 0.085;
  g.save(); g.strokeStyle = dim; g.lineWidth = 1.5 * u; g.setLineDash([8 * u, 7 * u]);
  roundRect(g, M, cy, W - 2 * M, ch, 8 * u); g.stroke(); g.restore();
  label(g, `DETAIL ${C.num}  /  ${Math.round(A.beat)} BEATS  /  ${P.fps} FPS`, M + 22 * u, cy + ch * 0.62, 20 * u, pale, 600, 'DejaVu Sans Mono');

  chrome(ctx, { color: pale, dim: withAlpha(cyan, 0.55) });
}

// ----------------------------------------------------------------- 5. RISO ---
const GRAIN = (() => { const r = mulberry(19); return Array.from({ length: 320 }, () => [r(), r(), r()]); })();

function riso(ctx) {
  const { g, W, H, u, M, P, A, t, accent } = ctx;
  const C = content(ctx), ap = appearance(A);
  const paper = '#F5EBDB', ink = '#1C1B19', second = complement(accent);
  fill(g, W, H, paper);

  // Paper grain.
  g.save(); g.fillStyle = withAlpha('#6B5B45', 0.10);
  for (const [x, y, s] of GRAIN) dot(g, x * W, y * H, (0.6 + s * 1.6) * u, withAlpha('#6B5B45', 0.09));
  g.restore();

  // Halftone field in the second ink.
  g.save(); g.globalAlpha = 0.5;
  for (let x = W * 0.62; x < W * 0.98; x += 18 * u) for (let y = H * 0.10; y < H * 0.42; y += 18 * u) {
    const d = (hash(x * 0.013 + y * 0.021) * 4 + 1.5) * u;
    dot(g, x, y, d, withAlpha(second, 0.55));
  }
  g.restore();

  // Two-colour overprint with a registration error.
  g.save();
  g.globalCompositeOperation = 'multiply';
  const stamp = back(clamp(A.enter));
  g.save();
  g.translate(W * 0.5, H * 0.43); g.rotate(-0.055 + 0.02 * Math.sin(t * 0.6)); g.scale(stamp, stamp);
  g.fillStyle = withAlpha(accent, 0.82);
  roundRect(g, -W * 0.40, -H * 0.105, W * 0.80, H * 0.21, 4 * u); g.fill();
  g.fillStyle = withAlpha(second, 0.55);
  g.beginPath(); g.arc(-W * 0.30, 0, H * 0.085, 0, TAU); g.fill();
  g.restore();
  g.restore();

  // Misregistered ink slab.
  const bx = M, by = H * 0.275, bw = (W - 2 * M) * (0.34 + 0.30 * ap.reveal), bh = H * 0.055;
  g.fillStyle = withAlpha(accent, 0.35); g.fillRect(bx + 7 * u, by + 6 * u, bw, bh);
  g.fillStyle = ink; g.fillRect(bx, by, bw, bh);
  label(g, `${C.kicker}  ${C.num}`, bx + 14 * u, by + bh * 0.74, 24 * u, paper, 700, 'DejaVu Sans Mono');

  // Heading stamped in ink, with an accent ghost 6px off.
  const hx = M, hy = H * 0.37, hw = W - 2 * M, hh = H * 0.28;
  drawFitted(g, C.heading, {
    x: hx + 8 * u, y: hy + 7 * u, w: hw, h: hh, size: 118 * u, minSize: 38 * u,
    weight: 900, family: fontFor(C.heading), color: withAlpha(accent, 0.55),
    reveal: ap.reveal, alpha: ap.alpha * 0.8,
  });
  drawFitted(g, C.heading, {
    x: hx, y: hy, w: hw, h: hh, size: 118 * u, minSize: 38 * u,
    weight: 900, family: fontFor(C.heading), color: ink, reveal: ap.reveal, alpha: ap.alpha,
  });

  line(g, M, hy + hh + 30 * u, W - M, hy + hh + 30 * u, ink, 2 * u);
  drawFitted(g, C.detail, {
    x: M, y: hy + hh + 56 * u, w: (W - 2 * M) * 0.86, h: H * 0.115,
    size: 34 * u, minSize: 17 * u, weight: 500, family: fontFor(C.detail), color: ink,
    reveal: eio(clamp(A.enter - 0.1)), alpha: ap.alpha,
  });

  // Rotated tape strip.
  g.save(); g.translate(W * 0.84, H * 0.83); g.rotate(-0.28);
  g.fillStyle = withAlpha(second, 0.75); g.fillRect(-W * 0.16, -22 * u, W * 0.32, 44 * u);
  label(g, 'PRINTED, NOT FILMED', 0, 8 * u, 19 * u, paper, 700, 'DejaVu Sans Mono', 'center');
  g.restore();

  label(g, `2 INKS  /  ${P.bpm} BPM  /  300 DPI`, M, H - M * 0.9, 19 * u, '#8A7B66', 600, 'DejaVu Sans Mono');
  chrome(ctx, { color: ink, dim: '#9A8C76' });
}

// -------------------------------------------------------------- 6. CAPTION ---
function caption(ctx) {
  const { g, W, H, u, M, P, A, accent } = ctx;
  const C = content(ctx), ap = appearance(A);
  fill(g, W, H, '#0A0A0A');

  const words = String(C.heading).trim().split(/\s+/).filter(Boolean).slice(0, 7);
  const step = A.duration / Math.max(1, words.length);
  const wi = clamp(Math.floor((A.t - A.start) / step), 0, words.length - 1);
  const wordT = (A.t - A.start) - wi * step;
  const punch = 1 + 0.075 * (1 - eo(clamp(wordT / 0.24)));
  const bandColor = wi % 2 === 0 ? '#F5F5F2' : accent;
  const bandInk = wi % 2 === 0 ? '#0A0A0A' : '#0A0A0A';

  // Hard-cut word band.
  const by = H * 0.255, bh = H * 0.345;
  g.fillStyle = bandColor; g.fillRect(0, by, W, bh);
  g.save(); g.translate(W / 2, by + bh / 2); g.scale(punch, punch); g.translate(-W / 2, -(by + bh / 2));
  drawFitted(g, words[wi] || '', {
    x: M * 0.7, y: by + bh * 0.20, w: W - M * 1.4, h: bh * 0.62,
    size: 188 * u, minSize: 56 * u, weight: 900, family: fontFor(words[wi] || ''),
    color: bandInk, align: 'center', reveal: 1, alpha: clamp(A.exit * 3),
  });
  g.restore();

  // Small kinetic strip of every word, current one marked.
  words.forEach((w, i) => {
    const x = M + i * ((W - 2 * M) / words.length);
    label(g, w.toUpperCase(), x, H * 0.205, 19 * u, i === wi ? accent : withAlpha('#ffffff', 0.35), 700, 'DejaVu Sans Mono');
    if (i === wi) { g.fillStyle = accent; g.fillRect(x, H * 0.212, ((W - 2 * M) / words.length) * 0.7, 3 * u); }
  });

  // Lower third: detail + a sliding accent bar.
  const ly = H * 0.655;
  g.fillStyle = accent; g.fillRect(0, ly, W * (0.12 + 0.16 * seg(A.t, A.start, A.end)), 8 * u);
  drawFitted(g, C.detail, {
    x: M, y: ly + 38 * u, w: W - 2 * M, h: H * 0.14, size: 40 * u, minSize: 19 * u,
    weight: 700, family: fontFor(C.detail), color: '#FFFFFF',
    reveal: eio(clamp(A.enter - 0.05)), alpha: clamp(A.exit * 2.4),
  });

  label(g, `${C.kicker} ${C.num}  ·  00:${String(Math.floor(A.t)).padStart(2, '0')}`, M, H * 0.125, 22 * u, withAlpha('#ffffff', 0.55), 600, 'DejaVu Sans Mono');
  label(g, 'NO FADES. ONLY CUTS.', M, H - M * 0.9, 19 * u, withAlpha('#ffffff', 0.4), 600, 'DejaVu Sans Mono');
  chrome(ctx, { color: '#FFFFFF', dim: withAlpha('#FFFFFF', 0.45) });
}

// ------------------------------------------------------------- 7. MYTHIC ---
const GOLD = '#E8B44A', BONE = '#F4E6D0', EMBER = '#FF3B1F';

function mythicDust(ctx, warm) {
  const { g, W, H, u, t } = ctx;
  for (let i = 0; i < 110; i++) {
    const x = hash(i * 3.71) * W;
    const y = (hash(i * 8.13) * H + t * (10 + hash(i * 2.9) * 30) * u) % (H * 1.15) - H * 0.07;
    const r = (0.7 + hash(i * 5.3) * 2.5) * u;
    dot(g, x, y, r, withAlpha(warm ? '#FFD9A0' : '#FFC0A8', 0.04 + hash(i * 7.7) * 0.13));
  }
}

function mythicVignette(ctx, strength = 0.76) {
  const { g, W, H } = ctx;
  const vg = g.createRadialGradient(W / 2, H * 0.48, W * 0.18, W / 2, H * 0.48, W * 0.86);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${strength})`);
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
}

function mythicBase(ctx, warm = false, red = false) {
  const { g, W, H, u } = ctx;
  fill(g, W, H, warm ? '#241610' : '#070506');
  const rg = g.createRadialGradient(W * 0.5, H * 0.46, 0, W * 0.5, H * 0.46, W * 0.92);
  rg.addColorStop(0, warm ? 'rgba(214,146,66,.26)' : red ? 'rgba(150,10,10,.34)' : 'rgba(74,8,10,.30)');
  rg.addColorStop(0.55, warm ? 'rgba(120,70,30,.12)' : 'rgba(60,6,8,.12)');
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg; g.fillRect(0, 0, W, H);
  // static embers / grain
  for (let i = 0; i < 90; i++) {
    const x = hash(i * 13.1) * W, y = hash(i * 17.7) * H;
    dot(g, x, y, (0.4 + hash(i * 3.3) * 1.1) * u, withAlpha('#FF9A6A', 0.05));
  }
}

function crackLine(g, x, y, len, angle, color, width, seed) {
  let cx = x, cy = y, a = angle;
  g.save(); g.strokeStyle = color; g.lineWidth = width; g.lineCap = 'round';
  g.beginPath(); g.moveTo(cx, cy);
  const steps = 7;
  for (let i = 1; i <= steps; i++) {
    a += (hash(seed * 9 + i) - 0.5) * 0.55;
    cx += Math.cos(a) * len / steps; cy += Math.sin(a) * len / steps;
    g.lineTo(cx, cy);
  }
  g.stroke(); g.restore();
}
function crackFan(ctx, cx, cy, count, len, color, width, seed) {
  for (let i = 0; i < count; i++) {
    const a = -Math.PI / 2 + (i - (count - 1) / 2) * (Math.PI * 1.25 / count) + (hash(seed + i) - 0.5) * 0.3;
    crackLine(ctx.g, cx, cy, len * (0.55 + hash(seed * 3 + i) * 0.65), a, color, width, seed + i);
  }
}

function mythicWheel(ctx, cx, cy, r, sink, alpha = 1) {
  const { g, u, t } = ctx;
  g.save(); g.globalAlpha *= alpha; g.translate(cx, cy + sink);
  g.shadowColor = GOLD; g.shadowBlur = 34 * u;
  g.strokeStyle = GOLD; g.lineWidth = 15 * u;
  g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
  g.shadowBlur = 0;
  g.strokeStyle = darken(GOLD, 0.42); g.lineWidth = 5 * u;
  g.beginPath(); g.arc(0, 0, r * 0.84, 0, TAU); g.stroke();
  for (let i = 0; i < 12; i++) {
    const a = i * TAU / 12 + t * 0.12;
    line(g, Math.cos(a) * r * 0.16, Math.sin(a) * r * 0.16, Math.cos(a) * r * 0.94, Math.sin(a) * r * 0.94, GOLD, 5 * u);
  }
  dot(g, 0, 0, r * 0.18, GOLD); dot(g, 0, 0, r * 0.085, '#4A2F10');
  g.restore();
}
function mythicGround(ctx, top, warm = false) {
  const { g, W, H } = ctx;
  const gr = g.createLinearGradient(0, top, 0, H);
  gr.addColorStop(0, warm ? '#6B4526' : '#3A0A0C');
  gr.addColorStop(1, warm ? '#1A100A' : '#0A0304');
  g.fillStyle = gr; g.fillRect(0, top, W, H - top);
  // blood / ghee sheen
  g.fillStyle = warm ? withAlpha(GOLD, 0.10) : withAlpha('#C4161B', 0.16);
  g.fillRect(0, top, W, (H - top) * 0.18);
}
function ellipse(g, x, y, rx, ry, color) {
  g.save(); g.translate(x, y); g.scale(1, ry / rx);
  g.beginPath(); g.arc(0, 0, rx, 0, TAU); g.fillStyle = color; g.fill(); g.restore();
}
function mythicGirl(ctx, x, y, s) {
  const { g, u } = ctx;
  // head, body, arms, tears — a simple silhouette
  dot(g, x, y - s * 1.35, s * 0.42, '#1A0E08');
  g.fillStyle = '#1A0E08';
  g.beginPath(); g.moveTo(x - s * 0.55, y); g.quadraticCurveTo(x, y - s * 0.95, x + s * 0.55, y); g.closePath(); g.fill();
  line(g, x - s * 0.4, y - s * 0.55, x - s * 0.85, y - s * 0.2, '#1A0E08', s * 0.16);
  line(g, x + s * 0.4, y - s * 0.55, x + s * 0.85, y - s * 0.25, '#1A0E08', s * 0.16);
  // tears
  dot(g, x - s * 0.14, y - s * 1.18, s * 0.06, '#9FD8FF');
  dot(g, x + s * 0.16, y - s * 1.10, s * 0.05, '#9FD8FF');
}

function mythicVisual(ctx, visual, p) {
  const { g, W, H, u, M, t, accent } = ctx;
  if (visual === 'wheel') {
    mythicGround(ctx, H * 0.72);
    crackFan(ctx, W * 0.5, H * 0.73, 9, W * 0.42, withAlpha(EMBER, 0.85), 2.4 * u, 11);
    g.save(); g.shadowColor = EMBER; g.shadowBlur = 26 * u;
    crackFan(ctx, W * 0.5, H * 0.73, 5, W * 0.30, withAlpha('#FF6A3D', 0.55), 5 * u, 31);
    g.restore();
    mythicWheel(ctx, W * 0.5, H * 0.60, W * 0.30, H * 0.11 * (0.4 + p * 0.6), 1);
    // sinking dust puff
    for (let i = 0; i < 18; i++) {
      const a = hash(i * 4.1) * TAU, rr = (0.12 + hash(i) * 0.34) * W;
      dot(g, W * 0.5 + Math.cos(a) * rr, H * 0.72 + Math.sin(a) * rr * 0.16, (2 + hash(i * 2) * 6) * u, withAlpha('#7A2B1C', 0.18));
    }
  } else if (visual === 'ghee') {
    mythicGround(ctx, H * 0.62, true);
    // broken pot shards
    g.save(); g.translate(W * 0.56, H * 0.60); g.rotate(-0.35);
    g.strokeStyle = '#7A4A28'; g.lineWidth = 9 * u;
    g.beginPath(); g.arc(0, 0, W * 0.13, Math.PI * 0.15, Math.PI * 0.95); g.stroke();
    g.restore();
    g.save(); g.translate(W * 0.70, H * 0.64); g.rotate(0.5);
    g.strokeStyle = '#5E3720'; g.lineWidth = 7 * u;
    g.beginPath(); g.arc(0, 0, W * 0.09, Math.PI * 1.05, Math.PI * 1.75); g.stroke();
    g.restore();
    // spilled ghee
    ellipse(g, W * 0.60, H * 0.665, W * (0.18 + p * 0.12), H * 0.035, withAlpha(GOLD, 0.75));
    g.save(); g.shadowColor = GOLD; g.shadowBlur = 24 * u;
    ellipse(g, W * 0.60, H * 0.663, W * 0.12, H * 0.018, withAlpha('#FFE49A', 0.55)); g.restore();
    mythicGirl(ctx, W * 0.28, H * 0.60, W * 0.14);
    // heat shimmer
    g.fillStyle = withAlpha('#FFC06A', 0.05); g.fillRect(0, 0, W, H);
  } else if (visual === 'squeeze') {
    mythicGround(ctx, H * 0.70);
    crackFan(ctx, W * 0.5, H * 0.70, 11, W * 0.46, withAlpha(EMBER, 0.6), 2.2 * u, 71);
    // two fists
    const fy = H * 0.46, fw = W * 0.26, fh = H * 0.115;
    [M * 0.7, W - M * 0.7 - fw].forEach((fx, i) => {
      g.save(); g.translate(fx + fw / 2, fy); g.rotate(i ? 0.10 : -0.10);
      g.fillStyle = '#C99A55'; g.shadowColor = GOLD; g.shadowBlur = 18 * u;
      roundRect(g, -fw / 2, -fh / 2, fw, fh, 18 * u); g.fill();
      g.shadowBlur = 0; g.strokeStyle = '#6B431B'; g.lineWidth = 2 * u;
      for (let k = 1; k < 4; k++) line(g, -fw / 2 + k * fw / 4, -fh * 0.32, -fw / 2 + k * fw / 4, fh * 0.32, '#6B431B', 2 * u);
      g.restore();
    });
    // soil being crushed between them
    g.fillStyle = '#3A2412';
    g.beginPath(); g.moveTo(W * 0.42, fy - fh * 0.35); g.lineTo(W * 0.58, fy - fh * 0.35);
    g.lineTo(W * 0.55, fy + fh * 0.42); g.lineTo(W * 0.45, fy + fh * 0.42); g.closePath(); g.fill();
    // golden drops into the pot
    for (let i = 0; i < 9; i++) {
      const dx = W * (0.44 + hash(i * 3.3) * 0.12);
      const dy = fy + fh * 0.5 + ((t * 130 * u + hash(i) * H * 0.22) % (H * 0.18));
      dot(g, dx, dy, (2.5 + hash(i * 5) * 3) * u, withAlpha('#FFDF8A', 0.9));
    }
    g.save(); g.strokeStyle = GOLD; g.lineWidth = 8 * u;
    g.beginPath(); g.arc(W * 0.5, H * 0.665, W * 0.085, Math.PI, TAU); g.stroke(); g.restore();
  } else if (visual === 'curse') {
    mythicGround(ctx, H * 0.80);
    g.save(); g.shadowColor = EMBER; g.shadowBlur = 30 * u;
    crackFan(ctx, W * 0.5, H * 0.82, 13, W * 0.62, withAlpha('#FF4A22', 0.75), 3 * u, 91); g.restore();
    // An ember halo makes the rising silhouette readable against the black.
    const hg = g.createRadialGradient(W * 0.5, H * 0.52, 0, W * 0.5, H * 0.52, W * 0.48);
    hg.addColorStop(0, withAlpha('#FF2A12', 0.30)); hg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = hg; g.fillRect(0, 0, W, H);
    // Bhudevi rising
    const rise = eio(clamp(p * 1.4));
    g.save(); g.translate(0, (1 - rise) * H * 0.22);
    g.fillStyle = '#150607';
    g.beginPath();
    g.moveTo(W * 0.16, H);
    g.bezierCurveTo(W * 0.22, H * 0.74, W * 0.34, H * 0.60, W * 0.43, H * 0.54);
    g.bezierCurveTo(W * 0.47, H * 0.42, W * 0.53, H * 0.42, W * 0.57, H * 0.54);
    g.bezierCurveTo(W * 0.66, H * 0.60, W * 0.78, H * 0.74, W * 0.84, H);
    g.closePath(); g.fill();
    g.strokeStyle = withAlpha('#FF6A3A', 0.42); g.lineWidth = 2.5 * u; g.stroke();
    dot(g, W * 0.5, H * 0.40, W * 0.105, '#150607');
    g.save(); g.strokeStyle = withAlpha('#FF6A3A', 0.40); g.lineWidth = 2 * u;
    g.beginPath(); g.arc(W * 0.5, H * 0.40, W * 0.105, 0, TAU); g.stroke(); g.restore();
    // crown
    for (let i = -2; i <= 2; i++) {
      g.fillStyle = GOLD;
      g.beginPath(); g.moveTo(W * 0.5 + i * W * 0.035 - W * 0.012, H * 0.325);
      g.lineTo(W * 0.5 + i * W * 0.035, H * 0.285); g.lineTo(W * 0.5 + i * W * 0.035 + W * 0.012, H * 0.325); g.closePath(); g.fill();
    }
    // glowing eyes
    [-1, 1].forEach(s => {
      const ex = W * 0.5 + s * W * 0.038, ey = H * 0.402;
      dot(g, ex, ey, 15 * u, withAlpha('#FF3A12', 0.22));
      g.save(); g.shadowColor = '#FFE9C0'; g.shadowBlur = 32 * u;
      dot(g, ex, ey, 7 * u, '#FFF0CF'); g.restore();
    });
    // raised arms
    line(g, W * 0.43, H * 0.55, W * 0.28, H * 0.44, '#150607', 14 * u);
    line(g, W * 0.57, H * 0.55, W * 0.72, H * 0.44, '#150607', 14 * u);
    g.restore();
  } else if (visual === 'arrow') {
    mythicGround(ctx, H * 0.76);
    crackFan(ctx, W * 0.5, H * 0.77, 7, W * 0.38, withAlpha(EMBER, 0.6), 2.2 * u, 131);
    mythicWheel(ctx, W * 0.5, H * 0.66, W * 0.26, H * 0.085, 1);
    // Karna straining: a simple golden silhouette pulling the wheel
    g.save(); g.fillStyle = '#B98A3E';
    dot(g, W * 0.5, H * 0.40, W * 0.065, '#B98A3E');
    g.beginPath(); g.moveTo(W * 0.44, H * 0.47); g.lineTo(W * 0.56, H * 0.47);
    g.lineTo(W * 0.60, H * 0.62); g.lineTo(W * 0.40, H * 0.62); g.closePath(); g.fill();
    line(g, W * 0.45, H * 0.50, W * 0.34, H * 0.60, '#B98A3E', 13 * u);
    line(g, W * 0.55, H * 0.50, W * 0.66, H * 0.60, '#B98A3E', 13 * u);
    g.restore();
    // arrow streak
    const ax = lerp(-W * 0.2, W * 1.2, clamp((t - (ctx.A.start + 0.6)) / 1.1));
    g.save(); g.shadowColor = '#FFD9A0'; g.shadowBlur = 22 * u;
    line(g, ax - W * 0.34, H * 0.34, ax, H * 0.385, '#FFE9C0', 5 * u);
    g.restore();
    g.fillStyle = '#FFE9C0';
    g.beginPath(); g.moveTo(ax, H * 0.385); g.lineTo(ax - W * 0.035, H * 0.37); g.lineTo(ax - W * 0.035, H * 0.40); g.closePath(); g.fill();
    // cut to black
    const fade = seg(t, ctx.A.end - 1.1, ctx.A.end);
    g.fillStyle = `rgba(0,0,0,${clamp(fade)})`; g.fillRect(0, 0, W, H);
  } else {
    mythicGround(ctx, H * 0.74);
    crackFan(ctx, W * 0.5, H * 0.75, 9, W * 0.42, withAlpha(EMBER, 0.6), 2.4 * u, 7);
  }
}

function mythic(ctx) {
  const { g, W, H, u, M, P, A, t, accent } = ctx;
  const C = content(ctx), ap = appearance(A);
  const visual = A.scene?.visual || 'wheel';
  const warm = visual === 'ghee';
  const red = visual === 'curse' || visual === 'wheel';

  mythicBase(ctx, warm, red);
  mythicVisual(ctx, visual, ap.reveal);
  mythicDust(ctx, warm);
  mythicVignette(ctx, warm ? 0.62 : 0.78);

  // Top kicker
  label(g, `महाभारत  ·  कर्ण पर्व  ·  ${String(A.shotNumber).padStart(2, '0')}/${String(A.totalShots).padStart(2, '0')}`,
    M, H * 0.075, 20 * u, withAlpha(BONE, 0.62), 600, fontFor('महाभारत'));

  const lines = C.heading.split('\n');
  if (lines.length > 1) {
    // Scene 1: two kinetic beats — fade, then red glow + shake.
    const p1 = clamp(seg(t, A.start + 0.15, A.start + 0.95)) * (1 - clamp(seg(t, A.start + 3.0, A.start + 3.8)));
    drawFitted(g, lines[0], {
      x: M, y: H * 0.155, w: W - 2 * M, h: H * 0.15, size: 76 * u, minSize: 32 * u,
      weight: 800, family: fontFor(lines[0]), color: BONE, alpha: p1,
      reveal: eio(clamp((t - A.start - 0.15) / 0.7)),
    });
    const q = clamp(seg(t, A.start + 3.3, A.start + 4.2));
    const shake = (1 - eio(clamp((t - A.start - 3.3) / 0.55))) * Math.sin(t * 47) * 7 * u;
    g.save(); g.translate(shake, Math.cos(t * 39) * 3 * u * (1 - q));
    drawFitted(g, lines[1], {
      x: M, y: H * 0.27, w: W - 2 * M, h: H * 0.28, size: 104 * u, minSize: 40 * u,
      weight: 900, family: fontFor(lines[1]), color: '#FFE6DE',
      shadowColor: accent, shadowBlur: 38 * u, alpha: q, reveal: eio(q),
    });
    g.restore();
    drawFitted(g, C.detail, {
      x: M, y: H * 0.60, w: W - 2 * M, h: H * 0.08, size: 30 * u, minSize: 17 * u,
      weight: 600, family: fontFor(C.detail), color: withAlpha(BONE, 0.72),
      reveal: eio(clamp(A.enter - 0.1)), alpha: ap.alpha,
    });
  } else {
    // Glitch split on the curse line.
    const glitch = visual === 'curse' && hash(Math.floor(t * 11)) > 0.87 ? 1 : 0;
    const curse = visual === 'curse';
    const textOpts = {
      x: M, y: curse ? H * 0.155 : H * 0.285, w: W - 2 * M,
      h: curse ? H * 0.235 : H * 0.29, size: curse ? 92 * u : 104 * u, minSize: 38 * u,
      weight: 900, family: fontFor(C.heading), color: BONE,
      shadowColor: accent, shadowBlur: 24 * u, reveal: ap.reveal, alpha: ap.alpha,
    };
    drawFitted(g, C.heading, textOpts);
    if (glitch) {
      drawFitted(g, C.heading, { ...textOpts, x: M + 9 * u, color: withAlpha('#00E5FF', 0.55), shadowBlur: 0, alpha: 0.5 * ap.alpha });
      drawFitted(g, C.heading, { ...textOpts, x: M - 9 * u, color: withAlpha(EMBER, 0.6), shadowBlur: 0, alpha: 0.5 * ap.alpha });
    }
    drawFitted(g, C.detail, {
      x: M, y: H * 0.635, w: W - 2 * M, h: H * 0.09, size: 31 * u, minSize: 17 * u,
      weight: 600, family: fontFor(C.detail), color: withAlpha(BONE, 0.78),
      reveal: eio(clamp(A.enter - 0.12)), alpha: ap.alpha,
    });
  }

  // SFX-synced flash: sub-drop, crush, thunder, arrow.
  const hits = P.audio?.sfx
    ? P.audio.sfx.map(s => Number(s.at) || 0)
    : timeline(P).filter(w => w.scene).map(w => w.start + (w.scene.visual === 'squeeze' ? 8 : w.scene.visual === 'curse' ? 7 : w.scene.visual === 'arrow' ? 2 : 0));
  let flash = 0;
  for (const h of hits) if (t >= h && t < h + 0.55) flash = Math.max(flash, 1 - (t - h) / 0.55);
  if (flash > 0) {
    g.fillStyle = withAlpha(visual === 'ghee' ? '#FFD9A0' : '#FF2A12', flash * 0.30);
    g.fillRect(0, 0, W, H);
  }

  // A thin ember progress rail instead of the default bright one.
  const y = H - M * 0.58, h = Math.max(2, 4 * u), w = W - 2 * M;
  g.fillStyle = withAlpha(BONE, 0.18); g.fillRect(M, y, w, h);
  g.fillStyle = accent; g.fillRect(M, y, w * clamp(t / P.duration), h);
  for (const win of timeline(P)) {
    if (win.number === 1) continue;
    const x = M + w * clamp(win.start / P.duration);
    g.fillStyle = withAlpha(BONE, 0.7); g.fillRect(x - u, y - 3 * u, 2 * u, h + 6 * u);
  }
}

const RENDERERS = { swiss, neon, keynote, blueprint, riso, caption, mythic };

export function drawFrame(g, W, H, t, rawProject) {
  const P = rawProject && rawProject.duration ? rawProject : normalizeProject(rawProject || {});
  const A = atTime(P, t);
  const ctx = makeCtx(g, W, H, t, P, A);
  g.save();
  (RENDERERS[P.style] || swiss)(ctx);
  g.restore();
}

export function posterFrame(g, W, H, t, project) { drawFrame(g, W, H, t, project); }
