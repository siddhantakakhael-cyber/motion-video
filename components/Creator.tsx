"use client";

import { useEffect, useMemo, useState } from "react";
import { generateStoryboard, SCRIPT_SAMPLES, scriptScenes } from "@/lib/ai";
import { availableFormats, exportVideo } from "@/lib/export";
import { saveMediaFile } from "@/lib/media";
import { MUSIC_MOOD_FOR_STYLE, renderMusicBed } from "@/lib/music";
import { download, makeAudio, safeName } from "@/lib/project";
import { STARTER_SCRIPT } from "@/lib/starter";
import { useStudio } from "@/lib/store";
import { captionCues, toSrt } from "@/lib/subs";
import { SCENE_STYLES, type AspectId, type SceneStyle } from "@/lib/types";
import { useUI } from "@/lib/ui";
import { narrate } from "@/lib/voiceover";
import Preview from "./Preview";
import { IconDownload, IconSparkles } from "./icons";
import { Button, Label, Slider, Toggle } from "./ui";

const SCRIPT_KEY = "motion-studio.script.v1";
const OPTIONS_KEY = "motion-studio.creator-options.v1";

const FORMATS: { id: AspectId; label: string; hint: string }[] = [
  { id: "9:16", label: "Reel", hint: "9:16" },
  { id: "16:9", label: "Wide", hint: "16:9" },
  { id: "1:1", label: "Square", hint: "1:1" },
  { id: "4:5", label: "Feed", hint: "4:5" },
];

const STYLE_PREVIEW: Record<SceneStyle["id"], string> = {
  bold: "linear-gradient(145deg,#2a1460,#0b0b12)",
  cinematic: "linear-gradient(145deg,#20180d,#0a0908)",
  news: "linear-gradient(160deg,#122238,#070b12)",
  neon: "linear-gradient(200deg,#0a1f2e,#05060a)",
};

