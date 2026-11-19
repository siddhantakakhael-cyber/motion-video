"use client";

import { audioEngine } from "@/lib/audio";
import { fmtTime } from "@/lib/anim";
import { useStudio } from "@/lib/store";
import { CANVAS_FONTS, SWATCHES, type AspectId, type Layer } from "@/lib/types";
import { useUI } from "@/lib/ui";
import {
  IconAlignCenter,
  IconAlignLeft,
  IconAlignRight,
  IconAudio,
  IconCopy,
  IconDiamond,
  IconEye,
  IconEyeOff,
  IconImage,
  IconLock,
  IconPlus,
  IconShape,
  IconSliders,
  IconText,
  IconTrash,
  IconUnlock,
} from "./icons";
import {
  Button,
  ColorInput,
  Divider,
  EmptyHint,
  Field,
  IconButton,
  Label,
  NumberInput,
  SectionHeader,
  Segmented,
  Select,
  Slider,
  Toggle,
} from "./ui";

const BG_PRESETS = [
  { name: "Violet night", bg: { type: "gradient" as const, from: "#2a1460", to: "#0b0b12", angle: 145, color: "#0b0b12" } },
  { name: "Ink", bg: { type: "solid" as const, from: "#0a0a0a", to: "#0a0a0a", angle: 0, color: "#0a0a0a" } },
  { name: "Ember", bg: { type: "gradient" as const, from: "#3b0d1a", to: "#140409", angle: 200, color: "#140409" } },
  { name: "Ocean", bg: { type: "gradient" as const, from: "#0b3b52", to: "#04121c", angle: 160, color: "#04121c" } },
  { name: "Mesh glow", bg: { type: "mesh" as const, from: "#8b5cf6", to: "#22d3ee", angle: 0, color: "#07070b" } },
  { name: "Paper", bg: { type: "solid" as const, from: "#f7f5ef", to: "#f7f5ef", angle: 0, color: "#f7f5ef" } },
];

