import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import zlib from "node:zlib";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

const require = createRequire(import.meta.url);
const CACHE = path.resolve(".cache/chromium-libs");

/** The prebuilt Chromium needs its Amazon Linux shared libraries; unpack once. */
function ensureLibs() {
  if (existsSync(path.join(CACHE, "lib"))) return;
  const pkgRoot = path.dirname(require.resolve("@sparticuz/chromium/package.json"));
  const brotli = readFileSync(path.join(pkgRoot, "bin/al2023.tar.br"));
  const tar = path.join(CACHE, "al2023.tar");
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(tar, zlib.brotliDecompressSync(brotli));
  execFileSync("tar", ["xf", tar, "-C", CACHE]);
}

export async function launch({ width = 1080, height = 1920, scale = 1 } = {}) {
  ensureLibs();
  process.env.LD_LIBRARY_PATH = `${path.join(CACHE, "lib")}:${process.env.LD_LIBRARY_PATH ?? ""}`;
  const executablePath = await chromium.executablePath();
  const browser = await puppeteer.launch({
    executablePath,
    headless: "shell",
    args: [
      ...chromium.args,
      "--no-sandbox",
      "--hide-scrollbars",
      "--font-render-hinting=none",
      "--force-color-profile=srgb",
      "--disable-lcd-text",
      "--allow-file-access-from-files",
    ],
    defaultViewport: { width, height, deviceScaleFactor: scale },
  });
  return browser;
}
