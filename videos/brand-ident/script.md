# Brand ident — Rahasya Sutra Studio

**Length:** 6.0 s · 1080 × 1920 · 30 fps · Hindi wordmark · no narration
**Job:** the channel's cold open and end card. Vector only, gold on ink, one crimson hit.

## Beats

| Time | Frame | Motion |
| --- | --- | --- |
| 0.00 | Chakra already on screen at 38% opacity, a 160 px gold hairline across the top, dust drifting. **Never blank.** | chakra spins from −28° |
| 0.15 – 1.20 | Chakra rises to full 90%, mandala fades in at 5 → 20%, hairline grows to 560 px | easeOutExpo, no bounce |
| 1.20 | **Impact.** Crimson ring flashes once (the only crimson in the piece), 17 px shake for 0.3 s | shake decays e^-t/0.105 |
| 1.45 | `रहस्य` rises 54 px, off-white, 156 px | 0.62 s |
| 2.20 | `सूत्र` rises, antique gold, one gradient sweep across it | 0.62 s |
| 2.95 | `स्टूडियो` in gold, 44 px, tracked +10 | 0.5 s |
| 3.45 | Gold hairline grows to 430 px | 0.8 s |
| 3.75 | `@rahasyasutrastudio` in Inter 800 | 0.5 s |
| 4.40 | Second, smaller impact (8 px) as the tagline lands | shake 0.1 s |
| 4.55 | `अनसुनी कहानियाँ · हर युग से` | 0.5 s |
| 5.40 – 6.00 | Chakra dims to 30%, lockup lifts 18 px, fade to ink | linear fade |

## Sound

`scripts/score.mjs videos/brand-ident/audio/score.wav 6.0 1.2 4.4` — D-minor drone with a 52 Hz
body on both hits, 38 Hz sub under it, cresting into the first impact.

## Rebuild

```bash
node scripts/score.mjs videos/brand-ident/audio/score.wav 6.0 1.2 4.4
node scripts/render.mjs videos/brand-ident
```

The whole piece is `window.seek(t)` over `brand/kit.js` primitives: `chakra()`, `mandala()`,
`shake()`, `enter()`, `grow()`, `dust()`.
