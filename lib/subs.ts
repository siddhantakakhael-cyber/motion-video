import type { Project } from "./types";

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
