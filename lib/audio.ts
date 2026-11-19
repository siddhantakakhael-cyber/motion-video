import { loadAudioBuffer } from "./media";
import type { Layer, Project } from "./types";

class AudioEngine {
  private ctx: AudioContext | null = null;
  private sources: AudioBufferSourceNode[] = [];
  private previewSources: AudioBufferSourceNode[] = [];
  private gain: GainNode | null = null;

  context(): AudioContext {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
    }
    return this.ctx;
  }

  async resume() {
    const ctx = this.context();
    if (ctx.state === "suspended") await ctx.resume();
    return ctx;
  }

  async play(project: Project, fromTime: number) {
    this.stop();
    const audioLayers = project.layers.filter(
      (l) => l.type === "audio" && l.audioUrl && !l.hidden
    );
    if (!audioLayers.length) return;
    const ctx = await this.resume();
    const master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
    this.gain = master;

    for (const layer of audioLayers) {
      const buffer = await loadAudioBuffer(ctx, layer.audioUrl!);
      if (!buffer) continue;
      const layerEnd = layer.start + layer.duration;
      if (fromTime >= layerEnd) continue;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const g = ctx.createGain();
      g.gain.value = layer.volume ?? 0.7;
      src.connect(g).connect(master);
      const offset = Math.max(0, fromTime - layer.start);
      const duration = Math.min(buffer.duration - offset, layerEnd - Math.max(fromTime, layer.start));
      if (duration <= 0.02) continue;
      src.start(ctx.currentTime + 0.02, offset, duration);
      this.sources.push(src);
    }
  }

  stop() {
    for (const src of this.sources) {
      try {
        src.stop();
      } catch {
        /* already stopped */
      }
    }
    this.sources = [];
    for (const src of this.previewSources) {
      try {
        src.stop();
      } catch {
        /* already stopped */
      }
    }
    this.previewSources = [];
    if (this.gain) {
      try {
        this.gain.disconnect();
      } catch {
        /* noop */
      }
      this.gain = null;
    }
  }

  /** Preview a single audio asset (used by the inspector and media bin). */
  async preview(url: string | undefined, volume = 0.8) {
    if (!url) return;
    const ctx = await this.resume();
    const buffer = await loadAudioBuffer(ctx, url);
    if (!buffer) return;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const g = ctx.createGain();
    g.gain.value = volume;
    src.connect(g).connect(ctx.destination);
    src.start();
    this.previewSources.push(src);
  }
}

export const audioEngine = new AudioEngine();
