import { create } from "zustand";
import { clamp, uid } from "./anim";
import {
  baseLayer,
  duplicateLayer as cloneLayer,
  emptyProject,
  projectEnd,
  withAspect,
} from "./project";
import type { AspectId, Layer, LayerType, MediaItem, Project } from "./types";
import { ASPECTS } from "./types";

const clone = <T,>(v: T): T => {
  if (typeof structuredClone === "function") return structuredClone(v);
  return JSON.parse(JSON.stringify(v)) as T;
};

const MAX_HISTORY = 60;

interface UpdateOpts {
  history?: boolean;
}

export interface StudioState {
  project: Project;
  selectedId: string | null;
  time: number;
  playing: boolean;
  seekSeq: number;
  zoom: number;
  media: MediaItem[];
  past: Project[];
  future: Project[];
  saveState: "saved" | "dirty" | "saving";
  mediaReady: boolean;
  resetSeq: number;

  snapshot: () => void;
  setSaveState: (s: StudioState["saveState"]) => void;
  setProject: (p: Project, opts?: UpdateOpts) => void;
  patchProject: (patch: Partial<Project>, opts?: UpdateOpts) => void;
  setAspect: (aspect: AspectId) => void;

  addLayer: (layer: Layer, select?: boolean, place?: "top" | "bottom") => void;
  addLayers: (layers: Layer[]) => void;
  updateLayer: (id: string, patch: Partial<Layer>, opts?: UpdateOpts) => void;
  moveLayer: (id: string, start: number, opts?: UpdateOpts) => void;
  trimLayer: (id: string, start: number, duration: number, opts?: UpdateOpts) => void;
  removeLayer: (id: string) => void;
  duplicate: (id: string) => void;
  reorder: (id: string, dir: "up" | "down") => void;
  toggleHidden: (id: string) => void;
  toggleLocked: (id: string) => void;

  addKeyframe: (id: string, t?: number) => void;
  removeKeyframe: (layerId: string, kfId: string) => void;
  updateKeyframe: (layerId: string, kfId: string, patch: Partial<Layer["keyframes"][number]>, opts?: UpdateOpts) => void;

  select: (id: string | null) => void;
  setTime: (t: number) => void;
  seek: (t: number) => void;
  setPlaying: (p: boolean) => void;
  togglePlay: () => void;
  setZoom: (z: number) => void;

  setMedia: (items: MediaItem[]) => void;
  addMedia: (item: MediaItem) => void;
  removeMedia: (id: string) => void;
  setMediaReady: (ready: boolean) => void;

  fitDuration: () => void;
  undo: () => void;
  redo: () => void;
  loadProject: (p: Project) => void;
  newProject: (aspect?: AspectId) => void;
}

const initial = emptyProject("9:16");

function ensureDuration(project: Project): number {
  const end = projectEnd(project);
  return Math.max(project.duration, Math.ceil(end * 10) / 10);
}

