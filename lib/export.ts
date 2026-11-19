import { loadAudioBuffer, preloadImages } from "./media";
import { drawFrame } from "./render";
import type { Project } from "./types";

export interface ExportResult {
  blob: Blob;
  mime: string;
  ext: string;
}

export interface ExportOptions {
  project: Project;
  signal?: AbortSignal;
  onProgress?: (progress: number, note: string) => void;
  /** output resolution multiplier, 1 = full canvas size */
  scale?: number;
  /** preferred container */
  format?: FormatPref;
}

export type FormatPref = "mp4" | "webm";

export interface FormatOption {
  value: FormatPref;
  ext: string;
  mime: string;
  label: string;
  detail: string;
}

const MP4_CODECS: { mime: string; label: string }[] = [
  { mime: "video/mp4;codecs=avc1.42E01E,mp4a.40.2", label: "H.264 + AAC" },
  { mime: "video/mp4", label: "browser default (VP9/Opus)" },
];

const WEBM_CODECS: { mime: string; label: string }[] = [
  { mime: "video/webm;codecs=vp9,opus", label: "VP9 + Opus" },
  { mime: "video/webm;codecs=vp8,opus", label: "VP8 + Opus" },
  { mime: "video/webm", label: "browser default" },
];

function supported(mime: string) {
  try {
    return typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mime);
  } catch {
    return false;
  }
}

export function availableFormats(): FormatOption[] {
  if (typeof MediaRecorder === "undefined") {
    return [{ value: "webm", ext: "webm", mime: "video/webm", label: "WebM", detail: "VP9 + Opus" }];
  }
  const out: FormatOption[] = [];
  const mp4 = MP4_CODECS.find((c) => supported(c.mime));
  if (mp4) out.push({ value: "mp4", ext: "mp4", mime: mp4.mime, label: "MP4", detail: mp4.label });
  const webm = WEBM_CODECS.find((c) => supported(c.mime));
  if (webm) out.push({ value: "webm", ext: "webm", mime: webm.mime, label: "WebM", detail: webm.label });
  if (!out.length) {
    out.push({ value: "webm", ext: "webm", mime: "", label: "WebM", detail: "browser default" });
  }
  return out;
}

export function pickMime(pref: FormatPref = "mp4"): FormatOption {
  const formats = availableFormats();
  return formats.find((f) => f.value === pref) ?? formats[0];
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function exportVideo({
  project,
  signal,
  onProgress,
  scale = 1,
  format = "mp4",
}: ExportOptions): Promise<ExportResult> {
  const duration = Math.max(0.5, project.duration);
  const outputScale = Math.min(1.5, Math.max(0.25, scale));
  const chosen = pickMime(format);
  const mime = chosen.mime;
  const ext = chosen.ext;
  let lastReport = 0;
  const report = (p: number, note: string, force = false) => {
    const now = performance.now();
    if (!force && now - lastReport < 90) return;
    lastReport = now;
    onProgress?.(Math.min(1, Math.max(0, p)), note);
  };

  if (signal?.aborted) throw new Error("Export cancelled");

  report(0.02, "Preparing media", true);
  const images = await preloadImages(
    project.layers.filter((l) => l.type === "image" && l.src).map((l) => l.src as string)
  );

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(project.width * outputScale);
  canvas.height = Math.round(project.height * outputScale);
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas 2D is not available in this browser");
  ctx.setTransform(outputScale, 0, 0, outputScale, 0, 0);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, project.width, project.height);
  drawFrame(ctx, project, 0, images);

  const audioLayers = project.layers.filter((l) => l.type === "audio" && l.audioUrl && !l.hidden);
  let audioCtx: AudioContext | null = null;
  let audioDest: MediaStreamAudioDestinationNode | null = null;
  let audioStart = 0;
  const sources: AudioBufferSourceNode[] = [];

  if (audioLayers.length) {
    report(0.06, "Mixing audio", true);
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new Ctor();
    await audioCtx.resume();
    audioDest = audioCtx.createMediaStreamDestination();
    const decoded: { layer: (typeof audioLayers)[number]; buffer: AudioBuffer }[] = [];
    for (const layer of audioLayers) {
      const buffer = await loadAudioBuffer(audioCtx, layer.audioUrl!);
      if (buffer) decoded.push({ layer, buffer });
    }
    // schedule everything against one clock, then start the recorder just before it
    audioStart = audioCtx.currentTime + 0.12;
    for (const { layer, buffer } of decoded) {
      const src = audioCtx.createBufferSource();
      src.buffer = buffer;
      const gain = audioCtx.createGain();
      gain.gain.value = layer.volume ?? 0.7;
      src.connect(gain).connect(audioDest);
      const dur = Math.min(
        buffer.duration,
        Math.max(0.05, Math.min(layer.duration, duration - layer.start))
      );
      if (dur <= 0.02) continue;
      src.start(audioStart + layer.start, 0, dur);
      sources.push(src);
    }
  }

  const fps = Math.max(12, Math.min(60, project.fps || 30));
  const stream = canvas.captureStream(fps);
  if (audioDest) {
    for (const track of audioDest.stream.getAudioTracks()) stream.addTrack(track);
  }

  const bitrate = Math.min(
    18_000_000,
    Math.max(3_000_000, Math.round(canvas.width * canvas.height * fps * 0.11))
  );
  const recorder = new MediaRecorder(stream, {
    ...(mime ? { mimeType: mime } : {}),
    videoBitsPerSecond: bitrate,
  });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  let cancelled = false;
  const onAbort = () => {
    cancelled = true;
  };
  signal?.addEventListener("abort", onAbort);

  report(0.08, "Recording", true);
  recorder.start(200);

  // align the visual clock with the audio clock so tracks stay in sync
  while (audioCtx && audioCtx.currentTime < audioStart) {
    await new Promise((r) => requestAnimationFrame(() => r(null)));
  }
  const t0 = performance.now();

  await new Promise<void>((resolve) => {
    const tick = () => {
      if (cancelled) return resolve();
      const elapsed = (performance.now() - t0) / 1000;
      const t = Math.min(elapsed, duration);
      drawFrame(ctx, project, t, images);
      report(0.08 + (t / duration) * 0.86, "Recording");
      if (elapsed >= duration) {
        // hold the last frame briefly for the encoder to flush
        setTimeout(resolve, 160);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  report(0.96, "Finishing file", true);
  if (recorder.state !== "inactive") recorder.stop();
  await stopped;
  await wait(60);
  for (const src of sources) {
    try {
      src.stop();
    } catch {
      /* noop */
    }
  }
  stream.getTracks().forEach((t) => t.stop());
  if (audioCtx) await audioCtx.close().catch(() => undefined);
  signal?.removeEventListener("abort", onAbort);

  if (cancelled) throw new Error("Export cancelled");

  const blob = new Blob(chunks, { type: mime || "video/webm" });
  if (!blob.size) throw new Error("Recording produced an empty file — try again in Chrome or Edge.");
  report(1, "Done", true);
  return { blob, mime: mime || "video/webm", ext };
}
