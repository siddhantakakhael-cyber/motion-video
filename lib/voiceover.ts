"use client";

import { encodeWav, synthesizeLine } from "./tts";

export interface NarrationLine {
  text: string;
  /** start time in seconds, including the lead-in silence */
  start: number;
  /** spoken length of this line (without the gap that follows it) */
  duration: number;
}

export interface Narration {
  blob: Blob;
  lines: NarrationLine[];
  duration: number;
  sampleRate: number;
}

export interface NarrationOptions {
  /** eSpeak speed, roughly words per minute (140–200 reads naturally) */
  speed?: number;
  /** silence before the first line — lines up with the title card */
  lead?: number;
  /** pause inserted after every line */
  gap?: number;
  /** silence appended at the very end */
  tail?: number;
  onProgress?: (done: number, total: number) => void;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function resample(samples: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return samples;
  const ratio = to / from;
  const out = new Float32Array(Math.max(1, Math.floor(samples.length * ratio)));
  for (let i = 0; i < out.length; i++) {
    const pos = i / ratio;
    const i0 = Math.floor(pos);
    const i1 = Math.min(samples.length - 1, i0 + 1);
    const t = pos - i0;
    out[i] = samples[i0] * (1 - t) + samples[i1] * t;
  }
  return out;
}

/** Drop the leading/trailing silence eSpeak leaves around a line, so cuts sit on speech. */
function trimSilence(samples: Float32Array, sampleRate: number): Float32Array {
  const threshold = 0.008;
  let first = 0;
  let last = samples.length - 1;
  while (first < samples.length && Math.abs(samples[first]) < threshold) first++;
  while (last > first && Math.abs(samples[last]) < threshold) last--;
  if (last <= first) return samples;
  const pad = Math.round(sampleRate * 0.025);
  const start = Math.max(0, first - pad);
  const end = Math.min(samples.length, last + pad + 1);
  return samples.subarray(start, end);
}

function fadeEdges(samples: Float32Array, sampleRate: number) {
  const n = Math.min(Math.floor(sampleRate * 0.006), Math.floor(samples.length / 2));
  for (let i = 0; i < n; i++) {
    const k = i / n;
    samples[i] *= k;
    samples[samples.length - 1 - i] *= k;
  }
  return samples;
}

/**
 * Speak every line and stitch the result into one continuous voiceover track.
 * The returned line timings are what the timeline uses for its cuts, so cuts
 * land exactly where the narration moves to the next sentence.
 */
export async function narrate(lines: string[], opts: NarrationOptions = {}): Promise<Narration | null> {
  const spoken: { text: string; samples: Float32Array; sampleRate: number }[] = [];
  const speed = Math.round(opts.speed ?? 168);
  const lead = Math.max(0, opts.lead ?? 0);
  const gap = Math.max(0, opts.gap ?? 0.08);
  const tail = Math.max(0, opts.tail ?? 0.3);

  for (let i = 0; i < lines.length; i++) {
    const pcm = await synthesizeLine(lines[i], speed);
    if (!pcm) return null;
    spoken.push({ text: lines[i], samples: pcm.samples, sampleRate: pcm.sampleRate });
    opts.onProgress?.(i + 1, lines.length);
    // let the browser paint between lines on long scripts
    if (i % 3 === 2) await new Promise((r) => setTimeout(r, 0));
  }
  if (!spoken.length) return null;

  const sampleRate = spoken[0].sampleRate;
  const clips = spoken.map((line) => trimSilence(resample(line.samples, line.sampleRate, sampleRate), sampleRate));
  let cursor = lead;
  const layout: NarrationLine[] = [];
  for (let i = 0; i < clips.length; i++) {
    const duration = clips[i].length / sampleRate;
    layout.push({ text: spoken[i].text, start: round2(cursor), duration: round2(duration) });
    cursor += duration + gap;
  }

  const total = cursor + tail;
  const out = new Float32Array(Math.max(1, Math.ceil(total * sampleRate)));
  layout.forEach((cue, i) => {
    const source = clips[i].slice();
    fadeEdges(source, sampleRate);
    const startSample = Math.round(cue.start * sampleRate);
    for (let s = 0; s < source.length && startSample + s < out.length; s++) out[startSample + s] += source[s];
  });

  return {
    blob: encodeWav(out, sampleRate),
    lines: layout,
    duration: out.length / sampleRate,
    sampleRate,
  };
}
