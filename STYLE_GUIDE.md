# Motion style library

Choose a preset in Motion Studio, or use these as creative directions for a custom Remotion composition. The studio presets are reusable animated templates, not generated footage. Each has its own palette, type treatment, graphic motif and motion. The first is the user's preferred reference style.

| Style | Look and movement | Best for |
| --- | --- | --- |
| Warm Monochrome Editorial / **Warm Editorial** | Peach studio light, terracotta serif text, circular cutouts, soft slides and line draws. For custom work: word-by-word type, elegant overlaps, delicate SFX and one intentional finale cut. | Hindi explainers, stories, thoughtful reels |
| Cinematic | Deep indigo, luminous accents, slow zoom, expressive serif | Travel, films, dramatic stories |
| Minimal Studio | Off-white and charcoal, clean sans serif, fine rules and fades | Announcements, clean explainers |
| Neon Pulse | Dark violet, electric pink, grid and energetic type | Gaming, music, youth content |
| Documentary | Parchment, dark ink, warm editorial typography and measured slides | Research, history, learning |
| Playful Pop | Bright yellow, rounded colors, bold type and lively shape movement | Kids, celebrations, playful brands |
| Modern Luxury | Ink black, understated gold, elegant serif and soft fades | Fashion, premium product reveals |
| Tech Interface | Midnight teal, cyan, precise grids, mono lettering and slides | Software, AI, technology |
| Organic Nature | Sage and cream, warm serif, gentle circles and fades | Wellness, sustainability, outdoors |
| Retro Print | Vintage peach, rust, paper-like color blocks and serif | Nostalgia, culture, food |
| Bold Type | High-contrast black and red, oversized type and graphic blocks | Headlines, energetic short-form |
| Dreamy Pastel | Lavender and violet, soft glow, serif and floating zoom | Lifestyle, reflection, calm stories |
| Clean Corporate | Pale blue, navy, structured frames and clear sans serif | Business, presentations, services |
| Monochrome Noir | Black, white and gray, dramatic frame and fades | Portraits, photography, cinematic essays |
| Sunset Stories | Dark plum and amber, glowing gradient, cinematic zoom | Emotional stories, travel, inspiration |

## Audio-first workflow

1. Upload a supported audio track (up to 2 minutes and 30 MB), choose a style and optionally supply the on-screen text in the prompt. The browser decodes audio locally to estimate energy changes and uploads it to the local render server.
2. The studio suggests cuts from audio energy with fallback spacing. It is not beat detection, speech recognition, transcription, automatic footage selection, or an AI editor. Review the generated storyboard and preview it with sound; select a later scene and nudge its cut earlier or later.
3. Toggle the included soft transition sound effect on or off. The original audio is retained for the full video. Choose aspect ratio before generating.
4. Export the rendered MP4. Uploaded audio and renders are stored in ignored `renders/`; server memory holds upload IDs until it restarts. On restart, upload the audio again. Delete `renders/uploads/` when no longer needed. Never push a user's audio or derived content without their permission.
