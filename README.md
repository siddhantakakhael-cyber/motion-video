# Motion Reels · Instagram videos made in code

Write a script, pick a film style, and export a **9:16 MP4 for Instagram Reels** — every frame is drawn in code with a 2D canvas, then encoded with ffmpeg and a synthesised soundtrack. No video model, no stock footage, no external API keys.

Built with the [lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar) idea as inspiration: *a film style is a drawing program plus a set of invariants*. This repository is a fresh, browser-first implementation for short vertical social videos — it does not copy that project's demo films, style prompts or assets.

**Featured build:** a complete **58-second Hindi Reel, “कर्ण का छिपा श्राप”** — 5 shots with exact 0/7/20/35/48/58 timings, now in a **full bright Cartoon Epic style** with drawn characters, faces, scenery, comic bursts, the sinking chariot wheel, spilled ghee, Bhūdevī and the final arrow. Hindi voiceover in two voices and SFX stay synced to 0:00 / 0:28 / 0:42 / 0:50. See `public/samples/karna-reel.mp4` and the [Karna section](#the-karna-reel-58s).

---

## Quick start

```bash
sh run.sh          # easiest: installs deps if missing, then starts the server
# or
npm install && npm start
```

Open the live preview (port **3000**). The server prints `Motion Reels studio → http://0.0.0.0:3000`. In Arena, use the **Live Preview** panel — don't type `localhost:3000` in your own browser; the preview host proxies the same server and the app uses relative URLs.

To rebuild the featured 58s film: `npm run karna`.

**All files in one place:** open `/downloads.html` on the same preview host (or the **↓ Downloads** link in the studio header) — every sample MP4, the Karna poster/audio and the editable JSON have direct download buttons there.

> Node 20+ is required. `npm install` installs a static ffmpeg binary via `@ffmpeg-installer/ffmpeg`; nothing else is downloaded while you render.

### हिंदी में छोटा सारांश

1. `sh run.sh` चलाएँ (या `npm install && npm start`)। Arena के **Live Preview** में app खुलेगा — अपने browser में `localhost:3000` न लिखें।
2. ऊपर कोई **preset** चुनें (जैसे *Chai Startup (हिंदी)*) या अपना script लिखें।
3. Script में **हर लाइन = एक shot**: `हेडिंग | छोटा डिटेल`।
4. Style, रंग, 9:16 / 4:5 / 1:1 canvas और shot length चुनें।
5. **Export MP4 for Instagram** दबाएँ → MP4 डाउनलोड करें। Reels के लिए 1080 × 1920, पहले 1 सेकंड में हुक।

---

## What you can do

| | |
|---|---|
| **8 film styles** | Swiss Grid, Neon Tubes, Dark Keynote, Blueprint, Riso Print, Caption Cuts, Mythic Epic, **Cartoon Epic** |
| **Script → shot list** | One line per shot, `Heading | Detail | visualCue`; intro/end card are generated automatically (and can be set to zero length) |
| **Variable timings** | `sceneDurations: [7,13,15,13,10]` for a 58-second story, or the equal-shots slider |
| **Live preview** | The *same* `drawFrame()` used by the exporter, with play/pause, scrubbing and a shot timeline |
| **Instagram formats** | 1080×1920 (Reel HD), 720×1280 (fast), 1080×1350 (4:5 feed), 1080×1080 (square) |
| **Safe zones** | Toggle an overlay showing the top/bottom UI areas to keep clear |
| **Procedural score + SFX** | Kick, hat, bass, pad, whooshes, sub-drop, earth-crush, thunder and arrow — all written straight into PCM |
| **Voiceover mixing** | Pre-rendered WAV clips are tempo-fitted to each shot and mixed under the score (`scripts/render-karna.js`) |
| **Deterministic export** | Frame-by-frame RGBA → `libx264` H.264 + AAC, `yuv420p`, `+faststart`, 30 fps |
| **Cover frame** | Download any previewed frame as a PNG poster |
| **Hindi + English** | Devanagari text uses a bundled Noto Sans Devanagari; UI hints are bilingual |
| **CLI** | Render any project JSON without opening the browser |

---

## Using the studio

1. **Content** — pick a preset or type a title, handle and script. Each non-empty line becomes one shot; `|` splits the big line from the small caption.
2. **Look** — choose one of the eight styles and a signal colour. Switching style loads that style's default accent; you can override it.
3. **Format & motion** — canvas, equal shot length (1.8–4.0 s), tempo (80–150 BPM), soundtrack, and an optional **Shot lengths** field (`7, 13, 15, 13, 10`) for exact story pacing.
4. **Preview** — play, scrub, click a shot chip to jump, toggle safe zones, or shuffle style/colour/tempo.
5. **Export** — press **Export MP4 for Instagram**. The server renders asynchronously; the UI polls progress, then shows a playable MP4 and a download button.

A 5-shot Reel is ~16.7 s (501 frames at 1080×1920) and renders in a few seconds on this machine.

---

## Command line

```bash
# render a project JSON
node scripts/render.js --project examples/sample-reel.json --out out/reel.mp4

# render a built-in preset
node scripts/render.js --preset chai --out out/chai.mp4

# a PNG cover frame at t = 7s
node scripts/render.js --preset design --still --t 7 --out out/cover.png

# regenerate the bundled sample
npm run sample

# regenerate all four ready-to-upload sample Reels
npm run samples

# rebuild the 58s Karna film (voiceover + score + SFX + video)
npm run karna
```

Five MP4s are already included in `public/samples/`: the Karna curse film, Swiss design rules, a Hindi neon chai story, a dark product launch and caption-cut hooks.

`examples/sample-reel.json` and `examples/hindi-chai-reel.json` are ready to edit.

---

## The Karna Reel (58s)

`examples/karna-reel.json` is the supplied brief turned into a project:

| Shot | Window | Visual cue | Voice |
|---|---|---|---|
| 1 Hook | 0:00–0:07 | `wheel` · bright sky, Karna, golden chariot wheel sinking, comic dust | deep narrator |
| 2 Backstory | 0:07–0:20 | `ghee` · bright village backdrop, crying girl, spilled ghee, broken pot | narrator |
| 3 Twist | 0:20–0:35 | `squeeze` · Karna squeezing soil, golden ghee drops back into the pot, comic bursts | narrator |
| 4 Curse | 0:35–0:48 | `curse` · full-colour Bhūdevī rising, angry face, comic curse burst | narrator + **Bhūdevī voice** |
| 5 Climax | 0:48–0:58 | `arrow` · Karna with sunken wheel, visible arrow streak, final cut to black | narrator |

Implementation notes:

* `intro: 0` and `outro: 0` remove the generated title/end cards, so the five windows start exactly at `0, 7, 20, 35, 48` and end at `58`.
* Each scene carries a `visual` cue. `src/renderer.js` → `cartoon()` switches drawing programs on it; a hard `\n` in the hook heading drives the two-beat comic reveal, and every shot has a fully drawn foreground and background.
* The score is ducked to 30% under the voice. Seven Hindi WAV clips in `assets/voice/` are placed at `0.35, 7.35, 20.35, 23.65, 35.35, 39.6, 48.35`; four are lightly `atempo`-fitted so they never spill into the next shot (see the printed `end` times from `npm run karna`).
* `scripts/render-karna.js` mixes voice + `scorePCM()` + `addSfx()` into `karna-audio.wav`, then calls the normal `renderProject()` with `audioWav` so the video and audio share one timeline. SFX: sub-drop/creak at `0:00`, earth-crush at `0:28`, thunder + glitch at `0:42`, arrow at `0:50`.
* Output: `public/samples/karna-reel.mp4` (58.03s, 1080×1920, H.264 + AAC), `karna-poster.png` (44s), and the standalone `karna-audio.wav`.
* One short clause in the third voiceover line is worded gently (“घर जाने का डर था”) because the exact phrasing was blocked by speech content moderation; the on-screen story text and the rest of the voiceover follow the supplied brief.

To edit the story, change `examples/karna-reel.json` and run `npm run karna`. To use the same look for a different story, pick **Cartoon Epic** in the studio (or the **कर्ण का श्राप · Cartoon** preset) and set your own shot lengths.

---

## HTTP API

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Engine status, ffmpeg version, style/preset counts |
| `POST` | `/api/export` | Body = project JSON → `{id, status, filename}`; starts a background render |
| `GET` | `/api/export/:id` | `{status, progress, message, downloadUrl, filename}` |
| `GET` | `/download/:id` | The finished MP4 (byte-range friendly, inline for `<video>`) |
| `POST` | `/api/still` | `{project, t, w?, h?}` → a PNG frame |

Example:

```bash
curl -s -X POST localhost:3000/api/export \
  -H 'content-type: application/json' \
  -d '{"title":"HELLO","script":"One idea | One frame","style":"neon","size":"reel-fast"}'
```

---

## How it works

```
script / presets ──► src/project.js      (validation, shot windows, timeline)
                         │
browser preview ────────┼──► src/renderer.js  drawFrame(g, W, H, t, project)
Node export ────────────┘        ▲
                                 │ helpers: src/lib.js (easing, colour, fitted type)
                    src/score.js │ procedural PCM → WAV
                                 ▼
                    src/render.js  createCanvas → raw RGBA frames → ffmpeg → MP4
```

* **One renderer, two runtimes.** `src/renderer.js` has no DOM or Node APIs; it only uses the 2D canvas context. The browser imports it directly, and Node imports the same file with `@napi-rs/canvas`. That makes the preview and the MP4 frame-for-frame identical.
* **Deterministic frames.** Every style draws from `t` with seeded randomness and easing curves. Nothing depends on wall-clock time, so re-rendering the same project produces the same video.
* **Fitted typography.** `drawFitted()` wraps and shrinks text to fit any aspect ratio, and clip-reveals each line from below — the "print press" entrance shared by several styles.
* **Audio.** `scorePCM()` generates a mono 44.1 kHz buffer; `pcmToWav()` works both as a Web Audio source and as an ffmpeg input. ffmpeg muxes it to AAC and normalises the output with `-shortest`.
* **Fonts.** TTFs are bundled in `public/fonts/` and registered with the same family names in both runtimes, so measurements never drift between preview and export. See `public/fonts/CREDITS.md`.

### Style notes

| Style | Grammar |
|---|---|
| Swiss Grid | 12-column grid, paper/ink/one signal colour, giant numerals, clip reveals, one off-grid exception |
| Neon Tubes | Glowing tube lettering, flicker on beats, rain, wet asphalt, chasing border |
| Dark Keynote | Radial gradients, dot grid, spec card, progress bar, gentle push-in |
| Blueprint | Drafting grid, dimension lines that draw themselves, outline type, mono annotations |
| Riso Print | Two-ink multiply overprint, halftone dots, grain, deliberate misregistration |
| Caption Cuts | Hard-cut word bands, no fades, kinetic strip, lower-third caption |

---

## Repository layout

```
server.js                 static studio + render API
src/project.js            project model, presets, variable timeline
src/lib.js                easing, colour, fitted text helpers
src/renderer.js           eight style drawing programs (incl. cartoon)
src/score.js              procedural score, SFX + WAV writer
src/render.js             Node canvas → ffmpeg pipeline (accepts a mixed WAV)
public/                   index.html, CSS, app.js, fonts, 5 sample MP4s
scripts/render.js         generic CLI renderer
scripts/render-karna.js   voice + score + SFX mix → Karna MP4
examples/                 project JSON examples (incl. karna-reel.json)
assets/voice/             six generated Hindi voiceover WAVs
```

---

## Credits & licences

* Inspiration: [lemomo-ai/lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar) — *99 film styles made in code*. Its code is MIT; its guides are CC BY-NC 4.0; demo films/stills are CC BY 4.0. This project borrows the **concept** (styles as deterministic drawing programs) only.
* Rendering: [`@napi-rs/canvas`](https://www.npmjs.com/package/@napi-rs/canvas), [`@ffmpeg-installer/ffmpeg`](https://www.npmjs.com/package/@ffmpeg-installer/ffmpeg).
* Fonts: Inter, Noto Sans Devanagari (SIL OFL 1.1), DejaVu Sans Mono (DejaVu / Bitstream Vera). Details in `public/fonts/CREDITS.md`.
* Hindi voiceover: generated locally as WAV with two selected voices (narrator + Bhūdevī); no external TTS service is called at render time.
* Everything else in this repository — app, styles, score, SFX, drawings and sample reels — is original code. The videos you export are yours to use. The Mahābhārata story text is traditional/public-domain material retold here.

---

## Instagram checklist

- Reels: **1080 × 1920**, 9:16, H.264 + AAC, ≤ 60 s (short presets are 8–25 s; the Karna story is 58 s).
- Hook in the first second; keep important text out of the bottom ~18% (caption/buttons area).
- Use the **Safe zones** toggle while writing the script.
- Export with the soundtrack on for a ready-to-upload file, or off if you plan to add a licensed track in the Instagram editor.
