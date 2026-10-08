# woge

Wayland screenshot and image editor (Tauri 2 + React + Konva). Alpha.

## Install

```sh
nix run github:wochap/woge -- shot.png   # or: nix run . -- shot.png
nix profile install .                    # puts `woge` on PATH
```

Requires a native Wayland session. `wl-paste` (wl-clipboard) is bundled for clipboard input.

## Usage

```sh
woge shot.png            # open a file
grim - | woge -          # read image bytes from stdin
woge --clipboard         # load the clipboard image
woge                     # empty state: drop, paste or open an image
woge --theme latte -v    # force a theme, debug logging
woge shot.png -o out.png # Save writes out.png instead of shot.png
grim - | woge - -o /tmp/a.png --on-save exit   # prints /tmp/a.png after saving
woge shot.png -o out.jpg --format webp         # writes out.webp
woge shot.png --on-save stay --copy            # keep editing, copy after each save
```

Output flags:

- `-o, --output PATH`: target of Save (`Ctrl S`). Without it Save overwrites the source file; stdin/clipboard input opens Save as.
- `--format png|jpeg|webp`: beats the `-o` extension (which is rewritten), the config `format` and the source extension. Default PNG.
- `--on-save exit|stay`: exit after a successful Save (default) or keep the editor open. Save as never exits.
- `--copy`: also copy the result to the clipboard after each save.

stdout carries only saved paths, one absolute path per line. Overwriting a file keeps a session backup; the "Saved" toast offers Undo to restore it.

Exit codes: `0` saved with `on_save = exit` or closed with nothing to lose, `1` a scripted run (`-o` or stdin input) closed without saving, `2` startup error.

Copy (`Ctrl C`) writes a PNG to `~/.cache/woge/clip-*.png` and runs `shotclip --paste-once {path}`. When `shotclip` is not on `PATH` it falls back to `wl-copy --type image/png` with the PNG on stdin. Note that `--paste-once` clears after the first paste; set `[copy] command` to change that.

### Config

`~/.config/woge/config.toml` (all keys optional, unknown keys are an error):

```toml
theme = "auto"        # auto | mocha | latte
status_line = true
checkerboard = false
format = "png"        # png | jpeg | webp; unset = source extension
on_save = "exit"      # exit | stay
copy_on_save = false
jpeg_quality = 92     # 1–100
webp_quality = 90     # 1–100

[copy]
# argv, no shell; without {path} the PNG is piped to stdin
command = ["shotclip", "--paste-once", "{path}"]

[hooks]
# argv arrays, no shell; empty or missing disables the hook
on_load = ["notify-send", "woge", "loaded {input}"]
on_save = ["notify-send", "woge", "saved {output}"]
on_copy = []
on_exit = []

tool_sticky = true    # false: return to Select after drawing each object
badge_renumber = true # false: deleting a counter badge leaves a gap

[defaults]
# seeds tool settings; remembered settings win
color = "red"         # red peach yellow green teal blue mauve pink white black
stroke = "M"          # S | M | L
font = "Inter Variable"
font_size = 24        # 8–200
```

Hooks replace `{input}`, `{output}`, `{width}`, `{height}` and `{format}` inside each argument (never splitting it) and get `WOGE_INPUT`, `WOGE_OUTPUT`, `WOGE_WIDTH`, `WOGE_HEIGHT`, `WOGE_FORMAT` plus `WOGE_EXIT_CODE` for `on_exit`. They run detached with output in the log; failures never change the editor outcome. `on_exit` is awaited for at most 2 seconds.

Command line flags beat the config file. Logs go to `~/.local/state/woge/woge.log`.

The last colour, width, fill, arrowheads, font, size, bold, plate, brush smoothing, redact mode and strength, and badge size of each tool, plus recently used fonts, are remembered in `$XDG_STATE_HOME/woge/state.json` (default `~/.local/state/woge/state.json`). A corrupt file is ignored and overwritten. Fonts come from fontconfig (`fc-list`) plus the bundled Inter and JetBrains Mono.

### Tools

- **Select** (`V`): click, Shift+click to toggle, drag on empty space to marquee. Drag to move, handles to resize (Shift keeps aspect, Alt from centre); arrows show endpoint handles.
- **Rectangle** (`R`), **Ellipse** (`O`): colour, width S/M/L, fill. Shift = square/circle, Alt = from centre.
- **Arrow** (`A`): colour, width, head at End or Both. Shift snaps to 45°.
- **Text** (`T`): click to place and type; double click or Enter to edit; `Ctrl+Enter` or click away commits, `Esc` cancels. Colour, font, size, bold, background plate.
- **Brush** (`B`): freehand strokes; colour, width S/M/L, Smooth. Shift locks horizontal/vertical; a click draws a dot.
- **Highlighter** (`H`): wide 50% multiply strokes, yellow by default. Shift draws a straight line from the first point.
- **Redact** (`X`): drag a region that pixelates (default, 4–64 px blocks) or blurs (radius 2–40) the original image beneath; moving or resizing re-samples, and the export contains only the obscured pixels. Pixelate is safer.
- **Counter badge** (`N`): click to place numbered circles (1, 2, 3, …); colour, size S/M/L, `Next: N`, Reset. Double click or Enter edits a number. Deleting a badge renumbers the rest unless `badge_renumber = false`; duplicates take the next number.

Colours follow the theme flavour's palette at export time.

## Shortcuts

| Action | Keys |
| --- | --- |
| Select / Rectangle / Ellipse / Arrow / Text | `V` `R` `O` `A` `T` |
| Brush / Highlighter / Redact / Counter badge | `B` `H` `X` `N` |
| Delete selection | `Delete`, `Backspace` |
| Nudge selection | Arrows, `Shift` for 10px |
| Duplicate / Alt+drag duplicate | `Ctrl D` |
| Select all | `Ctrl A` |
| Copy / cut / paste objects | `Ctrl C` / `Ctrl X` / `Ctrl V` |
| Forward / backward, to front / back | `Ctrl ]` / `Ctrl [`, with `Shift` |
| Text size | `Ctrl Shift >` / `<` |
| Edit text or badge number / deselect | `Enter` / `Esc` |
| Pan | Scroll, Space + drag, middle drag |
| Zoom | Ctrl + Scroll, pinch |
| Fit / actual size | `Shift+1` / `Shift+0` |
| Zoom in / out | `Ctrl +` / `Ctrl −` |
| Open | `Ctrl O` |
| Paste image (no copied objects) | `Ctrl V` |
| Copy result (nothing selected) | `Ctrl C` |
| Save / Save as | `Ctrl S` / `Ctrl Shift S` |
| Shortcuts overlay | `?` |
| Quit | `Ctrl Q` |

## Development

```sh
nix develop
npm install
npm run tauri dev -- -- shot.png
npm test            # vitest
npm run test:rust   # cargo test
```

After changing `package-lock.json`, update `npmDeps.hash` in `flake.nix`.
