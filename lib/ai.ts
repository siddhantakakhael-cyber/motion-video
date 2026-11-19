import { uid } from "./anim";
import { makeShape, makeText } from "./project";
import type { AspectId, Layer, Project, SceneStyle } from "./types";
import { ASPECTS } from "./types";

export interface GenerateOptions {
  script: string;
  style: SceneStyle["id"];
  aspect: AspectId;
  brand: string;
  title: string;
  includeTitle: boolean;
  includeCTA: boolean;
  ctaText: string;
  wpm: number;
}

interface Theme {
  bg: Project["background"];
  font: string;
  weight: number;
  size: number; // at 1080 width
  color: string;
  captionY: number; // 0..1 of height offset from centre
  align: "left" | "center";
  animIn: Layer["animIn"];
  highlight?: string;
  highlightText?: string;
  accent: string;
  uppercase: boolean;
  index: { x: number; y: number; color: string };
  extras: (w: number, h: number, total: number, brand: string, opts: GenerateOptions) => Layer[];
}

const THEMES: Record<SceneStyle["id"], Theme> = {
  bold: {
    bg: { type: "gradient", color: "#0b0b12", from: "#2a1460", to: "#0b0b12", angle: 145 },
    font: "Poppins",
    weight: 800,
    size: 96,
    color: "#ffffff",
    captionY: 0,
    align: "center",
    animIn: "slide-up",
    accent: "#8b5cf6",
    uppercase: false,
    index: { x: 0.36, y: 0.45, color: "rgba(255,255,255,0.42)" },
    extras: (w, h, total, brand, opts) => [
      makeText(brand.toUpperCase() || "MOTION STUDIO", {
        name: "Brand handle",
        role: "brand",
        start: 0,
        duration: total,
        y: -h * 0.43,
        fontSize: Math.round(w * 0.028),
        fontWeight: 600,
        letterSpacing: 4,
        color: "rgba(255,255,255,0.55)",
        animIn: "fade",
        animOut: "none",
      }),
      makeShape({
        name: "Top accent",
        start: 0,
        duration: total,
        w: Math.round(w * 0.11),
        h: Math.round(w * 0.008),
        fill: "#8b5cf6",
        y: -h * 0.39,
        animIn: "fade",
        animOut: "none",
      }),
      makeShape({
        name: "Glow blob",
        shape: "ellipse",
        start: 0,
        duration: total,
        w: Math.round(w * 0.9),
        h: Math.round(w * 0.9),
        fill: "radial:#8b5cf6:0.34",
        x: w * 0.22,
        y: -h * 0.18,
        animIn: "fade",
        animOut: "none",
        opacity: 0.7,
      }),
    ],
  },
  cinematic: {
    bg: { type: "solid", color: "#0a0908", from: "#000000", to: "#000000", angle: 0 },
    font: "Playfair Display",
    weight: 600,
    size: 82,
    color: "#f6f1e7",
    captionY: 0.24,
    align: "center",
    animIn: "fade",
    accent: "#d4a017",
    uppercase: false,
    index: { x: 0.38, y: 0.385, color: "rgba(246,241,231,0.32)" },
    extras: (w, h, total, _brand, opts) => [
      makeShape({
        name: "Letterbox top",
        start: 0,
        duration: total,
        w: w * 1.2,
        h: Math.round(h * 0.085),
        fill: "#000000",
        y: -h / 2 + h * 0.0425,
        animIn: "none",
        animOut: "none",
      }),
      makeShape({
        name: "Letterbox bottom",
        start: 0,
        duration: total,
        w: w * 1.2,
        h: Math.round(h * 0.085),
        fill: "#000000",
        y: h / 2 - h * 0.0425,
        animIn: "none",
        animOut: "none",
      }),
      makeText("A FILM BY " + (opts.brand || "MOTION STUDIO"), {
        name: "Credit",
        start: 0,
        duration: total,
        y: -h / 2 + h * 0.0425,
        fontSize: Math.round(w * 0.021),
        fontFamily: "Inter",
        fontWeight: 500,
        letterSpacing: 6,
        color: "rgba(246,241,231,0.55)",
        animIn: "fade",
        animOut: "none",
      }),
      makeShape({
        name: "Gold rule",
        start: 0,
        duration: total,
        w: Math.round(w * 0.08),
        h: 3,
        fill: "#d4a017",
        y: h / 2 - h * 0.0425,
        animIn: "fade",
        animOut: "none",
      }),
    ],
  },
  news: {
    bg: { type: "gradient", color: "#0b1220", from: "#122238", to: "#070b12", angle: 160 },
    font: "Inter",
    weight: 800,
    size: 74,
    color: "#ffffff",
    captionY: 0.26,
    align: "left",
    animIn: "slide-up",
    accent: "#ef4444",
    uppercase: false,
    index: { x: 0.4, y: 0.375, color: "rgba(255,255,255,0.35)" },
    extras: (w, h, total, brand, opts) => [
      makeShape({
        name: "Live chip",
        start: 0,
        duration: total,
        w: Math.round(w * 0.16),
        h: Math.round(w * 0.05),
        fill: "#ef4444",
        x: -w * 0.5 + w * 0.11,
        y: -h * 0.45,
        animIn: "none",
        animOut: "none",
      }),
      makeText("LIVE", {
        name: "Live label",
        start: 0,
        duration: total,
        x: -w * 0.5 + w * 0.11,
        y: -h * 0.45,
        fontSize: Math.round(w * 0.024),
        fontWeight: 800,
        letterSpacing: 3,
        color: "#ffffff",
        animIn: "none",
        animOut: "none",
      }),
      makeText(brand.toUpperCase() || "NEWS DESK", {
        name: "Desk",
        start: 0,
        duration: total,
        x: w * 0.12,
        y: -h * 0.45,
        fontSize: Math.round(w * 0.026),
        fontWeight: 700,
        letterSpacing: 3,
        color: "rgba(255,255,255,0.7)",
        animIn: "fade",
        animOut: "none",
      }),
      makeText(opts.title || "TOP STORY", {
        name: "News headline",
        role: "brand",
        start: 0,
        duration: total,
        y: -h * 0.365,
        w: w * 0.84,
        fontSize: Math.round(w * 0.046),
        fontFamily: "Inter",
        fontWeight: 800,
        letterSpacing: -1,
        lineHeight: 1.15,
        color: "rgba(255,255,255,0.92)",
        animIn: "slide-down",
        animOut: "none",
      }),
      makeShape({
        name: "Ticker bar",
        start: 0,
        duration: total,
        w: w * 1.2,
        h: Math.round(h * 0.055),
        fill: "rgba(239,68,68,0.14)",
        y: h * 0.445,
        animIn: "none",
        animOut: "none",
      }),
      makeText("● BREAKING  ·  " + (opts.title || "TOP STORY").toUpperCase(), {
        name: "Ticker",
        start: 0,
        duration: total,
        y: h * 0.445,
        fontSize: Math.round(w * 0.021),
        fontWeight: 600,
        letterSpacing: 2,
        color: "#fca5a5",
        animIn: "none",
        animOut: "none",
      }),
    ],
  },
  neon: {
    bg: { type: "gradient", color: "#05060a", from: "#0a1f2e", to: "#05060a", angle: 200 },
    font: "Poppins",
    weight: 800,
    size: 88,
    color: "#9df6ff",
    captionY: 0.02,
    align: "center",
    animIn: "pop",
    accent: "#22d3ee",
    uppercase: true,
    highlight: "#0b1220",
    highlightText: "#7ef0ff",
    index: { x: 0.38, y: 0.45, color: "rgba(103,232,249,0.4)" },
    extras: (w, h, total, brand) => [
      makeShape({
        name: "Neon ring",
        shape: "ellipse",
        start: 0,
        duration: total,
        w: Math.round(w * 0.78),
        h: Math.round(w * 0.78),
        fill: "radial:#22d3ee:0.16",
        y: 0,
        animIn: "fade",
        animOut: "none",
      }),
      makeText(brand.toUpperCase() || "@MOTION", {
        name: "Brand handle",
        start: 0,
        duration: total,
        y: -h * 0.42,
        fontSize: Math.round(w * 0.03),
        fontWeight: 600,
        letterSpacing: 5,
        color: "#67e8f9",
        animIn: "fade",
        animOut: "none",
      }),
      makeShape({
        name: "Cyan bar",
        start: 0,
        duration: total,
        w: Math.round(w * 0.1),
        h: 4,
        fill: "#22d3ee",
        y: -h * 0.38,
        animIn: "fade",
        animOut: "none",
      }),
      makeShape({
        name: "Magenta bar",
        start: 0,
        duration: total,
        w: Math.round(w * 0.06),
        h: 4,
        fill: "#f472b6",
        y: h * 0.4,
        animIn: "fade",
        animOut: "none",
      }),
    ],
  },
};

