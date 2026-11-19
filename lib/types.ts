export type LayerType = "text" | "image" | "shape" | "audio";

export type AnimPreset = "none" | "fade" | "slide-up" | "slide-down" | "zoom-in" | "pop";
export type AnimOut = "none" | "fade" | "slide-down" | "zoom-out";

export interface Keyframe {
  id: string;
  t: number; // seconds from layer start
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
}

export interface Background {
  type: "solid" | "gradient" | "mesh";
  color: string;
  from: string;
  to: string;
  angle: number;
}

export interface Layer {
  id: string;
  type: LayerType;
  name: string;
  /** timeline position in seconds */
  start: number;
  duration: number;

  /** base transform — x/y are offsets from canvas centre, in canvas px */
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  keyframes: Keyframe[];
  animIn: AnimPreset;
  animOut: AnimOut;

  /* text */
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  color?: string;
  align?: "left" | "center" | "right";
  lineHeight?: number;
  letterSpacing?: number;
  highlight?: string;
  highlightText?: string;
  uppercase?: boolean;

  /* image */
  src?: string;
  /** links a layer to the on-device media library so projects survive reloads */
  mediaId?: string;
  fit?: "cover" | "contain";
  radius?: number;

  /* image + shape box */
  w?: number;
  h?: number;

  /* shape */
  shape?: "rect" | "ellipse" | "triangle" | "line";
  fill?: string;

  /* audio */
  audioUrl?: string;
  volume?: number;

  /* meta */
  hidden?: boolean;
  locked?: boolean;
  role?: "caption" | "headline" | "visual" | "accent" | "voice" | "music" | "brand";
}

export type AspectId = "9:16" | "16:9" | "1:1" | "4:5";

export interface Project {
  version: 1;
  name: string;
  width: number;
  height: number;
  fps: number;
  duration: number;
  background: Background;
  layers: Layer[];
  updatedAt: number;
}

export interface MediaItem {
  id: string;
  name: string;
  type: "image" | "audio";
  /** object URL for live use */
  url: string;
  createdAt: number;
}

export interface SceneStyle {
  id: "bold" | "cinematic" | "news" | "neon";
  label: string;
  description: string;
}

export const ASPECTS: Record<AspectId, { w: number; h: number; label: string }> = {
  "9:16": { w: 1080, h: 1920, label: "Reel · Story" },
  "16:9": { w: 1920, h: 1080, label: "YouTube" },
  "1:1": { w: 1080, h: 1080, label: "Square" },
  "4:5": { w: 1080, h: 1350, label: "Feed" },
};

export const CANVAS_FONTS = [
  { label: "Inter", value: "Inter" },
  { label: "Poppins", value: "Poppins" },
  { label: "Bebas Neue", value: "Bebas Neue" },
  { label: "Playfair", value: "Playfair Display" },
  { label: "Mono", value: "JetBrains Mono" },
];

export const SWATCHES = [
  "#ffffff",
  "#f8fafc",
  "#fbbf24",
  "#f472b6",
  "#a78bfa",
  "#60a5fa",
  "#34d399",
  "#fb7185",
  "#111111",
  "#07070b",
];

export const SCENE_STYLES: SceneStyle[] = [
  { id: "bold", label: "Bold", description: "Huge type, violet gradients, punchy pops." },
  { id: "cinematic", label: "Cinematic", description: "Serif headlines, letterboxing, slow fades." },
  { id: "news", label: "News", description: "Lower-third captions, red accent, ticker." },
  { id: "neon", label: "Neon", description: "Cyan + magenta glow on deep black." },
];
