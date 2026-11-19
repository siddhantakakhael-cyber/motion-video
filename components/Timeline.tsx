"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { fmtTime } from "@/lib/anim";
import { insertFiles } from "@/lib/insert";
import { projectEnd } from "@/lib/project";
import { useStudio } from "@/lib/store";
import { useUI } from "@/lib/ui";
import type { Layer } from "@/lib/types";
import {
  IconAudio,
  IconChevronDown,
  IconChevronUp,
  IconCopy,
  IconDiamond,
  IconEye,
  IconEyeOff,
  IconImage,
  IconLock,
  IconMinus,
  IconPlus,
  IconShape,
  IconText,
  IconTrash,
  IconUnlock,
  IconUpload,
} from "./icons";
import { Button, IconButton, NumberInput } from "./ui";

const HEAD_W = 204;
const ROW_H = 38;
const RULER_H = 28;
const MIN_SPAN = 8;

const TYPE_STYLE: Record<string, { bg: string; border: string; text: string; accent: string }> = {
  text: { bg: "bg-violet-500/20", border: "border-violet-400/40", text: "text-violet-100", accent: "#a78bfa" },
  image: { bg: "bg-sky-500/20", border: "border-sky-400/40", text: "text-sky-100", accent: "#38bdf8" },
  shape: { bg: "bg-amber-500/20", border: "border-amber-400/40", text: "text-amber-100", accent: "#fbbf24" },
  audio: { bg: "bg-emerald-500/20", border: "border-emerald-400/40", text: "text-emerald-100", accent: "#34d399" },
};

function typeIcon(type: Layer["type"], size = 13) {
  if (type === "text") return <IconText width={size} height={size} />;
  if (type === "image") return <IconImage width={size} height={size} />;
  if (type === "shape") return <IconShape width={size} height={size} />;
  return <IconAudio width={size} height={size} />;
}

function tickStep(zoom: number) {
  const candidates = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120];
  return candidates.find((c) => c * zoom >= 58) ?? 120;
}

