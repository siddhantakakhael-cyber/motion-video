# Motion Studio

A prompt-to-video starter built with [Remotion](https://github.com/remotion-dev/remotion). Enter an idea or upload audio, choose a style and aspect ratio, then generate an animated preview and export an MP4.

The prompt is interpreted locally using simple rules, **not an AI model**. Videos use a bundled background image and motion template; this does not generate new footage or voiceovers. Projects are held in the browser's memory for the current session.

## Run locally

Requires Node.js 20+ and npm. On Linux, Chromium's shared-library dependencies must be installed (including `libnss3` and `libnspr4`).

```sh
npm install
npm run dev
```

Open the Vite URL. The dev server proxies `/api` requests to the render server on port 3001. To run a production build, run `npm run build` followed by `npm start` and open port 3001. Exports are rendered on the server with Remotion and headless Chromium; generated files are stored in the ignored `renders/` directory. Optionally set `CHROME_PATH` to use an existing Chromium executable.

## Styles and audio editing

Motion Studio includes **15 selectable animated style presets**. Browse [STYLE_GUIDE.md](STYLE_GUIDE.md) for the looks and [AGENTS.md](AGENTS.md) for instructions to agents working on video requests. The app suggests a style based on prompt keywords; you can always choose another. Select a scene in the storyboard to move its cut earlier or later.

Upload audio (up to **2 minutes / 30 MB**) to generate a video matching its duration. The browser estimates changes in audio energy and suggests scene cuts; the original audio is included in preview and export. Optionally enable a subtle transition sound effect. Enter the text you want to use in the prompt, separating phrases with punctuation.

This is an **editing template**, not text-to-video AI or beat-perfect editing. Local transcription and optional Pexels stock search require the setup below. Audio stays on the server during transcription; enabling stock search sends only the displayed search terms to Pexels. Search matches are heuristic, so review captions, timing, and clips. Uploads and renders stay in the ignored `renders/` folder; IDs are lost on a server restart, after which you must upload again. Remove `renders/uploads/` when done. Do not expose this development server to the public internet: it has no authentication or user isolation.

To run the small test suite: `node --test tests/*.test.js`. Export requires a compatible Chromium and Linux libraries including `libnss3` and `libnspr4`; set `CHROME_PATH` to a local executable if needed.

## Automatic subtitles (local Whisper)

The app can transcribe uploaded audio on the server using [whisper.cpp](https://github.com/ggml-org/whisper.cpp). This is opt-in infrastructure: neither the CLI nor the model is bundled. Install and build whisper.cpp and download a **multilingual** model such as `base` following its official documentation (the initial model download requires internet). English-only `.en` models cannot transcribe Hindi. Set these environment variables before starting the app:

- `WHISPER_CPP_BIN`: absolute path to the built `whisper-cli` executable.
- `WHISPER_MODEL`: absolute path to the downloaded `ggml-base.bin` or another compatible multilingual model.
- `FFMPEG_PATH` (optional): path to ffmpeg; Linux x64 uses Remotion's bundled binary by default.

Example, after building whisper.cpp in your home directory:

```sh
export WHISPER_CPP_BIN="$HOME/whisper.cpp/build/bin/whisper-cli"
export WHISPER_MODEL="$HOME/whisper.cpp/models/ggml-base.bin"
npm run dev
```

On upload, transcription runs locally on the server; choose Auto, Hindi or English and retry if needed. No audio is sent to a transcription provider. Whisper segments are split into short readable captions with **estimated timing within each segment**, not precise word alignment. Correct the text in the editor, then regenerate. Results can be inaccurate, especially for mixed languages or noise. A missing model or CLI is reported in the UI and the manual prompt workflow remains usable.

## Optional stock footage

For keyword-based stock video, obtain a Pexels API key through Pexels and configure `PEXELS_API_KEY` **in the server environment**, not in source control or chat. Restart the server. In the app, explicitly enable “Find matching Pexels stock clips”; inspect the displayed keywords or enter an English search phrase before generating. Only up to four unique search terms are sent to Pexels, never the audio. Pexels clips are downloaded into ignored `renders/uploads/`, credited on screen, and used as muted backgrounds; their availability and license are subject to [Pexels' license](https://www.pexels.com/license/) and API terms. In environments that block Pexels network access, this feature cannot fetch footage. If the key is absent, the service fails, a clip is too large, or no usable match exists, the UI reports this and falls back to motion graphics. The app does **not** generate new video footage or understand audio semantically.
