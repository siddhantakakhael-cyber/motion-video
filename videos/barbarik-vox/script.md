# बर्बरीक — असली विजेता (Vox-style explainer)

**Source:** स्कंद पुराण (माहेश्वर खंड / कौमारिका खंड)
**Format:** 1080 × 1920 · 30 fps · 55.0 s · Hindi narration + scored bed + natural ambience · vector only
**Look:** pitch black, antique gold, one crimson accent, Noto Sans Devanagari 800

## Beat sheet (windows fixed to the brief)

| # | Time | Scene | On-screen Hindi | Vector |
| --- | --- | --- | --- | --- |
| 1 | 0.0 – 7.0 | Hook: the winner was not Arjun | असली विजेता / अर्जुन नहीं था! | chakra zooms out, meditating warrior on the peak, perspective battlefield grid |
| 2 | 7.0 – 20.0 | Three arrows could stop the war | सिर्फ 3 बाण... / और पूरा युद्ध खत्म! | three arrows fly and lock onto targets across a geometric grid |
| 3 | 20.0 – 34.0 | The sacrifice and the last wish | शीश का / महादान + “मैं पूरा युद्ध देखना चाहता हूँ…” | lit presence + floating chakra meets the kneeling warrior → gold flash → moon over the cliff |
| 4 | 34.0 – 46.0 | The Pandavas ask who he saw | “तुमने युद्ध में / किसे लड़ते देखा?” | split screen: five warrior emblems vs. the divine aura with soundwave pulses |
| 5 | 46.0 – 55.0 | The reveal | असली विजेता... / स्वयं श्रीकृष्ण! | 78 particles spiral into the chakra, silhouette, embers rising |

## Narration (exact)

1. महाभारत के अठारह दिन के महायुद्ध में करोड़ों योद्धा लड़े। पर असली विजेता न अर्जुन था, न भीम, न कर्ण।
2. भीम का पोता बर्बरीक सिर्फ तीन अचूक बाण लेकर कुरुक्षेत्र पहुँचा। उसका एक ही बाण पूरी कौरव और पांडव सेना को रोक सकता था। तीन बाण — पहला सेना रोके, दूसरा युद्ध का अंत करे।
3. धर्म की रक्षा के लिए श्रीकृष्ण ने दान में बर्बरीक का शीश माँगा। बिना एक पल सोचे उसने अपना शीश गुरु दक्षिणा में अर्पित कर दिया। पर एक आखिरी इच्छा रखी — मैं अपनी आँखों से पूरा युद्ध देखना चाहता हूँ।
4. कृष्ण ने वरदान देकर उसका शीश ऊँचे पर्वत शिखर पर स्थापित किया। युद्ध के बाद पांडवों में बहस हुई — जीत किसकी वजह से हुई? सबने बर्बरीक से पूछा — तुमने युद्ध में किसे लड़ते देखा?
5. बर्बरीक ने कहा — मैंने पूरे अठारह दिन सिर्फ एक सुदर्शन चक्र को चलते देखा। और खुद श्रीकृष्ण को युद्ध लड़ते और जीतते देखा।

## Motion rules applied (see MOTION.md)

- Frame 0 already carries the hook: chakra large, spinning, gold hairline, dust — never blank.
- Scene windows fixed by `fixedDurations: [7, 13, 14, 12, 9]` in `script.json`, so the cuts land on exactly 7 / 20 / 34 / 46 s.
- One camera impulse per cut (`Brand.shake`, 11–16 px, `e^-t/0.11`, ≤0.45°); never continuous.
- Parallax: art scales 1.015 → 1.06 and drifts −10 px while the type holds still.
- No typewriter, no bounce, no purple/blue gradient, no violence — symbolic silhouettes only.
- One crimson element in the whole video: the underline under the Pandavas' question.

## Sound

`scripts/voice.mjs` writes `audio/narration.wav` in three layers:

1. **Voice** — eSpeak-NG `hi`, one line per scene, trimmed and faded.
2. **Score** — a D-minor drone that breathes on slow LFOs, plus a low impact on every cut.
3. **Ambience** (`scripts/lib/ambience.mjs`, level `0.45` in `script.json`) — all synthesised:
   - night wind + air shimmer running the whole reel, breathing on 0.06/0.12 Hz LFOs
   - distant battlefield rumble under the arrows and the sacrifice beats
   - an arrow whoosh and string twang on each of the three locked arrows (7.7 / 9.4 / 11.2 s)
   - temple bell on frame 0 and on the last frame
   - conch swell at the aura (20.4 s), the flash (27.3 s) and the reveal (46.3 s)
   - crickets trilling under the moon and the question, fading out before the final title

   The bed is side-ducked 45% by the narration envelope, so the voice always wins and
   the silence between lines still has a room around it.

## Rebuild

```bash
node scripts/voice.mjs videos/barbarik-vox     # narration + score + ambience + timing.js
node scripts/render.mjs videos/barbarik-vox    # 1650 frames → MP4
```
