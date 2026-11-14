# Remotion video

<p align="center">
  <a href="https://github.com/remotion-dev/logo">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://github.com/remotion-dev/logo/raw/main/animated-logo-banner-dark.apng">
      <img alt="Animated Remotion Logo" src="https://github.com/remotion-dev/logo/raw/main/animated-logo-banner-light.gif">
    </picture>
  </a>
</p>

Welcome to your Remotion project!

## Commands

**Install Dependencies**

```console
npm i --loglevel=error
```

**Start Preview**

```console
npm run dev
```

**Render video**

```console
npx remotion render
```

**Upgrade Remotion**

```console
npx remotion upgrade
```

## Docs

Get started with Remotion by reading the [fundamentals page](https://www.remotion.dev/docs/the-fundamentals).

## Help

We provide help on our [Discord server](https://discord.gg/6VzzNDwUwV).

## Issues

Found an issue with Remotion? [File an issue here](https://github.com/remotion-dev/remotion/issues/new).

## License

Note that for some entities a company license is needed. [Read the terms here](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md).

## Diwali Hindi facts video

The `DiwaliHindiFacts` composition is a seven-scene Hindi video with narration. Its background, voice tracks, and Devanagari font are in `public/`. Run `npm run dev` to preview it in Remotion Studio, or render an MP4 on a machine with Chrome and its system dependencies installed:

```sh
npx remotion render DiwaliHindiFacts out/diwali-hindi.mp4
```

## Diwali editorial short

`DiwaliEditorial` is an 18-second, 720×1280 Hindi short in a warm editorial kinetic-typography style, with narration and a quiet stereo music bed. Preview it in Studio, or render it with:

```sh
npx remotion render DiwaliEditorial out/diwali-editorial.mp4
```

## Odisha ancient science reel

`OdishaAncientScience` is a 720×1280 (9:16), ~103-second Instagram reel in a dark "museum spotlight" style. Eight scenes cut hard against an AI-selected narrator's Hinglish dialogue (`public/odisha/vo-*.mp3`), with synced caption pills, kinetic headlines, stat chips, a segmented progress bar, and an end-card CTA for the "Anything" channel. All visuals are code-drawn vector art (Konark wheel, sun-dial, magnet, Lingaraj deul, Ratna Bhandar vault, Khandagiri caves). The percussion music bed is generated programmatically by `scripts/make-bed.mjs` — kicks, booms and whooshes land exactly on the scene cut frames, and the riser sweeps into the CTA.

Preview it in Studio, or render an MP4:

```sh
npx remotion render OdishaAncientScience out/odisha-ancient-science.mp4
```

On machines without a system Chromium (e.g. minimal Linux sandboxes), install `@sparticuz/chromium`, extract its bundled libraries (`bin/al2023.tar.br` → `/tmp/al2023`), then pass:

```sh
export LD_LIBRARY_PATH=/tmp/al2023/lib
npx remotion render OdishaAncientScience out/odisha-ancient-science.mp4 --browser-executable=/tmp/chromium
```

To change the channel name, edit the `Anything` wordmark in `CtaArt` and the `BrandFoot` line in the same file (`src/OdishaAncientScience.tsx`).
