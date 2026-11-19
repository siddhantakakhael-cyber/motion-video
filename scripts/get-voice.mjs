import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";

/**
 * Fetch a Piper Hindi voice into videos/<slug>/voices/.
 *
 *   node scripts/get-voice.mjs videos/barbarik-vox hi_IN-pratham-medium
 *
 * Piper's own downloader pulls from HuggingFace; this pulls the same .onnx +
 * .onnx.json from a GitHub mirror instead (model files committed as plain
 * blobs), so a machine that can reach GitHub but not HF still gets a voice.
 * Voices are ~61 MB each and git-ignored — never commit them.
 */
const [dir, voiceArg] = process.argv.slice(2);
if (!dir || !voiceArg) {
  console.error("usage: node scripts/get-voice.mjs videos/<slug> <voice-name>");
  console.error("  voices: hi_IN-pratham-medium · hi_IN-rohan-medium · hi_IN-priyamvada-medium");
  process.exit(1);
}

const voice = voiceArg.replace(/\.onnx(\.json)?$/, "");
const names = [`${voice}.onnx`, `${voice}.onnx.json`];
const tmp = path.join(dir, ".voice-tmp");
const dest = path.join(dir, "voices");
const already = names.every((n) => existsSync(path.join(dest, n)));

if (already) {
  console.log(`voice: ${voice} already in ${dest}`);
  process.exit(0);
}

mkdirSync(dest, { recursive: true });
rmSync(tmp, { recursive: true, force: true });
console.log(`voice: fetching ${voice} …`);
execFileSync(
  "git",
  [
    "clone",
    "--depth",
    "1",
    "--filter=blob:none",
    "--no-checkout",
    "https://github.com/anmol-shrivastav/tts-hindi",
    tmp,
  ],
  { stdio: "inherit" }
);
execFileSync("git", ["-C", tmp, "sparse-checkout", "init", "--cone"], { stdio: "inherit" });
execFileSync("git", ["-C", tmp, "sparse-checkout", "set", "models"], { stdio: "inherit" });
execFileSync("git", ["-C", tmp, "checkout"], { stdio: "inherit" });

for (const name of names) {
  const from = path.join(tmp, "models", name);
  if (!existsSync(from)) throw new Error(`missing ${name} in the mirror`);
  cpSync(from, path.join(dest, name));
}
rmSync(tmp, { recursive: true, force: true });
console.log(`voice: ${voice} → ${dest}`);
