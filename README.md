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
```

Hooks replace `{input}`, `{output}`, `{width}`, `{height}` and `{format}` inside each argument (never splitting it) and get `WOGE_INPUT`, `WOGE_OUTPUT`, `WOGE_WIDTH`, `WOGE_HEIGHT`, `WOGE_FORMAT` plus `WOGE_EXIT_CODE` for `on_exit`. They run detached with output in the log; failures never change the editor outcome. `on_exit` is awaited for at most 2 seconds.

Command line flags beat the config file. Logs go to `~/.local/state/woge/woge.log`.

## Shortcuts

| Action | Keys |
| --- | --- |
| Select tool | `V` |
| Pan | Scroll, Space + drag, middle drag |
| Zoom | Ctrl + Scroll, pinch |
| Fit / actual size | `Shift+1` / `Shift+0` |
| Zoom in / out | `Ctrl +` / `Ctrl −` |
| Open | `Ctrl O` |
| Paste image | `Ctrl V` |
| Copy result | `Ctrl C` |
| Save / Save as | `Ctrl S` / `Ctrl Shift S` |
| Shortcuts overlay | `?` |
| Quit | `Ctrl Q` |

Annotation tools are listed in the UI but arrive in later changes.

## Development

```sh
nix develop
npm install
npm run tauri dev -- -- shot.png
npm test            # vitest
npm run test:rust   # cargo test
```

After changing `package-lock.json`, update `npmDeps.hash` in `flake.nix`.
