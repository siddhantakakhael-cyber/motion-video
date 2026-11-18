// Build the 58s "Karna's Hidden Curse" Reel end to end:
// Hindi voiceover (tempo-fitted) + procedural score + synced SFX → mixed WAV,
// then the exact same canvas renderer pipes frames into ffmpeg with that WAV.

import { readFileSync, writeFileSync, mkdirSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { normalizeProject } from '../src/project.js';
import { scorePCM, pcmToWav, addSfx } from '../src/score.js';
import { renderProject, renderFramePNG } from '../src/render.js';
import { mulberry, clamp } from '../src/lib.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SR = 44100;
const FFMPEG = ffmpegInstaller.path;

function readWav(path) {
  const b = readFileSync(path);
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let off = 12, fmt = null, data = null;
  while (off + 8 <= b.length) {
    const id = String.fromCharCode(...b.subarray(off, off + 4));
    const sz = dv.getUint32(off + 4, true);
    if (id === 'fmt ') fmt = { ch: dv.getUint16(off + 10, true), sr: dv.getUint32(off + 12, true), bits: dv.getUint16(off + 22, true) };
    if (id === 'data') { data = { off: off + 8, len: sz }; break; }
    off += 8 + sz + (sz % 2);
  }
  if (!fmt || !data || fmt.bits !== 16) throw new Error(`unsupported WAV: ${path}`);
  const frames = Math.floor(data.len / (fmt.ch * 2));
  const mono = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    let v = 0;
    for (let c = 0; c < fmt.ch; c++) v += dv.getInt16(data.off + (i * fmt.ch + c) * 2, true) / 32768;
    mono[i] = v / fmt.ch;
  }
  // Linear resample to the project rate (TTS is already 44.1k, kept for safety).
  if (fmt.sr === SR) return mono;
  const n = Math.floor(frames * SR / fmt.sr);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = i * fmt.sr / SR, i0 = Math.floor(x), f = x - i0;
    out[i] = (mono[i0] || 0) * (1 - f) + (mono[Math.min(frames - 1, i0 + 1)] || 0) * f;
  }
  return out;
}

function fitTempo(src, tempo, work, i) {
  if (!tempo || Math.abs(tempo - 1) < 0.01) return src;
  const out = join(work, `voice-${i}-fit.wav`);
  execFileSync(FFMPEG, [
    '-y', '-loglevel', 'error', '-i', src,
    '-filter:a', `atempo=${tempo}`, '-ar', String(SR), '-ac', '1',
    '-c:a', 'pcm_s16le', out,
  ], { stdio: 'ignore' });
  return out;
}

function buildMix(P, raw) {
  const events = raw.audio?.voice || [];
  const work = mkdtempSync(join(tmpdir(), 'karna-audio-'));
  const n = Math.ceil((P.duration + 0.2) * SR);
  const master = new Float32Array(n);
  const rand = mulberry(4242);

  // 1. Procedural score, ducked well under the narrator.
  const score = scorePCM(P);
  for (let i = 0; i < Math.min(n, score.length); i++) master[i] += score[i] * 0.30;

  // 2. Voiceover, each clip tempo-fitted and placed at its timestamp.
  const placed = [];
  events.forEach((ev, idx) => {
    const src = resolve(ROOT, ev.file);
    if (!existsSync(src)) throw new Error(`missing voice clip: ${ev.file}`);
    const fitted = fitTempo(src, Number(ev.tempo) || 1, work, idx);
    const samples = readWav(fitted);
    const start = Math.max(0, Math.floor((Number(ev.at) || 0) * SR));
    const gain = Number(ev.gain) || 1;
    const fadeIn = Math.floor(0.10 * SR), fadeOut = Math.floor(0.22 * SR);
    for (let k = 0; k < samples.length && start + k < n; k++) {
      let env = 1;
      if (k < fadeIn) env *= k / fadeIn;
      if (k > samples.length - fadeOut) env *= Math.max(0, (samples.length - k) / fadeOut);
      master[start + k] += samples[k] * gain * env;
    }
    placed.push({ file: ev.file, at: Number(ev.at) || 0, dur: samples.length / SR, end: (Number(ev.at) || 0) + samples.length / SR, tempo: Number(ev.tempo) || 1 });
  });

  // 3. SFX on the exact beats from the brief.
  for (const s of raw.audio?.sfx || []) addSfx(master, s.type, Number(s.at) || 0, Number(s.gain) || 1, rand, SR);

  // 4. Master fade + soft limiter + peak normalise.
  const fin = Math.floor(0.15 * SR), fout = Math.floor(0.55 * SR);
  let peak = 0;
  for (let i = 0; i < n; i++) {
    let v = Math.tanh(master[i] * 1.05) * 0.92;
    if (i < fin) v *= i / fin;
    if (i > n - fout) v *= Math.max(0, (n - i) / fout);
    master[i] = v; peak = Math.max(peak, Math.abs(v));
  }
  if (peak > 0.001) { const g = 0.92 / peak; for (let i = 0; i < n; i++) master[i] *= g; }
  rmSync(work, { recursive: true, force: true });
  return { wav: pcmToWav(master), placed };
}

async function main() {
  const raw = JSON.parse(readFileSync(join(ROOT, 'examples/karna-reel.json'), 'utf8'));
  const P = normalizeProject(raw);
  const outDir = join(ROOT, 'public/samples');
  mkdirSync(outDir, { recursive: true });
  const wavPath = join(outDir, 'karna-audio.wav');
  const mp4Path = join(outDir, 'karna-reel.mp4');
  const posterPath = join(outDir, 'karna-poster.png');

  console.log(`Karna Reel · ${P.duration}s · ${P.scenes.length} shots · ${P.w}×${P.h} @ ${P.fps}fps · style=${P.style}`);
  const { wav, placed } = buildMix(P, raw);
  writeFileSync(wavPath, Buffer.from(wav));
  console.log(`Mixed audio → ${wavPath}`);
  for (const v of placed) console.log(`  voice ${v.file.padEnd(22)} at ${v.at.toFixed(2)}s  dur ${v.dur.toFixed(2)}s  end ${v.end.toFixed(2)}s  tempo ${v.tempo}`);

  const started = Date.now();
  let last = -1;
  const info = await renderProject(P, {
    outPath: mp4Path, audioWav: wavPath,
    onProgress: (p, msg) => {
      const pct = Math.round(p * 100);
      if (pct !== last && pct % 10 === 0) { console.log(`  ${pct}%  ${msg}`); last = pct; }
    },
  });
  console.log(`Video → ${mp4Path} (${info.frames} frames in ${((Date.now() - started) / 1000).toFixed(1)}s)`);

  writeFileSync(posterPath, renderFramePNG(P, 44.0));
  console.log(`Poster → ${posterPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
