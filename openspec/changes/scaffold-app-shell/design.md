## Context

Empty repository. Reference implementation for every infrastructure pattern is `~/Sandboxes/sandbox/video-trimmer` (same author): Tauri 2, undecorated window, Wayland gate before GTK init, clap CLI, strict TOML config with precedence, tracing to an XDG state dir, Nix flake with `cargo-tauri.hook`, vitest and cargo tests. Visual target is `design/project/woge.dc.html`; board 1i has the tokens, 1a/1b the main window, 1e the empty state, 1f the shortcut overlay, 1l the zoom menu, 1n the compact rule.

Later changes add geometry (crop/rotate/resize + history), output (save/copy/hooks), shape annotations and paint tools. This change must leave clean seams for them: a document store, a tool registry, an options-strip slot and a keyboard dispatcher.

## Goals / Non-Goals

**Goals:**
- Running `woge image.png`, `grim - | woge -`, `woge --clipboard` or `woge` (empty state) opens the window with the image fitted.
- Smooth pan/zoom at 60fps on a 4k screenshot with mouse, touchpad and keyboard.
- Theme tokens and chrome geometry come from CSS variables matching board 1i exactly.
- `nix run`, `nix develop` then `npm run tauri dev`, `npm test`, `cargo test` all work.

**Non-Goals:**
- Any editing, history, export, clipboard copy or hooks (later changes).
- X11 support, other OSes, multiple windows, multiple documents.

## Decisions

### Project layout mirrors video-trimmer
`src-tauri/` with `lib.rs` (`run()`), `main.rs`, modules `cli.rs`, `config.rs`, `logging.rs`, `lifecycle.rs`, `input.rs` (reads path/stdin/clipboard bytes), `app.rs` (Tauri commands and managed state). Frontend `src/` with `App.tsx`, `store/` (zustand), `canvas/` (react-konva stage and viewport), `chrome/` (TopBar, Toolbar, OptionsStrip, StatusLine, EmptyState, ShortcutOverlay, Toast), `lib/` (backend bridge, keys, theme), `styles.css`. Alternative considered: a fresh `create-tauri-app` scaffold with ad-hoc structure; rejected because the trimmer layout is proven and the author knows it.

### Wayland is enforced in Rust before Tauri starts
Copy `validate_wayland()` from the trimmer: set `GDK_BACKEND=wayland`, require `WAYLAND_DISPLAY`, connect to the socket, exit 2 with a stderr message otherwise. Window: `decorations: false`, 1280×800, min 640×520, `dragDropEnabled: true`.

### Image bytes flow Rust → webview as a scoped asset or as bytes
- Path input: canonicalise, verify it is a regular readable file, add it to the asset-protocol scope at runtime, hand the webview a `convertFileSrc` URL (trimmer pattern). Webview fetches it and decodes with `createImageBitmap(blob, { imageOrientation: "from-image" })` so EXIF rotation is already baked into the bitmap.
- Stdin (`-`) and clipboard: Rust reads all bytes (clipboard via `wl-paste --no-newline --type image/png`, falling back to the first `image/*` type offered) into a temp file under the app cache dir, then treats it like a path. Source path is `None` for these, which later disables Save-in-place in favour of Save as.
- Drag and drop and `Ctrl+O` go through the same `load_input(path)` command. `Ctrl+V` calls `load_clipboard()`.
- Only one image at a time; loading a new image replaces the document after the later changes add a dirty check (not in scope here).
Alternative: decode in Rust with the `image` crate and ship RGBA; rejected because the webview already decodes every needed format, and `createImageBitmap` handles EXIF.