export const useStudio = create<StudioState>((set, get) => {
  const withHistory = (fn: (p: Project) => Project, opts?: UpdateOpts) => {
    const state = get();
    if (opts?.history !== false) {
      set({ past: [...state.past.slice(-(MAX_HISTORY - 1)), clone(state.project)], future: [] });
    }
    const next = fn(state.project);
    set({ project: { ...next, updatedAt: Date.now() }, saveState: "dirty" });
  };

  return {
    project: initial,
    selectedId: null,
    time: 0,
    playing: false,
    seekSeq: 0,
    zoom: 92,
    media: [],
    past: [],
    future: [],
    saveState: "saved",
    mediaReady: false,
    resetSeq: 0,

    snapshot: () => {
      const state = get();
      set({ past: [...state.past.slice(-(MAX_HISTORY - 1)), clone(state.project)], future: [] });
    },
    setSaveState: (saveState) => set({ saveState }),

    setProject: (p, opts) => {
      const state = get();
      if (opts?.history !== false) {
        set({ past: [...state.past.slice(-(MAX_HISTORY - 1)), clone(state.project)], future: [] });
      }
      set({
        project: { ...p, updatedAt: Date.now() },
        saveState: "dirty",
        time: clamp(get().time, 0, p.duration),
        resetSeq: get().resetSeq + 1,
      });
    },
    patchProject: (patch, opts) =>
      withHistory((p) => ({ ...p, ...patch, duration: patch.duration ?? p.duration }), opts),
    setAspect: (aspect) =>
      withHistory((p) => {
        const next = withAspect(p, aspect);
        return { ...next, duration: p.duration };
      }),

    addLayer: (layer, select = true, place = "top") => {
      withHistory((p) => ({
        ...p,
        layers: place === "bottom" ? [layer, ...p.layers] : [...p.layers, layer],
        duration: Math.max(p.duration, Math.ceil((layer.start + layer.duration) * 10) / 10),
      }));
      if (select) set({ selectedId: layer.id });
    },
    addLayers: (layers) => {
      withHistory((p) => {
        const merged = { ...p, layers: [...p.layers, ...layers] };
        return { ...merged, duration: ensureDuration(merged) };
      });
    },
    updateLayer: (id, patch, opts) =>
      withHistory(
        (p) => ({
          ...p,
          layers: p.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)),
        }),
        opts
      ),
    moveLayer: (id, start, opts) =>
      withHistory((p) => {
        const layer = p.layers.find((l) => l.id === id);
        if (!layer) return p;
        const nextStart = Math.max(0, Math.round(start * 100) / 100);
        const next = {
          ...p,
          layers: p.layers.map((l) => (l.id === id ? { ...l, start: nextStart } : l)),
        };
        return { ...next, duration: Math.max(p.duration, Math.ceil((nextStart + layer.duration) * 10) / 10) };
      }, opts),
    trimLayer: (id, start, duration, opts) =>
      withHistory((p) => ({
        ...p,
        layers: p.layers.map((l) =>
          l.id === id
            ? { ...l, start: Math.max(0, start), duration: Math.max(0.2, duration) }
            : l
        ),
      }), opts),
    removeLayer: (id) => {
      withHistory((p) => ({ ...p, layers: p.layers.filter((l) => l.id !== id) }));
      if (get().selectedId === id) set({ selectedId: null });
    },
    duplicate: (id) => {
      const layer = get().project.layers.find((l) => l.id === id);
      if (!layer) return;
      const copy = cloneLayer(layer);
      withHistory((p) => ({ ...p, layers: [...p.layers, copy] }));
      set({ selectedId: copy.id });
    },
    reorder: (id, dir) =>
      withHistory((p) => {
        const index = p.layers.findIndex((l) => l.id === id);
        if (index < 0) return p;
        const target = dir === "up" ? index + 1 : index - 1;
        if (target < 0 || target >= p.layers.length) return p;
        const layers = [...p.layers];
        [layers[index], layers[target]] = [layers[target], layers[index]];
        return { ...p, layers };
      }),
    toggleHidden: (id) => {
      const layer = get().project.layers.find((l) => l.id === id);
      if (!layer) return;
      withHistory((p) => ({
        ...p,
        layers: p.layers.map((l) => (l.id === id ? { ...l, hidden: !l.hidden } : l)),
      }));
    },
    toggleLocked: (id) => {
      const layer = get().project.layers.find((l) => l.id === id);
      if (!layer) return;
      withHistory((p) => ({
        ...p,
        layers: p.layers.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l)),
      }));
    },

    addKeyframe: (id, t) => {
      const state = get();
      const layer = state.project.layers.find((l) => l.id === id);
      if (!layer) return;
      const local = clamp((t ?? state.time) - layer.start, 0, layer.duration);
      withHistory((p) => ({
        ...p,
        layers: p.layers.map((l) => {
          if (l.id !== id) return l;
          if (l.keyframes.some((k) => Math.abs(k.t - local) < 0.08)) return l;
          return {
            ...l,
            keyframes: [
              ...l.keyframes,
              { id: uid("kf"), t: Math.round(local * 100) / 100, x: l.x, y: l.y, scale: l.scale, rotation: l.rotation, opacity: l.opacity },
            ].sort((a, b) => a.t - b.t),
          };
        }),
      }));
    },
    removeKeyframe: (layerId, kfId) =>
      withHistory((p) => ({
        ...p,
        layers: p.layers.map((l) =>
          l.id === layerId ? { ...l, keyframes: l.keyframes.filter((k) => k.id !== kfId) } : l
        ),
      })),
    updateKeyframe: (layerId, kfId, patch, opts) =>
      withHistory(
        (p) => ({
          ...p,
          layers: p.layers.map((l) =>
            l.id === layerId
              ? {
                  ...l,
                  keyframes: l.keyframes.map((k) => (k.id === kfId ? { ...k, ...patch } : k)),
                }
              : l
          ),
        }),
        opts
      ),

    select: (selectedId) => set({ selectedId }),
    setTime: (t) => set({ time: clamp(t, 0, get().project.duration) }),
    seek: (t) =>
      set({ time: clamp(t, 0, get().project.duration), seekSeq: get().seekSeq + 1 }),
    setPlaying: (playing) => set({ playing }),
    togglePlay: () => {
      const { playing, time, project } = get();
      if (!playing && time >= project.duration - 0.02) set({ time: 0 });
      set({ playing: !playing });
    },
    setZoom: (z) => set({ zoom: clamp(z, 24, 320) }),

    setMedia: (media) => set({ media }),
    addMedia: (item) => set((s) => ({ media: [...s.media, item] })),
    removeMedia: (id) => set((s) => ({ media: s.media.filter((m) => m.id !== id) })),
    setMediaReady: (mediaReady) => set({ mediaReady }),

    fitDuration: () => {
      const end = get().project.layers.filter((l) => l.type !== "audio").reduce((m, l) => Math.max(m, l.start + l.duration), 0);
      withHistory((p) => ({ ...p, duration: Math.max(1, Math.round(end * 10) / 10) }));
    },

    undo: () => {
      const { past, project, future, time } = get();
      if (!past.length) return;
      const previous = past[past.length - 1];
      set({
        project: previous,
        past: past.slice(0, -1),
        future: [clone(project), ...future].slice(0, MAX_HISTORY),
        selectedId: null,
        time: clamp(time, 0, previous.duration),
        saveState: "dirty",
      });
    },
    redo: () => {
      const { past, project, future } = get();
      if (!future.length) return;
      const next = future[0];
      set({
        project: next,
        past: [...past, clone(project)],
        future: future.slice(1),
        saveState: "dirty",
        time: clamp(get().time, 0, next.duration),
      });
    },
    loadProject: (p) =>
      set({
        project: p,
        past: [],
        future: [],
        selectedId: null,
        time: 0,
        saveState: "saved",
        resetSeq: get().resetSeq + 1,
      }),
    newProject: (aspect = "9:16") =>
      set({
        project: { ...emptyProject(aspect), name: "Untitled project" },
        past: [],
        future: [],
        selectedId: null,
        time: 0,
        playing: false,
        saveState: "saved",
        resetSeq: get().resetSeq + 1,
      }),
  };
});

export const useSelectedLayer = (): Layer | null => {
  const id = useStudio((s) => s.selectedId);
  const layers = useStudio((s) => s.project.layers);
  return layers.find((l) => l.id === id) ?? null;
};

export function createTextLayer(overrides: Partial<Layer> = {}): Layer {
  return baseLayer("text", {
    name: "Headline",
    text: "Your headline",
    fontSize: 92,
    fontFamily: "Poppins",
    fontWeight: 800,
    color: "#ffffff",
    align: "center",
    lineHeight: 1.12,
    animIn: "slide-up",
    animOut: "fade",
    ...overrides,
  });
}

export const layerTypeLabel = (type: LayerType) =>
  type === "text" ? "Text" : type === "image" ? "Image" : type === "shape" ? "Shape" : "Audio";
