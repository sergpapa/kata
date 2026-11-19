# Kata logo

The mark is two brush strokes written as `{` and `}` that close into an ensō, with a short lime
brush stroke at the centre. The wordmark is KATA in Noto Serif JP SemiBold, outlined. Colours are the
app's theme tokens: `--sidebar` navy, `--sidebar-foreground` for strokes on navy, `--lime` for the
centre on dark grounds and `--primary` indigo for it on light ones, where lime fails 3:1.

| File                                     | Use                                       |
| ---------------------------------------- | ----------------------------------------- |
| `kata-mark-reversed` (.svg, .png)        | The mark on navy: the primary logo        |
| `kata-mark`                              | The mark on light grounds                 |
| `kata-lockup-horizontal-reversed`        | Mark and wordmark side by side, on navy   |
| `kata-lockup-horizontal`                 | The same on light grounds                 |
| `kata-lockup-stacked-reversed`           | Mark above wordmark, on navy              |
| `kata-app-icon`, `kata-app-icon-512.png` | The mark on a rounded navy tile           |
| `favicon-32.png`, `favicon-16.png`       | Browser tab icons, rendered from the tile |
| `kata-overview.png`                      | Every version on one sheet                |
| `kata-logo.vectorcraft`                  | The master, one artboard per version      |

The web app uses two more artboards from the master, both transparent: `app-mark` and
`app-wordmark`, copied to `apps/web/src/assets/`. The favicons are copied to `apps/web/public/`.

## Regenerating

The strokes are drawn by `build_kata.py`, which writes a batch of VectorCraft commands. Change the
brush there, not by hand in the master, so every version stays identical:

```sh
python build_kata.py kata.json
vectorcraft-cli run --commands kata.json --export kata-logo.vectorcraft
vectorcraft-cli convert kata-logo.vectorcraft kata-mark-reversed.svg --artboard 0
```

Artboards, by index: 0 `mark-reversed`, 1 `mark`, 2 `lockup-horizontal-reversed`,
3 `lockup-horizontal`, 4 `lockup-stacked-reversed`, 5 `app-icon`, 6 `app-mark`, 7 `app-wordmark`.
PNGs are exported with `--ppi 144` (2×); the favicons from artboard 5 at `--ppi 3.84` and `1.92`; the
app's SVGs with `--decimals 1`.

Fonts: Noto Serif JP (SIL Open Font License) for the wordmark. Its letters are outlines in every
file, so nothing here needs the font installed.
