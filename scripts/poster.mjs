import path from "node:path";
import { mkdirSync } from "node:fs";
import { launch } from "./lib/browser.mjs";
import { serve } from "./lib/server.mjs";

/** Grab one still from a video folder — used for README art and thumbnails. */
const dir = process.argv[2];
const at = Number(process.argv[3] ?? 3);
const out = process.argv[4] ?? path.join(dir, "out", "poster.png");
if (!dir) {
  console.error("usage: node scripts/poster.mjs videos/<slug> [seconds] [out.png]");
  process.exit(1);
}
mkdirSync(path.dirname(out), { recursive: true });

const server = await serve(process.cwd());
const browser = await launch({ width: 1080, height: 1920 });
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.port}/${dir}/index.html`, { waitUntil: "networkidle0" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => window.TIMING && typeof window.seek === "function");
  await page.evaluate(async () => {
    if (window.READY) await window.READY;
  });
  await page.evaluate((t) => window.seek(t), at);
  await page.screenshot({ path: out, type: "png" });
  console.log(`poster: ${out} @ ${at}s`);
} finally {
  await browser.close();
  await server.close();
}
