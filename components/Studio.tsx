"use client";

import { useEffect, useState } from "react";
import { audioEngine } from "@/lib/audio";
import { loadStoredMedia } from "@/lib/media";
import { starterProject } from "@/lib/starter";
import { useStudio } from "@/lib/store";
import type { Project } from "@/lib/types";
import { useUI } from "@/lib/ui";
import { IconImage, IconLogo, IconSliders, IconSparkles } from "./icons";
import ExportModal from "./ExportModal";
import Inspector from "./Inspector";
import LeftPanel from "./LeftPanel";
import Preview from "./Preview";
import Shortcuts from "./Shortcuts";
import Timeline from "./Timeline";
import Toasts from "./Toasts";
import TopBar from "./TopBar";

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
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

export default function Studio() {
  const project = useStudio((s) => s.project);
  const mediaReady = useStudio((s) => s.mediaReady);
  const setSaveState = useStudio((s) => s.setSaveState);
  const playing = useStudio((s) => s.playing);
  const seekSeq = useStudio((s) => s.seekSeq);
  const openExport = useUI((s) => s.openExport);
  const setShortcuts = useUI((s) => s.setShortcuts);
  const [mobilePanel, setMobilePanel] = useState<null | "ai" | "media" | "inspect">(null);
  const [timelineHeight, setTimelineHeight] = useState(284);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 640) setTimelineHeight(208);
  }, []);

  /* ---------- hydrate media + project ---------- */
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
      setSaveState("saved");
      // land on a frame with something in it and focus the first caption
      if (studio.time === 0) {
        const headline =
          studio.project.layers.find((l) => l.role === "headline") ??
          studio.project.layers.find((l) => l.role === "caption") ??
          studio.project.layers.find((l) => l.type === "text");
        if (headline) {
          studio.seek(Math.min(0.55, headline.start + 0.45));
          studio.select(headline.id);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [setSaveState]);

  /* ---------- autosave ---------- */
  useEffect(() => {
    if (!mediaReady) return;
    setSaveState("saving");
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

  /* ---------- playback clock + audio ---------- */
  useEffect(() => {
    if (!playing) {
      audioEngine.stop();
      return;
    }
    const state = useStudio.getState();
    void audioEngine.play(state.project, state.time);
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.12, (now - last) / 1000);
      last = now;
      const s = useStudio.getState();
      if (!s.playing) return;
      const next = s.time + dt;
      if (next >= s.project.duration) {
        s.setTime(s.project.duration);
        s.setPlaying(false);
        return;
      }
      s.setTime(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      audioEngine.stop();
    };
  }, [playing, seekSeq]);

  /* ---------- shortcuts ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const s = useStudio.getState();
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        if (s.selectedId) s.duplicate(s.selectedId);
        return;
      }
      if (mod && e.key.toLowerCase() === "e") {
        e.preventDefault();
        s.setPlaying(false);
        openExport();
        return;
      }
      if (e.key === " ") {
        e.preventDefault();
        s.togglePlay();
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const step = e.shiftKey ? 1 : 1 / s.project.fps;
        const dir = e.key === "ArrowRight" ? 1 : -1;
        s.setPlaying(false);
        s.seek(s.time + step * dir);
        return;
      }
      if (e.key === "Home") {
        e.preventDefault();
        s.seek(0);
        return;
      }
      if (e.key === "End") {
        e.preventDefault();
        s.seek(s.project.duration);
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (s.selectedId) {
          e.preventDefault();
          s.removeLayer(s.selectedId);
        }
        return;
      }
      if (e.key === "Escape") {
        s.select(null);
        return;
      }
      if (e.key === "?") {
        setShortcuts(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openExport, setShortcuts]);

  /* ---------- ctrl+scroll timeline zoom ---------- */
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      const s = useStudio.getState();
      s.setZoom(s.zoom * (e.deltaY < 0 ? 1.1 : 0.9));
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-ink-950">
      <TopBar />

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[300px] shrink-0 flex-col border-r border-white/[0.07] bg-ink-950 md:flex xl:w-[318px]">
          <LeftPanel />
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          <Preview />
        </main>

        <aside className="hidden w-[310px] shrink-0 flex-col border-l border-white/[0.07] bg-ink-950 lg:flex xl:w-[330px]">
          <Inspector />
        </aside>
      </div>

      <div className="flex h-9 shrink-0 items-center gap-1 border-t border-white/[0.06] bg-ink-950 px-2 lg:hidden">
        <button
          onClick={() => setMobilePanel("ai")}
          className="flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md bg-white/[0.05] text-[11px] text-zinc-300"
        >
          <IconSparkles width={12} height={12} /> AI Director
        </button>
        <button
          onClick={() => setMobilePanel("inspect")}
          className="flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md bg-white/[0.05] text-[11px] text-zinc-300"
        >
          <IconSliders width={12} height={12} /> Properties
        </button>
        <button
          onClick={() => setMobilePanel("media")}
          className="flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md bg-white/[0.05] text-[11px] text-zinc-300"
        >
          <IconImage width={12} height={12} /> Media
        </button>
      </div>

      <Timeline height={timelineHeight} onResize={setTimelineHeight} />
      <ExportModal />
      <Shortcuts />
      <Toasts />

      {mobilePanel ? (
        <div className="fixed inset-0 z-40 flex bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setMobilePanel(null)}>
          <div
            className="flex h-full w-[88%] max-w-[360px] flex-col border-r border-white/10 bg-ink-950"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-10 items-center justify-between border-b border-white/[0.07] px-3">
              <span className="text-xs font-medium text-zinc-200">
                {mobilePanel === "inspect" ? "Properties" : mobilePanel === "media" ? "Media" : "AI Director"}
              </span>
              <button onClick={() => setMobilePanel(null)} className="text-zinc-500 hover:text-white">
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1">
              {mobilePanel === "inspect" ? (
                <Inspector />
              ) : (
                <LeftPanel initialTab={mobilePanel === "media" ? "media" : "ai"} />
              )}
            </div>
          </div>
        </div>
      ) : null}

      {!mediaReady ? (
        <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-4 bg-ink-950">
          <IconLogo width={44} height={44} />
          <div className="text-center">
            <p className="text-sm font-semibold text-white">Motion Studio</p>
            <p className="mt-1 text-[11px] text-zinc-500">Loading your workspace…</p>
          </div>
          <div className="h-1 w-32 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/2 animate-shimmer rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-400 to-violet-500 bg-[length:200%_100%]" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
