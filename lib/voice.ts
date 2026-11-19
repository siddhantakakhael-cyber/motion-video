export interface VoiceRecording {
  blob: Blob;
  url: string;
  duration: number;
}

export class VoiceRecorder {
  private recorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private stream: MediaStream | null = null;
  private startedAt = 0;
  private resolveStop: ((r: VoiceRecording) => void) | null = null;
  private rejectStop: ((e: Error) => void) | null = null;

  get active() {
    return this.recorder?.state === "recording";
  }

  async start() {
    if (this.active) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Microphone capture is not supported in this browser.");
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    this.stream = stream;
    this.chunks = [];
    const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((m) =>
      typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)
    );
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    this.recorder = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(this.chunks, { type: mime ?? "audio/webm" });
      const duration = Math.max(0.2, (performance.now() - this.startedAt) / 1000);
      this.cleanup();
      this.resolveStop?.({ blob, url: URL.createObjectURL(blob), duration });
      this.resolveStop = null;
      this.rejectStop = null;
    };
    this.startedAt = performance.now();
    recorder.start(200);
  }

  stop(): Promise<VoiceRecording> {
    if (!this.recorder || this.recorder.state === "inactive") {
      return Promise.reject(new Error("No recording in progress"));
    }
    return new Promise((resolve, reject) => {
      this.resolveStop = resolve;
      this.rejectStop = reject;
      this.recorder?.stop();
    });
  }

  cancel() {
    if (this.recorder && this.recorder.state !== "inactive") {
      this.rejectStop?.(new Error("Recording cancelled"));
      this.recorder.stop();
      // onstop fires and resolves with data; discard it
      this.resolveStop = null;
      this.rejectStop = null;
    }
    this.cleanup();
  }

  private cleanup() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.recorder = null;
  }
}

/** Quick lookup so the UI can use the recorder without an import cycle. */
export const voiceRecorder = new VoiceRecorder();
