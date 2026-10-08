## Why

woge does not exist yet: the repository holds only OpenSpec scaffolding and a Claude Design handoff. Every later change (crop/rotate/resize, export, annotations) needs a running Wayland desktop app that can load an image, show it on a canvas and navigate it. This change builds that shell so the following changes can each add one feature group on top of a working app.

## What Changes

- New Tauri 2 + React + react-konva project at the repo root, packaged by a Nix flake (dev shell and `nix run`), modelled on video-trimmer.
- Rust entry point enforces a native Wayland session, parses the CLI, loads `~/.config/woge/config.toml`, initialises logging and opens one undecorated window.
- CLI accepts an input path, `-` for stdin bytes, or `--clipboard`, plus `--theme` and `-v`. Output-related flags are reserved for the output change and rejected as unknown for now.
- Image input: CLI path, stdin, clipboard (`wl-paste`), drag and drop, `Ctrl+O` file dialog, `Ctrl+V` paste. The webview decodes PNG/JPEG/WebP with EXIF orientation applied.
- Catppuccin Mocha/Latte theming as CSS custom properties from design board 1i, following the system colour scheme with a config override.
- Editor chrome from the design: top bar (drag region, file name and dimensions, zoom menu, Copy/Save/Save as placeholders, close), left toolbar with all tools as disabled/placeholder buttons, options strip slot, optional status line, empty state, shortcut overlay (`?`), compact rule under 960×600.
- Viewport: Konva stage showing the image centred and fitted; wheel pans, Ctrl+wheel/pinch zooms to cursor, Space or middle-drag pans, `Shift+1` fit, `Shift+0` 100%, `Ctrl+=`/`Ctrl+-` steps.
- Document store skeleton (zustand) holding base image and viewport, ready for the geometry change to add history.

## Capabilities

### New Capabilities
- `app-runtime`: Wayland enforcement, window, logging, exit codes, flake packaging.
- `cli-and-config`: command line surface, config file format and precedence, state directory.
- `image-input`: all the ways an image enters the editor and how decoding behaves.
- `viewport-navigation`: pan, zoom, fit and actual-size behaviour for mouse, touchpad and keyboard.
- `editor-chrome`: layout, theming, empty state, shortcut overlay and compact behaviour.

### Modified Capabilities
_None._

## Impact

- New files: `flake.nix`, `package.json`, `vite.config.ts`, `src/`, `src-tauri/`, `index.html`, tests.
- Dependencies: tauri 2, tauri-plugin-dialog, clap, serde, toml, directories, tracing; react 19, react-konva, konva, zustand, tailwindcss 4, @phosphor-icons/react, fontsource Inter Variable and JetBrains Mono.
- Runtime dependencies in the flake: webkitgtk 4.1, gtk3, wl-clipboard (paste), fontconfig.
- No user-visible output yet: Copy/Save are visible but disabled until the output change.
