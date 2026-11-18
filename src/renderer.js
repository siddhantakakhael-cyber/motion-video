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

// ------------------------------------------------------------- 8. CARTOON ---
// A bright, fully drawn 2D-cartoon telling of the same story: real characters,
// faces, scenery and comic effects — nothing hidden in silhouette.
const C_INK = '#2B1A12', C_SKIN = '#F8CFA1', C_SKIN_D = '#E2A273';
const C_GOLD = '#FFC93C', C_GOLD_D = '#DF9618', C_CREAM = '#FFF7E4';
const C_SKY = '#86D3FF', C_SKY_LO = '#E9F8FF', C_SUN = '#FFD84D';
const C_GRASS = '#79C95C', C_GRASS_D = '#4B9637', C_SOIL = '#D89A5B', C_SOIL_D = '#A96C38';
const C_RED = '#FF5A3C', C_TEAL = '#3BC0A8', C_TEAL_D = '#1E8C9B', C_CLOUD = '#FFFFFF';
const C_PINK = '#FF93A8', C_BLUE = '#4FB8FF', C_PURPLE = '#8A6BFF';

function celShape(g, fill, lw, fn) {
  g.beginPath(); fn();
  g.fillStyle = fill; g.fill();
  if (lw > 0) {
    g.strokeStyle = C_INK; g.lineWidth = lw; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke();
  }
}
function celEllipse(g, x, y, rx, ry, fill, lw = 4) { celShape(g, fill, lw, () => g.ellipse(x, y, rx, ry, 0, 0, TAU)); }
function celCircle(g, x, y, r, fill, lw = 4) { celEllipse(g, x, y, r, r, fill, lw); }
function celRect(g, x, y, w, h, r, fill, lw = 4) { celShape(g, fill, lw, () => g.roundRect(x, y, w, h, r)); }
function celLine(g, x1, y1, x2, y2, color, lw = 5) {
  g.save(); g.strokeStyle = color; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.restore();
}
function celArc(g, x, y, r, a0, a1, color, lw = 5) {
  g.save(); g.strokeStyle = color; g.lineWidth = lw; g.lineCap = 'round';
  g.beginPath(); g.arc(x, y, r, a0, a1); g.stroke(); g.restore();
}