const WORDS_PER_MIN = 160;
const MIN_SCENE = 1.3;

export function splitScript(script: string): string[] {
  const blocks = script
    .replace(/\r/g, "")
    .split(/\n+/)
    .map((b) => b.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  for (const block of blocks) {
    const clean = block.replace(/^[#>*\-\d.\s]+/, "").trim();
    if (!clean) continue;
    const sentences = clean.split(/(?<=[.!?…|])\s+/).filter(Boolean);
    for (const sentence of sentences) {
      const words = sentence.split(/\s+/);
      if (words.length <= 9 && sentence.length <= 56) {
        chunks.push(sentence);
      } else {
        let current: string[] = [];
        for (const word of words) {
          current.push(word);
          const len = current.join(" ").length;
          if (current.length >= 5 && (len >= 34 || /[,;:]$/.test(word))) {
            chunks.push(current.join(" "));
            current = [];
          }
        }
        if (current.length) chunks.push(current.join(" "));
      }
    }
  }
  return chunks.filter((c) => c.trim().length > 0);
}

function estimateDuration(text: string, wpm: number) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(MIN_SCENE, (words / wpm) * 60 + 0.55);
}

function takeWords(text: string, n: number) {
  return text.trim().split(/\s+/).slice(0, n).join(" ");
}

/** First sentence, trimmed to a character budget on a word boundary. */
function sentenceTitle(text: string, maxChars: number) {
  const clean = text.trim().replace(/\s+/g, " ");
  const first = clean.split(/(?<=[.!?…])\s/)[0] || clean;
  if (first.length <= maxChars) return first.replace(/[.!?…]+$/, "");
  let out = "";
  for (const word of first.split(" ")) {
    const next = out ? `${out} ${word}` : word;
    if (next.length > maxChars) break;
    out = next;
  }
  return (out || takeWords(first, 6)).replace(/[,;:.!?…]+$/, "");
}

export function generateStoryboard(opts: GenerateOptions): Project {
  const { w, h } = ASPECTS[opts.aspect];
  const theme = THEMES[opts.style];
  const wpm = Math.min(220, Math.max(90, opts.wpm || WORDS_PER_MIN));
  const chunks = splitScript(opts.script);
  const source = chunks.length
    ? chunks
    : ["Paste your script in the AI panel to build a storyboard."];

  const titleDur = 2.6;
  const ctaDur = 3.2;
  let cursor = opts.includeTitle ? titleDur + 0.25 : 0;
  const placements: { text: string; start: number; duration: number }[] = [];
  for (const chunk of source) {
    const d = estimateDuration(chunk, wpm);
    placements.push({ text: chunk, start: Math.round(cursor * 100) / 100, duration: Math.round(d * 100) / 100 });
    cursor += d + 0.08;
  }
  const ctaStart = Math.round(cursor * 100) / 100;
  const total = Math.round((opts.includeCTA ? ctaStart + ctaDur : cursor) * 10) / 10;
  const autoTitle = opts.title?.trim() || sentenceTitle(source[0] ?? "New story", 34);
  const cardTitle = opts.title?.trim() || sentenceTitle(source[0] ?? "New story", 54);

  const layers: Layer[] = [];

  // persistent themed furniture
  layers.push(...theme.extras(w, h, total, opts.brand, opts));

  // title card
  if (opts.includeTitle) {
    const title = cardTitle.toUpperCase();
    layers.push(
      makeText(title, {
        name: "Title",
        role: "headline",
        start: 0,
        duration: titleDur,
        y: -h * 0.02,
        fontSize: Math.round(w * (title.length > 28 ? 0.062 : 0.078)),
        fontFamily: theme.font,
        fontWeight: theme.weight,
        color: theme.color,
        uppercase: false,
        lineHeight: 1.08,
        letterSpacing: -2,
        animIn: opts.style === "cinematic" ? "fade" : "pop",
        animOut: "fade",
      }),
      makeShape({
        name: "Title rule",
        start: 0.15,
        duration: titleDur - 0.15,
        w: Math.round(w * 0.14),
        h: 8,
        fill: theme.accent,
        y: h * 0.12,
        animIn: "pop",
        animOut: "fade",
      })
    );
  }

  // caption scenes
  placements.forEach((p, i) => {
    const isLong = p.text.length > 46;
    layers.push(
      makeText(p.text, {
        name: `Scene ${i + 1}`,
        role: "caption",
        start: p.start,
        duration: p.duration,
        y: h * theme.captionY,
        x: theme.align === "left" ? 0 : 0,
        w: theme.align === "left" ? w * 0.8 : w * 0.86,
        fontSize: Math.round(w * (isLong ? 0.054 : 0.066)),
        fontFamily: theme.font,
        fontWeight: theme.weight,
        color: theme.color,
        uppercase: theme.uppercase,
        lineHeight: 1.16,
        letterSpacing: opts.style === "cinematic" ? 0 : -1,
        highlight: theme.highlight,
        highlightText: theme.highlightText,
        align: theme.align,
        animIn: theme.animIn,
        animOut: "fade",
      })
    );

    if (theme.align === "left") {
      layers.push(
        makeShape({
          name: "Accent bar",
          start: p.start,
          duration: p.duration,
          w: 8,
          h: Math.round(h * 0.1),
          fill: theme.accent,
          x: -w * 0.418,
          y: h * theme.captionY,
          animIn: "pop",
          animOut: "fade",
        })
      );
    }

    // scene numbering keeps long-form videos readable
    if (placements.length > 3) {
      layers.push(
        makeText(`${String(i + 1).padStart(2, "0")} / ${String(placements.length).padStart(2, "0")}`, {
          name: `Counter ${String(i + 1).padStart(2, "0")}`,
        locked: true,
          start: p.start,
          duration: p.duration,
          x: w * theme.index.x,
          y: h * theme.index.y,
          fontSize: Math.round(w * 0.02),
          fontFamily: "JetBrains Mono",
          fontWeight: 500,
          letterSpacing: 2,
          color: theme.index.color,
          animIn: "fade",
          animOut: "none",
        })
      );
    }
  });

  // CTA
  if (opts.includeCTA) {
    const cta = opts.ctaText || "Follow for more";
    layers.push(
      makeText(cta, {
        name: "CTA",
        role: "headline",
        start: ctaStart,
        duration: ctaDur,
        y: -h * 0.03,
        fontSize: Math.round(w * 0.078),
        fontFamily: theme.font,
        fontWeight: theme.weight,
        color: theme.color,
        uppercase: opts.style === "neon",
        animIn: "pop",
        animOut: "fade",
      }),
      makeText(opts.brand || "@motionstudio", {
        name: "CTA handle",
        role: "brand",
        start: ctaStart + 0.25,
        duration: ctaDur - 0.25,
        y: h * 0.06,
        fontSize: Math.round(w * 0.032),
        fontWeight: 600,
        letterSpacing: 3,
        color: theme.accent,
        animIn: "slide-up",
        animOut: "fade",
      }),
      makeShape({
        name: "CTA pill",
        shape: "rect",
        start: ctaStart + 0.1,
        duration: ctaDur - 0.1,
        w: Math.round(w * 0.42),
        h: Math.round(w * 0.085),
        fill: theme.accent,
        y: h * 0.13,
        animIn: "pop",
        animOut: "fade",
        opacity: 0.16,
      })
    );
  }

  // ambient movement — slow drift on the largest background blob
  const blob = layers.find((l) => l.name === "Glow blob");
  if (blob) {
    blob.animIn = "fade";
    blob.animOut = "fade";
    blob.keyframes = [
      { id: uid("kf"), t: 0, x: blob.x, y: blob.y, scale: 1, rotation: 0, opacity: 0.55 },
      { id: uid("kf"), t: total * 0.5, x: blob.x - w * 0.16, y: blob.y + h * 0.05, scale: 1.12, rotation: 8, opacity: 0.75 },
      { id: uid("kf"), t: total, x: blob.x, y: blob.y, scale: 1, rotation: 0, opacity: 0.55 },
    ];
  }

  return {
    version: 1,
    name: autoTitle,
    width: w,
    height: h,
    fps: 30,
    duration: total,
    background: theme.bg,
    layers,
    updatedAt: Date.now(),
  };
}

export const SCRIPT_SAMPLES: { label: string; text: string }[] = [
  {
    label: "Product launch",
    text: `Meet the future of everyday focus.

One tap. Zero noise. Just you and your best work.

Built from aerospace aluminium, it weighs less than a notebook — and lasts three full days on a single charge.

No notifications. No doomscrolling. Only the things you chose to care about.

We built it because the world got loud, and your attention became the product.

Focus One. Out now.`,
  },
  {
    label: "Odisha history",
    text: `Long before modern science, Odisha was measuring the sky.

The Konark Sun Temple aligns with the sun on equinox, its wheels acting as precise sundials.

At Barabati, ancient texts recorded eclipses with an accuracy that still surprises astronomers.

The craftsmen were not magicians. They were observers, patient and exact.

And they wrote everything down.

This is the science we forgot to remember.`,
  },
  {
    label: "Motivational",
    text: `You do not need more time.

You need fewer open tabs in your head.

Pick one thing. Give it ninety honest minutes.

Not because it is easy — because it is yours.

The work will still be hard tomorrow. But you will be less afraid of it.

Start ugly. Start today.`,
  },
];
