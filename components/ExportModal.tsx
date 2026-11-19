"use client";

import { useEffect, useRef, useState } from "react";
import { download, safeName } from "@/lib/project";
import { captionCues, toSrt, toVtt } from "@/lib/subs";
import { availableFormats, exportVideo, type FormatPref } from "@/lib/export";
import { useStudio } from "@/lib/store";
import { useUI } from "@/lib/ui";
import { IconCheck, IconClose, IconDownload } from "./icons";
import { Button, Segmented } from "./ui";

const fmtSize = (bytes: number) =>
  bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export default function ExportModal() {
  const open = useUI((s) => s.exportOpen);
  const state = useUI((s) => s.exportState);
  const progress = useUI((s) => s.exportProgress);
  const note = useUI((s) => s.exportNote);
  const error = useUI((s) => s.exportError);
  const info = useUI((s) => s.exportInfo);
  const closeExport = useUI((s) => s.closeExport);
  const setExport = useUI((s) => s.setExport);
  const toast = useUI((s) => s.toast);

  const project = useStudio((s) => s.project);
  const setPlaying = useStudio((s) => s.setPlaying);

  const [scale, setScale] = useState("1");
  const [filename, setFilename] = useState("");
  const [format, setFormat] = useState<FormatPref>("mp4");
  const blobRef = useRef<Blob | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const formats = availableFormats();
  const current = formats.find((f) => f.value === format) ?? formats[0];
  const ext = current.ext;
  const cues = captionCues(project);
  const saveCaptions = (kind: "srt" | "vtt") => {
    const text = kind === "srt" ? toSrt(cues) : toVtt(cues);
    const blob = new Blob([text], { type: kind === "srt" ? "application/x-subrip" : "text/vtt" });
    download(blob, `${safeName(filename || project.name)}.${kind}`);
    toast("Captions exported", `${cues.length} lines · ${kind.toUpperCase()}`, "success");
  };
  const audioCount = project.layers.filter((l) => l.type === "audio" && l.audioUrl && !l.hidden).length;
  const scaleNum = Number(scale);
  const outW = Math.round(project.width * scaleNum);
  const outH = Math.round(project.height * scaleNum);

  useEffect(() => {
    if (!open) return;
    setPlaying(false);
    setFilename(safeName(project.name));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && state !== "rendering") closeExport();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const start = async () => {
    if (!project.layers.some((l) => l.type !== "audio")) {
      toast("Nothing to export", "Add at least one visual layer.", "error");
      return;
    }
    blobRef.current = null;
    const controller = new AbortController();
    abortRef.current = controller;
    setExport({ exportState: "rendering", exportProgress: 0, exportNote: "Preparing media", exportError: null, exportInfo: null });
    try {
      const result = await exportVideo({
        project,
        signal: controller.signal,
        scale: scaleNum,
        format: current.value,
        onProgress: (p, n) => setExport({ exportProgress: p, exportNote: n }),
      });
      blobRef.current = result.blob;
      const name = `${safeName(filename || project.name)}.${result.ext}`;
      download(result.blob, name);
      setExport({
        exportState: "done",
        exportProgress: 1,
        exportInfo: { name, size: result.blob.size, ext: result.ext },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Export failed";
      if (message.includes("cancelled")) {
        setExport({ exportState: "idle", exportProgress: 0, exportError: null });
      } else {
        setExport({ exportState: "error", exportError: message });
      }
    } finally {
      abortRef.current = null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-[480px] overflow-hidden rounded-2xl border border-white/10 bg-ink-850 shadow-[0_40px_120px_-30px_rgba(0,0,0,1)]">
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-violet-500/15 blur-3xl" />

        <div className="relative flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Export video</h2>
            <p className="text-[10.5px] text-zinc-500">Rendered on this device — nothing leaves your browser</p>
          </div>
          <button
            onClick={closeExport}
            disabled={state === "rendering"}
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-30"
          >
            <IconClose width={15} height={15} />
          </button>
        </div>

        <div className="relative space-y-4 px-5 py-4">
          {state === "idle" || state === "rendering" ? (
            <>
              <div className="grid grid-cols-3 gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-center">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-600">Length</p>
                  <p className="mt-0.5 font-mono text-xs text-zinc-200">{project.duration.toFixed(1)}s</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-600">Frame</p>
                  <p className="mt-0.5 font-mono text-xs text-zinc-200">
                    {outW}×{outH}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-600">Format</p>
                  <p className="mt-0.5 font-mono text-xs text-zinc-200">{ext.toUpperCase()}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500">Quality</p>
                <Segmented
                  value={scale}
                  onChange={setScale}
                  options={[
                    { value: "1", label: `Full · ${project.width}p` },
                    { value: "0.75", label: "75%" },
                    { value: "0.5", label: "50%" },
                  ]}
                />
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500">Container</p>
                <Segmented
                  value={current.value}
                  onChange={(v) => setFormat(v)}
                  options={formats.map((f) => ({ value: f.value, label: f.label }))}
                />
                <p className="text-[10px] leading-relaxed text-zinc-600">
                  {current.label} · {current.detail}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500">
                    Captions
                  </p>
                  <span className="text-[10px] text-zinc-600">{cues.length} lines</span>
                </div>
                {cues.length ? (
                  <>
                    <div className="flex gap-2">
                      <Button variant="default" size="sm" className="flex-1" onClick={() => saveCaptions("srt")}>
                        Download .srt
                      </Button>
                      <Button variant="default" size="sm" className="flex-1" onClick={() => saveCaptions("vtt")}>
                        Download .vtt
                      </Button>
                    </div>
                    <p className="text-[10px] leading-relaxed text-zinc-600">
                      Captions are burned in and timed to the narration — these files are extras for
                      YouTube, Reels and Shorts.
                    </p>
                  </>
                ) : (
                  <p className="text-[10px] leading-relaxed text-zinc-600">
                    No caption layers yet. Generate a storyboard and they appear here.
                  </p>
                )}
              </div>

              <label className="block space-y-1.5">
                <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500">File name</span>
                <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-ink-900/80 px-2.5">
                  <input
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    className="h-8 min-w-0 flex-1 bg-transparent text-xs text-zinc-100 outline-none"
                  />
                  <span className="text-[11px] text-zinc-600">.{ext}</span>
                </div>
              </label>

              {state === "rendering" ? (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-400">{note || "Rendering"}</span>
                    <span className="font-mono text-zinc-200">{Math.round(progress * 100)}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400 transition-[width] duration-150"
                      style={{ width: `${Math.max(2, progress * 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] leading-relaxed text-zinc-600">
                    Recording in real time — about {Math.ceil(project.duration)}s. Keep this tab focused for a
                    clean file.
                  </p>
                </div>
              ) : (
                <p className="text-[10px] leading-relaxed text-zinc-600">
                  {audioCount
                    ? `${audioCount} audio layer${audioCount > 1 ? "s" : ""} will be mixed in.`
                    : "No audio layers — the video will be silent."}{" "}
                  Export takes about {Math.ceil(project.duration)}s because frames are captured live.
                </p>
              )}

              <div className="flex items-center gap-2 pt-1">
                <Button variant="default" size="lg" className="flex-1" onClick={closeExport} disabled={state === "rendering"}>
                  Cancel
                </Button>
                {state === "rendering" ? (
                  <Button
                    variant="danger"
                    size="lg"
                    className="flex-1"
                    onClick={() => {
                      abortRef.current?.abort();
                    }}
                  >
                    Stop render
                  </Button>
                ) : (
                  <Button variant="primary" size="lg" className="flex-[1.4]" onClick={() => void start()}>
                    <IconDownload width={15} height={15} /> Render video
                  </Button>
                )}
              </div>
            </>
          ) : null}

          {state === "done" && info ? (
            <div className="space-y-4 py-2 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30">
                <IconCheck width={22} height={22} />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-white">Your video is ready</h3>
                <p className="mt-1 text-[11px] text-zinc-500">
                  {info.name} · {fmtSize(info.size)} · {info.ext.toUpperCase()}
                </p>
                <p className="mx-auto mt-2 max-w-[320px] text-[10.5px] leading-relaxed text-zinc-600">
                  Download started automatically. If your browser blocked it, use the button below.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="lg"
                  className="flex-1"
                  onClick={() => setExport({ exportState: "idle", exportInfo: null })}
                >
                  Render another
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  className="flex-1"
                  onClick={() => {
                    if (blobRef.current) download(blobRef.current, info.name);
                  }}
                >
                  <IconDownload width={15} height={15} /> Download
                </Button>
              </div>
              <button onClick={closeExport} className="text-[11px] text-zinc-500 hover:text-zinc-200">
                Back to editing
              </button>
            </div>
          ) : null}

          {state === "error" ? (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-red-400/20 bg-red-500/[0.07] p-3">
                <p className="text-xs font-medium text-red-200">Render failed</p>
                <p className="mt-1 text-[11px] leading-relaxed text-red-200/70">{error}</p>
              </div>
              <ul className="space-y-1 text-[10.5px] text-zinc-500">
                <li>· Chrome or Edge give the most reliable capture.</li>
                <li>· Make sure no other tab is capturing screen audio.</li>
                <li>· Try 75% quality if the encoder runs out of memory.</li>
              </ul>
              <div className="flex gap-2">
                <Button variant="default" size="lg" className="flex-1" onClick={closeExport}>
                  Close
                </Button>
                <Button variant="primary" size="lg" className="flex-1" onClick={() => void start()}>
                  Try again
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