export default function Timeline({
  height,
  onResize,
}: {
  height: number;
  onResize: (h: number) => void;
}) {
  const project = useStudio((s) => s.project);
  const selectedId = useStudio((s) => s.selectedId);
  const time = useStudio((s) => s.time);
  const zoom = useStudio((s) => s.zoom);
  const resetSeq = useStudio((s) => s.resetSeq);
  const setZoom = useStudio((s) => s.setZoom);
  const select = useStudio((s) => s.select);
  const seek = useStudio((s) => s.seek);

  const addLayer = useStudio((s) => s.addLayer);
  const removeLayer = useStudio((s) => s.removeLayer);
  const duplicate = useStudio((s) => s.duplicate);
  const reorder = useStudio((s) => s.reorder);
  const toggleHidden = useStudio((s) => s.toggleHidden);
  const toggleLocked = useStudio((s) => s.toggleLocked);
  const patchProject = useStudio((s) => s.patchProject);
  const fitDuration = useStudio((s) => s.fitDuration);
  const toast = useUI((s) => s.toast);

  const scrollRef = useRef<HTMLDivElement>(null);
  const headsRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{
    mode: "move" | "trim-start" | "trim-end";
    id: string;
    startX: number;
    origStart: number;
    origDuration: number;
    snapped: boolean;
  } | null>(null);
  const scrubRef = useRef(false);

  const ordered = useMemo(() => [...project.layers].reverse(), [project.layers]);
  const span = Math.max(project.duration, projectEnd(project), MIN_SPAN) + 2.5;
  const contentW = Math.max(span * zoom, 480);
  const step = tickStep(zoom);
  const ticks = Math.ceil(span / step);

  const onHeadScroll = () => undefined;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ left: 0, top: 0 });
    if (headsRef.current) headsRef.current.scrollTop = 0;
  }, [resetSeq]);

  useEffect(() => {
    if (!selectedId) return;
    const index = ordered.findIndex((l) => l.id === selectedId);
    const el = scrollRef.current;
    if (index < 0 || !el) return;
    const rowTop = index * ROW_H;
    const viewTop = el.scrollTop;
    const viewHeight = el.clientHeight - RULER_H;
    if (rowTop < viewTop || rowTop + ROW_H > viewTop + viewHeight) {
      const target = Math.max(0, rowTop - viewHeight / 2 + ROW_H / 2);
      el.scrollTo({ top: target, behavior: "smooth" });
    }
  }, [selectedId, ordered]);

  const timeFromEvent = useCallback((clientX: number, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    return Math.max(0, (clientX - rect.left) / useStudio.getState().zoom);
  }, []);

  const onDragMove = useCallback((e: PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const st = useStudio.getState();
    const p = st.project;
    const layer = p.layers.find((l) => l.id === d.id);
    if (!layer) return;
    const dt = (e.clientX - d.startX) / st.zoom;
    if (!d.snapped) {
      if (Math.abs(dt) * st.zoom < 2) return;
      st.snapshot();
      d.snapped = true;
    }
    const threshold = 7 / st.zoom;
    const targets = [0, st.time, p.duration];
    for (const l of p.layers) {
      if (l.id === d.id) continue;
      targets.push(l.start, l.start + l.duration);
    }
    const snapVal = (v: number) => {
      let best = v;
      let bestDist = threshold;
      for (const t of targets) {
        const dist = Math.abs(v - t);
        if (dist < bestDist) {
          bestDist = dist;
          best = t;
        }
      }
      return best;
    };

    if (d.mode === "move") {
      const raw = Math.max(0, d.origStart + dt);
      const startSnap = snapVal(raw);
      const endSnap = snapVal(raw + layer.duration) - layer.duration;
      const next = Math.abs(raw - endSnap) < Math.abs(raw - startSnap) ? endSnap : startSnap;
      st.moveLayer(d.id, Math.max(0, next), { history: false });
    } else if (d.mode === "trim-start") {
      const end = d.origStart + d.origDuration;
      const ns = Math.min(end - 0.2, Math.max(0, snapVal(d.origStart + dt)));
      st.trimLayer(d.id, ns, end - ns, { history: false });
    } else {
      const ne = Math.max(d.origStart + 0.2, snapVal(d.origStart + d.origDuration + dt));
      st.trimLayer(d.id, d.origStart, ne - d.origStart, { history: false });
    }
  }, []);

  const onDragEnd = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener("pointermove", onDragMove);
    window.removeEventListener("pointerup", onDragEnd);
  }, [onDragMove]);

  const beginDrag = (e: React.PointerEvent, layer: Layer, mode: "move" | "trim-start" | "trim-end") => {
    if (layer.locked) {
      select(layer.id);
      return;
    }
    e.stopPropagation();
    select(layer.id);
    const st = useStudio.getState();
    if (st.time < layer.start || st.time > layer.start + layer.duration - 0.03) {
      st.seek(layer.start + Math.min(0.08, layer.duration * 0.1));
    }
    dragRef.current = {
      mode,
      id: layer.id,
      startX: e.clientX,
      origStart: layer.start,
      origDuration: layer.duration,
      snapped: false,
    };
    window.addEventListener("pointermove", onDragMove);
    window.addEventListener("pointerup", onDragEnd);
  };

  const addText = () => {
    const st = useStudio.getState();
    addLayer(
      {
        id: `t_${Math.random().toString(36).slice(2, 9)}`,
        type: "text",
        name: "Headline",
        text: "Your headline",
        start: Math.round(st.time * 100) / 100,
        duration: 3,
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
        opacity: 1,
        keyframes: [],
        animIn: "slide-up",
        animOut: "fade",
        fontSize: 92,
        fontFamily: "Poppins",
        fontWeight: 800,
        color: "#ffffff",
        align: "center",
        lineHeight: 1.12,
        letterSpacing: -1,
      },
      true,
      "top"
    );
  };

  const addShape = () => {
    const st = useStudio.getState();
    addLayer(
      {
        id: `s_${Math.random().toString(36).slice(2, 9)}`,
        type: "shape",
        name: "Accent bar",
        shape: "rect",
        fill: "#8b5cf6",
        w: 180,
        h: 10,
        start: Math.round(st.time * 100) / 100,
        duration: 3,
        x: 0,
        y: 120,
        scale: 1,
        rotation: 0,
        opacity: 1,
        keyframes: [],
        animIn: "pop",
        animOut: "fade",
      },
      true,
      "top"
    );
  };

  const onUpload = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const res = await insertFiles(files);
    const parts: string[] = [];
    if (res.images) parts.push(`${res.images} image${res.images > 1 ? "s" : ""}`);
    if (res.audio) parts.push(`${res.audio} audio`);
    if (parts.length) toast("Added to timeline", parts.join(" · "), "success");
    if (res.skipped) toast("Some files skipped", "Only images and audio are supported.", "error");
  };

  const selectedIndex = project.layers.findIndex((l) => l.id === selectedId);

  return (
    <section
      style={{ height }}
      className="relative flex shrink-0 flex-col border-t border-white/[0.08] bg-ink-900/70"
    >
      <div
        onPointerDown={(e) => {
          e.preventDefault();
          const startY = e.clientY;
          const startH = height;
          const move = (ev: PointerEvent) => onResize(Math.min(560, Math.max(180, startH - (ev.clientY - startY))));
          const up = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
          };
          window.addEventListener("pointermove", move);
          window.addEventListener("pointerup", up);
        }}
        className="group absolute -top-[3px] left-0 z-30 h-[6px] w-full cursor-row-resize"
        title="Drag to resize the timeline"
      >
        <span className="mx-auto mt-[2px] block h-[2px] w-16 rounded-full bg-white/0 transition group-hover:bg-violet-400/70" />
      </div>
      <div className="no-scrollbar flex h-10 shrink-0 items-center gap-1 overflow-x-auto border-b border-white/[0.06] px-3">
        <Button size="sm" variant="ghost" onClick={addText} className="text-zinc-300">
          <IconText width={13} height={13} /> Text
        </Button>
        <Button size="sm" variant="ghost" onClick={addShape} className="text-zinc-300">
          <IconShape width={13} height={13} /> Shape
        </Button>
        <Button size="sm" variant="ghost" onClick={() => fileRef.current?.click()} className="text-zinc-300">
          <IconUpload width={13} height={13} /> Media
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,audio/*"
          multiple
          className="hidden"
          onChange={(e) => {
            void onUpload(e.target.files);
            e.target.value = "";
          }}
        />

        <span className="mx-1 h-4 w-px bg-white/10" />

        <IconButton label="Duplicate layer" onClick={() => selectedId && duplicate(selectedId)} disabled={!selectedId}>
          <IconCopy width={14} height={14} />
        </IconButton>
        <IconButton label="Bring forward" onClick={() => selectedId && reorder(selectedId, "up")} disabled={!selectedId}>
          <IconChevronUp width={14} height={14} />
        </IconButton>
        <IconButton label="Send backward" onClick={() => selectedId && reorder(selectedId, "down")} disabled={!selectedId}>
          <IconChevronDown width={14} height={14} />
        </IconButton>
        <IconButton
          label="Delete layer"
          onClick={() => selectedId && removeLayer(selectedId)}
          disabled={!selectedId}
          className="hover:bg-red-500/15 hover:text-red-300"
        >
          <IconTrash width={14} height={14} />
        </IconButton>

        <span className="ml-auto mr-2 flex items-center gap-2 text-[10px] text-zinc-500">
          <span className="hidden sm:inline">Duration</span>
          <div className="w-[64px]">
            <NumberInput
              value={project.duration}
              min={0.5}
              max={600}
              step={0.5}
              suffix="s"
              onChange={(v) => patchProject({ duration: v })}
            />
          </div>
          <Button size="sm" variant="ghost" onClick={fitDuration} title="Fit duration to content">
            Fit
          </Button>
        </span>

        <span className="mx-1 h-4 w-px bg-white/10" />
        <IconButton label="Zoom out" onClick={() => setZoom(zoom / 1.25)}>
          <IconMinus width={13} height={13} />
        </IconButton>
        <span className="w-9 text-center text-[10px] tabular-nums text-zinc-500">{Math.round(zoom)}</span>
        <IconButton label="Zoom in" onClick={() => setZoom(zoom * 1.25)}>
          <IconPlus width={13} height={13} />
        </IconButton>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="flex shrink-0 flex-col border-r border-white/[0.06]" style={{ width: HEAD_W }}>
          <div
            className="flex items-center justify-between px-3 text-[10px] font-medium uppercase tracking-[0.1em] text-zinc-500"
            style={{ height: RULER_H }}
          >
            <span>Layers</span>
            <span>{project.layers.length}</span>
          </div>
          <div ref={headsRef} className="min-h-0 flex-1 overflow-hidden" onScroll={onHeadScroll}>
            {ordered.map((layer) => {
              const active = layer.id === selectedId;
              return (
                <div
                  key={layer.id}
                  onClick={() => select(layer.id)}
                  style={{ height: ROW_H }}
                  className={`group flex cursor-pointer items-center gap-1.5 border-l-2 px-2 transition-colors ${
                    active
                      ? "border-violet-400 bg-white/[0.06]"
                      : "border-transparent hover:bg-white/[0.03]"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${
                      TYPE_STYLE[layer.type].bg
                    } ${TYPE_STYLE[layer.type].text}`}
                  >
                    {typeIcon(layer.type, 11)}
                  </span>
                  <span className="clip-text flex-1 text-[11px] text-zinc-300">{layer.name}</span>
                  <span className="flex items-center opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleHidden(layer.id);
                      }}
                      className={`flex h-5 w-5 items-center justify-center rounded hover:bg-white/10 ${
                        layer.hidden ? "text-amber-400" : "text-zinc-500"
                      }`}
                      title={layer.hidden ? "Show layer" : "Hide layer"}
                    >
                      {layer.hidden ? <IconEyeOff width={12} height={12} /> : <IconEye width={12} height={12} />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLocked(layer.id);
                      }}
                      className={`flex h-5 w-5 items-center justify-center rounded hover:bg-white/10 ${
                        layer.locked ? "text-amber-400" : "text-zinc-500"
                      }`}
                      title={layer.locked ? "Unlock layer" : "Lock layer"}
                    >
                      {layer.locked ? <IconLock width={12} height={12} /> : <IconUnlock width={12} height={12} />}
                    </button>
                  </span>
                  {layer.hidden ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 group-hover:hidden" />
                  ) : null}
                </div>
              );
            })}
            {!ordered.length ? (
              <p className="px-3 py-4 text-[11px] text-zinc-600">No layers yet — add text or use the AI Director.</p>
            ) : null}
          </div>
        </div>

        <div
          ref={scrollRef}
          className="relative min-w-0 flex-1 overflow-auto"
          onScroll={(e) => {
            if (headsRef.current) headsRef.current.scrollTop = e.currentTarget.scrollTop;
          }}
        >
          <div style={{ width: contentW }} className="relative min-h-full">
            <div
              className="sticky top-0 z-20 border-b border-white/[0.06] bg-ink-900/95 backdrop-blur"
              style={{
                height: RULER_H,
                backgroundImage: `repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 1px, transparent 1px ${
                  step * zoom
                }px)`,
              }}
              onPointerDown={(e) => {
                scrubRef.current = true;
                seek(timeFromEvent(e.clientX, e.currentTarget));
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (scrubRef.current) seek(timeFromEvent(e.clientX, e.currentTarget));
              }}
              onPointerUp={() => {
                scrubRef.current = false;
              }}
              onPointerCancel={() => {
                scrubRef.current = false;
              }}
            >
              {Array.from({ length: ticks + 1 }).map((_, i) => {
                const t = i * step;
                return (
                  <span
                    key={i}
                    className="pointer-events-none absolute top-0 flex h-full items-center"
                    style={{ left: t * zoom }}
                  >
                    <span className="h-2 w-px bg-white/20" />
                    <span className="ml-1 whitespace-nowrap text-[9.5px] tabular-nums text-zinc-500">
                      {step < 1 ? `${t.toFixed(2)}s` : fmtTime(t)}
                    </span>
                  </span>
                );
              })}
              <div
                className="pointer-events-none absolute top-0 h-full w-px bg-white/40"
                style={{ left: time * zoom }}
              >
                <span className="absolute -left-[5px] top-0 h-2.5 w-2.5 rounded-sm bg-white" />
              </div>
            </div>

            <div
              className="relative"
              style={{
                backgroundImage: `repeating-linear-gradient(90deg, rgba(255,255,255,0.025) 0 1px, transparent 1px ${
                  step * zoom
                }px)`,
              }}
            >
              {ordered.map((layer) => {
                const style = TYPE_STYLE[layer.type];
                const width = Math.max(layer.duration * zoom, 18);
                const selected = layer.id === selectedId;
                return (
                  <div
                    key={layer.id}
                    style={{ height: ROW_H }}
                    className="relative border-b border-white/[0.03]"
                    onClick={() => select(layer.id)}
                  >
                    <div
                      onPointerDown={(e) => beginDrag(e, layer, "move")}
                      onDoubleClick={() => {
                        select(layer.id);
                        seek(layer.start);
                      }}
                      className={`group absolute top-[6px] flex h-[28px] items-center rounded-md border ${style.bg} ${style.border} ${
                        selected ? "ring-2 ring-white/70" : "hover:brightness-110"
                      } ${layer.locked ? "cursor-not-allowed" : "cursor-grab"} ${
                        layer.hidden ? "opacity-35" : ""
                      }`}
                      style={{ left: layer.start * zoom, width }}
                      title={`${layer.name} · ${layer.start.toFixed(2)}s → ${(layer.start + layer.duration).toFixed(2)}s`}
                    >
                      <span
                        className={`pointer-events-none flex min-w-0 items-center gap-1 px-2 ${style.text}`}
                      >
                        {typeIcon(layer.type, 11)}
                        <span className="clip-text text-[10.5px] font-medium">
                          {layer.type === "text" ? layer.text || layer.name : layer.name}
                        </span>
                      </span>

                      {layer.type === "audio" ? (
                        <span className="pointer-events-none absolute inset-x-0 bottom-0 top-0 flex items-center gap-[2px] overflow-hidden px-2 opacity-40">
                          {Array.from({ length: Math.max(4, Math.floor(width / 5)) }).map((_, i) => {
                            const h = 20 + Math.abs(Math.sin(i * 1.7 + layer.name.length)) * 60;
                            return (
                              <span
                                key={i}
                                className="w-[2px] shrink-0 rounded-full"
                                style={{ height: `${h}%`, background: style.accent }}
                              />
                            );
                          })}
                        </span>
                      ) : null}

                      {layer.keyframes.map((kf) => (
                        <button
                          key={kf.id}
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            select(layer.id);
                            seek(layer.start + kf.t);
                          }}
                          title={`Keyframe at ${kf.t.toFixed(2)}s`}
                          className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[1px] border border-ink-950 bg-white transition-transform hover:scale-125"
                          style={{ left: `${(kf.t / layer.duration) * 100}%` }}
                        />
                      ))}

                      {!layer.locked ? (
                        <>
                          <span
                            onPointerDown={(e) => beginDrag(e, layer, "trim-start")}
                            className="absolute inset-y-0 left-0 w-[7px] cursor-ew-resize rounded-l-md hover:bg-white/25"
                          />
                          <span
                            onPointerDown={(e) => beginDrag(e, layer, "trim-end")}
                            className="absolute inset-y-0 right-0 w-[7px] cursor-ew-resize rounded-r-md hover:bg-white/25"
                          />
                        </>
                      ) : null}
                      {selected ? (
                        <span className="pointer-events-none absolute -top-[15px] left-0 whitespace-nowrap rounded bg-ink-700 px-1 py-[1px] text-[9px] tabular-nums text-zinc-200 ring-1 ring-white/10">
                          {layer.duration.toFixed(2)}s
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
              {!ordered.length ? (
                <div style={{ height: ROW_H * 3 }} className="flex items-center px-4 text-[11px] text-zinc-600">
                  Drop clips here — or generate a storyboard with the AI Director.
                </div>
              ) : null}
            </div>

            {/* end-of-project marker */}
            <div
              className="pointer-events-none absolute top-0 z-10 h-full border-l border-dashed border-white/25"
              style={{ left: project.duration * zoom }}
            >
              <span className="absolute left-1 top-1 rounded bg-ink-800/90 px-1 py-[1px] text-[9px] tabular-nums text-zinc-400 ring-1 ring-white/10">
                end
              </span>
            </div>

            <div
              className="pointer-events-none absolute top-0 z-10 h-full w-px bg-violet-400/80"
              style={{ left: time * zoom }}
            >
              <span className="absolute -left-[4.5px] top-0 h-2 w-2 rounded-full bg-violet-300 shadow-[0_0_10px_rgba(167,139,250,0.9)]" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-7 shrink-0 items-center gap-3 border-t border-white/[0.06] px-3 text-[10px] text-zinc-600">
        <span className="flex items-center gap-1">
          <IconDiamond width={9} height={9} /> keyframe
        </span>
        <span className="hidden sm:inline">Drag clip to move · drag edges to trim · double-click to jump</span>
        <span className="ml-auto hidden items-center gap-1 md:flex">
          {selectedIndex >= 0 ? (
            <>
              <span className="text-zinc-500">Selected</span>
              <span className="max-w-[160px] truncate text-zinc-400">{project.layers[selectedIndex].name}</span>
            </>
          ) : (
            "Nothing selected"
          )}
        </span>
      </div>
    </section>
  );
}