export default function Creator() {
  const project = useStudio((s) => s.project);
  const setProject = useStudio((s) => s.setProject);
  const setPlaying = useStudio((s) => s.setPlaying);
  const seek = useStudio((s) => s.seek);
  const toast = useUI((s) => s.toast);

  const [script, setScript] = useState("");
  const [style, setStyle] = useState<SceneStyle["id"]>("bold");
  const [format, setFormat] = useState<AspectId>("9:16");
  const [voiceOn, setVoiceOn] = useState(true);
  const [pace, setPace] = useState(1);
  const [musicOn, setMusicOn] = useState(true);

  const [busy, setBusy] = useState(false);
  const [busyNote, setBusyNote] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportNote, setExportNote] = useState("");
  const [hasExported, setHasExported] = useState(false);
  // MediaRecorder support only exists in the browser — keep the first paint
  // identical to the server render so hydration stays clean.
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // restore the prompt + options
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SCRIPT_KEY);
      const firstRun = localStorage.getItem("motion-studio.creator-options.v1") === null;
      setScript(saved ?? (firstRun ? STARTER_SCRIPT : ""));
      const raw = localStorage.getItem(OPTIONS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<{
          style: SceneStyle["id"];
          format: AspectId;
          voiceOn: boolean;
          pace: number;
          musicOn: boolean;
        }>;
        if (parsed.style) setStyle(parsed.style);
        if (parsed.format) setFormat(parsed.format);
        if (parsed.voiceOn !== undefined) setVoiceOn(parsed.voiceOn);
        if (parsed.pace) setPace(parsed.pace);
        if (parsed.musicOn !== undefined) setMusicOn(parsed.musicOn);
      }
    } catch {
      /* storage disabled */
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      try {
        localStorage.setItem(SCRIPT_KEY, script);
        localStorage.setItem(OPTIONS_KEY, JSON.stringify({ style, format, voiceOn, pace, musicOn }));
      } catch {
        /* noop */
      }
    }, 300);
    return () => clearTimeout(id);
  }, [script, style, format, voiceOn, pace, musicOn]);

  const stats = useMemo(() => {
    const scenes = scriptScenes(script);
    const words = script.trim() ? script.trim().split(/\s+/).length : 0;
    return { scenes: scenes.length, words };
  }, [script]);

  const captions = useMemo(() => captionCues(project), [project]);
  const formats = useMemo(() => availableFormats(), []);
  const formatLabel = mounted ? formats[0]?.label ?? "MP4" : "MP4";

  const generate = async () => {
    if (!script.trim() || busy) {
      if (!script.trim()) toast("Write a prompt first", "One idea per line works best.", "error");
      return;
    }
    setBusy(true);
    setHasExported(false);
    try {
      const scenes = scriptScenes(script);
      const lead = 2.6;

      let narration: Awaited<ReturnType<typeof narrate>> = null;
      if (voiceOn) {
        setBusyNote(`Narrating 0/${scenes.length}`);
        narration = await narrate(scenes, {
          speed: Math.round(168 * pace),
          lead,
          gap: 0.16,
          tail: 0.3,
          onProgress: (done, total) => setBusyNote(`Narrating ${Math.min(done, total)}/${total}`),
        });
        if (!narration) toast("Voice unavailable", "Timing fell back to a word-count estimate.", "error");
      }

      setBusyNote("Directing…");
      const next = generateStoryboard({
        script,
        style,
        aspect: format,
        brand: "@yourhandle",
        title: "",
        includeTitle: true,
        includeCTA: true,
        ctaText: "Follow for more",
        wpm: 150,
        sceneDurations: narration
          ? narration.lines.map((l) => Math.round((l.duration + 0.08) * 100) / 100)
          : undefined,
        titleLead: narration ? lead : undefined,
      });
      setProject(next);

      const store = useStudio.getState();
      if (narration) {
        const file = new File([narration.blob], "ai-voiceover.wav", { type: "audio/wav" });
        const item = await saveMediaFile(file, "audio");
        store.addMedia(item);
        store.addLayer(
          makeAudio(item.url, "AI voiceover", {
            mediaId: item.id,
            start: 0,
            duration: Math.ceil(narration.duration * 10) / 10,
            volume: 1,
            role: "voice",
          }),
          false,
          "top"
        );
      }

      if (musicOn) {
        setBusyNote("Scoring…");
        const bed = await renderMusicBed(next.duration + 0.2, MUSIC_MOOD_FOR_STYLE[style] ?? "warm");
        if (bed) {
          const file = new File([bed], "music-bed.wav", { type: "audio/wav" });
          const item = await saveMediaFile(file, "audio");
          store.addMedia(item);
          store.addLayer(
            makeAudio(item.url, "Music bed", {
              mediaId: item.id,
              start: 0,
              duration: Math.ceil(next.duration * 10) / 10,
              volume: narration ? 0.14 : 0.26,
              role: "music",
            }),
            false,
            "bottom"
          );
        }
      }

      seek(0);
      setPlaying(true);
      const sceneCount = next.layers.filter((l) => l.role === "caption").length;
      toast("Video ready", `${sceneCount} scenes · ${next.duration.toFixed(1)}s · preview playing`, "success");
    } catch (err) {
      toast("Could not build the video", err instanceof Error ? err.message : "Unknown error", "error");
    } finally {
      setBusy(false);
      setBusyNote("");
    }
  };

  const exportNow = async () => {
    if (exporting) return;
    setExporting(true);
    setExportProgress(0);
    setExportNote("Preparing");
    setPlaying(false);
    try {
      const result = await exportVideo({
        project: useStudio.getState().project,
        format: formats[0]?.value ?? "mp4",
        scale: 1,
        onProgress: (p, note) => {
          setExportProgress(p);
          setExportNote(note);
        },
      });
      download(result.blob, `${safeName(project.name)}.${result.ext}`);
      setHasExported(true);
      toast("Video downloaded", `${(result.blob.size / 1048576).toFixed(1)} MB · ${result.ext.toUpperCase()}`, "success");
    } catch (err) {
      toast("Export failed", err instanceof Error ? err.message : "Unknown error", "error");
    } finally {
      setExporting(false);
      setExportNote("");
    }
  };

  const downloadCaptions = () => {
    if (!captions.length) {
      toast("No captions yet", "Generate a video first.", "error");
      return;
    }
    download(new Blob([toSrt(captions)], { type: "application/x-subrip" }), `${safeName(project.name)}.srt`);
    toast("Captions saved", `${captions.length} lines · SRT`, "success");
  };

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[380px_1fr] lg:overflow-hidden">
      {/* -------- prompt column -------- */}
      <aside className="order-2 min-h-0 border-t border-white/[0.06] px-4 py-4 lg:order-1 lg:overflow-y-auto lg:border-t-0 lg:border-r">
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-violet-400 to-violet-600 text-white">
                <IconSparkles width={13} height={13} />
              </span>
              <h2 className="text-[13px] font-semibold text-white">What should the video say?</h2>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
              Paste a script or type your idea — one line per scene. Everything is generated on your
              device.
            </p>
          </div>

          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            rows={8}
            placeholder={"Paste your script here.\n\nOne idea per line gives the cleanest scenes."}
            className="w-full resize-y rounded-xl border border-white/10 bg-ink-900/80 px-3 py-2.5 text-xs leading-relaxed text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-violet-400/60 focus:ring-2 focus:ring-violet-500/10"
          />

          <div className="flex items-center justify-between text-[10px] text-zinc-500">
            <span>
              {stats.words} words · {stats.scenes} scenes
            </span>
            {script ? (
              <button onClick={() => setScript("")} className="text-zinc-600 hover:text-zinc-300">
                Clear
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-1">
            {SCRIPT_SAMPLES.map((sample) => (
              <button
                key={sample.label}
                onClick={() => setScript(sample.text)}
                className="rounded-full bg-white/[0.04] px-2 py-1 text-[10px] text-zinc-400 ring-1 ring-white/10 transition hover:bg-violet-500/15 hover:text-violet-100"
              >
                {sample.label}
              </button>
            ))}
          </div>

          <div>
            <Label>Look</Label>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              {SCENE_STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id)}
                  className={`overflow-hidden rounded-lg text-left ring-1 transition ${
                    style === s.id ? "ring-violet-400/70" : "ring-white/10 hover:ring-white/25"
                  }`}
                >
                  <span className="relative block h-7" style={{ background: STYLE_PREVIEW[s.id] }}>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-white/90">
                      {s.label}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Format</Label>
            <div className="mt-1.5 grid grid-cols-4 gap-1.5">
              {FORMATS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFormat(f.id)}
                  className={`rounded-lg px-1 py-1.5 text-center text-[10px] ring-1 transition ${
                    format === f.id
                      ? "bg-violet-500/15 text-violet-100 ring-violet-400/60"
                      : "text-zinc-400 ring-white/10 hover:ring-white/25"
                  }`}
                >
                  {f.label}
                  <span className="block text-[9px] text-zinc-600">{f.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
            <div className="flex items-center justify-between">
              <Toggle checked={voiceOn} onChange={setVoiceOn} label="AI voiceover" />
              <span className="rounded-full bg-emerald-400/10 px-1.5 py-0.5 text-[9px] text-emerald-300 ring-1 ring-emerald-400/20">
                on-device
              </span>
            </div>
            {voiceOn ? (
              <Slider value={pace} min={0.85} max={1.3} step={0.05} onChange={setPace} />
            ) : null}
            <div className="flex items-center justify-between border-t border-white/[0.06] pt-2">
              <Toggle checked={musicOn} onChange={setMusicOn} label="Background music" />
              <span className="text-[9px] text-zinc-500">generated</span>
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => void generate()}
            disabled={busy || !script.trim()}
          >
            <IconSparkles width={15} height={15} />
            {busy ? busyNote || "Generating…" : "Generate video"}
          </Button>
          <p className="-mt-1 text-center text-[10px] leading-relaxed text-zinc-600">
            {stats.scenes} scenes · voiceover, music and cuts are built automatically
          </p>
        </div>
      </aside>

      {/* -------- preview + result -------- */}
      <section className="order-1 flex h-[72vh] flex-col border-b border-white/[0.06] lg:order-2 lg:h-auto lg:min-h-0 lg:flex-1 lg:border-b-0">
        <Preview />

        <div className="shrink-0 border-t border-white/[0.06] px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="mr-auto flex items-center gap-3 text-[11px] text-zinc-500">
              <span className="tabular-nums text-zinc-300">{project.duration.toFixed(1)}s</span>
              <span>
                {project.width}×{project.height}
              </span>
              <span>{captions.length} captions</span>
            </div>
            <Button size="sm" variant="default" onClick={downloadCaptions} disabled={!captions.length}>
              .srt
            </Button>
            <Button size="sm" variant="primary" onClick={() => void exportNow()} disabled={exporting}>
              <IconDownload width={12} height={12} />
              {exporting ? "Rendering…" : `Download ${formatLabel}`}
            </Button>
          </div>

          {exporting ? (
            <div className="mt-2 space-y-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400 transition-[width] duration-150"
                  style={{ width: `${Math.max(2, exportProgress * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-zinc-500">
                {exportNote || "Rendering"} · {Math.round(exportProgress * 100)}% — real-time capture,
                keep this tab focused.
              </p>
            </div>
          ) : hasExported ? (
            <p className="mt-2 text-[10px] text-emerald-300/80">
              Saved. Change the script and generate again for a new cut.
            </p>
          ) : null}
        </div>

        {captions.length ? (
          <div className="shrink-0 border-t border-white/[0.06] bg-black/20 px-4 py-2">
            <p className="mb-1.5 text-[9px] uppercase tracking-[0.1em] text-zinc-600">Scene cuts</p>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {captions.map((cue, i) => (
                <button
                  key={`${cue.index}-${i}`}
                  onClick={() => seek(cue.start)}
                  className="max-w-[190px] shrink-0 rounded-md bg-white/[0.04] px-2 py-1 text-left text-[10px] text-zinc-400 ring-1 ring-white/[0.06] transition hover:bg-violet-500/10 hover:text-violet-100"
                  title={cue.text}
                >
                  <span className="block font-mono text-[9px] text-zinc-600">
                    {cue.start.toFixed(2)}s
                  </span>
                  <span className="line-clamp-1 block">{cue.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
