# Bundled fonts

These TTF files are copied from npm packages at setup time so the browser
preview and the Node renderer use **exactly the same type** (important for
frame-for-frame identical output).

| Font | Files | Licence | Source |
|---|---|---|---|
| Inter | `Inter_*.ttf` | SIL Open Font License 1.1 | [@expo-google-fonts/inter](https://www.npmjs.com/package/@expo-google-fonts/inter) (Google Fonts) |
| Noto Sans Devanagari | `NotoSansDevanagari_*.ttf` | SIL Open Font License 1.1 | [@expo-google-fonts/noto-sans-devanagari](https://www.npmjs.com/package/@expo-google-fonts/noto-sans-devanagari) (Google Fonts) |
| DejaVu Sans Mono | `DejaVuSansMono.ttf` | DejaVu / Bitstream Vera licence | system font, `/usr/share/fonts/truetype/dejavu` |

The OFL allows bundling, embedding and redistribution. The font names are not
used as product names; the app and the films you export are yours.

The reference project [lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar)
uses its own OFL font subsets (Archivo, Fredoka, Lilita One, IM Fell English,
ZCOOL KuaiLe). This project does not copy those files; it uses the fonts above.
