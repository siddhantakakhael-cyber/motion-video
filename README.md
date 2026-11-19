# Motion graphics studio

Every frame is code. A video in this repo is one HTML file that exposes `window.seek(seconds)`;
headless Chromium draws each frame, ffmpeg encodes them, and the narration is synthesised on the
machine. No After Effects, no timeline editor, no render service.

![Barbarik reveal](docs/poster.jpg)

▶ **Watch:** [`videos/barbarik/out/barbarik-reel.mp4`](videos/barbarik/out/barbarik-reel.mp4)
— 1080 × 1920, 30 fps, 56.8 s, Hindi voiceover, 13 MB.

## The videos

| Video | Length | Size | What it is |
| --- | --- | --- | --- |
| [`barbarik`](videos/barbarik) | 56.8 s | 1080×1920 | Skanda Purana retelling: the real winner of the Mahabharat was not Arjuna. |

## The skills

The workflow comes from [charlie947/motion-graphics-skills](https://github.com/charlie947/motion-graphics-skills)
(MIT), installed in [`.claude/skills/`](.claude/skills) — 15 skills for launch films, reels,
animated charts, title sequences, brand intake and reel exports. `brand.md` and `MOTION.md` are the
two files those skills ask for first, written for this channel.

Read order for a new video: `brand-intake` → `motion-brief-writer` → `launch-video` or `loop-cover`
→ `reel-export`.

## Repository layout

```
.claude/skills/          the skill pack (15 skills + references)
brand.md                 palette, type, voice, sign-off
MOTION.md                the animation contract: timing, camera, texture, sound
assets/fonts/            Noto Sans Devanagari + Inter (woff2, self-hosted)
scripts/voice.mjs        narration (eSpeak-NG) + score + timing.js
scripts/render.mjs       frames → H.264/AAC MP4
scripts/poster.mjs       one still from any second
videos/<slug>/
  index.html             the whole animation, as window.seek(t)
  script.json            narration text and voice settings
  script.md              beat sheet, timings, sources
  video.json             size, fps, audio path, output path
  media/                 stills
  audio/narration.wav    generated, mixed, ready for the mux
  out/                   the MP4
```

## Build a video

```bash
npm install

# 1. narration + score + timings (writes audio/narration.wav and timing.js)
npm run voice -- videos/barbarik

# 2. frames → MP4
npm run render -- videos/barbarik

# 3. a still, for thumbnails and README art
npm run poster -- videos/barbarik 49 docs/poster.jpg
```

`npm run build` does voice + render in one go.

### What you need

Node 20+, and nothing else that is not in `package.json`:

- **Chromium** comes from `@sparticuz/chromium` and is unpacked into `.cache/` on first run.
- **ffmpeg** comes from `@ffmpeg-installer/ffmpeg` (static build, includes libx264 and AAC).
- **Voice** comes from `espeak-ng` compiled to WebAssembly — Hindi included, no API key, offline.

Render speed is about 0.7 s per frame on a shared CPU, so a 57-second 30 fps reel takes ~19 minutes.
Cut `fps` in `video.json` or lower `crf`/`maxrate` for drafts.

## Adding a video

1. Copy `videos/barbarik` to `videos/<slug>`.
2. Replace `script.json` (narration, one entry per scene) and `media/`.
3. Write `index.html`: keep the `window.seek(t)` contract, read `window.TIMING` for starts, hold
   type inside y 360–1420.
4. `npm run voice -- videos/<slug> && npm run render -- videos/<slug>`.

The encoder rejects nothing by accident: `render.mjs` prints the final stream listing so you can
check `h264`, `yuv420p`, `bt709` and the AAC track before uploading.

## Licence

Code MIT. Fonts: Noto Sans Devanagari and Inter (SIL OFL). Skills: MIT, © Charlie Hills.
Imagery generated for this project.
