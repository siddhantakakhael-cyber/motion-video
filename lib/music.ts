"use client";

import { encodeWav } from "./tts";

export type MusicMood = "warm" | "uplifting" | "tense" | "calm";

interface MoodSpec {
  chords: number[][];
  bpm: number;
  wave: OscillatorType;
  bright: number;
  pad: number;
  pluck: number;
}

const SEMITONE = (freq: number, steps: number) => freq * Math.pow(2, steps / 12);

/** A minor-ish progressions, built from simple triads so they always sit under speech. */
const MOODS: Record<MusicMood, MoodSpec> = {
  warm: {
    chords: [
      [220.0, 261.63, 329.63], // Am
      [174.61, 220.0, 261.63], // F
      [196.0, 246.94, 293.66], // G
      [164.81, 196.0, 246.94], // Em
    ],
    bpm: 82,
    wave: "triangle",
    bright: 1500,
    pad: 0.085,
    pluck: 0.05,
  },
  uplifting: {
    chords: [
      [261.63, 329.63, 392.0], // C
      [196.0, 246.94, 293.66], // G
      [220.0, 261.63, 329.63], // Am
      [174.61, 220.0, 261.63], // F
    ],
    bpm: 100,
    wave: "sawtooth",
    bright: 2100,
    pad: 0.06,
    pluck: 0.055,
  },
  tense: {
    chords: [
      [220.0, 261.63, 311.13], // Am(maj)
      [196.0, 233.08, 293.66], // Gm/Bb-ish
      [174.61, 220.0, 261.63],
      [207.65, 246.94, 311.13],
    ],
    bpm: 90,
    wave: "sawtooth",
    bright: 1200,
    pad: 0.07,
    pluck: 0.04,
  },
  calm: {
    chords: [
      [261.63, 329.63, 392.0],
      [220.0, 261.63, 329.63],
      [174.61, 220.0, 261.63],
      [196.0, 246.94, 293.66],
    ],
    bpm: 70,
    wave: "sine",
    bright: 900,
    pad: 0.09,
    pluck: 0.03,
  },
};

export const MUSIC_MOOD_FOR_STYLE: Record<string, MusicMood> = {
  bold: "uplifting",
  cinematic: "calm",
  news: "tense",
  neon: "warm",
};

/**
 * Render a soft, royalty-free backing bed with WebAudio. Everything is
 * synthesised locally, so the app ships no audio files and stays licence-clean.
 */
export async function renderMusicBed(seconds: number, mood: MusicMood = "warm"): Promise<Blob | null> {
  if (typeof window === "undefined") return null;
  const OfflineCtx =
    window.OfflineAudioContext ||
    (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  if (!OfflineCtx) return null;

  const spec = MOODS[mood];
  const sampleRate = 44100;
  const length = Math.max(1, Math.ceil(seconds * sampleRate));
  const ctx = new OfflineCtx(1, length, sampleRate);

  const master = ctx.createGain();
  master.gain.value = 0.7;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = spec.bright;
  filter.Q.value = 0.6;
  filter.connect(master);
  master.connect(ctx.destination);

  const beat = 60 / spec.bpm;
  const bar = beat * 4;

  for (let start = 0, i = 0; start < seconds; start += bar, i++) {
    const chord = spec.chords[i % spec.chords.length];

    // pad chord
    chord.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      osc.type = spec.wave;
      osc.frequency.value = freq * (index === 0 ? 0.5 : 1);
      osc.detune.value = index * 4 - 4;
      const gain = ctx.createGain();
      const fadeIn = Math.min(0.8, bar * 0.35);
      const end = Math.min(seconds, start + bar + 0.25);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(spec.pad, start + fadeIn);
      gain.gain.setValueAtTime(spec.pad, Math.max(start + fadeIn, end - 0.5));
      gain.gain.linearRampToValueAtTime(0, end);
      osc.connect(gain).connect(filter);
      osc.start(start);
      osc.stop(Math.min(seconds, end + 0.05));
    });

    // gentle arpeggio
    for (let step = 0; step < 4; step++) {
      const at = start + step * beat;
      if (at >= seconds - 0.1) break;
      const freq = SEMITONE(chord[step % chord.length], 12);
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(spec.pluck, at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, Math.min(seconds, at + 0.34));
      osc.connect(gain).connect(filter);
      osc.start(at);
      osc.stop(Math.min(seconds, at + 0.4));
    }
  }

  const rendered = await ctx.startRendering();
  const samples = rendered.getChannelData(0);
  // fade the very edges so the bed never clicks in or out
  const edge = Math.floor(sampleRate * 0.35);
  for (let i = 0; i < edge && i < samples.length; i++) {
    const k = i / edge;
    samples[i] *= k;
    samples[samples.length - 1 - i] *= k;
  }
  return encodeWav(samples, sampleRate);
}
