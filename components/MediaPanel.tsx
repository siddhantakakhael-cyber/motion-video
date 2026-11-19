"use client";

import { useEffect, useRef, useState } from "react";
import { audioEngine } from "@/lib/audio";
import { insertFiles, insertMediaItem, insertRecording } from "@/lib/insert";
import { deleteMediaItem } from "@/lib/media";
import { useStudio } from "@/lib/store";
import type { MediaItem as MediaRecord } from "@/lib/types";
import { useUI } from "@/lib/ui";
import { voiceRecorder } from "@/lib/voice";
import { IconAudio, IconMic, IconMusic, IconTrash, IconUpload } from "./icons";
import { Button, EmptyHint, SectionHeader } from "./ui";

export default function MediaPanel() {
  const media = useStudio((s) => s.media);
  const removeMedia = useStudio((s) => s.removeMedia);
  const toast = useUI((s) => s.toast);

  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!recording) return;
    const started = performance.now();
    const id = setInterval(() => setElapsed((performance.now() - started) / 1000), 100);
    return () => clearInterval(id);
  }, [recording]);

  const upload = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setUploading(true);
    try {
      const res = await insertFiles(files);
      const parts: string[] = [];
      if (res.images) parts.push(`${res.images} image${res.images > 1 ? "s" : ""}`);
      if (res.audio) parts.push(`${res.audio} audio`);
      if (parts.length) toast("Added to timeline", parts.join(" · "), "success");
      if (res.skipped) toast("Unsupported file", "Use images (JPG, PNG, WebP) or audio (MP3, WAV, M4A).", "error");
    } catch (err) {
      toast("Upload failed", err instanceof Error ? err.message : "Try a different file", "error");
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      await voiceRecorder.start();
      setElapsed(0);
      setRecording(true);
      toast("Recording voiceover", "Speak your script, then hit stop. It lands at the playhead.");
    } catch (err) {
      toast("Microphone unavailable", err instanceof Error ? err.message : "Allow mic access to record.", "error");
    }
  };

  const stopRecording = async () => {
    setSaving(true);
    try {
      const result = await voiceRecorder.stop();
      setRecording(false);
      const layer = await insertRecording(result.blob, "Voiceover", result.duration);
      if (layer) toast("Voiceover added", `${result.duration.toFixed(1)}s at the playhead`, "success");
    } catch (err) {
      setRecording(false);
      toast("Recording failed", err instanceof Error ? err.message : "Try again", "error");
    } finally {
      setSaving(false);
    }
  };

  const images = media.filter((m) => m.type === "image");
  const audio = media.filter((m) => m.type === "audio");

  const addFromLibrary = async (m: MediaRecord) => {
    try {
      await insertMediaItem(m);
      toast(
        m.type === "image" ? "Image added" : "Audio added",
        m.type === "image" ? "Full-bleed Ken Burns at the playhead" : "Placed at 0:00",
        "success"
      );
    } catch {
      toast("Could not add media", "Try uploading the file again.", "error");
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-white/[0.06] px-3.5">
        <div>
          <h2 className="text-[13px] font-semibold text-white">Media</h2>
          <p className="text-[10px] text-zinc-500">Stored on this device</p>
        </div>
        <Button size="sm" variant="default" onClick={() => inputRef.current?.click()} disabled={uploading}>
          <IconUpload width={12} height={12} />
          {uploading ? "Adding…" : "Upload"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,audio/*"
          className="hidden"
          onChange={(e) => {
            void upload(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3.5 py-3">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void upload(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-dashed px-3 py-5 text-center transition ${
            dragOver
              ? "border-violet-400/70 bg-violet-500/10"
              : "border-white/12 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]"
          }`}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-zinc-400">
            <IconUpload width={15} height={15} />
          </span>
          <p className="text-[11px] font-medium text-zinc-300">Drop images or audio</p>
          <p className="text-[10px] leading-relaxed text-zinc-600">
            Images get a slow Ken Burns push. Audio is placed at 0:00 as a music bed.
          </p>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full ${
                recording ? "recording-dot bg-red-500/20 text-red-300" : "bg-white/[0.06] text-zinc-300"
              }`}
            >
              <IconMic width={14} height={14} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-zinc-200">Voiceover</p>
              <p className="font-mono text-[10px] text-zinc-500">
                {recording ? `● ${elapsed.toFixed(1)}s` : "Record straight into the timeline"}
              </p>
            </div>
            {recording ? (
              <Button size="sm" variant="danger" onClick={() => void stopRecording()} disabled={saving}>
                Stop
              </Button>
            ) : (
              <Button size="sm" variant="soft" onClick={() => void startRecording()}>
                Record
              </Button>
            )}
          </div>
          {recording ? (
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full animate-pulse rounded-full bg-red-400" style={{ width: "100%" }} />
            </div>
          ) : null}
        </div>

        <SectionHeader title={`Images · ${images.length}`} />
        {images.length ? (
          <div className="grid grid-cols-3 gap-1.5">
            {images.map((m) => (
              <div key={m.id} className="group relative aspect-square overflow-hidden rounded-lg ring-1 ring-white/10">
                <button
                  onClick={() => void addFromLibrary(m)}
                  className="block h-full w-full"
                  title="Add to timeline"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.url} alt={m.name} className="h-full w-full object-cover transition group-hover:scale-105" />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent py-1 text-[9px] font-medium text-white opacity-0 transition group-hover:opacity-100">
                    + Add to timeline
                  </span>
                </button>
                <button
                  onClick={async () => {
                    await deleteMediaItem(m.id);
                    removeMedia(m.id);
                    toast("Removed from library", m.name);
                  }}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded bg-black/55 text-zinc-300 opacity-0 transition hover:text-red-300 group-hover:opacity-100"
                  title="Delete from library"
                >
                  <IconTrash width={11} height={11} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyHint>Upload a photo and it becomes a full-frame scene with a slow zoom.</EmptyHint>
        )}

        <SectionHeader title={`Audio · ${audio.length}`} />
        {audio.length ? (
          <div className="space-y-1.5">
            {audio.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-ink-900/60 px-2 py-1.5"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded bg-emerald-500/15 text-emerald-300">
                  <IconMusic width={12} height={12} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="clip-text text-[11px] text-zinc-200">{m.name}</p>
                  <p className="text-[9.5px] text-zinc-600">audio</p>
                </div>
                <button
                  onClick={() => void audioEngine.preview(m.url, 0.7)}
                  className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:bg-white/10 hover:text-white"
                  title="Preview"
                >
                  <IconAudio width={12} height={12} />
                </button>
                <button
                  onClick={() => void addFromLibrary(m)}
                  className="rounded bg-white/[0.06] px-2 py-1 text-[9.5px] text-zinc-300 hover:bg-white/[0.12]"
                >
                  Add
                </button>
                <button
                  onClick={async () => {
                    await deleteMediaItem(m.id);
                    removeMedia(m.id);
                    toast("Removed from library", m.name);
                  }}
                  className="flex h-6 w-6 items-center justify-center rounded text-zinc-600 hover:bg-red-500/15 hover:text-red-300"
                  title="Delete from library"
                >
                  <IconTrash width={11} height={11} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyHint>Add a music bed — it is mixed into the exported video automatically.</EmptyHint>
        )}
      </div>
    </div>
  );
}
