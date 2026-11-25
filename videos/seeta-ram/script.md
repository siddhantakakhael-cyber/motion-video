# रामायण · वह रात — Rahasya Sutra Studio

**Source:** रामायण — अग्नि परीक्षा के बाद का मौन, वनवास और सीता की आखिरी इच्छा
**Format:** 1080 × 1920 · 30 fps · 52.0 s · Hindi narration + scored bed + natural ambience · vector only
**Look:** pitch black, antique gold, one crimson reveal word, Noto Sans Devanagari 800
**Pace:** brand speed — headline holds ≥ 1.2 s, one visual event per beat, hard cuts on narration beats

## Beat sheet (fixed windows: 8 / 11 / 17 / 3 / 13 = 52 s)

| # | Time | Scene | On-screen Hindi | Vector |
|---|------|-------|-----------------|--------|
| 1 | 0.0 – 8.0 | Hook: the biggest secret is not in war, but in a silence | किकर `रामायण · वह रात` / हेडलाइन `उस रात` | gold hairline already drawn (frame 0), mandala fades in rotating, 16 gold motes |
| 2 | 8.0 – 19.0 | Truth: Sita stood in fire even after Lanka was won | हेडलाइन `जब सब बदल गया` (antique gold) | hard cut + shake on entry, chakra spins up 0.4 rev/s behind, parallax zoom |
| 3 | 19.0 – 36.0 | Exile: Sita accepted exile, but kept her last wish | सब-लाइन बैंड `अग्नि परीक्षा के बाद भी, वनवास` (y 1240) | mandala opacity drops to 6%, chakra carries the frame |
| 4 | 36.0 – 39.0 | Satya: the one crimson word | `सत्य` (crimson, one element, crimson hairline under it) | hard cut + shake 10 px, everything else gold or off-white |
| 5 | 39.0 – 52.0 | CTA card: its own time | `फॉलो करें` (gold) / `@rahasyasutrastudio` (Inter) / सUTRā line grows 0 → 220 px | chakra mark settles, fade to ink |

## Narration (exact)

1. रामायण का सबसे बड़ा रहस्य, युद्ध में नहीं — एक मौन में।
2. सीता अग्नि में खड़ी रहीं, लंका जीतने के बाद भी।
3. सीता ने वनवास स्वीकार किया, पर आखिरी इच्छा अपनी रखी।
4. सत्य।
5. फॉलो करें रहस्य सूत्र स्टूडियो।

## Motion rules applied (see MOTION.md)

- Frame 0 already carries the hook: gold hairline, dust motes — never blank.
- Scene windows fixed by `fixedDurations: [8, 11, 17, 3, 13]` so cuts land exactly.
- One camera impulse per cut (`Brand.shake`, 6–16 px, `e^(-6t)` over 0.28–0.4 s, ≤ 0.5°); never continuous, never on text entry.
- Parallax: background 1.06 → 1.20, mandala 1.00 → 1.06, type 1.00 → 1.015; background up, mandala down-right 12 px, type down 4 px.
- Mandala rotates 3–5°/s continuous; chakra 0.3–0.45 rev/s, gold rim, slows never stops.
- Text rises 36–46 px and fades in; no scale, no rotation, no per-letter animation.
- One gold sweep on one word per video; one crimson element max (`सत्य`).
- Devanagari: no uppercase, no fake italic, no outline stroke. All copy inside y 360–1420.

## Sound

`scripts/voice.mjs videos/seeta-ram` — Hindi narration (eSpeak-NG `hi`) + D-minor drone + 52 Hz thump on every cut + synthesised ambience (wind, rumble, crickets, bell, conch).

## Rebuild

```bash
node scripts/voice.mjs videos/seeta-ram     # narration + score + ambience + timing.js
node scripts/render.mjs videos/seeta-ram    # 1560 frames → MP4
```
