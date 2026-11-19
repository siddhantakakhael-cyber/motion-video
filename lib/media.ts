import type { MediaItem } from "./types";

const DB_NAME = "motion-studio";
const DB_VERSION = 1;
const STORE = "media";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export interface StoredMedia {
  id: string;
  name: string;
  type: "image" | "audio";
  blob: Blob;
  createdAt: number;
}

export async function saveMediaFile(file: File, type: "image" | "audio"): Promise<MediaItem> {
  const id = `m_${Math.random().toString(36).slice(2, 9)}`;
  const record: StoredMedia = { id, name: file.name, type, blob: file, createdAt: Date.now() };
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // IndexedDB can be unavailable (private mode) — the object URL still works this session
  }
  return { id, name: file.name, type, url: URL.createObjectURL(file), createdAt: record.createdAt };
}

export async function loadStoredMedia(): Promise<MediaItem[]> {
  try {
    const db = await openDb();
    const records = await new Promise<StoredMedia[]>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result as StoredMedia[]);
      req.onerror = () => reject(req.error);
    });
    return records
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        url: URL.createObjectURL(r.blob),
        createdAt: r.createdAt,
      }));
  } catch {
    return [];
  }
}

export async function getMediaBlob(id: string): Promise<Blob | null> {
  try {
    const db = await openDb();
    return await new Promise<Blob | null>((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => resolve((req.result as StoredMedia | undefined)?.blob ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function deleteMediaItem(id: string) {
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* noop */
  }
}

/* ---------- runtime image cache ---------- */

const imageCache = new Map<string, HTMLImageElement>();
const pending = new Map<string, Promise<HTMLImageElement>>();

export function getCachedImage(src: string): HTMLImageElement | undefined {
  const img = imageCache.get(src);
  return img && img.complete && img.naturalWidth > 0 ? img : undefined;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached && cached.complete && cached.naturalWidth > 0) return Promise.resolve(cached);
  const existing = pending.get(src);
  if (existing) return existing;
  const p = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageCache.set(src, img);
      pending.delete(src);
      resolve(img);
    };
    img.onerror = () => {
      pending.delete(src);
      reject(new Error(`Failed to load image`));
    };
    img.src = src;
  });
  pending.set(src, p);
  return p;
}

export async function preloadImages(srcs: string[]) {
  const unique = Array.from(new Set(srcs.filter(Boolean)));
  await Promise.all(unique.map((s) => loadImage(s).catch(() => null)));
  return Object.fromEntries(
    unique
      .map((s) => [s, imageCache.get(s)] as const)
      .filter((entry): entry is [string, HTMLImageElement] => Boolean(entry[1]))
  );
}

/* ---------- audio buffers ---------- */

const bufferCache = new Map<string, AudioBuffer>();

export function getCachedBuffer(url: string) {
  return bufferCache.get(url);
}

export async function loadAudioBuffer(ctx: BaseAudioContext, url: string): Promise<AudioBuffer | null> {
  const cached = bufferCache.get(url);
  if (cached) return cached;
  try {
    const res = await fetch(url);
    const data = await res.arrayBuffer();
    const buf = await ctx.decodeAudioData(data);
    bufferCache.set(url, buf);
    return buf;
  } catch {
    return null;
  }
}

export function isMediaRef(src?: string) {
  return Boolean(src && src.startsWith("blob:"));
}
