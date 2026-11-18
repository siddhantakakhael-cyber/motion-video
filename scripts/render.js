// Render a project JSON to an MP4 without the web UI.
//   node scripts/render.js --project examples/sample-reel.json --out out/reel.mp4
//   node scripts/render.js --preset design --out out/reel.mp4
//   node scripts/render.js --preset chai --still --t 4 --out out/poster.png

import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { normalizeProject, projectFromPreset, PRESETS } from '../src/project.js';
import { renderProject, renderFramePNG } from '../src/render.js';

const args = process.argv.slice(2);
const get = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const out = resolve(get('--out', 'out/reel.mp4'));
mkdirSync(dirname(out), { recursive: true });

let raw = {};
const projectFile = get('--project', null);
if (projectFile) raw = JSON.parse(readFileSync(resolve(projectFile), 'utf8'));
else if (args.includes('--preset')) raw = projectFromPreset(get('--preset', PRESETS[0].id));
else raw = projectFromPreset(PRESETS[0].id);
const P = normalizeProject(raw);

if (args.includes('--still')) {
  const t = Number(get('--t', P.intro + P.sceneDuration * 0.6)) || 0;
  const png = renderFramePNG(P, t);
  const { writeFileSync } = await import('node:fs');
  writeFileSync(out, png);
  console.log(`Still written: ${out} (t=${t.toFixed(2)}s, ${P.w}×${P.h})`);
} else {
  console.log(`Rendering ${P.scenes.length + 2} shots · ${P.duration.toFixed(1)}s · ${P.w}×${P.h} @ ${P.fps}fps · style=${P.style}`);
  const started = Date.now();
  let last = -1;
  const info = await renderProject(P, {
    outPath: out,
    onProgress: (p, msg) => {
      const pct = Math.round(p * 100);
      if (pct !== last && pct % 10 === 0) { console.log(`  ${pct}%  ${msg}`); last = pct; }
    },
  });
  console.log(`Done: ${out}  (${info.frames} frames in ${((Date.now() - started) / 1000).toFixed(1)}s)`);
}
