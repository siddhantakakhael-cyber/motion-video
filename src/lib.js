// Small, dependency-free helpers shared by the browser preview and the Node renderer.
// Inspired by the deterministic motion helpers in lemo-opuscar/core/lib.js.

export const TAU = Math.PI * 2;
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const ss = t => { t = clamp(t); return t * t * (3 - 2 * t); };
export const eio = t => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const eo = t => 1 - Math.pow(1 - clamp(t), 3);
export const ei = t => Math.pow(clamp(t), 3);
export const back = (t, s = 1.8) => { t = clamp(t) - 1; return 1 + t * t * ((s + 1) * t + s); };
export const spring = (t, k = 7, z = 0.35) => { t = Math.max(0, t); return 1 - Math.exp(-z * k * t) * Math.cos(k * Math.sqrt(1 - z * z) * t * 1.6); };

export function mulberry(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// ---------------------------------------------------------------- colour ---
export function hex2rgb(hex) {
  let h = String(hex || '#ffffff').trim().replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) h = 'ffffff';
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
export const rgb2hex = ([r, g, b]) => '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
export function mix(a, b, t) { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex([lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)]); }
export const lighten = (hex, t) => mix(hex, '#ffffff', t);
export const darken = (hex, t) => mix(hex, '#000000', t);
export function withAlpha(hex, a) { const [r, g, b] = hex2rgb(hex); return `rgba(${r},${g},${b},${clamp(a)})`; }
export function complement(hex) {
  const [r, g, b] = hex2rgb(hex);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  h = (h * 60 + 180 + 360) % 360;
  const c = d / 255, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = max / 255 - c;
  let rr = 0, gg = 0, bb = 0;
  if (h < 60) [rr, gg, bb] = [c, x, 0];
  else if (h < 120) [rr, gg, bb] = [x, c, 0];
  else if (h < 180) [rr, gg, bb] = [0, c, x];
  else if (h < 240) [rr, gg, bb] = [0, x, c];
  else if (h < 300) [rr, gg, bb] = [x, 0, c];
  else [rr, gg, bb] = [c, 0, x];
  return rgb2hex([(rr + m) * 255, (gg + m) * 255, (bb + m) * 255]);
}

// ------------------------------------------------------------------ fonts ---
export const DEVANAGARI = /[\u0900-\u097F]/;
export const fontFor = text => DEVANAGARI.test(text || '') ? 'Noto Devanagari' : 'Inter';
export function setFont(g, size, weight = 700, family = 'Inter') {
  g.font = `${weight} ${Math.max(1, Math.round(size))}px "${family}"`;
  g.textBaseline = 'alphabetic';
}

// Greedy word wrap. Long words are broken by character so captions never clip.
export function wrapLines(g, text, maxW) {
  const out = [];
  for (const paragraph of String(text || '').split('\n')) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (!words.length) { out.push(''); continue; }
    let line = '';
    for (const word of words) {
      const candidate = line ? line + ' ' + word : word;
      if (g.measureText(candidate).width <= maxW || !line) {
        if (g.measureText(candidate).width <= maxW) { line = candidate; continue; }
        // word itself too wide: split it
        for (const ch of word) {
          if (g.measureText(line + ch).width > maxW && line) { out.push(line); line = ch; }
          else line += ch;
        }
      } else { out.push(line); line = word; }
    }
    if (line) out.push(line);
  }
  return out.length ? out : [''];
}

// Shrink a block of text until it fits both width and height.
export function fitLines(g, text, maxW, maxH, startSize, minSize = 18, lineHeight = 1.14, weight = 700, family = 'Inter') {
  let size = startSize;
  while (size > minSize) {
    setFont(g, size, weight, family);
    const lines = wrapLines(g, text, maxW);
    const h = lines.length * size * lineHeight;
    if (h <= maxH && lines.every(l => g.measureText(l).width <= maxW * 1.01)) return { size, lines, lineHeight: size * lineHeight };
    size *= 0.94;
  }
  setFont(g, minSize, weight, family);
  return { size: minSize, lines: wrapLines(g, text, maxW), lineHeight: minSize * lineHeight };
}

// Draw a fitted block. `reveal` (0..1) clip-reveals each line from below, the
// signature "print press" entrance of the code-made film styles.
export function drawFitted(g, text, o) {
  const {
    x, y, w, h, size, minSize = 16, weight = 700, family = fontFor(text), color = '#ffffff',
    align = 'left', lineHeight = 1.14, reveal = 1, alpha = 1,
    shadowColor = null, shadowBlur = 0, stroke = null, strokeColor = '#ffffff', strokeWidth = 2,
  } = o;
  const fit = fitLines(g, text, w, h, size, minSize, lineHeight, weight, family);
  setFont(g, fit.size, weight, family);
  g.save();
  g.globalAlpha *= alpha;
  g.fillStyle = color;
  g.textAlign = align;
  if (shadowColor) { g.shadowColor = shadowColor; g.shadowBlur = shadowBlur; }
  const n = fit.lines.length;
  const ax = align === 'center' ? x + w / 2 : align === 'right' ? x + w : x;
  fit.lines.forEach((line, i) => {
    const p = clamp(reveal * n - i);
    if (p <= 0) return;
    const base = y + fit.size * 0.86 + i * fit.lineHeight;
    g.save();
    g.beginPath();
    g.rect(x - 4, base - fit.size * 1.08, w + 8, fit.size * 1.38);
    g.clip();
    const ty = base + (1 - p) * fit.size * 1.12;
    if (stroke) {
      g.lineWidth = strokeWidth; g.strokeStyle = strokeColor; g.lineJoin = 'round';
      g.strokeText(line, ax, ty);
    }
    g.fillText(line, ax, ty);
    g.restore();
  });
  g.restore();
  return { ...fit, width: w };
}

// --------------------------------------------------------------- primitives ---
export function roundRect(g, x, y, w, h, r) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  g.beginPath();
  if (typeof g.roundRect === 'function') g.roundRect(x, y, w, h, rr);
  else {
    g.moveTo(x + rr, y); g.lineTo(x + w - rr, y); g.quadraticCurveTo(x + w, y, x + w, y + rr);
    g.lineTo(x + w, y + h - rr); g.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    g.lineTo(x + rr, y + h); g.quadraticCurveTo(x, y + h, x, y + h - rr);
    g.lineTo(x, y + rr); g.quadraticCurveTo(x, y, x + rr, y); g.closePath();
  }
  return g;
}
export function line(g, x1, y1, x2, y2, color, width = 2, dash = null) {
  g.save(); g.strokeStyle = color; g.lineWidth = width;
  if (dash) g.setLineDash(dash);
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.restore();
}
export function lineGrow(g, x1, y1, x2, y2, p, color, width = 2, dash = null) {
  line(g, x1, y1, lerp(x1, x2, clamp(p)), lerp(y1, y2, clamp(p)), color, width, dash);
}
export function dot(g, x, y, r, color) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = color; g.fill(); }
export function arrow(g, x, y, dir, size, color) {
  g.save(); g.strokeStyle = color; g.lineWidth = Math.max(1, size * 0.12); g.lineCap = 'round';
  g.beginPath(); g.moveTo(x - dir * size, y - size * 0.55); g.lineTo(x, y); g.lineTo(x - dir * size, y + size * 0.55); g.stroke(); g.restore();
}
