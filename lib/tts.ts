"use client";

/**
 * On-device narration. meSpeak (eSpeak compiled to JavaScript) runs entirely in
 * the browser — no API key, no network, works offline and on static hosts.
 *
 * The engine is ~5 MB, so it lives in its own lazily imported chunk and is only
 * fetched the first time you generate a voiceover.
 */

interface Engine {
  speak: (text: string, args?: Record<string, unknown>) => ArrayBuffer | number | null;
  loadConfig: (data: unknown) => void;
  loadVoice: (data: unknown) => void;
}

let enginePromise: Promise<Engine | null> | null = null;

export function loadEngine(): Promise<Engine | null> {
  if (enginePromise) return enginePromise;
  enginePromise = (async () => {
    if (typeof window === "undefined") return null;
    try {
      const [mod, configModule, voiceModule] = await Promise.all([
        import("mespeak"),
        import("mespeak/src/mespeak_config.json"),
        import("mespeak/voices/en/en-us.json"),
      ]);
      const engine = ((mod as unknown as { default?: Engine }).default ?? mod) as Engine;
      const config = (configModule as unknown as { default: unknown }).default;
      const voice = (voiceModule as unknown as { default: unknown }).default;
      engine.loadConfig(config);
      engine.loadVoice(voice);
      return engine;
    } catch (err) {
      console.warn("meSpeak failed to load", err);
      return null;
    }
  })();
  return enginePromise;
}

export interface Pcm {
  samples: Float32Array;
  sampleRate: number;
}

function readAscii(view: DataView, offset: number, length: number) {
  let out = "";
  for (let i = 0; i < length; i++) out += String.fromCharCode(view.getUint8(offset + i));
  return out;
}

/** Minimal RIFF/WAVE reader — eSpeak always emits 16-bit PCM. */
export function parseWav(buffer: ArrayBuffer): Pcm | null {
  if (buffer.byteLength < 44) return null;
  const view = new DataView(buffer);
  if (readAscii(view, 0, 4) !== "RIFF" || readAscii(view, 8, 4) !== "WAVE") return null;

  let offset = 12;
  let sampleRate = 22050;
  let channels = 1;
  let bits = 16;

  while (offset + 8 <= buffer.byteLength) {
    const id = readAscii(view, offset, 4);
    const size = view.getUint32(offset + 4, true);
    if (id === "fmt ") {
      channels = view.getUint16(offset + 10, true) || 1;
      sampleRate = view.getUint32(offset + 12, true) || 22050;
      bits = view.getUint16(offset + 22, true) || 16;
    } else if (id === "data") {
      const start = offset + 8;
      const bytes = Math.min(size, buffer.byteLength - start);
      const frameSize = Math.max(1, channels) * Math.max(1, bits / 8);
      const frames = Math.floor(bytes / frameSize);
      const samples = new Float32Array(frames);
      for (let i = 0; i < frames; i++) {
        const base = start + i * frameSize;
        samples[i] = bits === 8 ? (view.getUint8(base) - 128) / 128 : view.getInt16(base, true) / 32768;
      }
      return { samples, sampleRate };
    }
    offset += 8 + size + (size % 2);
  }
  return null;
}

/** 16-bit mono WAV from float samples. */
export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeAscii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buffer], { type: "audio/wav" });
}

const cache = new Map<string, Pcm | null>();

/** Speak one line and return its PCM samples (null when the engine is unavailable). */
export async function synthesizeLine(text: string, speed = 168): Promise<Pcm | null> {
  const engine = await loadEngine();
  if (!engine) return null;
  const clean = text.trim();
  if (!clean) return null;

  const key = `${speed}|${clean}`;
  if (cache.has(key)) return cache.get(key) ?? null;

  let result: Pcm | null = null;
  try {
    const raw = engine.speak(clean, {
      rawdata: "arraybuffer",
      speed,
      pitch: 48,
      amplitude: 92,
      wordgap: 0,
    });
    if (raw instanceof ArrayBuffer) result = parseWav(raw);
  } catch (err) {
    console.warn("Speech synthesis failed", err);
  }
  cache.set(key, result);
  return result;
}
