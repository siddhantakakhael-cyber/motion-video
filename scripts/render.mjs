import { mkdirSync, readFileSync } from "node:fs";
import { once } from "node:events";
import path from "node:path";
import { spawn } from "node:child_process";
import ffmpeg from "@ffmpeg-installer/ffmpeg";
import { launch } from "./lib/browser.mjs";
import { serve } from "./lib/server.mjs";

/**
 * Render a video folder: drive window.seek(t) frame by frame, pipe the JPEGs
 * straight into ffmpeg, mux the narration, write an H.264/AAC MP4 with bt709
 * tags (the encode reel-export asks for).
 */
const dir = process.argv[2];
if (!dir) {
  console.error("usage: node scripts/render.mjs videos/<slug>");
  process.exit(1);
}

const cfg = JSON.parse(readFileSync(path.join(dir, "video.json"), "utf8"));
const { width, height, fps = 30 } = cfg;
const out = path.join(dir, cfg.out);
mkdirSync(path.dirname(out), { recursive: true });

const server = await serve(process.cwd());
const browser = await launch({ width, height });

try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.error("page error:", e.message.slice(0, 200)));
  page.on("console", (m) => {
    if (m.type() === "error") console.error("console:", m.text().slice(0, 200));
  });
  await page.goto(`http://127.0.0.1:${server.port}/${dir}/index.html`, { waitUntil: "networkidle0" });
  await page.evaluate(() => document.fonts.ready);
  const ready = await page
    .waitForFunction(() => window.TIMING && typeof window.seek === "function", { timeout: 15000 })
    .then(() => true)
    .catch(() => false);
  if (!ready) throw new Error("index.html never exposed window.TIMING / window.seek");
  await page.evaluate(async () => {
    if (window.READY) await window.READY;
  });

  const duration = await page.evaluate(() => window.TIMING.duration);
  const frames = Math.round(duration * fps);
  console.log(`render: ${dir} · ${width}x${height} · ${fps}fps · ${duration.toFixed(2)}s · ${frames} frames`);

  const audio = path.join(dir, cfg.audio);
  const proc = spawn(ffmpeg.path, [
    "-y",
    "-f", "image2pipe",
    "-vcodec", "mjpeg",
    "-framerate", String(fps),
    "-i", "pipe:0",
    "-i", audio,
    "-c:v", "libx264",
    "-preset", "slow",
    "-crf", String(cfg.crf ?? 22),
    "-maxrate", cfg.maxrate ?? "9M",
    "-bufsize", "16M",
    "-profile:v", "high",
    "-pix_fmt", "yuv420p",
    "-color_range", "tv",
    "-colorspace", "bt709",
    "-color_primaries", "bt709",
    "-color_trc", "bt709",
    "-c:a", "aac",
    "-b:a", "192k",
    "-ar", "48000",
    "-ac", "2",
    "-shortest",
    "-movflags", "+faststart",
    out,
  ]);
  let log = "";
  proc.stderr.on("data", (d) => {
    log = (log + d.toString()).slice(-4000);
  });
  const finished = new Promise((resolve, reject) => {
    proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}\n${log.slice(-1200)}`))));
  });

  const started = Date.now();
  for (let i = 0; i < frames; i++) {
    const t = i / fps;
    await page.evaluate((time) => window.seek(time), t);
    const shot = await page.screenshot({ type: "jpeg", quality: 95, optimizeForSpeed: true });
    if (!proc.stdin.write(Buffer.from(shot))) await once(proc.stdin, "drain");
    if (i % 90 === 0 || i === frames - 1) {
      const pct = Math.round(((i + 1) / frames) * 100);
      process.stdout.write(`\r  ${pct}% · frame ${i + 1}/${frames} · ${((Date.now() - started) / 1000).toFixed(1)}s`);
    }
  }
  proc.stdin.end();
  await finished;
  process.stdout.write("\n");

  const probe = spawn(ffmpeg.path, ["-hide_banner", "-i", out]);
  let info = "";
  probe.stderr.on("data", (d) => (info += d.toString()));
  await new Promise((r) => probe.on("close", r));
  const streams = info
    .split("\n")
    .filter((l) => /Stream #|Duration:/.test(l))
    .map((l) => l.replace(/^\s+/, ""))
    .join("\n");
  console.log(`done: ${out}\n${streams}`);
} finally {
  await browser.close();
  await server.close();
}
