import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import ESpeakNg from "espeak-ng";
import { RATE, fade, normalize, readWav, silence, trimSilence, writeWav } from "./lib/wav.mjs";
import { buildAmbience } from "./lib/ambience.mjs";

/**
 * Hindi narration + score for one video folder.
 *
 * Either Piper (neural VITS, a .onnx voice from script.json) or espeak-ng (WASM)
 * speaks every scene, the silence between lines is trimmed,
 * the lines are stitched with a fixed gap, and a D-minor drone with a low impact
 * on each cut is mixed underneath, together with a synthesised natural bed
 * (wind, distant rumble, crickets, bell, conch, arrow whooshes) that is ducked
 * by the voice. Cut timings are written to timing.js so the HTML scene code and
 * the audio agree to the sample.
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

/* ---- engine: Piper (neural) when a voice model is present, else espeak-ng ---- */
const piperModel = (() => {
  const m = spec.voice?.model ?? process.env.PIPER_MODEL ?? "";
  if (!m) return "";
  return path.isAbsolute(m) ? m : path.join(dir, m);
})();
const usePiper =
  (spec.voice?.engine ?? "espeak") === "piper" &&
  Boolean(piperModel) &&
  existsSync(piperModel) &&
  spawnSync("piper", ["--help"], { encoding: "utf8" }).status === 0;
if ((spec.voice?.engine ?? "espeak") === "piper" && !usePiper) {
  console.warn(`piper requested but ${piperModel || "no model"} is unavailable — falling back to espeak-ng`);
}

const trimTo = (file) => {
  const { samples, sampleRate } = readWav(file);
  return { samples: fade(trimSilence(samples, sampleRate), sampleRate, 25), sampleRate };
};
const synthPiper = (text, file, scale) => {
  const res = spawnSync(
    "piper",
    ["-m", piperModel, "-f", file, "--length-scale", scale.toFixed(2), "--sentence-silence", "0.12"],
    { input: `${text}\n`, encoding: "utf8" }
  );
  if (res.status !== 0) throw new Error(`piper failed: ${(res.stderr ?? "").slice(0, 300)}`);
  return trimTo(file);
};

const lines = [];
for (const [i, scene] of spec.scenes.entries()) {
  const file = path.join(audioDir, `line${i}.wav`);
  if (usePiper) {
    // Piper's durations wobble a little per run, so each line is retried faster
    // until it fits its scene window with room to breathe.
    const budget = fixed ? fixed[i] - (scene.margin ?? 0.5) : Infinity;
    let scale = scene.lengthScale ?? spec.voice?.lengthScale ?? 0.95;
    let out = synthPiper(scene.narration, file, scale);
    let dur = out.samples.length / out.sampleRate;
    if (dur > budget) {
      // Piper's duration tracks length-scale almost linearly, so jump straight to
      // the scale that fits instead of walking down from the default — that keeps
      // the read as slow as the scene window allows.
      scale = Math.max(0.72, Math.min(0.98, (scale * budget) / dur * 0.99));
      for (let tries = 0; tries < 6; tries++) {
        out = synthPiper(scene.narration, file, scale);
        dur = out.samples.length / out.sampleRate;
        if (dur <= budget) break;
        scale = Math.max(0.72, scale - 0.02);
      }
    }
    lines.push({ id: scene.id, ...out, scale });
    console.log(`  ${scene.id.padEnd(10)} piper · ${dur.toFixed(2)}s / ${fixed ? fixed[i] : "?"}s · length-scale ${scale.toFixed(2)}`);
  } else {
    const tmp = `/line${i}.wav`;
    const engine = await ESpeakNg({
      arguments: ["-v", voice, "-s", String(speed), "-p", String(pitch), "-w", tmp, scene.narration],
    });
    writeFileSync(file, Buffer.from(engine.FS.readFile(tmp)));
    lines.push({ id: scene.id, ...trimTo(file) });
  }
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

/* ---- natural ambience: wind, rumble, crickets, bell, conch, arrows ---- */
const ambience =
  spec.ambience?.level === 0
    ? null
    : buildAmbience({
        duration,
        rate: RATE,
        scenes: spec.scenes.map((sc, i) => ({ ...sc, ...scenes[i] })),
        voice: voiceTrack,
        level: spec.ambience?.level ?? 0.16,
      });

const mix = new Float32Array(total);
for (let i = 0; i < total; i++) {
  mix[i] = voiceTrack[i] + bed[i] * (spec.bed?.level ?? 0.13) + (ambience ? ambience[i] : 0);
}
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
