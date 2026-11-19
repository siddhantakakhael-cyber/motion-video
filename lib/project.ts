import { uid } from "./anim";
import type { AspectId, Layer, LayerType, Project } from "./types";
import { ASPECTS } from "./types";

export const FONT_STACK: Record<string, string> = {
  Inter: "Inter, system-ui, sans-serif",
  Poppins: "Poppins, Inter, sans-serif",
  "Bebas Neue": '"Bebas Neue", Impact, sans-serif',
  "Playfair Display": '"Playfair Display", Georgia, serif',
  "JetBrains Mono": '"JetBrains Mono", ui-monospace, monospace',
};

export function fontString(layer: Layer): string {
  const family = layer.fontFamily ?? "Inter";
  const weight = layer.fontWeight ?? 700;
  const size = layer.fontSize ?? 64;
  return `${weight} ${size}px ${FONT_STACK[family] ?? family}`;
}

export function emptyProject(aspect: AspectId = "9:16"): Project {
  const { w, h } = ASPECTS[aspect];
  return {
    version: 1,
    name: "Untitled project",
    width: w,
    height: h,
    fps: 30,
    duration: 12,
    background: {
      type: "gradient",
      color: "#0b0b12",
      from: "#1b1035",
      to: "#0b0b12",
      angle: 145,
    },
    layers: [],
    updatedAt: Date.now(),
  };
}

export function baseLayer(type: LayerType, patch: Partial<Layer> = {}): Layer {
  return {
    id: uid(type),
    type,
    name: type === "text" ? "Text" : type === "image" ? "Image" : type === "shape" ? "Shape" : "Audio",
    start: 0,
    duration: 3,
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
    opacity: 1,
    keyframes: [],
    animIn: "fade",
    animOut: "none",
    hidden: false,
    locked: false,
    ...patch,
  };
}

export function makeText(text = "Your headline", patch: Partial<Layer> = {}): Layer {
  return baseLayer("text", {
    name: text.slice(0, 24) || "Text",
    text,
    fontSize: 84,
    fontFamily: "Inter",
    fontWeight: 800,
    color: "#ffffff",
    align: "center",
    lineHeight: 1.12,
    letterSpacing: -1,
    animIn: "slide-up",
    animOut: "fade",
    y: 0,
    ...patch,
  });
}

export function makeShape(patch: Partial<Layer> = {}): Layer {
  return baseLayer("shape", {
    name: "Accent bar",
    shape: "rect",
    fill: "#8b5cf6",
    w: 160,
    h: 10,
    animIn: "pop",
    animOut: "none",
    ...patch,
  });
}

export function makeImage(src: string, name = "Image", patch: Partial<Layer> = {}): Layer {
  return baseLayer("image", {
    name,
    src,
    fit: "cover",
    radius: 32,
    animIn: "fade",
    animOut: "none",
    ...patch,
  });
}

export function makeAudio(url: string, name = "Music", patch: Partial<Layer> = {}): Layer {
  return baseLayer("audio", {
    name,
    audioUrl: url,
    volume: 0.6,
    animIn: "none",
    animOut: "none",
    role: "music",
    ...patch,
  });
}

export const projectEnd = (project: Project) =>
  project.layers.reduce((max, l) => Math.max(max, l.start + l.duration), 0);

export const layerEnd = (layer: Layer) => layer.start + layer.duration;

export function sortLayers(layers: Layer[]): Layer[] {
  return [...layers].sort((a, b) => a.start - b.start);
}

export function withAspect(project: Project, aspect: AspectId): Project {
  const { w, h } = ASPECTS[aspect];
  const sx = w / project.width;
  const sy = h / project.height;
  // geometric mean keeps type legible when the frame changes shape
  const s = Math.sqrt(sx * sy);
  const layers = project.layers.map((l) => ({
    ...l,
    x: Math.round(l.x * sx),
    y: Math.round(l.y * sy),
    w: l.w != null ? Math.round(l.w * sx) : l.w,
    h: l.h != null ? Math.round(l.h * sy) : l.h,
    fontSize: l.fontSize != null ? Math.round(l.fontSize * s) : l.fontSize,
    keyframes: l.keyframes.map((k) => ({ ...k, x: k.x * sx, y: k.y * sy })),
  }));
  return { ...project, width: w, height: h, layers, updatedAt: Date.now() };
}

export function duplicateLayer(layer: Layer, offset = 0.25): Layer {
  return {
    ...layer,
    id: uid(layer.type),
    name: `${layer.name} copy`,
    start: layer.start + offset,
    keyframes: layer.keyframes.map((k) => ({ ...k, id: uid("kf") })),
  };
}

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function safeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "motion";
}
