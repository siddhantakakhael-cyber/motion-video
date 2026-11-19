# Rahasya Sutra Studio — working notes

Before designing, generating or animating anything, read MOTION.md in full.

Every colour, font, timing and motion value comes from that file.

The file sets the look, not the ambition. When I say go all out, go all out.

If something I ask for is not covered there, ask me rather than choosing for yourself.

When you have finished, check your own frames against MOTION.md, fix what fails, and only then show me.

---

## Build

- `npm run voice -- videos/<slug>` — Hindi narration (eSpeak-NG, offline) + score + `timing.js`
- `npm run render -- videos/<slug>` — headless Chromium frames → H.264/AAC MP4
- `npm run poster -- videos/<slug> <seconds> <out.png>`
- Brand kit: `brand/kit.css` + `brand/kit.js` (tokens, mandala, chakra, camera shake, parallax, type entrances). Every video links both.
- Skills live in `.claude/skills/` (charlie947/motion-graphics-skills, MIT). Read `brand-intake` → `motion-brief-writer` → `launch-video`/`loop-cover` → `reel-export`.
