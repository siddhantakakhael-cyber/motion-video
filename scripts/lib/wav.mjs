import { readFileSync, writeFileSync } from "node:fs";

export const RATE = 22050;

/** Read a 16-bit mono PCM WAV into a Float32Array. */
export function readWav(file) {
  const buf = readFileSync(file);
  if (buf.toString("ascii", 0, 4) !== "RIFF") throw new Error(`${file} is not a RIFF wav`);
  let offset = 12;
  let data = null;
  let rate = RATE;
  while (offset < buf.length - 8) {
    const id = buf.toString("ascii", offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    if (id === "fmt ") rate = buf.readUInt32LE(offset + 12);
    if (id === "data") {
      data = buf.subarray(offset + 8, offset + 8 + size);
      break;
    }
    offset += 8 + size + (size % 2);
  }
  if (!data) throw new Error("no data chunk");
  const samples = new Float32Array(data.length / 2);
  for (let i = 0; i < samples.length; i++) samples[i] = data.readInt16LE(i * 2) / 32768;
  return { samples, sampleRate: rate };
}

export function writeWav(file, samples, sampleRate = RATE) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  writeFileSync(file, Buffer.concat([header, data]));
  return samples.length / sampleRate;
}

export function peak(samples) {
  let p = 0;
  for (const s of samples) p = Math.max(p, Math.abs(s));
  return p;
}

export function normalize(samples, target = 0.86) {
  const p = peak(samples);
  if (p < 1e-6) return samples;
  const k = target / p;
  for (let i = 0; i < samples.length; i++) samples[i] *= k;
  return samples;
}

/** Trim leading/trailing silence so cuts land on speech, not air. */
export function trimSilence(samples, sampleRate = RATE, threshold = 0.004, edge = 0.05) {
  const win = Math.round(sampleRate * 0.01);
  let first = 0;
  let last = samples.length;
  for (let i = 0; i < samples.length; i += win) {
    let sum = 0;
    for (let j = i; j < Math.min(i + win, samples.length); j++) sum += samples[j] * samples[j];
    if (Math.sqrt(sum / win) > threshold) {
      first = i;
      break;
    }
  }
  for (let i = samples.length - win; i >= 0; i -= win) {
    let sum = 0;
    for (let j = i; j < Math.min(i + win, samples.length); j++) sum += samples[j] * samples[j];
    if (Math.sqrt(sum / win) > threshold) {
      last = Math.min(samples.length, i + win);
      break;
    }
  }
  const pad = Math.round(sampleRate * edge);
  return samples.subarray(Math.max(0, first - pad), Math.min(samples.length, last + pad));
}

/** Short fades so no line clicks in or out. */
export function fade(samples, sampleRate = RATE, ms = 30) {
  const n = Math.round((sampleRate * ms) / 1000);
  for (let i = 0; i < n && i < samples.length; i++) {
    const k = i / n;
    samples[i] *= k;
    samples[samples.length - 1 - i] *= k;
  }
  return samples;
}

export const silence = (seconds, sampleRate = RATE) => new Float32Array(Math.round(seconds * sampleRate));
