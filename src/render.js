// Node-side renderer. The browser and this module call the exact same
// drawFrame(); frames are piped as raw RGBA into ffmpeg, which writes an
// Instagram-ready H.264 / AAC MP4 with faststart.

import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeProject } from './project.js';
import { drawFrame } from './renderer.js';
import { scorePCM, pcmToWav } from './score.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const FONT_DIR = join(HERE, '..', 'public', 'fonts');
const FFMPEG = ffmpegInstaller.path;

let fontsReady = false;
export function registerFonts() {
  if (fontsReady) return;
  const fonts = [
    ['Inter', 'Inter_400Regular.ttf'], ['Inter', 'Inter_500Medium.ttf'],
    ['Inter', 'Inter_600SemiBold.ttf'], ['Inter', 'Inter_700Bold.ttf'],
    ['Inter', 'Inter_800ExtraBold.ttf'], ['Inter', 'Inter_900Black.ttf'],
    ['Noto Devanagari', 'NotoSansDevanagari_400Regular.ttf'],
    ['Noto Devanagari', 'NotoSansDevanagari_600SemiBold.ttf'],
    ['Noto Devanagari', 'NotoSansDevanagari_700Bold.ttf'],
    ['Noto Devanagari', 'NotoSansDevanagari_800ExtraBold.ttf'],
    ['DejaVu Sans Mono', 'DejaVuSansMono.ttf'],
  ];
  for (const [family, file] of fonts) {
    const p = join(FONT_DIR, file);
    if (existsSync(p)) GlobalFonts.registerFromPath(p, family);
  }
  fontsReady = true;
}

export function renderFramePNG(raw, t, w, h) {
  registerFonts();
  const P = normalizeProject(raw);
  const W = w || P.w, H = h || P.h;
  const canvas = createCanvas(W, H);
  const g = canvas.getContext('2d');
  drawFrame(g, W, H, Math.min(t, P.duration - 1 / P.fps), P);
  return canvas.toBuffer('image/png');
}

function ffmpegArgs(P, wavPath, outPath) {
  return [
    '-y', '-loglevel', 'error',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${P.w}x${P.h}`, '-r', String(P.fps), '-i', 'pipe:0',
    '-i', wavPath,
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
    '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart',
    '-c:a', 'aac', '-b:a', '128k', '-ar', '44100',
    '-shortest', outPath,
  ];
}

export async function renderProject(raw, { outPath, onProgress = () => {}, audioWav = null } = {}) {
  registerFonts();
  const P = normalizeProject(raw);
  if (!outPath) throw new Error('outPath is required');
  mkdirSync(dirname(outPath), { recursive: true });

  const work = mkdtempSync(join(tmpdir(), 'motion-reels-'));
  // A caller may supply a fully mixed WAV (voiceover + score + SFX).
  const wavPath = audioWav && existsSync(audioWav) ? audioWav : join(work, 'score.wav');
  if (wavPath !== audioWav) writeFileSync(wavPath, Buffer.from(pcmToWav(scorePCM(P))));

  const ff = spawn(FFMPEG, ffmpegArgs(P, wavPath, outPath), { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = '';
  ff.stderr.on('data', d => { err += String(d).slice(0, 4000); });

  const canvas = createCanvas(P.w, P.h);
  const g = canvas.getContext('2d');
  const total = Math.round(P.duration * P.fps);

  try {
    for (let i = 0; i < total; i++) {
      const t = i / P.fps;
      drawFrame(g, P.w, P.h, t, P);
      const img = g.getImageData(0, 0, P.w, P.h);
      const frame = Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength);
      if (!ff.stdin.write(frame)) await once(ff.stdin, 'drain');
      if (i % 6 === 0 || i === total - 1) onProgress((i + 1) / total * 0.94, `Drawing frame ${i + 1}/${total}`);
    }
    ff.stdin.end();
    const [code] = await once(ff, 'close');
    if (code !== 0) throw new Error(`ffmpeg exited ${code}: ${err || 'no details'}`);
  } catch (e) {
    try { ff.stdin.destroy(); } catch {}
    try { ff.kill('SIGKILL'); } catch {}
    throw e;
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
  onProgress(1, 'MP4 ready');
  return { outPath, duration: P.duration, frames: total, width: P.w, height: P.h, fps: P.fps };
}
