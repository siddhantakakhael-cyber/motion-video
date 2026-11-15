// Generates the epic-mythic sound bed for "Sampati: The Untold Sacrifice".
// Output: public/sampati/bed.wav (44.1kHz 16-bit stereo)
import {writeFileSync} from "node:fs";

const SR = 44100;
const FPS = 30;
const f2s = (f) => f / FPS;
// Scene starts (frames) — must match SampatiUntold.tsx
const S = [0, 266, 564, 841, 1139, 1443, 1765];
const totalFrames = 1999;
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

// ── warm drone: A1 root + E2 fifth, slow tremolo ──
for (let s = 0; s < N; s++) {
  const t = s / SR;
  const lfo = 1 + 0.12 * Math.sin(2 * Math.PI * 0.09 * t) + 0.06 * Math.sin(2 * Math.PI * 0.23 * t + 1.2);
  const v = (Math.sin(2 * Math.PI * 55 * t) * 0.72 + Math.sin(2 * Math.PI * 82.5 * t + 0.7) * 0.28) * 0.105 * lfo;
  outL[s] += v;
  outR[s] += v * 0.95;
}

// ── wind through the flight scenes (S2 → S4 start) ──
{
  const t0 = f2s(S[1]), t1 = f2s(S[3]);
  add(t0, SR * (t1 - t0), (_u, p) => {
    const swell = 0.35 + 0.65 * Math.abs(Math.sin(p * 7 + 1));
    const e = 0.085 * swell * Math.min(1, p * 8) * Math.min(1, (1 - p) * 5);
    const v = (Math.random() * 2 - 1) * e;
    return [v, v * 0.85];
  });
}

// ── taiko-style boom on each cut (biggest at sacrifice) ──
const boom = (t, level = 0.55) => add(t, SR * 0.9, (u) => {
  const f = 30 + 46 * expd(u, 9);
  const e = expd(u, 4.2) * level;
  const v = Math.sin(2 * Math.PI * f * u) * e;
  return [v * 1.02, v];
});
const whoosh = (cutT, dur = 0.35, level = 0.15) => add(cutT - dur, SR * dur, (_u, p) => {
  const e = Math.pow(p, 2.4) * (1 - Math.pow(p, 22)) * level;
  const v = (Math.random() * 2 - 1) * e;
  return [v, v * 0.85];
});
for (const f of S) {
  const t = f2s(f);
  const big = f === S[3];
  boom(t, big ? 0.85 : 0.6);
  if (t > 0) whoosh(t, big ? 0.6 : 0.34, big ? 0.24 : 0.16);
}

// ── riser into the sacrifice (1.1s before S4) ──
{
  const endT = f2s(S[3]);
  add(endT - 1.1, SR * 1.1, (_u, p) => {
    const fq = 150 + 800 * Math.pow(p, 2);
    const e = Math.pow(p, 1.7) * 0.26;
    const v = Math.sin(2 * Math.PI * fq * (_u)) * e * 0.5 + (Math.random() * 2 - 1) * e * 0.5;
    return [v, v * 0.9];
  });
}

// ── wing-burn crackle at S4 + 0.6s ──
add(f2s(S[3]) + 0.6, SR * 0.7, (u, p) => {
  const crack = Math.random() > 0.82 ? 1 : 0;
  const e = crack * expd(u % 0.02, 400) * 0.3 * (1 - p * 0.4);
  const v = (Math.random() * 2 - 1) * e;
  return [v, v * 0.9];
});

// ── lonely ground texture in S5: slow low pulse 72bpm ──
{
  const t0 = f2s(S[4]), t1 = f2s(S[5]);
  const period = 60 / 72;
  for (let t = t0; t < t1; t += period) {
    add(t, SR * 0.24, (u) => {
      const e = expd(u, 18) * 0.2;
      const v = Math.sin(2 * Math.PI * 58 * u) * e;
      return [v, v * 0.94];
    });
  }
}

// ── eagle-vision shimmer at S6 (rising bell arpeggio) ──
[660, 880, 990, 1320].forEach((fq, i) => {
  add(f2s(S[5]) + 0.25 + i * 0.16, SR * 1.3, (u) => {
    const e = expd(u, 3.2) * 0.1;
    const v = Math.sin(2 * Math.PI * fq * u) * e + Math.sin(2 * Math.PI * fq * 2.001 * u) * e * 0.3;
    return [v * (i % 2 ? 0.8 : 1), v * (i % 2 ? 1 : 0.8)];
  });
});

// ── ending: warm major pad + soft bell (hope) ──
{
  const t0 = f2s(S[6]);
  add(t0, SR * (totalSec - t0), (u, p) => {
    const e = Math.min(1, u / 2.2) * Math.min(1, Math.max(0, (totalSec - t0 - u) / 1.6)) * 0.055;
    const notes = [220, 277.18, 329.63, 440];
    let v = 0;
    for (const fq of notes) v += Math.sin(2 * Math.PI * fq * u + Math.sin(u * 0.6) * 0.2);
    v = (v / notes.length) * e;
    return [v, v * 0.9];
  });
}
add(f2s(S[6]) + 1.1, SR * 2.6, (u) => {
  const e = expd(u, 2.4) * 0.11;
  const v = Math.sin(2 * Math.PI * 1108.7 * u) * e + Math.sin(2 * Math.PI * 1662 * u) * e * 0.4;
  return [v * 0.9, v];
});

// ── master: soft clip, fades, normalize ──
let peak = 0;
for (let s = 0; s < N; s++) peak = Math.max(peak, Math.abs(outL[s]), Math.abs(outR[s]));
const gain = 0.82 / peak;
const fadeOut = 1.5 * SR;
const fadeIn = 0.2 * SR;
const PCM = new Int16Array(N * 2);
for (let s = 0; s < N; s++) {
  let l = outL[s] * gain;
  let r = outR[s] * gain;
  l = Math.tanh(l * 1.12) * 0.94;
  r = Math.tanh(r * 1.12) * 0.94;
  if (s < fadeIn) { l *= s / fadeIn; r *= s / fadeIn; }
  if (s > N - fadeOut) { const k = (N - s) / fadeOut; l *= k; r *= k; }
  PCM[s * 2] = Math.round(l * 32767);
  PCM[s * 2 + 1] = Math.round(r * 32767);
}
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
writeFileSync(new URL("../public/sampati/bed.wav", import.meta.url), buf);
console.log("bed.wav:", (buf.length / 1024 / 1024).toFixed(1), "MB,", totalSec.toFixed(2), "s");
