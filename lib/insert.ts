import { uid } from "./anim";
import { saveMediaFile } from "./media";
import { makeAudio, makeImage } from "./project";
import { useStudio } from "./store";
import type { Layer, MediaItem } from "./types";

export async function probeAudioUrl(url: string): Promise<number> {
  return new Promise((resolve) => {
    const el = document.createElement("audio");
    const done = (v: number) => resolve(v);
    el.preload = "metadata";
    el.onloadedmetadata = () => done(Number.isFinite(el.duration) ? el.duration : 0);
    el.onerror = () => done(0);
    el.src = url;
  });
}

export async function probeAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement("audio");
    const done = (v: number) => {
      URL.revokeObjectURL(url);
      resolve(v);
    };
    el.preload = "metadata";
    el.onloadedmetadata = () => done(Number.isFinite(el.duration) ? el.duration : 0);
    el.onerror = () => done(0);
    el.src = url;
  });
}

function imageLayerFromUrl(url: string, name: string, mediaId: string | undefined): Layer {
  const store = useStudio.getState();
  const project = store.project;
  const duration = 4;
  return makeImage(url, name, {
    mediaId,
    start: Math.round(store.time * 100) / 100,
    duration,
    w: project.width * 1.04,
    h: project.height * 1.04,
    x: 0,
    y: 0,
    radius: 0,
    fit: "cover",
    animIn: "fade",
    animOut: "fade",
    keyframes: [
      { id: uid("kf"), t: 0, x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
      { id: uid("kf"), t: duration, x: 0, y: -project.height * 0.018, scale: 1.08, rotation: 0, opacity: 1 },
    ],
  });
}

function audioLayerFromUrl(url: string, name: string, mediaId: string | undefined, seconds: number): Layer {
  const store = useStudio.getState();
  return makeAudio(url, name, {
    mediaId,
    start: 0,
    duration: Math.max(1, Math.min(seconds || store.project.duration, 600)),
    volume: 0.55,
  });
}

/** Add an item that already lives in the media library — no duplicate library entry. */
export async function insertMediaItem(item: MediaItem): Promise<Layer | null> {
  const store = useStudio.getState();
  if (item.type === "image") {
    const layer = imageLayerFromUrl(item.url, item.name.replace(/\.[^.]+$/, ""), item.id);
    store.addLayer(layer, true, "bottom");
    return layer;
  }
  const seconds = await probeAudioUrl(item.url);
  const layer = audioLayerFromUrl(item.url, item.name.replace(/\.[^.]+$/, ""), item.id, seconds);
  store.addLayer(layer, true, "top");
  return layer;
}

export interface InsertedFiles {
  images: number;
  audio: number;
  skipped: number;
}

export async function insertFiles(files: FileList | File[]): Promise<InsertedFiles> {
  const list = Array.from(files);
  const result: InsertedFiles = { images: 0, audio: 0, skipped: 0 };

  for (const file of list) {
    const store = useStudio.getState();

    if (file.type.startsWith("image/")) {
      const item = await saveMediaFile(file, "image");
      store.addMedia(item);
      store.addLayer(imageLayerFromUrl(item.url, file.name.replace(/\.[^.]+$/, ""), item.id), true, "bottom");
      result.images += 1;
    } else if (file.type.startsWith("audio/")) {
      const seconds = await probeAudioDuration(file);
      const item = await saveMediaFile(file, "audio");
      store.addMedia(item);
      store.addLayer(audioLayerFromUrl(item.url, file.name.replace(/\.[^.]+$/, ""), item.id, seconds), true, "top");
      result.audio += 1;
    } else {
      result.skipped += 1;
    }
  }

  return result;
}

export async function insertRecording(blob: Blob, name = "Voiceover", knownDuration = 0): Promise<Layer | null> {
  const file = new File([blob], `${name.toLowerCase().replace(/\s+/g, "-")}.webm`, { type: blob.type || "audio/webm" });
  const probed = await probeAudioDuration(file);
  const seconds = Number.isFinite(probed) && probed > 0 ? probed : knownDuration;
  const item = await saveMediaFile(file, "audio");
  const store = useStudio.getState();
  store.addMedia(item);
  const layer = makeAudio(item.url, name, {
    mediaId: item.id,
    role: "voice",
    start: store.time,
    duration: Math.max(0.6, seconds || 1),
    volume: 1,
  });
  store.addLayer(layer, true, "top");
  return layer;
}
