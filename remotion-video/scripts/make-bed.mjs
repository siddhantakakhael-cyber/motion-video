// Generates a subtle cinematic percussion bed aligned to the Odisha reel's scene cuts.
// Output: public/odisha/bed.wav (44.1kHz 16-bit stereo)
import {writeFileSync} from "node:fs";

const SR = 44100;
const FPS = 30;
// Scene start frames (must match OdishaAncientScience.tsx cut table)
const sceneStarts = [0, 292, 640, 1030, 1416, 1843, 2310, 2740];
const totalFrames = 3091;
const totalSec = totalFrames / FPS;
const N = Math.ceil(totalSec * SR);

const outL = new Float64Array(N);
const outR = new Float64Array(N);

const add = (t, n, gen) => {
  const s0 = Math.round(t * SR);
  for (let i = 0; i < n; i++) {
    const idx = s0 + i;
    if (idx < 0 || idx >= N) continue;
    const [l, r] = gen(i / SR, i / n);
    outL[idx] += l;
    outR[idx] += r;
  }
};

const expd = (x, k) => Math.exp(-x * k);

// Kick: sine pitch drop 110->42Hz, fast decay
const kick = (t, level) => add(t, SR * 0.32, (ts) => {
  const f = 42 + 68 * expd(ts, 18);
  const e = expd(ts, 11) * level;
  const v = Math.sin(2 * Math.PI * f * ts) * e;
  return [v, v];
});

// Boom: deeper sub drop with longer tail (scene accents)
const boom = (t, level = 0.62) => add(t, SR * 0.9, (ts) => {
  const f = 30 + 46 * expd(ts, 9);
  const e = expd(ts, 4.2) * level;
  const v = Math.sin(2 * Math.PI * f * ts) * e;
  return [v * 1.02, v];
});

// Hat tick: short bandpassed noise
const hat = (t, level = 0.05, pan = 0.5) => add(t, SR * 0.045, (ts, p) => {
  const e = expd(ts, 120) * level;
  const v = (Math.random() * 2 - 1) * e;
  return [v * (1 - pan) * 2 * 0.9, v * pan * 2 * 0.9];
});

// Whoosh into a cut (ends exactly at cut): noise with rising bp feel
const whoosh = (cutT, dur = 0.34, level = 0.16) => add(cutT - dur, SR * dur, (ts, p) => {
  const e = Math.pow(p, 2.4) * (1 - Math.pow(p, 22)) * level;
  const v = (Math.random() * 2 - 1) * e;
  return [v, v * 0.85];
});

// Clap/snare: noise burst with body
const clap = (t, level = 0.24) => add(t, SR * 0.19, (ts) => {
  const e = expd(ts, 26) * level;
  const v = (Math.random() * 2 - 1) * e + Math.sin(2 * Math.PI * 190 * ts) * e * 0.4;
  return [v, v * 0.92];
});

// Riser: rising sine + noise, ends at target
const riser = (startT, endT, level = 0.3) => {
  const dur = endT - startT;
  add(startT, SR * dur, (ts, p) => {
    const f = 180 + 720 * Math.pow(p, 2);
    const e = Math.pow(p, 1.7) * level;
    const v = Math.sin(2 * Math.PI * f * ts) * e * 0.6 + (Math.random() * 2 - 1) * e * 0.4;
    return [v, v * 0.9];
  });
};

// Drone: A1 + A2 sines with slow tremolo, constant low bed
const trem = 0.12;
for (let s = 0; s < N; s++) {
  const t = s / SR;
  const lfo = 1 - trem + trem * (0.5 + 0.5 * Math.sin(2 * Math.PI * 0.11 * t));
  const v = (Math.sin(2 * Math.PI * 55 * t) * 0.75 + Math.sin(2 * Math.PI * 110 * t + 1.3) * 0.25) * 0.135 * lfo;
  outL[s] += v;
  outR[s] += v * 0.96;
}

// Beat grid @ 92 BPM
const BPM = 92;
const beat = 60 / BPM;
const totalBeats = Math.ceil(totalSec / beat);
for (let b = 0; b < totalBeats; b++) {
  const t = b * beat;
  if (t >= totalSec - 0.15) break;
  const isSceneStart = sceneStarts.some((f) => Math.abs(f / FPS - t) < beat * 0.45);
  kick(t, isSceneStart ? 0.55 : 0.3);
  if (t > 91.0) {
    // CTA section: claps on offbeats for energy
    if (b % 2 === 1) clap(t + beat * 0.5, 0.22);
    hat(t + beat * 0.5, 0.085, b % 2 ? 0.68 : 0.32);
  } else {
    hat(t + beat * 0.5, 0.05, b % 2 ? 0.66 : 0.34);
  }
}

// Scene accents: boom + whoosh before each cut (skip first, it has its own punch)
for (const f of sceneStarts) {
  const t = f / FPS;
  if (t === 0) {
    boom(0.02, 0.8);
    continue;
  }
  boom(t, 0.62);
  whoosh(t, 0.34, 0.17);
}

// CTA pad chord (A major-ish shimmer) at CTA start
add(91.33, SR * 9.0, (ts, p) => {
  const e = Math.min(1, ts / 1.6) * Math.min(1, Math.max(0, (9 - ts) / 1.4)) * 0.05;
  const notes = [110, 138.59, 164.81, 220];
  let v = 0;
  for (const f of notes) v += Math.sin(2 * Math.PI * f * ts + Math.sin(ts * 0.7) * 0.15);
  v = (v / notes.length) * e;
  return [v, v * 0.9];
});

// Riser into CTA
riser(87.3, 91.33, 0.3);

// Master: soft clip + fade in/out + normalize
let peak = 0;
for (let s = 0; s < N; s++) {
  peak = Math.max(peak, Math.abs(outL[s]), Math.abs(outR[s]));
}
const gain = 0.82 / peak;
const fadeOut = 1.4 * SR;
const fadeIn = 0.25 * SR;
const PCM = new Int16Array(N * 2);
for (let s = 0; s < N; s++) {
  let l = outL[s] * gain;
  let r = outR[s] * gain;
  l = Math.tanh(l * 1.15) * 0.94;
  r = Math.tanh(r * 1.15) * 0.94;
  if (s < fadeIn) { l *= s / fadeIn; r *= s / fadeIn; }
  if (s > N - fadeOut) { const k = (N - s) / fadeOut; l *= k; r *= k; }
  PCM[s * 2] = Math.round(l * 32767);
  PCM[s * 2 + 1] = Math.round(r * 32767);
}

// WAV header
const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + PCM.length * 2, 4);
header.write("WAVE", 8);
header.write("fmt ", 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(2, 22);
header.writeUInt32LE(SR, 24);
header.writeUInt32LE(SR * 4, 28);
header.writeUInt16LE(4, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(PCM.length * 2, 40);
const buf = Buffer.concat([header, Buffer.from(PCM.buffer)]);
writeFileSync(new URL("../public/odisha/bed.wav", import.meta.url), buf);
console.log("bed.wav written:", (buf.length / 1024 / 1024).toFixed(1), "MB,", totalSec.toFixed(2), "s");
