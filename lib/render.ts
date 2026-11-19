import { layerTransform } from "./anim";
import { fontString } from "./project";
import type { Background, Layer, Project } from "./types";

export type ImageMap = Record<string, HTMLImageElement>;

export function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  font: string
): string[] {
  ctx.font = font;
  const paragraphs = text.split("\n");
  const out: string[] = [];
  for (const para of paragraphs) {
    if (!para.trim()) {
      out.push("");
      continue;
    }
    const words = para.split(/\s+/);
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        out.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function paintBackground(ctx: CanvasRenderingContext2D, bg: Background, w: number, h: number) {
  ctx.save();
  if (bg.type === "solid") {
    ctx.fillStyle = bg.color;
    ctx.fillRect(0, 0, w, h);
  } else if (bg.type === "gradient") {
    const rad = (bg.angle * Math.PI) / 180;
    const cx = w / 2;
    const cy = h / 2;
    const len = Math.abs(w * Math.cos(rad)) + Math.abs(h * Math.sin(rad));
    const dx = (Math.cos(rad) * len) / 2;
    const dy = (Math.sin(rad) * len) / 2;
    const g = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
    g.addColorStop(0, bg.from);
    g.addColorStop(1, bg.to);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  } else {
    ctx.fillStyle = bg.color;
    ctx.fillRect(0, 0, w, h);
    const blobs = [
      { x: 0.22, y: 0.18, r: 0.75, c: bg.from, a: 0.85 },
      { x: 0.82, y: 0.34, r: 0.6, c: bg.to, a: 0.7 },
      { x: 0.5, y: 0.86, r: 0.7, c: bg.from, a: 0.4 },
    ];
    for (const b of blobs) {
      const g = ctx.createRadialGradient(
        b.x * w,
        b.y * h,
        0,
        b.x * w,
        b.y * h,
        b.r * Math.max(w, h)
      );
      g.addColorStop(0, hexA(b.c, b.a));
      g.addColorStop(1, hexA(b.c, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
  }
  ctx.restore();
}

export function hexA(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawText(ctx: CanvasRenderingContext2D, layer: Layer, w: number, h: number) {
  const raw = layer.uppercase ? (layer.text ?? "").toUpperCase() : layer.text ?? "";
  if (!raw.trim()) return;
  const font = fontString(layer);
  const size = layer.fontSize ?? 64;
  const maxWidth = Math.min(w * 0.92, layer.w ?? w * 0.86);
  const spacing = layer.letterSpacing ?? 0;

  ctx.font = font;
  ctx.textBaseline = "middle";
  // canvas letterSpacing is widely supported in Chromium / Safari 17+
  try {
    (ctx as unknown as { letterSpacing: string }).letterSpacing = `${spacing}px`;
  } catch {
    /* noop */
  }

  const lines = wrapLines(ctx, raw, maxWidth, font);
  const lh = size * (layer.lineHeight ?? 1.14);
  const totalH = lines.length * lh;
  const startY = -totalH / 2 + lh / 2;
  const padX = size * 0.2;
  const padY = size * 0.08;

  lines.forEach((line, i) => {
    const lineW = ctx.measureText(line).width;
    let lx = 0;
    if (layer.align === "left") lx = -maxWidth / 2 + lineW / 2;
    else if (layer.align === "right") lx = maxWidth / 2 - lineW / 2;
    const y = startY + i * lh;

    if (layer.highlight) {
      ctx.save();
      ctx.fillStyle = layer.highlight;
      roundRect(ctx, lx - lineW / 2 - padX, y - lh / 2 + padY, lineW + padX * 2, lh - padY * 2, size * 0.18);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    if (!layer.highlight) {
      ctx.shadowColor = "rgba(0,0,0,0.35)";
      ctx.shadowBlur = size * 0.22;
      ctx.shadowOffsetY = size * 0.03;
    }
    ctx.fillStyle = layer.highlightText ?? layer.color ?? "#fff";
    ctx.textAlign = "center";
    ctx.fillText(line, lx, y);
    ctx.restore();
  });

  try {
    (ctx as unknown as { letterSpacing: string }).letterSpacing = "0px";
  } catch {
    /* noop */
  }
}

function drawImage(
  ctx: CanvasRenderingContext2D,
  layer: Layer,
  img: HTMLImageElement | undefined,
  w: number,
  h: number
) {
  if (!img) {
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    roundRect(ctx, -(layer.w ?? w * 0.4) / 2, -(layer.h ?? h * 0.25) / 2, layer.w ?? w * 0.8, layer.h ?? h * 0.5, layer.radius ?? 24);
    ctx.fill();
    ctx.restore();
    return;
  }

  const boxW = layer.w ?? w * 0.8;
  const boxH = layer.h ?? (boxW * img.naturalHeight) / Math.max(1, img.naturalWidth);
  const radius = layer.radius ?? 0;
  ctx.save();
  ctx.beginPath();
  if (radius > 0) roundRect(ctx, -boxW / 2, -boxH / 2, boxW, boxH, radius);
  else ctx.rect(-boxW / 2, -boxH / 2, boxW, boxH);
  ctx.clip();

  const scale =
    layer.fit === "contain"
      ? Math.min(boxW / img.naturalWidth, boxH / img.naturalHeight)
      : Math.max(boxW / img.naturalWidth, boxH / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
}

function shapeFill(ctx: CanvasRenderingContext2D, layer: Layer, sw: number, sh: number) {
  const raw = layer.fill ?? "#8b5cf6";
  if (raw.startsWith("radial:")) {
    const [, hex = "#8b5cf6", alphaRaw = "0.4"] = raw.split(":");
    const alpha = Number(alphaRaw);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(sw, sh) / 2);
    g.addColorStop(0, hexA(hex, Number.isFinite(alpha) ? alpha : 0.4));
    g.addColorStop(0.6, hexA(hex, (Number.isFinite(alpha) ? alpha : 0.4) * 0.5));
    g.addColorStop(1, hexA(hex, 0));
    return g;
  }
  return raw;
}

function drawShape(ctx: CanvasRenderingContext2D, layer: Layer, w: number, h: number) {
  const sw = layer.w ?? 160;
  const sh = layer.h ?? 10;
  ctx.save();
  const fill = shapeFill(ctx, layer, sw, sh);
  ctx.fillStyle = fill;
  if (layer.shape === "ellipse") {
    ctx.beginPath();
    ctx.ellipse(0, 0, sw / 2, sh / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (layer.shape === "triangle") {
    ctx.beginPath();
    ctx.moveTo(0, -sh / 2);
    ctx.lineTo(sw / 2, sh / 2);
    ctx.lineTo(-sw / 2, sh / 2);
    ctx.closePath();
    ctx.fill();
  } else if (layer.shape === "line") {
    ctx.strokeStyle = fill;
    ctx.lineWidth = sh;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-sw / 2, 0);
    ctx.lineTo(sw / 2, 0);
    ctx.stroke();
  } else {
    roundRect(ctx, -sw / 2, -sh / 2, sw, sh, Math.min(18, sh / 2));
    ctx.fill();
  }
  ctx.restore();
  void w;
  void h;
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  project: Project,
  time: number,
  images: ImageMap = {}
) {
  const { width: w, height: h } = project;
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  paintBackground(ctx, project.background, w, h);

  for (const layer of project.layers) {
    if (layer.hidden || layer.type === "audio") continue;
    const local = time - layer.start;
    if (local < -0.001 || local > layer.duration) continue;

    const tr = layerTransform(layer, local);
    if (tr.opacity <= 0.001) continue;

    ctx.save();
    ctx.globalAlpha = Math.min(1, Math.max(0, tr.opacity));
    ctx.translate(w / 2 + tr.x, h / 2 + tr.y);
    if (tr.rotation) ctx.rotate((tr.rotation * Math.PI) / 180);
    ctx.scale(tr.scale, tr.scale);

    if (layer.type === "text") drawText(ctx, layer, w, h);
    else if (layer.type === "image") drawImage(ctx, layer, layer.src ? images[layer.src] : undefined, w, h);
    else if (layer.type === "shape") drawShape(ctx, layer, w, h);

    ctx.restore();
  }

  ctx.restore();
}
