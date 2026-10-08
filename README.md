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
```

Exit codes: `0` closed normally, `1` cancelled (reserved), `2` startup error.

### Config

`~/.config/woge/config.toml` (all keys optional, unknown keys are an error):

```toml
theme = "auto"        # auto | mocha | latte
status_line = true
checkerboard = false
```

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
| Shortcuts overlay | `?` |
| Quit | `Ctrl Q` |

Other tools (crop, resize, rotate, annotations), Copy and Save are listed in the UI but arrive in later changes.

## Development

```sh
nix develop
npm install
npm run tauri dev -- -- shot.png
npm test            # vitest
npm run test:rust   # cargo test
```

After changing `package-lock.json`, update `npmDeps.hash` in `flake.nix`.
