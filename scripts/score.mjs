import { mkdirSync } from "node:fs";
import path from "node:path";
import { RATE, normalize, writeWav } from "./lib/wav.mjs";

/**
 * Music-only score: a D-minor drone plus a low impact on demand.
 *
 *   node scripts/score.mjs out.wav 6.0 1.2 4.4
 *
 * Used by intros/idents that carry no narration. Same voice bed as
 * scripts/voice.mjs so a reel and its ident sit in the same key.
 */
const [file, secondsArg, ...hitArgs] = process.argv.slice(2);
if (!file || !secondsArg) {
  console.error("usage: node scripts/score.mjs <out.wav> <seconds> [hitTimes...]");
  process.exit(1);
}

const seconds = Number(secondsArg);
const hits = hitArgs.map(Number).filter((n) => Number.isFinite(n));
const total = Math.round(seconds * RATE);
const mix = new Float32Array(total);

const partials = [
  { f: 73.42, a: 0.5, lfo: 0.031 },
  { f: 110.0, a: 0.26, lfo: 0.043 },
  { f: 146.83, a: 0.2, lfo: 0.027 },
  { f: 174.61, a: 0.12, lfo: 0.053 },
  { f: 220.0, a: 0.06, lfo: 0.037 },
  { f: 293.66, a: 0.03, lfo: 0.019 },
];

const fadeIn = 0.02;
const fadeOut = Math.min(0.6, seconds * 0.15);

for (let i = 0; i < total; i++) {
  const t = i / RATE;
  let v = 0;
  for (const p of partials) {
    const swell = 0.55 + 0.45 * Math.sin(2 * Math.PI * p.lfo * t - Math.PI / 2);
    v += p.a * swell * Math.sin(2 * Math.PI * p.f * t);
  }
  const air = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 0.017 * t));
  // a slow crescendo into the impact and a tail after it
  const arc = 0.55 + 0.45 * Math.min(1, t / Math.max(0.6, seconds * 0.35));
  mix[i] = v * (0.55 + 0.45 * air) * arc;
}
normalize(mix, 0.42);

for (const at of hits) {
  const start = Math.round(at * RATE);
  const len = Math.round(1.15 * RATE);
  for (let i = 0; i < len && start + i < total; i++) {
    const t = i / RATE;
    const env = Math.exp(-t * 5.5);
    const body = Math.sin(2 * Math.PI * 52 * t) * 0.95 + Math.sin(2 * Math.PI * 38 * t) * 0.55;
    const click = (Math.sin(2 * Math.PI * 780 * t) * 0.3 + (Math.sin(i * 12.9898) * 0.5)) * Math.exp(-t * 40) * 0.5;
    mix[start + i] += (body + click) * env;
  }
}

const inLen = Math.round(fadeIn * RATE);
const outLen = Math.round(fadeOut * RATE);
for (let i = 0; i < inLen && i < total; i++) mix[i] *= i / inLen;
for (let i = 0; i < outLen && i < total; i++) mix[total - 1 - i] *= i / outLen;

normalize(mix, 0.9);
mkdirSync(path.dirname(file), { recursive: true });
const length = writeWav(file, mix, RATE);
console.log(`score: ${file} · ${length.toFixed(2)}s · hits at ${hits.join(", ") || "none"}`);
