import { makeText } from "./project";
import type { Layer, Project } from "./types";

export interface SubtitleCue {
  index: number;
  text: string;
  start: number;
  end: number;
}

const pad = (n: number, size = 2) => String(Math.floor(n)).padStart(size, "0");

function timecode(seconds: number, separator: "." | ",") {
  const safe = Math.max(0, seconds);
  const ms = Math.round((safe - Math.floor(safe)) * 1000);
  return `${pad(safe / 3600)}:${pad((safe % 3600) / 60)}:${pad(safe % 60)}${separator}${pad(ms, 3)}`;
}

/** Every caption layer on the timeline, in play order. */
export function captionCues(project: Project): SubtitleCue[] {
  return project.layers
    .filter((l) => l.type === "text" && l.role === "caption" && !l.hidden && (l.text ?? "").trim())
    .sort((a, b) => a.start - b.start)
    .map((layer, i) => ({
      index: i + 1,
      text: (layer.text ?? "").replace(/\s+/g, " ").trim(),
      start: layer.start,
      end: layer.start + layer.duration,
    }));
}

export function toSrt(cues: SubtitleCue[]): string {
  return cues
    .map(
      (cue) =>
        `${cue.index}\n${timecode(cue.start, ",")} --> ${timecode(cue.end, ",")}\n${cue.text}\n`
    )
    .join("\n");
}

export function toVtt(cues: SubtitleCue[]): string {
  const body = cues
    .map((cue) => `${timecode(cue.start, ".")} --> ${timecode(cue.end, ".")}\n${cue.text}\n`)
    .join("\n");
  return `WEBVTT\n\n${body}`;
}

function parseTimecode(value: string): number {
  const clean = value.trim().replace(",", ".");
  const parts = clean.split(":").map(Number);
  if (!parts.length || parts.some((n) => Number.isNaN(n))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

/** Parse an .srt or .vtt file (tolerant: extra blanks, BOM, cue settings, tags). */
export function parseSubtitles(raw: string): SubtitleCue[] {
  const text = raw.replace(/\r\n?/g, "\n").replace(/^\uFEFF/, "");
  const cues: SubtitleCue[] = [];
  for (const block of text.split(/\n{2,}/)) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    if (/^(WEBVTT|NOTE|STYLE|REGION)\b/i.test(lines[0])) continue;
    const arrow = lines.findIndex((l) => l.includes("-->"));
    if (arrow < 0) continue;
    const [rawFrom, rawTo] = lines[arrow].split("-->");
    const start = parseTimecode(rawFrom.trim().split(/\s+/)[0]);
    const end = parseTimecode((rawTo ?? "").trim().split(/\s+/)[0]);
    const body = lines
      .slice(arrow + 1)
      .join(" ")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!body || end <= start) continue;
    cues.push({ index: cues.length + 1, text: body, start, end });
  }
  return cues;
}

/**
 * Turn cues into caption layers, borrowing the look of captions already on the
 * timeline so an imported file matches the scene style.
 */
export function captionLayersFromCues(project: Project, cues: SubtitleCue[]): Layer[] {
  const template = project.layers.find((l) => l.type === "text" && l.role === "caption");
  const { width: w } = project;
  return cues.map((cue, i) => {
    const text = cue.text.replace(/\s+/g, " ").trim();
    const duration = Math.round(Math.max(0.4, cue.end - cue.start) * 100) / 100;
    return makeText(text, {
      name: `Caption ${i + 1}`,
      role: "caption",
      start: Math.round(cue.start * 100) / 100,
      duration,
      fontSize: template?.fontSize ?? Math.round(w * (text.length > 46 ? 0.054 : 0.066)),
      fontFamily: template?.fontFamily ?? "Poppins",
      fontWeight: template?.fontWeight ?? 800,
      color: template?.color ?? "#ffffff",
      uppercase: template?.uppercase ?? false,
      align: template?.align ?? "center",
      letterSpacing: template?.letterSpacing ?? -1,
      lineHeight: template?.lineHeight ?? 1.16,
      animIn: template?.animIn ?? "slide-up",
      animOut: template?.animOut ?? "fade",
      x: template?.x ?? 0,
      y: template?.y ?? 0,
      w: template?.w ?? w * 0.86,
    });
  });
}