function cartoonSun(g, x, y, r) {
  g.save(); g.strokeStyle = C_SUN; g.lineWidth = r * 0.13; g.lineCap = 'round';
  for (let i = 0; i < 12; i++) {
    const a = i * TAU / 12;
    g.beginPath(); g.moveTo(x + Math.cos(a) * r * 1.25, y + Math.sin(a) * r * 1.25);
    g.lineTo(x + Math.cos(a) * r * 1.65, y + Math.sin(a) * r * 1.65); g.stroke();
  }
  g.restore();
  celCircle(g, x, y, r, C_SUN, r * 0.09);
  celCircle(g, x - r * 0.28, y - r * 0.28, r * 0.16, withAlpha('#FFFFFF', 0.65), 0);
}
function cartoonCloud(g, x, y, s) {
  celRect(g, x - s, y - s * 0.38, s * 2, s * 0.78, s * 0.38, C_CLOUD, s * 0.06);
  celCircle(g, x - s * 0.5, y - s * 0.22, s * 0.48, C_CLOUD, s * 0.06);
  celCircle(g, x + s * 0.22, y - s * 0.38, s * 0.58, C_CLOUD, s * 0.06);
  celCircle(g, x + s * 0.66, y - s * 0.12, s * 0.40, C_CLOUD, s * 0.06);
}
function cartoonTree(g, x, y, s) {
  celRect(g, x - s * 0.10, y - s * 0.55, s * 0.20, s * 0.95, s * 0.06, C_SOIL_D, s * 0.05);
  celCircle(g, x - s * 0.32, y - s * 0.62, s * 0.42, C_GRASS, s * 0.05);
  celCircle(g, x + s * 0.30, y - s * 0.66, s * 0.44, C_GRASS_D, s * 0.05);
  celCircle(g, x, y - s * 0.95, s * 0.52, C_GRASS, s * 0.05);
}
function cartoonFlag(g, x, y, s, color) {
  celLine(g, x, y, x, y - s * 1.6, C_INK, s * 0.10);
  celShape(g, color, s * 0.06, () => { g.moveTo(x, y - s * 1.55); g.lineTo(x + s * 0.95, y - s * 1.25); g.lineTo(x, y - s * 0.95); g.closePath(); });
}
function cartoonDust(g, x, y, s) {
  celCircle(g, x - s * 0.45, y + s * 0.10, s * 0.34, C_CREAM, s * 0.05);
  celCircle(g, x, y - s * 0.12, s * 0.46, C_CLOUD, s * 0.05);
  celCircle(g, x + s * 0.48, y + s * 0.12, s * 0.32, C_CREAM, s * 0.05);
}
function cartoonBurst(g, cx, cy, r, fill, points = 12, lw = 5) {
  celShape(g, fill, lw, () => {
    for (let i = 0; i < points * 2; i++) {
      const a = i * Math.PI / points - Math.PI / 2;
      const rr = i % 2 ? r * 0.58 : r;
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.closePath();
  });
}
function cartoonMotion(g, cx, cy, r0, r1, count, color, lw = 5) {
  for (let i = 0; i < count; i++) {
    const a = i * TAU / count + 0.12;
    celLine(g, cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, color, lw);
  }
}
function cartoonLightning(g, x, y, s, color = C_SUN) {
  celShape(g, color, s * 0.06, () => {
    g.moveTo(x, y); g.lineTo(x - s * 0.35, y + s * 0.9); g.lineTo(x - s * 0.05, y + s * 0.9);
    g.lineTo(x - s * 0.30, y + s * 1.9); g.lineTo(x + s * 0.38, y + s * 0.78);
    g.lineTo(x + s * 0.06, y + s * 0.78); g.closePath();
  });
}

// A full little person: head, hair/crown, expressive face, tunic, arms, legs.
function cartoonPerson(g, x, y, s, o = {}) {
  const body = o.body || C_GOLD, lw = Math.max(2, s * 0.055);
  // legs
  celRect(g, x - s * 0.62, y + s * 1.45, s * 0.48, s * 0.95, s * 0.20, o.pants || C_SOIL_D, lw);
  celRect(g, x + s * 0.14, y + s * 1.45, s * 0.48, s * 0.95, s * 0.20, o.pants || C_SOIL_D, lw);
  // tunic
  celRect(g, x - s * 0.86, y + s * 0.48, s * 1.72, s * 1.28, s * 0.36, body, lw);
  celLine(g, x - s * 0.82, y + s * 1.18, x + s * 0.82, y + s * 1.18, C_GOLD_D, lw * 1.2);
  // arms
  g.save(); g.translate(x - s * 0.82, y + s * 0.68); g.rotate(o.armL ?? -0.45);
  celRect(g, -s * 0.22, -s * 0.16, s * 0.42, s * 1.15, s * 0.20, body, lw);
  celCircle(g, 0, s * 1.02, s * 0.26, C_SKIN, lw); g.restore();
  g.save(); g.translate(x + s * 0.82, y + s * 0.68); g.rotate(o.armR ?? 0.45);
  celRect(g, -s * 0.20, -s * 0.16, s * 0.42, s * 1.15, s * 0.20, body, lw);
  celCircle(g, 0, s * 1.02, s * 0.26, C_SKIN, lw); g.restore();
  // hair cap behind head
  celEllipse(g, x, y - s * 0.36, s * 0.98, s * 0.62, o.hair || '#3B2417', lw);
  // face
  celCircle(g, x, y, s, C_SKIN, lw);
  // ears
  celCircle(g, x - s * 0.96, y + s * 0.06, s * 0.20, C_SKIN, lw);
  celCircle(g, x + s * 0.96, y + s * 0.06, s * 0.20, C_SKIN, lw);
  // eyes
  const ex = s * 0.36, ey = y - s * 0.08;
  [-1, 1].forEach(d => {
    celEllipse(g, x + d * ex, ey, s * 0.24, s * 0.30, C_CLOUD, lw * 0.7);
    celCircle(g, x + d * ex + (o.look || 0) * s * 0.06, ey + s * 0.03, s * 0.12, o.eyes || C_INK, 0);
    celCircle(g, x + d * ex - s * 0.045, ey - s * 0.075, s * 0.045, C_CLOUD, 0);
  });
  // eyebrows
  const angry = o.mood === 'angry', worried = o.mood === 'worried';
  celLine(g, x - ex - s * 0.22, ey - s * 0.42 + (angry ? s * 0.12 : 0), x - ex + s * 0.18, ey - s * 0.42 + (angry ? -s * 0.02 : 0), C_INK, lw * 0.9);
  celLine(g, x + ex - s * 0.18, ey - s * 0.42 + (angry ? -s * 0.02 : 0), x + ex + s * 0.22, ey - s * 0.42 + (angry ? s * 0.12 : 0), C_INK, lw * 0.9);
  // mouth
  if (o.mood === 'shout') celEllipse(g, x, y + s * 0.46, s * 0.28, s * 0.20, '#8C2F2F', lw * 0.7);
  else if (worried || angry) celArc(g, x, y + s * 0.62, s * 0.30, Math.PI * 1.15, Math.PI * 1.85, C_INK, lw * 0.9);
  else celArc(g, x, y + s * 0.36, s * 0.32, Math.PI * 0.15, Math.PI * 0.85, C_INK, lw * 0.9);
  // moustache / crown / bow
  if (o.moustache) {
    celArc(g, x - s * 0.20, y + s * 0.30, s * 0.22, Math.PI * 0.1, Math.PI * 0.9, '#3B2417', lw * 0.8);
    celArc(g, x + s * 0.20, y + s * 0.30, s * 0.22, Math.PI * 0.1, Math.PI * 0.9, '#3B2417', lw * 0.8);
  }
  if (o.crown) {
    for (let i = -2; i <= 2; i++) celShape(g, C_GOLD, lw * 0.7, () => {
      const bx = x + i * s * 0.32;
      g.moveTo(bx - s * 0.13, y - s * 0.82); g.lineTo(bx, y - s * 1.35 - (i === 0 ? s * 0.16 : 0)); g.lineTo(bx + s * 0.13, y - s * 0.82); g.closePath();
    });
    celRect(g, x - s * 0.78, y - s * 0.92, s * 1.56, s * 0.22, s * 0.08, C_GOLD_D, lw * 0.7);
  }
  if (o.bow) {
    celCircle(g, x + s * 0.72, y - s * 0.72, s * 0.24, C_PINK, lw * 0.7);
  }
  if (o.blush) { [-1, 1].forEach(d => celCircle(g, x + d * s * 0.66, y + s * 0.28, s * 0.14, withAlpha(C_PINK, 0.65), 0)); }
  if (o.tears) { [-1, 1].forEach(d => celEllipse(g, x + d * ex, ey + s * 0.34, s * 0.09, s * 0.18, C_BLUE, 0)); }
}

function cartoonWheel(g, cx, cy, r, lw) {
  celCircle(g, cx, cy, r, C_GOLD, lw * 1.8);
  celCircle(g, cx, cy, r * 0.82, withAlpha(C_GOLD_D, 0.35), lw);
  for (let i = 0; i < 10; i++) {
    const a = i * TAU / 10;
    celLine(g, cx + Math.cos(a) * r * 0.14, cy + Math.sin(a) * r * 0.14, cx + Math.cos(a) * r * 0.92, cy + Math.sin(a) * r * 0.92, C_GOLD_D, lw * 0.8);
  }
  celCircle(g, cx, cy, r * 0.20, C_GOLD_D, lw);
  celCircle(g, cx, cy, r * 0.09, C_CREAM, lw * 0.6);
}

function cartoonBase(ctx, visual) {
  const { g, W, H, u, t } = ctx;
  const warm = visual === 'ghee' || visual === 'squeeze';
  const curse = visual === 'curse';
  const grd = g.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, curse ? '#FFB26B' : warm ? '#FFE3A0' : C_SKY);
  grd.addColorStop(1, curse ? '#FFD9A0' : warm ? '#FFF0C8' : C_SKY_LO);
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  cartoonSun(g, W * 0.84, H * 0.135, W * 0.075);
  cartoonCloud(g, W * 0.22, H * 0.155, W * 0.10);
  cartoonCloud(g, W * 0.60, H * 0.225, W * 0.075);
  if (curse) { cartoonCloud(g, W * 0.34, H * 0.30, W * 0.12); }
  // rolling hills
  celShape(g, C_GRASS, 4 * u, () => {
    g.moveTo(0, H * 0.56);
    g.quadraticCurveTo(W * 0.22, H * 0.44, W * 0.46, H * 0.56);
    g.quadraticCurveTo(W * 0.72, H * 0.42, W, H * 0.56);
    g.lineTo(W, H * 0.72); g.lineTo(0, H * 0.72); g.closePath();
  });
  celShape(g, C_GRASS_D, 0, () => {
    g.moveTo(0, H * 0.62); g.quadraticCurveTo(W * 0.35, H * 0.54, W * 0.68, H * 0.64);
    g.quadraticCurveTo(W * 0.86, H * 0.58, W, H * 0.63); g.lineTo(W, H * 0.72); g.lineTo(0, H * 0.72); g.closePath();
  });
  // ground
  g.fillStyle = curse ? '#C56A3C' : C_SOIL; g.fillRect(0, H * 0.70, W, H * 0.30);
  celLine(g, 0, H * 0.70, W, H * 0.70, C_INK, 5 * u);
  for (let i = 0; i < 16; i++) {
    const x = hash(i * 7.3) * W, y = H * (0.71 + hash(i * 3.1) * 0.25);
    celLine(g, x, y, x - 10 * u, y - 14 * u, C_GRASS_D, 2.5 * u);
    celLine(g, x, y, x + 11 * u, y - 12 * u, C_GRASS, 2.5 * u);
  }
  if (visual === 'wheel' || visual === 'arrow') {
    cartoonFlag(g, W * 0.10, H * 0.70, W * 0.075, C_RED);
    cartoonFlag(g, W * 0.90, H * 0.70, W * 0.075, C_PURPLE);
    cartoonTree(g, W * 0.05, H * 0.70, W * 0.085);
    cartoonDust(g, W * 0.30, H * 0.69, W * 0.06);
    cartoonDust(g, W * 0.74, H * 0.70, W * 0.05);
  } else {
    cartoonTree(g, W * 0.08, H * 0.70, W * 0.10);
    cartoonTree(g, W * 0.94, H * 0.70, W * 0.085);
  }
  if (curse) {
    cartoonLightning(g, W * 0.18, H * 0.05, W * 0.07);
    cartoonLightning(g, W * 0.82, H * 0.08, W * 0.055, '#FFF1A8');
  }
}

