// Generates the horror sound bed for "वह आखिरी कॉल" aligned to absolute frames.
// Output: public/thelastcall/bed.wav (44.1kHz 16-bit stereo)
import {writeFileSync} from "node:fs";

const SR = 44100;
const FPS = 30;
const f2s = (f) => f / FPS;
// Scene starts (frames) — must match TheLastCall.tsx
const S = [0, 320, 725, 1044, 1553];
const totalFrames = 1725;
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

// ── 60Hz drone throughout (per production notes), ducked after the final static
for (let s = 0; s < N; s++) {
  const t = s / SR;
  const f = totalFrames / FPS;
  let amp = 0.11;
  const duckAt = f2s(S[4] + 107); // static burst → near silence
  if (t > duckAt) amp = 0.028;
  const lfo = 1 + 0.14 * Math.sin(2 * Math.PI * 0.13 * t) + 0.07 * Math.sin(2 * Math.PI * 0.31 * t + 1);
  const v = (Math.sin(2 * Math.PI * 60 * t) * 0.7 + Math.sin(2 * Math.PI * 61.2 * t + 0.9) * 0.3) * amp * lfo;
  outL[s] += v;
  outR[s] += v * 0.94;
}

// ── phone ring trill at S1 open (screen lights up)
add(0.03, SR * 0.34, (ts) => {
  const e = expd(ts, 6) * Math.min(1, ts / 0.01) * 0.15;
  const v = (Math.sin(2 * Math.PI * 880 * ts) * 0.6 + Math.sin(2 * Math.PI * 1180 * ts) * 0.4) * e;
  return [v * 0.95, v];
});
add(0.49, SR * 0.34, (ts) => {
  const e = expd(ts, 6) * Math.min(1, ts / 0.01) * 0.13;
  const v = (Math.sin(2 * Math.PI * 880 * ts) * 0.6 + Math.sin(2 * Math.PI * 1180 * ts) * 0.4) * e;
  return [v * 0.95, v];
});

// ── heartbeat from S2 start → S4 end, accelerating 62→95 bpm (lub-dub)
const hbStart = S[1], hbEnd = S[4];
let hbT = hbStart;
while (hbT < hbEnd) {
  const p = (hbT - hbStart) / (hbEnd - hbStart);
  const bpm = 62 + 33 * p;
  const period = 60 / bpm;
  const amp = 0.42 + 0.34 * p;
  const ts = f2s(hbT);
  // lub
  add(ts, SR * 0.16, (u) => {
    const e = expd(u, 22) * amp;
    const v = Math.sin(2 * Math.PI * 52 * u) * e + (Math.random() * 2 - 1) * e * 0.22;
    return [v, v * 0.96];
  });
  // dub (softer, offset)
  add(ts + period * 0.27, SR * 0.13, (u) => {
    const e = expd(u, 24) * amp * 0.62;
    const v = Math.sin(2 * Math.PI * 47 * u) * e;
    return [v * 0.92, v];
  });
  hbT += period;
}

// ── footsteps during S4 walk (n3), crescendo, then stop (per script)
const stepStart = f2s(S[3] + 8);
for (let i = 0; i < 8; i++) {
  const t = stepStart + i * 0.87;
  const amp = 0.2 + i * 0.052;
  add(t, SR * 0.19, (u) => {
    const e = expd(u, 20) * amp;
    const v = Math.sin(2 * Math.PI * 74 * u) * e + (Math.random() * 2 - 1) * e * 0.3;
    return [v, v * 0.9];
  });
  add(t + 0.012, SR * 0.03, (u) => {
    const e = expd(u, 90) * amp * 0.4;
    const v = (Math.random() * 2 - 1) * e;
    return [v, v];
  });
}

// ── whooshes into hard cuts (S2, S3, S4)
for (const st of [S[1], S[2], S[3]]) {
  const cut = f2s(st);
  add(cut - 0.3, SR * 0.3, (_u, p) => {
    const e = Math.pow(p, 2.6) * 0.12;
    const v = (Math.random() * 2 - 1) * e;
    return [v, v * 0.85];
  });
}

// ── riser before S5 (last 0.8s of S4)
{
  const endT = f2s(S[4]);
  const dur = 0.8;
  add(endT - dur, SR * dur, (_u, p) => {
    const fq = 140 + 900 * Math.pow(p, 2);
    const e = Math.pow(p, 1.8) * 0.26;
    const v = Math.sin(2 * Math.PI * fq * (_u)) * e * 0.55 + (Math.random() * 2 - 1) * e * 0.45;
    return [v, v * 0.9];
  });
}

// ── glitch stinger at S5 start
add(f2s(S[4]), SR * 0.16, (u) => {
  const e = expd(u, 26) * 0.34;
  const v = (Math.random() * 2 - 1) * e;
  return [v, v * 0.85];
});
add(f2s(S[4]) + 0.02, SR * 0.05, (u) => {
  const e = expd(u, 70) * 0.12;
  const v = Math.sign(Math.sin(2 * Math.PI * 1150 * u)) * e;
  return [v, v * 0.8];
});

// ── sharp static burst at the cut-to-black (S5 + 107f) + sub thump
{
  const tS = f2s(S[4] + 107);
  add(tS, SR * 0.13, (u) => {
    const e = expd(u, 30) * 0.5;
    const v = (Math.random() * 2 - 1) * e;
    return [v, v];
  });
  add(tS, SR * 0.24, (u) => {
    const e = expd(u, 13) * 0.4;
    const v = Math.sin(2 * Math.PI * 44 * u) * e;
    return [v, v * 0.95];
  });
}

// ── master: soft clip, fades, normalize
let peak = 0;
for (let s = 0; s < N; s++) peak = Math.max(peak, Math.abs(outL[s]), Math.abs(outR[s]));
const gain = 0.85 / peak;
const fadeOut = 0.8 * SR;
const fadeIn = 0.08 * SR;
const PCM = new Int16Array(N * 2);
for (let s = 0; s < N; s++) {
  let l = outL[s] * gain;
  let r = outR[s] * gain;
  l = Math.tanh(l * 1.12) * 0.95;
  r = Math.tanh(r * 1.12) * 0.95;
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
writeFileSync(new URL("../public/thelastcall/bed.wav", import.meta.url), buf);
console.log("bed.wav:", (buf.length / 1024 / 1024).toFixed(1), "MB,", totalSec.toFixed(2), "s");
