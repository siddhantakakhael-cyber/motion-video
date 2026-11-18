// A tiny, deterministic score synthesiser. No samples, no network, no licence:
// kick, hat, bass, pad and transition whooshes written straight into PCM.
// The same function feeds the browser preview and the AAC track of the MP4.

import { mulberry, clamp } from './lib.js';
import { timeline } from './project.js';

const SR = 44100;

function addTone(buf, start, dur, freq, amp, kind, rand) {
  const i0 = Math.max(0, Math.floor(start * SR));
  const i1 = Math.min(buf.length, Math.floor((start + dur) * SR));
  let hp = 0, prev = 0, phase = 0, phase2 = 0;
  for (let i = i0; i < i1; i++) {
    const t = (i - i0) / SR;
    const p = t / dur;
    let v = 0;
    if (kind === 'kick') {
      const f = 150 * Math.exp(-t * 22) + 46;
      phase += (2 * Math.PI * f) / SR;
      v = Math.sin(phase) * Math.exp(-t * 9);
    } else if (kind === 'hat') {
      const x = rand() * 2 - 1;
      hp = 0.92 * (hp + x - prev); prev = x;
      v = hp * Math.exp(-t * 48);
    } else if (kind === 'bass') {
      phase += (2 * Math.PI * freq) / SR;
      v = (Math.sin(phase) + 0.32 * Math.sin(phase * 2)) * Math.exp(-t * 1.8) * (1 - Math.exp(-t * 90));
    } else if (kind === 'pad') {
      phase += (2 * Math.PI * freq) / SR;
      phase2 += (2 * Math.PI * freq * 1.004) / SR;
      const env = Math.min(1, t / 0.35) * Math.min(1, (1 - p) / 0.25);
      v = (Math.sin(phase) + 0.6 * Math.sin(phase2)) * 0.5 * env;
    } else if (kind === 'blip') {
      phase += (2 * Math.PI * (freq + t * freq * 0.9)) / SR;
      v = Math.sin(phase) * Math.exp(-t * 14) * (1 - p);
    } else if (kind === 'whoosh') {
      const x = rand() * 2 - 1;
      hp = 0.96 * (hp + x - prev); prev = x;
      v = hp * Math.sin(Math.PI * p) * 0.7;
    }
    buf[i] += v * amp;
  }
}

export function scorePCM(P, sampleRate = SR) {
  const sr = sampleRate || SR;
  const n = Math.max(1, Math.ceil((P.duration + 0.15) * sr));
  const buf = new Float32Array(n);
  if (P.music === false) return buf; // silent AAC track is still muxed
  const rand = mulberry(2026);
  const beat = 60 / P.bpm;
  const beats = Math.ceil(P.duration / beat) + 1;
  const root = 110; // A2
  const prog = [0, 0, -2, 3, 0, 5, 3, -2];
  const semi = s => root * Math.pow(2, s / 12);

  for (let b = 0; b < beats; b++) {
    const at = b * beat;
    if (at > P.duration + 0.1) break;
    // four-on-the-floor with a softer offbeat
    addTone(buf, at, 0.34, 0, b % 2 === 0 ? 0.46 : 0.26, 'kick', rand);
    addTone(buf, at + beat * 0.5, 0.09, 0, 0.085, 'hat', rand);
    addTone(buf, at, 0.06, 0, 0.045, 'hat', rand);
    // bass follows an 8-step progression
    const s = prog[Math.floor(b / 2) % prog.length];
    addTone(buf, at, beat * 0.92, semi(s - 12), 0.15, 'bass', rand);
    // pad chord at the top of each 4-beat bar
    if (b % 4 === 0) {
      [0, 3, 7].forEach((iv, k) => addTone(buf, at, beat * 3.8, semi(s + iv), 0.035 - k * 0.006, 'pad', rand));
    }
    // a bright tick on the last 16th before the next beat
    if (b % 2 === 1) addTone(buf, at + beat * 0.75, 0.12, semi(s + 12), 0.045, 'blip', rand);
  }

  // A short whoosh at every cut (variable shot lengths are respected).
  const cuts = timeline(P).slice(1).map(w => w.start);
  for (const c of cuts) {
    addTone(buf, Math.max(0, c - 0.13), 0.30, 0, 0.10, 'whoosh', rand);
    addTone(buf, c, 0.18, 330, 0.055, 'blip', rand);
  }

  // Fades, soft saturation, peak normalise.
  const fadeIn = 0.22 * sr, fadeOut = 0.7 * sr;
  let peak = 0;
  for (let i = 0; i < n; i++) {
    let v = Math.tanh(buf[i] * 1.15) * 0.9;
    if (i < fadeIn) v *= i / fadeIn;
    if (i > n - fadeOut) v *= Math.max(0, (n - i) / fadeOut);
    buf[i] = v;
    peak = Math.max(peak, Math.abs(v));
  }
  if (peak > 0.001) { const g = 0.89 / peak; for (let i = 0; i < n; i++) buf[i] *= g; }
  return buf;
}