function cartoonScene(ctx, visual, p) {
  const { g, W, H, u, t } = ctx;
  const lw = 5 * u;
  if (visual === 'wheel') {
    // Karna on the chariot, alarmed, above the sinking wheel.
    cartoonPerson(g, W * 0.50, H * 0.415, W * 0.085, { body: C_GOLD, crown: true, moustache: true, mood: 'worried', armL: -0.9, armR: 0.9 });
    celRect(g, W * 0.30, H * 0.525, W * 0.40, H * 0.095, 14 * u, C_GOLD_D, lw);
    cartoonWheel(g, W * 0.50, H * 0.685, W * 0.235, lw);
    // mud swallowing the lower half
    celShape(g, C_SOIL, 0, () => { g.moveTo(0, H * 0.755); g.quadraticCurveTo(W * 0.5, H * 0.72, W, H * 0.755); g.lineTo(W, H); g.lineTo(0, H); g.closePath(); });
    cartoonDust(g, W * 0.50, H * 0.755, W * 0.10);
    cartoonMotion(g, W * 0.50, H * 0.685, W * 0.26, W * 0.34, 10, C_RED, 4 * u);
    cartoonBurst(g, W * 0.79, H * 0.60, W * 0.10, C_SUN, 10, lw);
    label(g, 'धड़ाम!', W * 0.79, H * 0.615, 34 * u, C_INK, 900, 'Noto Devanagari', 'center');
  } else if (visual === 'ghee') {
    // little hut
    celRect(g, W * 0.70, H * 0.485, W * 0.22, H * 0.19, 8 * u, '#F3D8A8', lw);
    celShape(g, '#C4603C', lw, () => { g.moveTo(W * 0.66, H * 0.49); g.lineTo(W * 0.81, H * 0.40); g.lineTo(W * 0.96, H * 0.49); g.closePath(); });
    // crying girl
    cartoonPerson(g, W * 0.29, H * 0.565, W * 0.075, { body: C_PINK, bow: true, tears: true, mood: 'worried', blush: true, armL: -0.2, armR: 0.2 });
    // broken pot shards
    celArc(g, W * 0.58, H * 0.66, W * 0.115, Math.PI * 0.15, Math.PI * 0.92, C_SOIL_D, 9 * u);
    celArc(g, W * 0.72, H * 0.685, W * 0.075, Math.PI * 1.05, Math.PI * 1.72, C_SOIL_D, 7 * u);
    // ghee puddle
    celEllipse(g, W * 0.63, H * 0.715, W * (0.16 + p * 0.07), H * 0.032, C_GOLD, lw);
    celEllipse(g, W * 0.60, H * 0.708, W * 0.075, H * 0.013, C_CREAM, 0);
    // Karna arriving in the background
    cartoonPerson(g, W * 0.86, H * 0.545, W * 0.052, { body: C_GOLD, crown: true, mood: 'worried' });
    cartoonBurst(g, W * 0.46, H * 0.60, W * 0.075, '#FFF1A8', 9, lw);
  } else if (visual === 'squeeze') {
    // two big hands crushing a clump of soil
    const fy = H * 0.475, fw = W * 0.235, fh = H * 0.13;
    [W * 0.12, W * 0.88 - fw].forEach((fx, i) => {
      celRect(g, fx, fy - fh / 2, fw, fh, 22 * u, C_SKIN, lw);
      for (let k = 1; k < 4; k++) celLine(g, fx + k * fw / 4, fy - fh * 0.34, fx + k * fw / 4, fy + fh * 0.34, C_SKIN_D, 3 * u);
      celCircle(g, fx + (i ? 0 : fw), fy, 20 * u, C_SKIN, lw);
    });
    celShape(g, C_SOIL_D, lw, () => { g.ellipse(W * 0.5, fy, W * 0.085, H * 0.055, 0, 0, TAU); });
    // ghee drops + pot
    for (let i = 0; i < 10; i++) {
      const dx = W * (0.43 + hash(i * 3.7) * 0.14);
      const dy = fy + H * 0.06 + ((t * 150 * u + hash(i) * H * 0.20) % (H * 0.20));
      celCircle(g, dx, dy, (5 + hash(i * 5) * 5) * u, C_GOLD, 2 * u);
    }
    celArc(g, W * 0.5, H * 0.735, W * 0.105, Math.PI, TAU, C_GOLD_D, 10 * u);
    celEllipse(g, W * 0.5, H * 0.735, W * 0.10, H * 0.018, C_GOLD, 3 * u);
    // happy girl peeking + Karna's determined face
    cartoonPerson(g, W * 0.16, H * 0.655, W * 0.065, { body: C_PINK, bow: true, mood: 'happy', blush: true });
    cartoonPerson(g, W * 0.84, H * 0.36, W * 0.070, { body: C_GOLD, crown: true, moustache: true, mood: 'angry' });
    cartoonBurst(g, W * 0.50, H * 0.385, W * 0.115, C_SUN, 12, lw);
    label(g, 'क्रैक!', W * 0.50, H * 0.40, 40 * u, C_INK, 900, 'Noto Devanagari', 'center');
    cartoonMotion(g, W * 0.5, fy, W * 0.15, W * 0.22, 12, C_RED, 4 * u);
  } else if (visual === 'curse') {
    // cracked earth
    for (let i = 0; i < 9; i++) crackLine(g, W * 0.5, H * 0.78, W * (0.3 + hash(i) * 0.4), -Math.PI / 2 + (i - 4) * 0.28, '#8E2F1E', 4 * u, 200 + i);
    // aura burst
    cartoonBurst(g, W * 0.5, H * 0.57, W * 0.42, withAlpha('#FFE07A', 0.85), 16, 6 * u);
    // Bhudevi: large, colourful, clearly visible
    const s = W * 0.125, y = H * 0.455;
    celShape(g, C_TEAL, lw * 1.2, () => {
      g.moveTo(W * 0.5 - s * 1.35, H * 0.94);
      g.quadraticCurveTo(W * 0.5 - s * 1.0, H * 0.62, W * 0.5 - s * 0.55, H * 0.55);
      g.lineTo(W * 0.5 + s * 0.55, H * 0.55);
      g.quadraticCurveTo(W * 0.5 + s * 1.0, H * 0.62, W * 0.5 + s * 1.35, H * 0.94);
      g.closePath();
    });
    celShape(g, C_TEAL_D, lw, () => { g.moveTo(W * 0.5 - s * 0.6, H * 0.60); g.lineTo(W * 0.5 + s * 0.6, H * 0.60); g.lineTo(W * 0.5 + s * 0.9, H * 0.92); g.lineTo(W * 0.5 - s * 0.9, H * 0.92); g.closePath(); });
    cartoonPerson(g, W * 0.5, y, s, { body: C_TEAL, crown: true, mood: 'angry', eyes: '#C21E1E', armL: -1.25, armR: 1.25, blush: false });
    cartoonBurst(g, W * 0.80, H * 0.50, W * 0.095, C_RED, 10, lw);
    label(g, 'श्राप!', W * 0.80, H * 0.515, 32 * u, C_CREAM, 900, 'Noto Devanagari', 'center');
    cartoonMotion(g, W * 0.5, H * 0.60, W * 0.30, W * 0.40, 14, '#FFF1A8', 5 * u);
  } else if (visual === 'arrow') {
    // Karna straining to lift the wheel
    cartoonPerson(g, W * 0.50, H * 0.505, W * 0.085, { body: C_GOLD, crown: true, moustache: true, mood: 'shout', armL: -1.15, armR: 1.15 });
    cartoonWheel(g, W * 0.50, H * 0.705, W * 0.225, lw);
    celShape(g, C_SOIL, 0, () => { g.moveTo(0, H * 0.775); g.quadraticCurveTo(W * 0.5, H * 0.745, W, H * 0.775); g.lineTo(W, H); g.lineTo(0, H); g.closePath(); });
    cartoonDust(g, W * 0.50, H * 0.775, W * 0.09);
    // arrow streak
    const ax = lerp(-W * 0.25, W * 1.25, clamp((t - (ctx.A.start + 0.4)) / 4.5));
    celLine(g, ax - W * 0.42, H * 0.355, ax, H * 0.395, '#FFF1A8', 11 * u);
    celShape(g, C_RED, lw, () => { g.moveTo(ax, H * 0.395); g.lineTo(ax - W * 0.075, H * 0.355); g.lineTo(ax - W * 0.075, H * 0.435); g.closePath(); });
    cartoonMotion(g, ax - W * 0.1, H * 0.39, W * 0.05, W * 0.11, 8, C_CREAM, 4 * u);
  } else {
    cartoonPerson(g, W * 0.5, H * 0.50, W * 0.09, { body: C_GOLD, crown: true, mood: 'happy' });
  }
}

