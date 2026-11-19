# MOTION.md — Rahasya Sutra Studio

Read this before animating a single frame. Every colour, size, timing and motion value below is
the brand. If a request is not covered here, ask — do not invent.

## 1. Colour

| Hex | Name | Job | On screen |
| --- | --- | --- | --- |
| `#0A0A0A` | Pitch Black | stage, scrims, letterbox, gaps | 70–85% of the frame |
| `#D4AF37` | Antique Gold | chakra, mandala, hairlines, the sacred word | 10–20% |
| `#F5F5F0` | Off-White | Hindi headline, subtitles, handle | 5–15% |
| `#E50914` | Crimson | the twist only: one hairline, one word, one flash | ≤ 3% |

- No other colour exists. No purple, no blue, no teal, no grey-blue shadows.
- Black is never pure `#000`, white is never `#FFF`.
- On imagery or texture, gold needs a black scrim under it before it counts as legible.
- Gold glow is built from the same `#D4AF37` at 0.35 / 0.18 / 0.07 opacity — never a lighter tint.

## 2. Type

| Role | Font | Weight | Size (1080 wide) | Tracking | Colour |
| --- | --- | --- | --- | --- | --- |
| Kinetic headline | Noto Sans Devanagari | 900 / 800 | 108–136 px | −1 px | Off-White |
| Headline accent word | same | 900 | same | −1 px | Gold |
| Subtitle / quote | same | 500 / 600 | 40–48 px | 0 | Off-White 88% |
| Kicker / eyebrow | same | 700 | 28–31 px | 5–7 px | Gold |
| Handle, counter | Inter | 800 | 24–28 px | 2–4 px | Off-White 70% |

- Headline line-height 1.16–1.2, max two lines, centred.
- Everything inside y 360–1420 (Reels chrome safe zone). Nothing in the bottom 500 px except the progress hairline at y 1770.
- Devanagari gets no uppercase, no fake italic, no outline stroke.

## 3. Timing

- 30 fps, 1080 × 1920. Scene length comes from the narration, never from a round number.
- Entrances: 0.45–0.6 s per element, staggered 0.22 s.
- Holds: a headline holds at least 1.2 s before anything else moves.
- Exits: 0.3 s fade for text, 0.45 s crossfade between scenes.
- Two headlines never share a frame. The CTA is its own card with its own time.
- Hard cuts are allowed and encouraged between beats if the narration lands on one.

## 4. Motion

- Frame rate and determinism: every frame is `window.seek(t)`, pure. No CSS transitions, no
  `requestAnimationFrame`, no random per frame.
- Easing: `easeOutExpo` for entrances (`1 - 2^(-10x)`), `easeInOutCubic` for camera. No bounce,
  no overshoot, no spring, no elastic.
- **Parallax zoom:** background field 1.06 → 1.20 over the scene; mid-layer (mandala) 1.00 → 1.06;
  foreground type 1.00 → 1.015. Layers move at different rates and in different directions
  (background up, mandala down-right 12 px, type down 4 px) — that is the depth.
- **Camera shake:** only on a cut, a reveal or a hit. Amplitude 6–16 px, decay `e^(-6t)` over
  0.28–0.4 s, two or three impulses max per video, rotation ≤ 0.5°, deterministic sine of time and
  seed. Never continuous shake, never shake on text entry.
- **Mandala:** rotates 3–5°/s, continuous, unprompted. It is the room, not an event.
- **Chakra:** 0.3–0.45 revolutions/s, gold rim; it slows, never stops, never resets visibly.
- Text: rises 36–46 px and fades in. No scale, no rotation, no per-letter animation.
- Gold sweep on one word per video: `background-position` drifts once, 1.2 s, never loops.

## 5. Texture and finish

- **Pure vector.** Stills, AI imagery and photos are out — every visual is SVG/CSS: honed strokes,
  geometric mandalas, minimal silhouettes, light flares built from gradients. `videos/barbarik`
  is the one pre-brand exception and is not a template.
- Stroke weights: 2–6 px at 1080 wide. Corner radii minimal. Line caps round.
- Glow: 3 stacked blurs at 0.35 / 0.18 / 0.07 opacity, not one fat shadow.
- Grain: SVG noise at 5–7% opacity, offset per frame. Vignette 55%. Dust: 16–24 gold motes.
- Nothing is beveled, glossy, glassy or 3D-rendered. No drop shadows with hard edges.

## 6. Five things this motion must never do

1. Bounce, overshoot, spring or "pop" anything.
2. Use a purple-blue gradient, a rainbow gradient or a glassy blob.
3. Open on a blank, black or slowly fading frame.
4. Show blood, gore, a weapon entering a body, or a character in pain.
5. Put two headlines (or a headline and the CTA) on screen at the same time.

## 7. One example, shot by shot — a 52 s reel

| Time | Frame |
| --- | --- |
| 0.00 | Pitch black, a single gold hairline already drawn across the frame, 16 gold motes drifting. No blank frame. |
| 0.3–1.4 | Mandala fades in at 12% opacity, rotating 4°/s. Kicker in gold: `रामायण · अंतिम रहस्य`. |
| 1.4–3.2 | Headline rises: `वो रात` (off-white, 128 px) then `जब सब सो गए` (gold, 128 px). Parallax: mandala drifts down-right 12 px, background zooms 1.06 → 1.10. |
| 3.2 | Hard cut on the narration beat. Shake: 10 px, 0.3 s decay. Chakra spins up at 0.4 rev/s behind the second scene, gold rim, silhouette figure in black in front. |
| 3.2–8.0 | Subtitle band at y 1240: `जो सुना नहीं गया` — 44 px, 88% off-white. Mandala opacity drops to 6% while the chakra carries the frame. |
| 8.0–9.2 | Reveal word only in crimson: `रावण` (one element, crimson hairline under it). Everything else gold or off-white. |
| 9.2–9.5 | Cut to black for 0.3 s — the only true black gap in the video. |
| 9.5–52 | Beats repeat on the narration's cuts: one visual event per beat, one parallax zoom per scene, one shake per reveal, never two. |
| 52–56 | CTA card: chakra mark settles, `फॉलो करें` in gold, `@rahasyasutrastudio` in Inter under it, sutra line grows 0 → 220 px. |

Score: D-minor drone, a 52 Hz thump on every cut, gold silence before the reveal. No music with
vocals. Narration is Hindi, 180–190 wpm, and the cut timings come from the measured audio.
