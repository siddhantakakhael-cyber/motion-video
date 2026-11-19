"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fmtTime } from "@/lib/anim";
import { preloadImages } from "@/lib/media";
import { drawFrame, type ImageMap } from "@/lib/render";
import { useStudio } from "@/lib/store";
import { useUI } from "@/lib/ui";
import { Button, IconButton } from "./ui";
import {
  IconFramework,
  IconGrid,
  IconPause,
  IconPlay,
} from "./icons";

export default function Preview() {
  const project = useStudio((s) => s.project);
  const time = useStudio((s) => s.time);
  const playing = useStudio((s) => s.playing);
  const togglePlay = useStudio((s) => s.togglePlay);
  const seek = useStudio((s) => s.seek);
  const selectedId = useStudio((s) => s.selectedId);
  const safeGuides = useUI((s) => s.safeGuides);
  const toggleGuides = useUI((s) => s.toggleGuides);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const [images, setImages] = useState<ImageMap>({});
  const [fontsReady, setFontsReady] = useState(false);
  const [box, setBox] = useState({ w: 0, h: 0 });

  const srcKey = useMemo(
    () =>
      project.layers
        .filter((l) => l.type === "image" && l.src)
        .map((l) => l.src)
        .join("|"),
    [project.layers]
  );

  useEffect(() => {
    let alive = true;
    preloadImages(srcKey ? srcKey.split("|") : []).then((map) => {
      if (alive) setImages(map);
    });
    return () => {
      alive = false;
    };
  }, [srcKey]);

  useEffect(() => {
    let alive = true;
    if (typeof document !== "undefined" && "fonts" in document) {
      const faces = [
        '400 32px Inter',
        '600 32px Inter',
        '800 96px Inter',
        '700 32px Poppins',
        '800 96px Poppins',
        '400 96px "Bebas Neue"',
        '600 32px "Playfair Display"',
        '500 32px "JetBrains Mono"',
      ];
      const loaded = Promise.all(faces.map((f) => document.fonts.load(f).catch(() => null)));
      Promise.all([document.fonts.ready.catch(() => null), loaded]).then(() => {
        if (alive) setFontsReady(true);
      });
    }
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const scale = Math.min(rect.width / project.width, rect.height / project.height);
      setBox({
        w: Math.max(1, Math.floor(project.width * scale)),
        h: Math.max(1, Math.floor(project.height * scale)),
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [project.width, project.height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    drawFrame(ctx, project, time, images);
  }, [project, time, images, fontsReady]);

  const duration = project.duration;
  const step = 1 / project.fps;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-white/[0.06] px-4">
        <div className="flex items-center gap-2 whitespace-nowrap text-[11px] text-zinc-500">
          <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
          <span className="font-medium text-zinc-300">Preview</span>
          <span className="hidden text-zinc-700 sm:inline">/</span>
          <span className="hidden tabular-nums sm:inline">
            {project.width} × {project.height}
          </span>
          <span className="hidden text-zinc-700 sm:inline">·</span>
          <span className="hidden sm:inline">{project.fps} fps</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant={safeGuides ? "soft" : "ghost"}
            onClick={toggleGuides}
            title="Toggle title-safe guides"
          >
            <IconGrid width={13} height={13} />
            <span className="hidden sm:inline">Guides</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const el = document.getElementById("studio-preview-shell");
              if (!el) return;
              if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
              else el.requestFullscreen?.().catch(() => undefined);
            }}
            title="Fullscreen preview"
          >
            <IconFramework width={13} height={13} />
            <span className="hidden sm:inline">Fullscreen</span>
          </Button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center bg-[radial-gradient(ellipse_at_50%_0%,#15121f,#08080d_60%)] p-5">
        <div
          id="studio-preview-shell"
          ref={shellRef}
          className="relative flex h-full w-full items-center justify-center bg-[#08080d]"
        >
          <div className="relative" style={{ width: box.w || undefined, height: box.h || undefined }}>
            <canvas
              ref={canvasRef}
              width={project.width}
              height={project.height}
              className="block rounded-[6px] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] ring-1 ring-white/10"
              style={{ width: box.w || undefined, height: box.h || undefined }}
            />
            {safeGuides ? (
              <div className="pointer-events-none absolute inset-0 rounded-[6px]">
                <div className="absolute inset-[5%] rounded-sm border border-dashed border-white/15" />
                <div className="absolute inset-x-[5%] top-1/2 h-px bg-white/[0.06]" />
                <div className="absolute inset-y-[5%] left-1/2 w-px bg-white/[0.06]" />
                <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" />
              </div>
            ) : null}
            {playing ? (
              <div className="pointer-events-none absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-[10px] font-medium text-white/80 backdrop-blur">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
                PLAYING
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex h-14 shrink-0 items-center gap-2 border-t border-white/[0.06] bg-ink-900/60 px-4">
        <div className="flex items-center gap-0.5">
          <IconButton
            label="Go to start"
            onClick={() => {
              seek(0);
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 5h2v14H6zM19 5v14L9 12z" />
            </svg>
          </IconButton>
          <IconButton label="Previous frame" onClick={() => seek(Math.max(0, time - step))}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5h2v14H8zM19 5v14L9 12z" />
            </svg>
          </IconButton>
        </div>

        <button
          onClick={togglePlay}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink-950 shadow-lg transition hover:scale-105 active:scale-95"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <IconPause width={16} height={16} /> : <IconPlay width={16} height={16} className="ml-0.5" />}
        </button>

        <div className="flex items-center gap-0.5">
          <IconButton label="Next frame" onClick={() => seek(Math.min(duration, time + step))}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 5h2v14h-2zM5 5v14l10-7z" />
            </svg>
          </IconButton>
          <IconButton label="Go to end" onClick={() => seek(duration)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 5h2v14h-2zM5 5v14l10-7z" />
            </svg>
          </IconButton>
        </div>

        <div className="ml-2 flex items-baseline gap-1 font-mono text-xs">
          <span className="text-zinc-100">{fmtTime(time, true, project.fps)}</span>
          <span className="text-zinc-600">/ {fmtTime(duration, true, project.fps)}</span>
        </div>

        <div className="ml-auto flex items-center gap-3 whitespace-nowrap text-[11px] text-zinc-500">
          {selectedId ? null : (
            <span className="hidden items-center gap-1.5 md:flex">
              <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                Space
              </kbd>
              play
            </span>
          )}
          <span className="hidden items-center gap-2 sm:flex">
            <span className="text-zinc-600">{project.layers.filter((l) => l.type !== "audio").length} layers</span>
            <span className="text-zinc-700">·</span>
            <span className="text-zinc-600">{project.layers.filter((l) => l.type === "audio").length} audio</span>
          </span>
        </div>
      </div>
    </div>
  );
}