function cartoonBanner(ctx, y, h, fill) {
  const { g, W, M, u } = ctx;
  celRect(g, M * 0.55, y + 8 * u, W - M * 1.1, h, 20 * u, withAlpha(C_INK, 0.18), 0);
  celRect(g, M * 0.55, y, W - M * 1.1, h, 20 * u, fill, 6 * u);
}

function cartoon(ctx) {
  const { g, W, H, u, M, P, A, t, accent } = ctx;
  const C = content(ctx), ap = appearance(A);
  const visual = A.scene?.visual || 'wheel';
  cartoonBase(ctx, visual);
  cartoonScene(ctx, visual, ap.reveal);

  const lines = C.heading.split('\n');
  if (lines.length > 1) {
    // Hook: two bright comic beats.
    const p1 = clamp(seg(t, A.start + 0.15, A.start + 0.95)) * (1 - clamp(seg(t, A.start + 3.0, A.start + 3.8)));
    if (p1 > 0.01) {
      cartoonBanner(ctx, H * 0.115, H * 0.12, C_RED);
      drawFitted(g, lines[0], {
        x: M, y: H * 0.125, w: W - 2 * M, h: H * 0.105, size: 62 * u, minSize: 28 * u,
        weight: 900, family: fontFor(lines[0]), color: C_CREAM, stroke: true, strokeColor: C_INK, strokeWidth: 5 * u,
        reveal: eio(clamp((t - A.start - 0.15) / 0.7)), alpha: p1, align: 'center',
      });
    }
    const q = clamp(seg(t, A.start + 3.3, A.start + 4.2));
    if (q > 0.01) {
      cartoonBurst(g, W * 0.5, H * 0.195, W * 0.28, C_GOLD, 12, 6 * u);
      cartoonBanner(ctx, H * 0.115, H * 0.12, C_RED);
      const shake = (1 - eio(clamp((t - A.start - 3.3) / 0.55))) * Math.sin(t * 45) * 8 * u;
      g.save(); g.translate(shake, 0);
      drawFitted(g, lines[1], {
        x: M * 0.8, y: H * 0.135, w: W - M * 1.6, h: H * 0.15, size: 66 * u, minSize: 30 * u,
        weight: 900, family: fontFor(lines[1]), color: C_CREAM, stroke: true, strokeColor: C_INK, strokeWidth: 6 * u,
        reveal: eio(q), alpha: q, align: 'center',
      });
      g.restore();
    }
  } else {
    cartoonBanner(ctx, H * 0.115, H * 0.165, accent);
    drawFitted(g, C.heading, {
      x: M * 0.9, y: H * 0.128, w: W - M * 1.8, h: H * 0.14, size: visual === 'curse' ? 72 * u : 82 * u,
      minSize: 30 * u, weight: 900, family: fontFor(C.heading), color: C_CREAM,
      stroke: true, strokeColor: C_INK, strokeWidth: 6 * u, reveal: ap.reveal, alpha: ap.alpha, align: 'center',
    });
  }

  // detail chip near the bottom, above the safe caption area
  // top kicker ribbon drawn last so no comic burst can cover it
  celRect(g, M * 0.55, H * 0.038, W - M * 1.1, H * 0.042, 10 * u, C_INK, 0);
  label(g, `महाभारत  ·  कर्ण पर्व  ·  ${String(A.shotNumber).padStart(2, '0')}/${String(A.totalShots).padStart(2, '0')}`,
    W / 2, H * 0.068, 20 * u, C_CREAM, 700, 'Noto Devanagari', 'center');

  const chipY = H * 0.815, chipH = H * 0.055;
  celRect(g, M * 0.7, chipY, W - M * 1.4, chipH, 14 * u, C_CREAM, 4 * u);
  drawFitted(g, C.detail, {
    x: M, y: chipY + chipH * 0.12, w: W - 2 * M, h: chipH * 0.78, size: 28 * u, minSize: 16 * u,
    weight: 700, family: fontFor(C.detail), color: C_INK, align: 'center',
    reveal: eio(clamp(A.enter - 0.1)), alpha: ap.alpha,
  });

  // SFX flash — bright, never a black veil.
  const hits = P.audio?.sfx
    ? P.audio.sfx.map(s => Number(s.at) || 0)
    : timeline(P).filter(w => w.scene).map(w => w.start + (w.scene.visual === 'squeeze' ? 8 : w.scene.visual === 'curse' ? 7 : w.scene.visual === 'arrow' ? 2 : 0));
  let flash = 0;
  for (const h of hits) if (t >= h && t < h + 0.45) flash = Math.max(flash, 1 - (t - h) / 0.45);
  if (flash > 0) { g.fillStyle = withAlpha('#FFF3B0', flash * 0.42); g.fillRect(0, 0, W, H); }

  // comic progress rail
  const ry = H - M * 0.55, rh = 9 * u, rw = W - 2 * M;
  celRect(g, M, ry, rw, rh, rh / 2, C_CREAM, 3 * u);
  g.fillStyle = C_RED; g.fillRect(M + 3 * u, ry + 3 * u, (rw - 6 * u) * clamp(t / P.duration), rh - 6 * u);
  for (const win of timeline(P)) {
    if (win.number === 1) continue;
    const x = M + rw * clamp(win.start / P.duration);
    g.fillStyle = C_INK; g.fillRect(x - 1.5 * u, ry - 3 * u, 3 * u, rh + 6 * u);
  }

  // final cut to black — covers the complete comic frame, including captions.
  if (visual === 'arrow') {
    const fade = eio(clamp(seg(t, P.duration - 1.35, P.duration - 0.12)));
    if (fade > 0) { g.fillStyle = `rgba(12,9,8,${fade})`; g.fillRect(0, 0, W, H); }
  }
}

const RENDERERS = { swiss, neon, keynote, blueprint, riso, caption, mythic, cartoon };

export function drawFrame(g, W, H, t, rawProject) {
  const P = rawProject && rawProject.duration ? rawProject : normalizeProject(rawProject || {});
  const A = atTime(P, t);
  const ctx = makeCtx(g, W, H, t, P, A);
  g.save();
  (RENDERERS[P.style] || swiss)(ctx);
  g.restore();
}

export function posterFrame(g, W, H, t, project) { drawFrame(g, W, H, t, project); }
