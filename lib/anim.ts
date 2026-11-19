import type { AnimOut, AnimPreset, Keyframe, Layer } from "./types";

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const EASINGS = {
  linear: (t: number) => t,
  easeOut: (t: number) => 1 - Math.pow(1 - t, 3),
  easeInOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  pop: (t: number) => {
    const c = 1.7;
    const p = t - 1;
    return 1 + (c + 1) * Math.pow(p, 3) + c * Math.pow(p, 2);
  },
  spring: (t: number) => 1 - Math.pow(2, -10 * t) * Math.cos((t * 10 - 0.75) * ((2 * Math.PI) / 3)),
};

export type EaseName = keyof typeof EASINGS;

export interface Transform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
}

export function layerTransform(layer: Layer, localTime: number): Transform {
  const base: Transform = {
    x: layer.x,
    y: layer.y,
    scale: layer.scale,
    rotation: layer.rotation,
    opacity: layer.opacity,
  };

  // keyframes take precedence, animation presets layer on top
  if (layer.keyframes.length > 0) {
    const kfs = [...layer.keyframes].sort((a, b) => a.t - b.t);
    if (localTime <= kfs[0].t) {
      applyKf(base, kfs[0]);
    } else if (localTime >= kfs[kfs.length - 1].t) {
      applyKf(base, kfs[kfs.length - 1]);
    } else {
      for (let i = 0; i < kfs.length - 1; i++) {
        const a = kfs[i];
        const b = kfs[i + 1];
        if (localTime >= a.t && localTime <= b.t) {
          const p = EASINGS.easeInOut((localTime - a.t) / Math.max(0.0001, b.t - a.t));
          base.x = lerp(a.x, b.x, p);
          base.y = lerp(a.y, b.y, p);
          base.scale = lerp(a.scale, b.scale, p);
          base.rotation = lerp(a.rotation, b.rotation, p);
          base.opacity = lerp(a.opacity, b.opacity, p);
          break;
        }
      }
    }
  }

  const inDur = Math.min(0.55, Math.max(0.2, layer.duration * 0.25));
  const outDur = Math.min(0.45, Math.max(0.16, layer.duration * 0.2));
  const pIn = clamp(localTime / inDur, 0, 1);
  const pOut = clamp((layer.duration - localTime) / outDur, 0, 1);

  switch (layer.animIn) {
    case "fade":
      base.opacity *= EASINGS.easeOut(pIn);
      break;
    case "slide-up":
      base.opacity *= EASINGS.easeOut(clamp(pIn * 1.6, 0, 1));
      base.y += (1 - EASINGS.easeOut(pIn)) * 90;
      break;
    case "slide-down":
      base.opacity *= EASINGS.easeOut(clamp(pIn * 1.6, 0, 1));
      base.y -= (1 - EASINGS.easeOut(pIn)) * 90;
      break;
    case "zoom-in":
      base.opacity *= EASINGS.easeOut(clamp(pIn * 1.4, 0, 1));
      base.scale *= lerp(0.88, 1, EASINGS.easeOut(pIn));
      break;
    case "pop":
      base.opacity *= clamp(pIn * 2.2, 0, 1);
      base.scale *= EASINGS.pop(pIn);
      break;
  }

  switch (layer.animOut) {
    case "fade":
      base.opacity *= EASINGS.easeOut(pOut);
      break;
    case "slide-down":
      base.opacity *= clamp(pOut * 1.4, 0, 1);
      base.y += (1 - EASINGS.easeOut(pOut)) * 70;
      break;
    case "zoom-out":
      base.opacity *= clamp(pOut * 1.4, 0, 1);
      base.scale *= lerp(1, 0.92, EASINGS.easeOut(1 - pOut));
      break;
  }

  return base;
}

function applyKf(t: Transform, k: Keyframe) {
  t.x = k.x;
  t.y = k.y;
  t.scale = k.scale;
  t.rotation = k.rotation;
  t.opacity = k.opacity;
}

export const uid = (prefix = "id") =>
  `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;

export const round = (v: number, places = 2) => {
  const f = Math.pow(10, places);
  return Math.round(v * f) / f;
};

export const fmtTime = (s: number, withFrames = false, fps = 30) => {
  const safe = Math.max(0, s);
  const m = Math.floor(safe / 60);
  const sec = Math.floor(safe % 60);
  const frames = Math.floor((safe % 1) * fps);
  const base = `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return withFrames ? `${base}:${String(frames).padStart(2, "0")}` : `${base}`;
};