export default function Inspector() {
  const project = useStudio((s) => s.project);
  const selectedId = useStudio((s) => s.selectedId);
  const updateLayer = useStudio((s) => s.updateLayer);
  const removeLayer = useStudio((s) => s.removeLayer);
  const duplicate = useStudio((s) => s.duplicate);
  const toggleHidden = useStudio((s) => s.toggleHidden);
  const toggleLocked = useStudio((s) => s.toggleLocked);
  const addKeyframe = useStudio((s) => s.addKeyframe);
  const removeKeyframe = useStudio((s) => s.removeKeyframe);
  const updateKeyframe = useStudio((s) => s.updateKeyframe);
  const snapshot = useStudio((s) => s.snapshot);
  const seek = useStudio((s) => s.seek);
  const time = useStudio((s) => s.time);
  const media = useStudio((s) => s.media);
  const toast = useUI((s) => s.toast);

  const layer = project.layers.find((l) => l.id === selectedId) ?? null;

  if (!layer) return <ProjectInspector />;

  const set = (patch: Partial<Layer>, history = true) => updateLayer(layer.id, patch, { history });
  const setLive = (patch: Partial<Layer>) => updateLayer(layer.id, patch, { history: false });
  const typeLabel =
    layer.type === "text" ? "Text" : layer.type === "image" ? "Image" : layer.type === "shape" ? "Shape" : "Audio";

  const anchorsX = [-project.width * 0.32, 0, project.width * 0.32];
  const anchorsY = [-project.height * 0.32, 0, project.height * 0.32];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-white/[0.06] px-3.5">
        <span className="flex h-5 w-5 items-center justify-center rounded bg-white/[0.06] text-violet-300">
          {layer.type === "text" ? (
            <IconText width={12} height={12} />
          ) : layer.type === "image" ? (
            <IconImage width={12} height={12} />
          ) : layer.type === "shape" ? (
            <IconShape width={12} height={12} />
          ) : (
            <IconAudio width={12} height={12} />
          )}
        </span>
        <input
          value={layer.name}
          onChange={(e) => setLive({ name: e.target.value })}
          onFocus={snapshot}
          className="min-w-0 flex-1 bg-transparent text-xs font-medium text-zinc-100 outline-none"
        />
        <div className="flex items-center">
          <IconButton label={layer.hidden ? "Show" : "Hide"} onClick={() => toggleHidden(layer.id)}>
            {layer.hidden ? <IconEyeOff width={14} height={14} /> : <IconEye width={14} height={14} />}
          </IconButton>
          <IconButton label={layer.locked ? "Unlock" : "Lock"} onClick={() => toggleLocked(layer.id)}>
            {layer.locked ? <IconLock width={14} height={14} /> : <IconUnlock width={14} height={14} />}
          </IconButton>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-8">
        <SectionHeader
          title="Transform"
          action={
            <span className="text-[10px] uppercase tracking-wider text-zinc-600">{typeLabel}</span>
          }
        />
        <div className="space-y-2.5 px-3.5">
          <div className="grid grid-cols-2 gap-2">
            <Field label="X">
              <NumberInput value={Math.round(layer.x)} step={4} onEditStart={snapshot} onChange={(v) => setLive({ x: v })} />
            </Field>
            <Field label="Y">
              <NumberInput value={Math.round(layer.y)} step={4} onEditStart={snapshot} onChange={(v) => setLive({ y: v })} />
            </Field>
          </div>
          <Field label={`Scale · ${(layer.scale * 100).toFixed(0)}%`}>
            <Slider
              value={layer.scale}
              min={0.1}
              max={3}
              step={0.01}
              onCommit={snapshot}
              onChange={(v) => setLive({ scale: v })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Rotation">
              <NumberInput value={Math.round(layer.rotation)} step={1} suffix="°" onEditStart={snapshot} onChange={(v) => setLive({ rotation: v })} />
            </Field>
            <Field label={`Opacity · ${(layer.opacity * 100).toFixed(0)}%`}>
              <Slider
                value={layer.opacity}
                min={0}
                max={1}
                step={0.01}
                onCommit={snapshot}
                onChange={(v) => setLive({ opacity: v })}
              />
            </Field>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <div className="grid grid-cols-3 gap-[3px]">
              {anchorsY.map((y) =>
                anchorsX.map((x) => {
                  const on = Math.abs(layer.x - x) < 2 && Math.abs(layer.y - y) < 2;
                  return (
                    <button
                      key={`${x}-${y}`}
                      onClick={() => set({ x, y })}
                      className={`h-2.5 w-2.5 rounded-[2px] ring-1 transition ${
                        on ? "bg-violet-400 ring-violet-300" : "bg-ink-700 ring-white/10 hover:bg-ink-500"
                      }`}
                      title={`Move to ${x}, ${y}`}
                    />
                  );
                })
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto"
              onClick={() => set({ x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 })}
            >
              Reset
            </Button>
          </div>
        </div>

        <Divider />

        <SectionHeader title="Timing" action={<span className="font-mono text-[10px] text-zinc-500">{fmtTime(layer.start + layer.duration, true, project.fps)}</span>} />
        <div className="space-y-2.5 px-3.5">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Start">
              <NumberInput
                value={layer.start}
                step={0.1}
                min={0}
                suffix="s"
                onEditStart={snapshot}
                onChange={(v) => setLive({ start: Math.max(0, v) })}
              />
            </Field>
            <Field label="Duration">
              <NumberInput
                value={layer.duration}
                step={0.1}
                min={0.2}
                suffix="s"
                onEditStart={snapshot}
                onChange={(v) => setLive({ duration: Math.max(0.2, v) })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="In animation">
              <Select value={layer.animIn} onChange={(e) => set({ animIn: e.target.value as Layer["animIn"] })}>
                <option value="none">None</option>
                <option value="fade">Fade in</option>
                <option value="slide-up">Slide up</option>
                <option value="slide-down">Slide down</option>
                <option value="zoom-in">Zoom in</option>
                <option value="pop">Pop</option>
              </Select>
            </Field>
            <Field label="Out animation">
              <Select value={layer.animOut} onChange={(e) => set({ animOut: e.target.value as Layer["animOut"] })}>
                <option value="none">None</option>
                <option value="fade">Fade out</option>
                <option value="slide-down">Slide down</option>
                <option value="zoom-out">Zoom out</option>
              </Select>
            </Field>
          </div>
        </div>

        <Divider />

        <SectionHeader
          title="Keyframes"
          action={
            <Button
              size="sm"
              variant="soft"
              onClick={() => {
                addKeyframe(layer.id, time);
                toast("Keyframe added", `at ${(time - layer.start).toFixed(2)}s in this layer`, "success");
              }}
            >
              <IconPlus width={11} height={11} /> At playhead
            </Button>
          }
        />
        <div className="space-y-2 px-3.5">
          {layer.keyframes.length === 0 ? (
            <EmptyHint>
              Add two or more keyframes to animate position, scale or opacity over time. The playhead
              position decides where the keyframe lands.
            </EmptyHint>
          ) : (
            layer.keyframes
              .slice()
              .sort((a, b) => a.t - b.t)
              .map((kf) => (
                <div key={kf.id} className="rounded-lg border border-white/[0.07] bg-ink-900/60 p-2">
                  <div className="mb-1.5 flex items-center gap-1">
                    <button
                      onClick={() => seek(layer.start + kf.t)}
                      className="flex items-center gap-1 rounded px-1 py-0.5 text-[10px] font-medium text-violet-200 hover:bg-white/5"
                    >
                      <IconDiamond width={9} height={9} />
                      {kf.t.toFixed(2)}s
                    </button>
                    <div className="ml-auto flex items-center gap-1">
                      <div className="w-[52px]">
                        <NumberInput
                          value={kf.t}
                          step={0.05}
                          onEditStart={snapshot}
                          onChange={(v) => updateKeyframe(layer.id, kf.id, { t: Math.max(0, Math.min(layer.duration, v)) }, { history: false })}
                        />
                      </div>
                      <IconButton
                        label="Delete keyframe"
                        onClick={() => removeKeyframe(layer.id, kf.id)}
                        className="hover:bg-red-500/15 hover:text-red-300"
                      >
                        <IconTrash width={12} height={12} />
                      </IconButton>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(
                      [
                        ["X", "x"],
                        ["Y", "y"],
                        ["Scale", "scale"],
                        ["Opacity", "opacity"],
                      ] as const
                    ).map(([label, key]) => (
                      <Field key={key} label={label}>
                        <NumberInput
                          value={kf[key]}
                          step={key === "opacity" ? 0.05 : key === "scale" ? 0.01 : 4}
                          onEditStart={snapshot}
                          onChange={(v) => updateKeyframe(layer.id, kf.id, { [key]: v }, { history: false })}
                        />
                      </Field>
                    ))}
                  </div>
                </div>
              ))
          )}
        </div>

        <Divider />

        {layer.type === "text" ? (
          <>
            <SectionHeader title="Text" />
            <div className="space-y-2.5 px-3.5">
              <textarea
                value={layer.text ?? ""}
                rows={3}
                onFocus={snapshot}
                onChange={(e) => setLive({ text: e.target.value })}
                placeholder="Type your copy…"
                className="w-full resize-y rounded-lg border border-white/10 bg-ink-900/80 px-2.5 py-2 text-xs leading-relaxed text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-violet-400/60"
              />
              <div className="flex flex-wrap gap-1">
                {[
                  { label: "Headline", fontSize: 96, fontWeight: 800, lineHeight: 1.1 },
                  { label: "Subhead", fontSize: 64, fontWeight: 700, lineHeight: 1.18 },
                  { label: "Caption", fontSize: 44, fontWeight: 600, lineHeight: 1.3 },
                  { label: "Kicker", fontSize: 28, fontWeight: 600, lineHeight: 1.4 },
                ].map((p) => (
                  <button
                    key={p.label}
                    onClick={() =>
                      set({ fontSize: p.fontSize, fontWeight: p.fontWeight, lineHeight: p.lineHeight })
                    }
                    className="rounded-md bg-white/[0.04] px-2 py-1 text-[10px] text-zinc-400 ring-1 ring-white/10 transition hover:bg-white/[0.08] hover:text-zinc-100"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Font">
                  <Select value={layer.fontFamily} onChange={(e) => set({ fontFamily: e.target.value })}>
                    {CANVAS_FONTS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Weight">
                  <Select value={layer.fontWeight} onChange={(e) => set({ fontWeight: Number(e.target.value) })}>
                    {[400, 500, 600, 700, 800].map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Size">
                  <NumberInput value={layer.fontSize ?? 64} step={2} onEditStart={snapshot} onChange={(v) => setLive({ fontSize: Math.max(6, v) })} />
                </Field>
                <Field label="Line">
                  <NumberInput value={layer.lineHeight ?? 1.15} step={0.02} onEditStart={snapshot} onChange={(v) => setLive({ lineHeight: v })} />
                </Field>
                <Field label="Tracking">
                  <NumberInput value={layer.letterSpacing ?? 0} step={0.5} onEditStart={snapshot} onChange={(v) => setLive({ letterSpacing: v })} />
                </Field>
              </div>
              <div className="flex items-center justify-between">
                <Label>Align</Label>
                <div className="w-[118px]">
                  <Segmented
                    value={layer.align ?? "center"}
                    onChange={(v) => set({ align: v })}
                    options={[
                      { value: "left" as const, label: <IconAlignLeft width={12} height={12} /> },
                      { value: "center" as const, label: <IconAlignCenter width={12} height={12} /> },
                      { value: "right" as const, label: <IconAlignRight width={12} height={12} /> },
                    ]}
                  />
                </div>
              </div>
              <Field label="Colour" >
                <div onPointerDown={snapshot}>
                  <ColorInput value={layer.color ?? "#ffffff"} onChange={(v) => setLive({ color: v })} allowAlpha />
                </div>
              </Field>
              <div className="flex items-center justify-between pt-0.5">
                <Toggle checked={Boolean(layer.uppercase)} onChange={(v) => set({ uppercase: v })} label="Uppercase" />
                <Toggle
                  checked={Boolean(layer.highlight)}
                  onChange={(v) => set({ highlight: v ? "#ffffff" : undefined, highlightText: v ? "#0b0b12" : undefined })}
                  label="Highlight"
                />
              </div>
              {layer.highlight ? (
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Pill">
                    <div onPointerDown={snapshot}>
                      <ColorInput value={layer.highlight} onChange={(v) => setLive({ highlight: v })} allowAlpha />
                    </div>
                  </Field>
                  <Field label="Text on pill">
                    <div onPointerDown={snapshot}>
                      <ColorInput value={layer.highlightText ?? "#0b0b12"} onChange={(v) => setLive({ highlightText: v })} allowAlpha />
                    </div>
                  </Field>
                </div>
              ) : null}
            </div>
            <Divider />
          </>
        ) : null}

        {layer.type === "image" ? (
          <>
            <SectionHeader title="Image" />
            <div className="space-y-2.5 px-3.5">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Width">
                  <NumberInput value={Math.round(layer.w ?? project.width * 0.8)} step={10} onEditStart={snapshot} onChange={(v) => setLive({ w: Math.max(10, v) })} />
                </Field>
                <Field label="Height">
                  <NumberInput value={Math.round(layer.h ?? project.height * 0.5)} step={10} onEditStart={snapshot} onChange={(v) => setLive({ h: Math.max(10, v) })} />
                </Field>
              </div>
              <Field label="Fit">
                <Segmented
                  value={layer.fit ?? "cover"}
                  onChange={(v) => set({ fit: v })}
                  options={[
                    { value: "cover" as const, label: "Cover" },
                    { value: "contain" as const, label: "Contain" },
                  ]}
                />
              </Field>
              <Field label={`Corner radius · ${layer.radius ?? 0}px`}>
                <Slider value={layer.radius ?? 0} min={0} max={200} step={2} onCommit={snapshot} onChange={(v) => setLive({ radius: v })} />
              </Field>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="default"
                  className="flex-1"
                  onClick={() => set({ w: project.width, h: project.height, radius: 0, fit: "cover", x: 0, y: 0 })}
                >
                  Fill canvas
                </Button>
                <Button size="sm" variant="ghost" onClick={() => set({ w: project.width * 0.72, h: undefined, radius: 28 })}>
                  Fit inside
                </Button>
              </div>
              {media.some((m) => m.type === "image") ? (
                <Field label="Swap image">
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {media
                      .filter((m) => m.type === "image")
                      .slice(-12)
                      .map((m) => (
                        <button
                          key={m.id}
                          onClick={() => set({ src: m.url, mediaId: m.id, name: m.name })}
                          className={`h-11 w-11 shrink-0 overflow-hidden rounded-md ring-1 transition ${
                            layer.mediaId === m.id ? "ring-violet-400" : "ring-white/10 hover:ring-white/30"
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={m.url} alt={m.name} className="h-full w-full object-cover" />
                        </button>
                      ))}
                  </div>
                </Field>
              ) : null}
            </div>
            <Divider />
          </>
        ) : null}

        {layer.type === "shape" ? (
          <>
            <SectionHeader title="Shape" />
            <div className="space-y-2.5 px-3.5">
              <Field label="Kind">
                <Segmented
                  value={layer.shape ?? "rect"}
                  onChange={(v) => set({ shape: v })}
                  options={[
                    { value: "rect" as const, label: "Rect" },
                    { value: "ellipse" as const, label: "Circle" },
                    { value: "triangle" as const, label: "Tri" },
                    { value: "line" as const, label: "Line" },
                  ]}
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Width">
                  <NumberInput value={Math.round(layer.w ?? 160)} step={4} onEditStart={snapshot} onChange={(v) => setLive({ w: Math.max(1, v) })} />
                </Field>
                <Field label="Height">
                  <NumberInput value={Math.round(layer.h ?? 10)} step={2} onEditStart={snapshot} onChange={(v) => setLive({ h: Math.max(1, v) })} />
                </Field>
              </div>
              <Field label="Fill">
                <div onPointerDown={snapshot}>
                  <ColorInput value={layer.fill ?? "#8b5cf6"} onChange={(v) => setLive({ fill: v })} allowAlpha />
                </div>
              </Field>
              <div className="flex flex-wrap gap-1">
                {SWATCHES.map((c) => (
                  <button
                    key={c}
                    onClick={() => set({ fill: c })}
                    className="h-5 w-5 rounded ring-1 ring-white/15 transition hover:scale-110"
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
            <Divider />
          </>
        ) : null}

        {layer.type === "audio" ? (
          <>
            <SectionHeader title="Audio" />
            <div className="space-y-2.5 px-3.5">
              <Field label={`Volume · ${Math.round((layer.volume ?? 0.7) * 100)}%`}>
                <Slider
                  value={layer.volume ?? 0.7}
                  min={0}
                  max={1}
                  step={0.01}
                  onCommit={snapshot}
                  onChange={(v) => setLive({ volume: v })}
                />
              </Field>
              <Button
                size="sm"
                variant="default"
                className="w-full"
                onClick={() => {
                  audioEngine.preview(layer.audioUrl, layer.volume ?? 0.8);
                  toast("Previewing audio", layer.name);
                }}
                disabled={!layer.audioUrl}
              >
                <IconAudio width={12} height={12} /> Preview audio
              </Button>
              <p className="text-[10px] leading-relaxed text-zinc-600">
                Audio layers are mixed into the export. Keep music around 50–60% so narration stays clear.
              </p>
            </div>
            <Divider />
          </>
        ) : null}

        <div className="flex items-center gap-2 px-3.5 pb-4">
          <Button size="sm" variant="default" className="flex-1" onClick={() => duplicate(layer.id)}>
            <IconCopy width={12} height={12} /> Duplicate
          </Button>
          <Button size="sm" variant="danger" onClick={() => removeLayer(layer.id)}>
            <IconTrash width={12} height={12} /> Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProjectInspector() {
  const project = useStudio((s) => s.project);
  const patchProject = useStudio((s) => s.patchProject);
  const setAspect = useStudio((s) => s.setAspect);
  const setProject = useStudio((s) => s.setProject);
  const snapshot = useStudio((s) => s.snapshot);
  const layers = project.layers.length;

  const aspect: AspectId =
    project.width === 1080 && project.height === 1920
      ? "9:16"
      : project.width === 1920 && project.height === 1080
      ? "16:9"
      : project.width === 1080 && project.height === 1080
      ? "1:1"
      : "4:5";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-white/[0.06] px-3.5">
        <IconSliders width={14} height={14} className="text-zinc-500" />
        <span className="text-xs font-medium text-zinc-200">Canvas & background</span>
        <span className="ml-auto font-mono text-[10px] text-zinc-600">
          {project.width}×{project.height}
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3.5 py-4">
        <Field label="Project name">
          <input
            value={project.name}
            onFocus={snapshot}
            onChange={(e) => setProject({ ...project, name: e.target.value })}
            className="h-8 w-full rounded-lg border border-white/10 bg-ink-900/80 px-2.5 text-xs text-zinc-100 outline-none focus:border-violet-400/60"
          />
        </Field>

        <Field label="Format">
          <div className="grid grid-cols-4 gap-1">
            {(
              [
                ["9:16", "Reel"],
                ["16:9", "Wide"],
                ["1:1", "Square"],
                ["4:5", "Feed"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setAspect(id)}
                className={`flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-[10px] transition ${
                  aspect === id
                    ? "border-violet-400/50 bg-violet-500/10 text-violet-100"
                    : "border-white/10 bg-ink-900/50 text-zinc-500 hover:text-zinc-200"
                }`}
              >
                <span
                  className="rounded-[2px] border border-current opacity-70"
                  style={{
                    width: id === "16:9" ? 20 : id === "4:5" ? 12 : 14,
                    height: id === "16:9" ? 12 : 20,
                  }}
                />
                {label}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Frame rate">
            <Select value={project.fps} onChange={(e) => patchProject({ fps: Number(e.target.value) })}>
              {[24, 25, 30, 60].map((f) => (
                <option key={f} value={f}>
                  {f} fps
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Duration">
            <NumberInput
              value={project.duration}
              min={0.5}
              max={600}
              step={0.5}
              suffix="s"
              onEditStart={snapshot}
              onChange={(v) => patchProject({ duration: v }, { history: false })}
            />
          </Field>
        </div>

        <Field label="Background">
          <Segmented
            value={project.background.type}
            onChange={(v) => patchProject({ background: { ...project.background, type: v } })}
            options={[
              { value: "gradient" as const, label: "Gradient" },
              { value: "mesh" as const, label: "Mesh" },
              { value: "solid" as const, label: "Solid" },
            ]}
          />
        </Field>

        <div className="grid grid-cols-3 gap-1.5">
          {BG_PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => patchProject({ background: p.bg })}
              title={p.name}
              className="group overflow-hidden rounded-lg ring-1 ring-white/10 transition hover:ring-white/30"
            >
              <span
                className="block h-9 w-full"
                style={{
                  background:
                    p.bg.type === "solid"
                      ? p.bg.color
                      : `linear-gradient(${p.bg.angle}deg, ${p.bg.from}, ${p.bg.to})`,
                }}
              />
              <span className="block px-1 py-1 text-[9px] text-zinc-500 group-hover:text-zinc-300">{p.name}</span>
            </button>
          ))}
        </div>

        {project.background.type !== "solid" ? (
          <div className="grid grid-cols-2 gap-2">
            <Field label="From">
              <div onPointerDown={snapshot}>
                <ColorInput
                  value={project.background.from}
                  onChange={(v) => patchProject({ background: { ...project.background, from: v } }, { history: false })}
                />
              </div>
            </Field>
            <Field label="To">
              <div onPointerDown={snapshot}>
                <ColorInput
                  value={project.background.to}
                  onChange={(v) => patchProject({ background: { ...project.background, to: v } }, { history: false })}
                />
              </div>
            </Field>
          </div>
        ) : (
          <Field label="Colour">
            <div onPointerDown={snapshot}>
              <ColorInput
                value={project.background.color}
                onChange={(v) => patchProject({ background: { ...project.background, color: v } }, { history: false })}
              />
            </div>
          </Field>
        )}

        {project.background.type === "gradient" ? (
          <Field label={`Angle · ${project.background.angle}°`}>
            <Slider
              value={project.background.angle}
              min={0}
              max={360}
              onCommit={snapshot}
              onChange={(v) => patchProject({ background: { ...project.background, angle: v } }, { history: false })}
            />
          </Field>
        ) : null}

        <Divider />

        <div className="space-y-2 text-[10.5px] leading-relaxed text-zinc-500">
          <p className="flex items-center gap-1.5 text-zinc-400">
            <IconDiamond width={10} height={10} /> {layers} layer{layers === 1 ? "" : "s"} on the timeline
          </p>
          <p>
            Select any layer to edit its transform, animation and style. With nothing selected you get
            canvas settings.
          </p>
          <p className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2 text-zinc-600">
            Export renders in real time on this device — nothing is uploaded. Keep this tab visible while
            rendering.
          </p>
        </div>
      </div>
    </div>
  );
}
