"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { generateStoryboard, SCRIPT_SAMPLES, splitScript } from "@/lib/ai";
import { STARTER_SCRIPT } from "@/lib/starter";
import { useStudio } from "@/lib/store";
import { SCENE_STYLES, type AspectId, type SceneStyle } from "@/lib/types";
import { useUI } from "@/lib/ui";
import { IconSparkles } from "./icons";
import { Button, Field, Label, SectionHeader, Slider, TextInput, Toggle } from "./ui";

const SCRIPT_KEY = "motion-studio.script.v1";
const OPTIONS_KEY = "motion-studio.ai-options.v1";

const STYLE_PREVIEW: Record<SceneStyle["id"], string> = {
  bold: "linear-gradient(145deg,#2a1460,#0b0b12)",
  cinematic: "linear-gradient(145deg,#20180d,#0a0908)",
  news: "linear-gradient(160deg,#122238,#070b12)",
  neon: "linear-gradient(200deg,#0a1f2e,#05060a)",
};

export default function AIPanel() {
  const project = useStudio((s) => s.project);
  const setProject = useStudio((s) => s.setProject);
  const seek = useStudio((s) => s.seek);
  const select = useStudio((s) => s.select);
  const toast = useUI((s) => s.toast);

  const [script, setScript] = useState("");
  const [style, setStyle] = useState<SceneStyle["id"]>("bold");
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("@motionstudio");
  const [ctaText, setCtaText] = useState("Follow for more");
  const [includeTitle, setIncludeTitle] = useState(true);
  const [includeCTA, setIncludeCTA] = useState(true);
  const [wpm, setWpm] = useState(150);
  const [busy, setBusy] = useState(false);
  const scriptRef = useRef("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SCRIPT_KEY);
      const firstRun = localStorage.getItem("motion-studio.project.v2") === null;
      setScript(stored ?? (firstRun ? STARTER_SCRIPT : ""));
      const raw = localStorage.getItem(OPTIONS_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<{
          style: SceneStyle["id"];
          title: string;
          brand: string;
          ctaText: string;
          includeTitle: boolean;
          includeCTA: boolean;
          wpm: number;
        }>;
        if (saved.style) setStyle(saved.style);
        if (saved.title !== undefined) setTitle(saved.title);
        if (saved.brand !== undefined) setBrand(saved.brand);
        if (saved.ctaText) setCtaText(saved.ctaText);
        if (saved.includeTitle !== undefined) setIncludeTitle(saved.includeTitle);
        if (saved.includeCTA !== undefined) setIncludeCTA(saved.includeCTA);
        if (saved.wpm) setWpm(saved.wpm);
      }
    } catch {
      /* storage unavailable */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(OPTIONS_KEY, JSON.stringify({ style, title, brand, ctaText, includeTitle, includeCTA, wpm }));
    } catch {
      /* noop */
    }
  }, [style, title, brand, ctaText, includeTitle, includeCTA, wpm]);

  useEffect(() => {
    scriptRef.current = script;
    const id = setTimeout(() => {
      try {
        localStorage.setItem(SCRIPT_KEY, script);
      } catch {
        /* noop */
      }
    }, 300);
    return () => clearTimeout(id);
  }, [script]);

  // flush the draft when the panel unmounts (tab switch / reload)
  useEffect(
    () => () => {
      try {
        localStorage.setItem(SCRIPT_KEY, scriptRef.current);
      } catch {
        /* noop */
      }
    },
    []
  );

  const stats = useMemo(() => {
    const chunks = splitScript(script);
    const words = script.trim() ? script.trim().split(/\s+/).length : 0;
    const seconds = chunks.reduce(
      (total, c) => total + Math.max(1.3, (c.split(/\s+/).length / wpm) * 60 + 0.55) + 0.08,
      0
    );
    return { chunks: chunks.length, words, seconds: Math.round(seconds + (includeTitle ? 2.85 : 0) + (includeCTA ? 3.2 : 0)) };
  }, [script, wpm, includeTitle, includeCTA]);

  const aspect: AspectId =
    project.width === 1920 && project.height === 1080
      ? "16:9"
      : project.width === 1080 && project.height === 1080
      ? "1:1"
      : project.width === 1080 && project.height === 1350
      ? "4:5"
      : "9:16";

  const generate = () => {
    if (!script.trim()) {
      toast("Add a script first", "Paste a few lines — one idea per line works best.", "error");
      return;
    }
    setBusy(true);
    try {
      const next = generateStoryboard({
        script,
        style,
        aspect,
        brand,
        title,
        includeTitle,
        includeCTA,
        ctaText,
        wpm,
      });
      setProject(next);
      const headline =
        next.layers.find((l) => l.role === "headline") ?? next.layers.find((l) => l.role === "caption");
      seek(headline ? Math.min(0.55, headline.start + 0.4) : 0);
      if (headline) select(headline.id);
      const scenes = next.layers.filter((l) => l.role === "caption").length;
      toast("Storyboard generated", `${scenes} scenes · ${next.duration.toFixed(1)}s · fully editable`, "success");
    } catch (err) {
      toast("Could not generate", err instanceof Error ? err.message : "Unknown error", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative shrink-0 overflow-hidden border-b border-white/[0.06] px-3.5 py-3">
        <div className="pointer-events-none absolute -right-6 -top-10 h-28 w-28 rounded-full bg-violet-500/20 blur-2xl" />
        <div className="relative flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-400 to-violet-600 text-white shadow-lg">
            <IconSparkles width={15} height={15} />
          </span>
          <div className="min-w-0">
            <h2 className="text-[13px] font-semibold text-white">AI Director</h2>
            <p className="text-[10px] text-zinc-500">Script in, animated storyboard out</p>
          </div>
          <span className="ml-auto rounded-full bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-300 ring-1 ring-emerald-400/20">
            on-device
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3.5 py-3">
        <Field label="Your script">
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            rows={7}
            placeholder={"Paste your voiceover script here.\n\nOne idea per line gives the cleanest scenes. Punctuation is used to time the captions."}
            className="w-full resize-y rounded-xl border border-white/10 bg-ink-900/80 px-3 py-2.5 text-xs leading-relaxed text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-violet-400/60 focus:ring-2 focus:ring-violet-500/10"
          />
        </Field>

        <div className="flex items-center justify-between text-[10px] text-zinc-500">
          <span>
            {stats.words} words · {stats.chunks} scenes · ~{stats.seconds}s
          </span>
          {script ? (
            <button onClick={() => setScript("")} className="text-zinc-600 hover:text-zinc-300">
              Clear
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-1">
          <span className="mr-0.5 self-center text-[10px] text-zinc-600">Try</span>
          {SCRIPT_SAMPLES.map((s) => (
            <button
              key={s.label}
              onClick={() => setScript(s.text)}
              className="rounded-full bg-white/[0.04] px-2 py-1 text-[10px] text-zinc-400 ring-1 ring-white/10 transition hover:bg-violet-500/15 hover:text-violet-100"
            >
              {s.label}
            </button>
          ))}
        </div>

        <div>
          <Label>Visual style</Label>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            {SCENE_STYLES.map((s) => (
              <button
                key={s.id}
                onClick={() => setStyle(s.id)}
                className={`group overflow-hidden rounded-lg text-left ring-1 transition ${
                  style === s.id
                    ? "ring-violet-400/70"
                    : "ring-white/10 hover:ring-white/25"
                }`}
              >
                <span className="relative block h-8" style={{ background: STYLE_PREVIEW[s.id] }}>
                  <span
                    className={`absolute inset-0 flex items-center justify-center text-[10px] font-semibold tracking-wide text-white/90 ${
                      style === s.id ? "" : "opacity-70"
                    }`}
                    style={{ fontFamily: s.id === "cinematic" ? "Playfair Display, serif" : "Poppins, sans-serif" }}
                  >
                    {s.label}
                  </span>
                  {style === s.id ? (
                    <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-violet-300" />
                  ) : null}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-zinc-600">
            {SCENE_STYLES.find((s) => s.id === style)?.description}
          </p>
        </div>

        <div className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
          <Field label="Title card">
            <TextInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Auto from your script"
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Brand / handle">
              <TextInput value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="@yourhandle" />
            </Field>
            <Field label="End call-to-action">
              <TextInput value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder="Follow for more" />
            </Field>
          </div>
          <div className="flex items-center justify-between pt-1">
            <Toggle checked={includeTitle} onChange={setIncludeTitle} label="Title card" />
            <Toggle checked={includeCTA} onChange={setIncludeCTA} label="End CTA" />
          </div>
        </div>

        <Field label={`Narration pace · ${wpm} wpm`}>
          <Slider value={wpm} min={100} max={210} step={5} onChange={setWpm} />
        </Field>
        <p className="-mt-1 text-[10px] text-zinc-600">
          Slower pace keeps each caption on screen longer. 140–160 matches most social voiceovers.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Format</Label>
            <p className="mt-1 text-[11px] text-zinc-400">
              {aspect} · {project.width}×{project.height}
            </p>
          </div>
          <div>
            <Label>Scenes</Label>
            <p className="mt-1 flex items-center gap-1 text-[11px] text-zinc-400">
              <IconSparkles width={11} height={11} className="text-violet-300" />
              {stats.chunks} cuts
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={generate}
          disabled={busy || !script.trim()}
        >
          <IconSparkles width={15} height={15} />
          {busy ? "Directing…" : "Generate storyboard"}
        </Button>
        <p className="-mt-1 text-center text-[10px] leading-relaxed text-zinc-600">
          Replaces the current timeline — <kbd className="rounded bg-white/5 px-1 font-mono">⌘Z</kbd> brings
          the old edit back.
        </p>

        <SectionHeader title="How it works" />
        <ol className="-mt-1 space-y-1.5 pb-6 text-[10.5px] leading-relaxed text-zinc-500">
          <li className="flex gap-2">
            <span className="mt-[3px] h-1 w-1 shrink-0 rounded-full bg-violet-400" />
            Script is split into caption-sized scenes by punctuation and line breaks.
          </li>
          <li className="flex gap-2">
            <span className="mt-[3px] h-1 w-1 shrink-0 rounded-full bg-violet-400" />
            Scene duration comes from word count and your chosen pace.
          </li>
          <li className="flex gap-2">
            <span className="mt-[3px] h-1 w-1 shrink-0 rounded-full bg-violet-400" />
            Theme applies fonts, accents, transitions and safe-area positions.
          </li>
          <li className="flex gap-2">
            <span className="mt-[3px] h-1 w-1 shrink-0 rounded-full bg-violet-400" />
            Everything lands on the timeline as normal layers — edit freely.
          </li>
        </ol>
      </div>
    </div>
  );
}