### Konva stage with three layers and a viewport transform
Stage fills the canvas area and resizes with a `ResizeObserver`. Layers: `image` (one `Konva.Image` of the bitmap), `objects` (empty for now), `ui` (empty for now). The viewport is `{ x, y, scale }` applied to the stage, stored in the zustand store, never persisted. Fit = scale so the image fits inside the canvas minus 24px padding, centred; 100% = scale 1 centred on the current view centre. Zoom range 5%–3200%, zoom to cursor keeps the point under the pointer fixed. Wheel handling on the canvas container: `ctrlKey` ⇒ zoom by `exp(-deltaY * 0.01)` (this is also how WebKitGTK reports pinch); `shiftKey` with a `deltaY`-only mouse wheel ⇒ horizontal pan; otherwise pan by `(deltaX, deltaY)`. Space held or middle button ⇒ drag pan with a grab cursor. `Konva.pixelRatio` follows `devicePixelRatio`. Alternative: raw Canvas2D; rejected per the exploration (Konva gives the transformer and hit testing later changes need).

### Theme: CSS variables, two flavours, system follow
`styles.css` defines `:root[data-theme="mocha"]` and `:root[data-theme="latte"]` blocks copied verbatim from board 1i plus the shared geometry block. Tailwind 4 `@theme` maps utility colours to those variables. `data-theme` is set from `prefers-color-scheme` via `matchMedia` and overridden by `theme = "mocha" | "latte"` in config (sent to the webview with the launch options). Konva UI colours that later changes need (selection, handles, dim) are read with `getComputedStyle` into a `useThemeColors()` hook so canvas and DOM stay in sync.

### Keyboard dispatcher at the editor boundary
One `useKeymap()` hook on the editor root maps `event` → action using a declarative table (`keys.ts`) that also feeds the shortcut overlay and tooltips. Events are ignored when focus is in an input, textarea or contenteditable, or when an overlay owns them. Tool shortcuts (V C S L R O A T B H X N) register as entries now but their actions are no-ops with disabled toolbar buttons until the tools exist; this keeps the overlay content complete from day one. Rotate is `L`/`Shift+L` per the design.

### Chrome geometry and compact rule
Grid: top bar `--topbar-h`, toolbar `--toolbar-w`, options strip `--strip-h` (rendered empty but present when a tool with options is active, otherwise collapsed), status line `--status-h` toggled by config `status_line = true`. Under 960px wide: file name truncates, Fit/100% fold into the zoom menu, Save as becomes an icon button, options strip scrolls horizontally with a fading right edge. Under 600px tall: Undo/Redo move to the top bar. Implemented with a `useViewportSize()` hook rather than CSS media queries because the toolbar reflow is structural.

### Config and state directories
`$XDG_CONFIG_HOME/woge/config.toml`, `#[serde(deny_unknown_fields)]`, startup fails with exit 2 naming the file and key on any error (trimmer behaviour). Keys this change defines: `theme`, `status_line`, `checkerboard`. Later changes extend the struct. `$XDG_STATE_HOME/woge/` holds logs now and `state.json` later. Precedence: built-in default < config file < CLI flag.

### Testing
Rust: unit tests for CLI parsing, config precedence and error messages, Wayland validation error text, input byte sniffing. Frontend: vitest for the viewport math (fit, zoom-to-cursor, clamping), keymap dispatch (ignored in inputs, modifier matching), theme resolution, compact rule thresholds. Konva is mocked in jsdom; no visual tests.

## Risks / Trade-offs

- [WebKitGTK may deliver pinch as `gesturechange` instead of ctrl+wheel on some versions] → also listen for `gesturestart/change` and treat scale deltas as zoom; verify on Hyprland during apply.
- [Large images (>8k) make a single `Konva.Image` slow to redraw while panning] → enable `imageSmoothingEnabled` only above 100% zoom and cache the image node; acceptable for v1.
- [`wl-paste` absent on the machine] → report a toast "wl-paste not found" and keep the empty state; flake provides wl-clipboard.
- [Fonts: fontsource variable fonts must be loaded before Konva measures text in later changes] → load Inter and JetBrains Mono in `main.tsx` and await `document.fonts.ready` before the first render.

## Migration Plan

Greenfield. Rollback is deleting the repository contents.

## Open Questions

- Checkerboard canvas background defaults to off (flat mantle) per the design assumption; exposed as config `checkerboard` and in the zoom menu.
