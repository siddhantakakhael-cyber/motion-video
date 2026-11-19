"use client";

import { useEffect } from "react";
import { loadStoredMedia } from "@/lib/media";
import { starterProject } from "@/lib/starter";
import { useStudio } from "@/lib/store";
import type { Project } from "@/lib/types";
import Creator from "./Creator";
import { IconLogo } from "./icons";
import Toasts from "./Toasts";

const PROJECT_KEY = "motion-studio.project.v2";

function serialize(project: Project): string {
  return JSON.stringify({
    ...project,
    layers: project.layers.map((l) => ({
      ...l,
      src: l.mediaId ? undefined : l.src,
      audioUrl: l.mediaId ? undefined : l.audioUrl,
    })),
  });
}

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.isContentEditable;
}

export default function Studio() {
  const project = useStudio((s) => s.project);
  const mediaReady = useStudio((s) => s.mediaReady);
  const saveState = useStudio((s) => s.saveState);
  const setSaveState = useStudio((s) => s.setSaveState);

  /* hydrate media + last project */
  useEffect(() => {
    let alive = true;
    (async () => {
      const items = await loadStoredMedia();
      if (!alive) return;
      useStudio.getState().setMedia(items);
      const urls = new Map(items.map((i) => [i.id, i.url]));

      let loaded: Project | null = null;
      try {
        const raw = localStorage.getItem(PROJECT_KEY);
        if (raw) loaded = JSON.parse(raw) as Project;
      } catch {
        loaded = null;
      }

      if (loaded && Array.isArray(loaded.layers) && loaded.layers.length) {
        const layers = loaded.layers.map((l) => ({
          ...l,
          src: l.mediaId ? urls.get(l.mediaId) ?? l.src : l.src,
          audioUrl: l.mediaId ? urls.get(l.mediaId) ?? l.audioUrl : l.audioUrl,
          hidden: l.hidden ?? false,
          keyframes: l.keyframes ?? [],
        }));
        useStudio.getState().loadProject({ ...loaded, layers });
      } else {
        useStudio.getState().loadProject(starterProject());
      }
      const studio = useStudio.getState();
      studio.setMediaReady(true);
      studio.seek(0.4);
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* autosave */
  useEffect(() => {
    if (!mediaReady) return;
    setSaveState("dirty");
    const id = setTimeout(() => {
      try {
        localStorage.setItem(PROJECT_KEY, serialize(project));
        setSaveState("saved");
      } catch {
        setSaveState("dirty");
      }
    }, 650);
    return () => clearTimeout(id);
  }, [project, mediaReady, setSaveState]);

  /* space = play / pause */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isTyping(e.target)) {
        e.preventDefault();
        useStudio.getState().togglePlay();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-ink-950 text-zinc-200">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/[0.06] bg-ink-950/80 px-4 backdrop-blur">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-violet-600 text-white shadow-[0_8px_24px_-8px_rgba(139,92,246,0.8)]">
          <IconLogo width={18} height={18} />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-[13px] font-semibold text-white">Motion Studio</h1>
          <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">Prompt to video</p>
        </div>
        <span className="ml-2 hidden max-w-[260px] truncate border-l border-white/10 pl-3 text-[12px] text-zinc-400 lg:block">
          {project.name}
        </span>
        <span className="ml-auto flex items-center gap-2 rounded-full bg-white/[0.04] px-2.5 py-1 text-[10px] text-zinc-500 ring-1 ring-white/10">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              saveState === "saved" ? "bg-emerald-400/80" : "bg-amber-400/80"
            }`}
          />
          {saveState === "saved" ? "Saved locally" : "Saving…"}
        </span>
      </header>

      <Creator />
      <Toasts />
    </div>
  );
}
