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

This is an **editing template**, not automatic speech transcription, semantic understanding, beat-perfect editing, footage search or text-to-video AI. It does not create subtitles from your audio. With no prompt it uses neutral scene labels. Uploads and renders stay in the local ignored `renders/` folder; IDs are lost on a server restart, after which you must upload again. Remove `renders/uploads/` when done. Don't expose this development server to the public internet: it has no authentication or user isolation.

To run the small test suite: `node --test tests/*.test.js`. Export requires a compatible Chromium and Linux libraries including `libnss3` and `libnspr4`; set `CHROME_PATH` to a local executable if needed.