// One-shot sound effects. `at` is in seconds from the start of the film.
export const SFX_DUR = { subdrop: 1.8, creak: 1.3, crush: 0.9, thunder: 2.6, arrow: 0.55, glitch: 0.18 };

export function addSfx(buf, type, at, gain = 1, rand = mulberry(7), sampleRate = SR) {
  const i0 = Math.max(0, Math.floor(at * sampleRate));
  if (i0 >= buf.length) return;
  const dur = SFX_DUR[type] || 0.5;
  const n = Math.min(buf.length - i0, Math.floor(dur * sampleRate));
  let phase = 0, lp = 0, hp = 0, prev = 0;
  const noise = () => rand() * 2 - 1;
  for (let k = 0; k < n; k++) {
    const tt = k / sampleRate, p = tt / dur;
    let v = 0;
    if (type === 'subdrop') {
      const f = 90 * Math.exp(-tt * 1.6) + 26;
      phase += 2 * Math.PI * f / sampleRate;
      v = Math.sin(phase) * Math.exp(-tt * 1.7) * (1 - Math.exp(-tt * 140));
    } else if (type === 'creak') {
      const x = noise(); lp = 0.93 * lp + 0.07 * x;
      phase += 2 * Math.PI * (55 + 18 * Math.sin(tt * 9)) / sampleRate;
      v = (lp * 0.7 + Math.sin(phase) * 0.3) * Math.sin(Math.PI * p) * 0.9;
    } else if (type === 'crush') {
      const x = noise(); lp = 0.72 * lp + 0.28 * x;
      const crackle = rand() > 0.93 ? (rand() * 2 - 1) * 0.8 : 0;
      v = (lp * 0.8 + crackle) * Math.exp(-tt * 4.2);
    } else if (type === 'thunder') {
      const x = noise(); lp = 0.975 * lp + 0.025 * x;
      phase += 2 * Math.PI * 42 / sampleRate;
      v = (lp * 1.3 + Math.sin(phase) * 0.35) * Math.sin(Math.PI * Math.pow(p, 0.7)) * Math.exp(-tt * 0.7);
    } else if (type === 'arrow') {
      const x = noise(); hp = 0.9 * (hp + x - prev); prev = x;
      phase += 2 * Math.PI * (900 + 1400 * tt) / sampleRate;
      v = (hp * 0.6 + Math.sin(phase) * 0.25) * Math.sin(Math.PI * p);
    } else if (type === 'glitch') {
      v = (rand() > 0.5 ? 1 : -1) * 0.5 * (1 - p);
    } else {
      v = noise() * 0.3 * Math.exp(-tt * 8);
    }
    buf[i0 + k] += v * gain;
  }
}

// 16-bit mono WAV — usable as an <audio> blob in the browser and as an ffmpeg
// input on the server.
export function pcmToWav(pcm, sampleRate = SR) {
  const n = pcm.length;
  const bytes = new Uint8Array(44 + n * 2);
  const dv = new DataView(bytes.buffer);
  const str = (off, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(off + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); dv.setUint32(4, 36 + n * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true);
  dv.setUint16(22, 1, true); dv.setUint32(24, sampleRate, true);
  dv.setUint32(28, sampleRate * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
  str(36, 'data'); dv.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const v = clamp(pcm[i], -1, 1);
    dv.setInt16(44 + i * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true);
  }
  return bytes;
}
