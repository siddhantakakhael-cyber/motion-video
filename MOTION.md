# MOTION.md

House rules for every animation in this repo. They exist because these are the notes that came
back from drafts that looked cheap.

## The contract

1. **Every frame is a pure function of time.** Each video's `index.html` exposes
   `window.seek(seconds)`. No CSS transitions, no `setInterval`, no `requestAnimationFrame`.
   Same second in, same pixels out, every run.
2. **30 fps, 1080 × 1920, H.264 High, yuv420p, bt709, AAC 192k @ 48k.** Anything else gets
   re-encoded before upload.
3. **Render is offline.** Headless Chromium screenshots each frame, JPEG quality 95, piped
   straight into ffmpeg. Nothing is captured in real time, so a slow machine only makes the
   render slower — never the video.

## Timing

- Ease out cubic on entrances: `1 - (1 - x)^3`. Ease in-out for camera moves.
- Text: 0.55s to arrive, lines staggered 0.22–0.28s apart, 46px rise.
- Scene crossfade: 0.45s out, 0.5s in. Never let two headlines overlap — that is the one
  mistake that reads as amateur.
- The CTA owns its own card and its own time. It never shares the frame with a headline.

## Camera

- Every still gets a slow Ken Burns: scale 1.06 → 1.18, drift −26px, over the scene length.
- One accent move per video, not one per scene. Here: a 1.5% breathing pulse on the hook.
- No shake, no whip pans, no zoom punches on text.

## Type motion

- Rise + fade only. No typewriter, no per-letter bounce, no rotation.
- Gold gradient text may drift its `background-position` across a climax line.
- Rules/underlines grow from 0 to 220px with the same ease.

## Texture

- Grain: SVG feTurbulence at 7.5% opacity, offset per frame so it moves like film.
- Vignette: radial, 62% at the corners.
- Dust: 22 motes, deterministic seeds, drifting up at 14–40px/s.
- Scrims: three stacked gradients — centre halo for the type, edge falloff, top/bottom darker.
  The image is graded to `brightness(0.84) saturate(1.06) contrast(1.05)`.

## Sound

- Narration is trimmed of silence and faded 25ms at the edges, so cuts land on speech.
- Music is generated, not licensed: D-minor drone (73.42 / 110 / 146.83 / 174.61 / 220 Hz) with
  slow LFO swells, at 13% under the voice, plus a 52 Hz thump on every cut.
- Nothing peaks above 0.94 after summing.
