# Video creation instructions

These repository-level instructions are for agents working on video requests in this project. Check the user's current instructions first and preserve existing work.

## Choose a visual style

- When a user requests a new video and has not specified a style, suggest 3 relevant choices from `STYLE_GUIDE.md` and ask which they prefer when that choice matters. Mention **Warm Monochrome Editorial** when it fits: it is this user's previously expressed preference. If the user supplies a style, reference, or asks you to proceed without questions, use it directly. Do not repeatedly ask about an already-selected style.
- Confirm only consequential unknowns: format, language, length, and whether the video should summarize or cover all source material. Use reasonable defaults when the request already provides enough information.
- Make the visual treatment coherent: readable typography, intentional hierarchy, safe margins, accessible contrast, coherent colors and polished motion. Drive Remotion animation from frames, not CSS transitions. In a vertical video, design specifically for 9:16.

## Editing, audio and sound

- Use deliberate cuts and transitions informed by the story, pauses, beats or provided audio; don't claim automatic cuts are perfectly beat-synced. Vary pacing for speech, and don't cut in the middle of an important sentence just to match a beat. Let the user review or change cuts where possible.
- Offer suitable sound effects and background music; keep them subtle, aligned with transitions and quieter than speech. Respect a request for no SFX. Use owned, licensed, or generated assets and identify relevant licenses. Avoid audio clipping and abrupt starts or endings.
- When the user supplies audio, preserve the original audio and create graphics, typography, footage or other motion appropriate to its content and duration. Listen or use a reliable transcript if available; if transcription is unavailable, request a script or use neutral on-screen text. Never invent what the audio says. Detecting energy changes is only a heuristic, not speech understanding.
- If the user provides source material, accurately represent it, distinguish summaries from verbatim readings, and cite source locations when helpful. Do not upload private materials or their derived video to a public repository without permission.

## Delivery

- Build and test the composition, preview representative frames, and when a video file is requested render an MP4 with audio and verify duration, dimensions, and audio tracks. Explain actual limitations rather than claiming a video or download is ready when it isn't.
- Follow the repository's `.gitignore`: don't commit user audio, exports, or generated assets unless they are deliberately required for a deliverable and the user has authorized publishing. Ask before publishing user-provided content publicly. Work on the current branch only.
- The existing UI uses template-based animation and simple audio-energy cut suggestions; it does not currently transcribe speech, automatically find stock footage, or generate video footage. Do not describe these features as already available.
