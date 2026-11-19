# Motion Studio

![Motion Studio editor](docs/screenshot.png)

**Live demo:** https://siddhantakakhael-cyber.github.io/motion-video/

A motion-graphics video editor that runs entirely in the browser. Paste a script, get an
animated storyboard, fine-tune every layer on a real timeline, then record a finished MP4/WebM —
no uploads, no render server, no account.

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
```

Built with Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS and Zustand. Video is
rendered with Canvas 2D and captured with `MediaRecorder`; audio is mixed with the Web Audio API;
media and projects stay on-device in IndexedDB + localStorage.

---

## What it does

**AI Director (on-device).** Paste a script and pick a style — *Bold*, *Cinematic*, *News* or
*Neon*. The director splits the copy into caption-sized scenes, lays out the safe areas, adds a
title card, scene counter and end CTA, and puts everything on the timeline as ordinary, editable
layers. Replacing the timeline is undoable.

**AI voiceover + auto cuts.** With *AI voiceover* on, every scene is spoken by an on-device speech
engine (meSpeak/eSpeak — no API key, no network, works offline). The generated audio is measured
line by line, so scene lengths and cut points come from the real narration instead of a word-count
guess: each caption appears exactly as its line starts. The voice lands on the timeline as a normal
audio layer you can trim, move or mute, and the whole mix is baked into the export.

**Timeline.** One track per layer, top = front. Drag clips to move (with snapping to clip edges,
the playhead and the project end), drag edges to trim, and double-click to jump. Hide, lock,
duplicate, reorder or delete from the layer heads. Zoom with the toolbar or ⌘/Ctrl + scroll.

**Keyframes.** Put the playhead inside a clip and hit *At playhead* to capture a keyframe of
position, scale, rotation and opacity. Add a second one and the layer interpolates between them
with eased curves; preset in/out animations (fade, slide, pop, zoom) layer on top.

**Inspector.** Transform, timing, animation presets, typography (five canvas fonts, size, weight,
line height, tracking, alignment, colour, highlight pills, uppercase), images (cover/contain,
radius, exact box), shapes (rect, ellipse, triangle, line, gradient-glow fills) and audio volume.

**Media.** Drop images or audio. Images become full-bleed scenes with a slow Ken Burns push; audio
lands at 0:00 as a music bed. You can also record a voiceover straight from the microphone and it
appears at the playhead. Everything is stored in IndexedDB, so reloads keep your library.

**Canvas.** 9:16, 16:9, 1:1 and 4:5 (existing layers are repositioned and type is rescaled when you
switch), 24–60 fps, solid/gradient/mesh backgrounds, six background presets and a full colour
picker.

**Export.** Frames are drawn at the project's resolution, audio layers are mixed in, and the whole
thing is recorded in real time at up to 18 Mbps. Pick a container in the export dialog: MP4
(H.264 + AAC where the browser has it, otherwise VP9/Opus in an MP4 wrapper) or WebM
(VP9/VP8 + Opus). The dialog shows the exact codec pair before you render, and the file downloads
straight to your machine.

**Captions.** Caption layers double as subtitles: the export dialog downloads them as
`.srt` or `.vtt`, timed to the same cuts the video uses (and they are burned in already).

**Editing niceties.** 60-step undo/redo, debounced autosave with a saved indicator, project menu
(new blank canvas, demo storyboard, clear timeline), keyboard shortcuts and a first-run demo reel.

---

## Project layout

```
app/                 Next.js app shell, global styles, favicon
components/          Studio shell, TopBar, Preview, Timeline, Inspector, AI + Media panels,
                     export modal, toasts, shared UI primitives and icons
lib/types.ts         Layer / Project / media types and presets
lib/anim.ts          Easings, keyframe interpolation, in/out animations, time formatting
lib/render.ts        Canvas renderer: backgrounds, text wrapping + pills, images, shapes
lib/ai.ts            Script splitting, pacing, four look presets, storyboard generator
lib/project.ts       Factories, aspect scaling, fonts, download helpers
lib/store.ts         Zustand store: project, selection, playhead, history, media, autosave flag
lib/export.ts        MediaRecorder capture + Web Audio mix + progress/cancel
lib/audio.ts         Preview playback of audio layers with start offsets
lib/voice.ts         Microphone recorder
lib/insert.ts        File uploads / recordings → layers
lib/media.ts         IndexedDB media library, image + audio buffer caches
lib/starter.ts       First-run demo project
```

## Keyboard shortcuts

| Action | Keys |
| --- | --- |
| Play / pause | `Space` |
| Previous / next frame | `← →` |
| Jump one second | `Shift + ← →` |
| Start / end | `Home` / `End` |
| Undo / redo | `⌘/Ctrl + Z` / `⇧ + ⌘/Ctrl + Z` |
| Duplicate layer | `⌘/Ctrl + D` |
| Delete layer | `⌫` |
| Export | `⌘/Ctrl + E` |
| Timeline zoom | `⌘/Ctrl + scroll` |
| Deselect | `Esc` |

## Notes and limits

- Export is a real-time screen-quality capture of a dedicated canvas, so a 30 s video takes
  roughly 30 s to render — keep the tab focused while recording.
- Output codec is whatever the browser can mux, and the export dialog labels it honestly: H.264 +
  AAC where available, otherwise VP9/Opus (MP4 or WebM). Firefox typically offers WebM only.
- The bundled voice is an offline formant synth (eSpeak): clear and free, but robotic. Swap in a
  neural engine or a cloud TTS key by replacing `lib/tts.ts` — the timing pipeline only needs PCM.
- Caption timing with the voiceover on follows the audio, so changing the pace slider re-times the
  cuts when you generate again.
- The AI Director is a deterministic, local director (script analysis + layout heuristics), not a
  cloud LLM — it works offline, costs nothing and never sends your script anywhere.
- Projects reference media by ID; deleting a file from the Media tab leaves existing layers intact
  for the current session but they will show an empty frame after a reload.
- Tested against current Chromium; Safari and Firefox support the editing UI, with the codec
  differences noted above.
