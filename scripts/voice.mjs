import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import ESpeakNg from "espeak-ng";
import { RATE, fade, normalize, readWav, silence, trimSilence, writeWav } from "./lib/wav.mjs";

/**
 * Hindi narration + score for one video folder.
 *
 * espeak-ng (WASM) speaks every scene, the silence between lines is trimmed,
 * the lines are stitched with a fixed gap, and a D-minor drone with a low impact
 * on each cut is mixed underneath. Cut timings are written to timing.js so the
 * HTML scene code and the audio agree to the sample.
 */
const dir = process.argv[2];
if (!dir) {
  console.error("usage: node scripts/voice.mjs videos/<slug>");
  process.exit(1);
}

const spec = JSON.parse(readFileSync(path.join(dir, "script.json"), "utf8"));
const audioDir = path.join(dir, "audio");
mkdirSync(audioDir, { recursive: true });

const speed = spec.voice?.speed ?? 186;
const fixed = spec.fixedDurations ?? null;
const pitch = spec.voice?.pitch ?? 42;
const voice = spec.voice?.voice ?? "hi";
const gap = spec.gap ?? 0.24;
const tail = spec.tail ?? 2.2;

const lines = [];
for (const [i, scene] of spec.scenes.entries()) {
  const tmp = `/line${i}.wav`;
  const engine = await ESpeakNg({
    arguments: ["-v", voice, "-s", String(speed), "-p", String(pitch), "-w", tmp, scene.narration],
  });
  const file = path.join(audioDir, `line${i}.wav`);
  writeFileSync(file, Buffer.from(engine.FS.readFile(tmp)));
  const { samples, sampleRate } = readWav(file);
  const trimmed = fade(trimSilence(samples, sampleRate), sampleRate, 25);
  lines.push({ id: scene.id, samples: trimmed, sampleRate });
}

const spoken = lines.reduce((n, l) => n + l.samples.length / l.sampleRate, 0) + gap * (lines.length - 1);
const duration = fixed
  ? Math.round(fixed.reduce((a, b) => a + b, 0) * 100) / 100
  : Math.round((spoken + tail) * 100) / 100;
const total = Math.round(duration * RATE);

const voiceTrack = new Float32Array(total);
const scenes = [];
let cursor = 0;
for (const [i, line] of lines.entries()) {
  const start = Math.round(cursor * RATE);
  voiceTrack.set(line.samples, start);
  const len = line.samples.length / line.sampleRate;
  // the last line gets no tail: the CTA card owns the tail, otherwise the two
  // cards would be on screen together and the type would collide
  const isLast = i === lines.length - 1;
  const sceneLen = fixed ? fixed[i] : len + (isLast ? 0 : gap);
  scenes.push({
    id: line.id,
    start: Math.round(cursor * 100) / 100,
    duration: Math.round(sceneLen * 100) / 100,
    speak: Math.round(len * 100) / 100,
  });
  cursor += fixed ? sceneLen : len + gap;
  if (fixed && len > sceneLen) {
    console.warn(`  ! ${line.id}: narration ${len.toFixed(2)}s is longer than its ${sceneLen}s window`);
  }
}
normalize(voiceTrack, 0.88);

/* ---- score: D minor drone + impact on every cut ---- */
const bed = new Float32Array(total);
const partials = [
  { f: 73.42, a: 0.5, lfo: 0.031 },
  { f: 110.0, a: 0.26, lfo: 0.043 },
  { f: 146.83, a: 0.18, lfo: 0.027 },
  { f: 174.61, a: 0.12, lfo: 0.053 },
  { f: 220.0, a: 0.06, lfo: 0.037 },
];
for (let i = 0; i < total; i++) {
  const t = i / RATE;
  let v = 0;
  for (const p of partials) {
    const swell = 0.55 + 0.45 * Math.sin(2 * Math.PI * p.lfo * t - Math.PI / 2);
    v += p.a * swell * Math.sin(2 * Math.PI * p.f * t);
  }
  // slow breathing filter: fade the top partials in and out
  const air = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 0.017 * t));
  bed[i] = v * (0.55 + 0.45 * air);
}
normalize(bed, 0.5);

for (const scene of scenes.slice(0, -1)) {
  const start = Math.round(scene.start * RATE);
  const len = Math.round(0.9 * RATE);
  for (let i = 0; i < len && start + i < total; i++) {
    const t = i / RATE;
    const env = Math.exp(-t * 6.5);
    const thump = Math.sin(2 * Math.PI * 52 * t) * 0.9 + Math.sin(2 * Math.PI * 38 * t) * 0.5;
    const noise = (Math.random() * 2 - 1) * 0.12;
    bed[start + i] += (thump + noise) * env;
  }
}

const mix = new Float32Array(total);
for (let i = 0; i < total; i++) mix[i] = voiceTrack[i] + bed[i] * (spec.bed?.level ?? 0.13);
const head = Math.round(0.12 * RATE);
const edge = Math.round(0.5 * RATE);
for (let i = 0; i < head; i++) mix[i] *= i / head;
for (let i = 0; i < edge; i++) mix[total - 1 - i] *= i / edge;
normalize(mix, 0.94);

const narrationPath = path.join(audioDir, "narration.wav");
writeWav(narrationPath, mix, RATE);

const timing = {
  duration,
  fps: spec.fps ?? 30,
  scenes,
  cta: fixed ? null : { start: Math.round((duration - tail) * 100) / 100, duration: tail },
  tail,
};
writeFileSync(path.join(dir, "timing.js"), `window.TIMING = ${JSON.stringify(timing, null, 1)};\n`);

const sizes = existsSync(narrationPath) ? `${(mix.length / RATE).toFixed(2)}s` : "missing";
console.log(
  `voice: ${lines.length} lines · ${duration.toFixed(2)}s · ${sizes}\n` +
    scenes.map((s) => `  ${s.id.padEnd(12)} ${s.start.toFixed(2)}s +${s.duration.toFixed(2)}s`).join("\n")
);
