# brand.md

Brand intake for this studio. Every video reads this file before it writes a frame.

## What this is

A Hindu-mythology short-form channel. Reels that retell one story from the epics in under a
minute, ending on the twist the audience did not know. Hindi narration, Devanagari type,
cinematic stills, gold on black.

## Palette

| Token | Hex | Where |
| --- | --- | --- |
| Ink | `#07070B` | background, letterbox, every scrim ends here |
| Bone | `#F6EFE4` | primary headline text |
| Gold | `#E9B44C` | the second line of every headline, HUD accents, progress |
| Gold light | `#FFD98A` | gradient start on climax lines |
| Gold deep | `#B4701F` | progress bar start, hairlines |
| Ember | `#C2410C` | sparingly, fear/sacrifice beat only |
| Blood | `#7F1D1D` | never as a fill; only inside imagery |

Rules:

- Two type colours on screen at once: bone + gold. A third colour is a bug.
- Gold never sits on a bright gold image without a scrim behind it.
- No pure `#FFFFFF`, no pure `#000000`. Ink and bone only.

## Type

- **Devanagari:** Noto Sans Devanagari, weight 800 for headlines, 600/700 for eyebrows and quotes.
- **Latin / numerals:** Inter 600/800, letter-spacing 2–7px for HUD labels.
- Headline: 118px, line-height 1.18, tracking −1px, max two lines, centred.
- Eyebrow: 31px, weight 700, tracking 6px, gold light.
- Quote: 54px, weight 600, gold italics for the quoted line.
- Nothing above y 360 or below y 1420 (Reels UI safe zone).

## Voice

- Hindi, eSpeak-NG `hi` at 186 wpm, pitch 42 — fast and grave.
- Sentence rhythm: setup, setup, twist. The twist lands in the last 8 seconds.
- No "guys", no "subscribe", no exaggerated promises. "फॉलो करें" is the only CTA.

## Sign-off

- Handle: **महाभारत रहस्य**, dot + gold, top-left, on every scene.
- Counter: `01 / 05` Inter, top-right, gold numerals.
- Progress hairline across the bottom above the caption safe zone.
