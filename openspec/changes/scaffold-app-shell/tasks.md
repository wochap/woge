## 1. Project scaffold

- [ ] 1.1 Initialise the Tauri 2 + React 19 + TypeScript + Vite project at the repo root (`package.json`, `index.html`, `vite.config.ts`, `tsconfig*.json`, `src-tauri/` with `Cargo.toml`, `tauri.conf.json`, `build.rs`, `capabilities/default.json`), identifier `com.wochap.woge`, window 1280×800 min 640×520, `decorations: false`, `dragDropEnabled: true`, asset protocol enabled with empty scope and the CSP from video-trimmer adapted to images only
- [ ] 1.2 Add dependencies: tauri, tauri-plugin-dialog, clap (derive), serde, serde_json, toml, directories, thiserror, tracing, tracing-subscriber, tracing-appender; react, react-dom, react-konva, konva, zustand, tailwindcss + @tailwindcss/vite, @phosphor-icons/react, @fontsource-variable/inter, @fontsource-variable/jetbrains-mono, @tauri-apps/api, @tauri-apps/plugin-dialog; dev: vitest, jsdom, @testing-library/react, @testing-library/user-event, prettier, typescript
- [ ] 1.3 Write `flake.nix` modelled on video-trimmer: `rustPlatform.buildRustPackage` with `cargo-tauri.hook`, `fetchNpmDeps`, `wrapGAppsHook3`, buildInputs webkitgtk_4_1/gtk3/glib/librsvg/dbus, runtime `wl-clipboard` and `fontconfig` on PATH, `GDK_BACKEND=wayland`; dev shell with the same tools; `apps.default`; placeholder npmDeps hash to be fixed after the first `npm install` produces `package-lock.json`
- [ ] 1.4 Add `.gitignore` for `node_modules`, `dist`, `src-tauri/target`, `.direnv`; add npm scripts `dev`, `build`, `tauri`, `test`, `test:rust`, `format`
- [ ] 1.5 Copy `scripts/icons.sh` approach from video-trimmer and generate placeholder app icons so `tauri build` succeeds

## 2. Rust runtime

- [ ] 2.1 `lib.rs`: `run()` validates Wayland (port `validate_wayland` from video-trimmer), loads config, resolves effective options, initialises logging, builds the Tauri app with the dialog plugin and managed state; `main.rs` calls it; exit codes 0/1/2 as constants in `lifecycle.rs`
- [ ] 2.2 `cli.rs`: clap `Cli` with `input: Option<PathBuf>` (`-` allowed), `--clipboard` conflicting with `input`, `--theme`, `-v`; `LaunchOptions` serialisable struct; unit tests for each scenario in `cli-and-config`
- [ ] 2.3 `config.rs`: `FileConfig` with `deny_unknown_fields` (`theme`, `status_line`, `checkerboard`), loader that reports file and key on error, `resolve(cli, file) -> Effective`; tests for missing file, unknown key, invalid value, precedence
- [ ] 2.4 `logging.rs`: tracing to `$XDG_STATE_HOME/woge/woge.log` with `-v` → debug; stdout untouched
- [ ] 2.5 `input.rs`: `InputSource::{Path, Stdin, Clipboard}`; read stdin fully when `-`; `read_clipboard()` runs `wl-paste --list-types` then `wl-paste --no-newline --type <image/*>`, with distinct errors for "not found" and "no image"; stage bytes in `$XDG_CACHE_HOME/woge/<uuid>.<ext>`; cleanup of staged files on replace and exit; byte-sniff tests for png/jpeg/webp
- [ ] 2.6 `app.rs` Tauri commands: `take_launch_options` (once), `load_input(path)` (canonicalise, verify regular file, add to asset scope, return `{url, path, name, bytes}`), `load_clipboard()`, `exit_application(code)`; register `core:window:allow-start-dragging`, `core:window:allow-close`, `dialog:allow-open` in capabilities

## 3. Theme and chrome

- [ ] 3.1 `src/styles.css`: copy the Mocha, Latte and shared geometry blocks from design board 1i verbatim; Tailwind 4 `@theme` mapping colours/fonts/radii to those variables; base styles (focus ring in `--accent`, selection, no outline on `:focus`)
- [ ] 3.2 `lib/theme.ts` + `useTheme()`: resolve `auto` via `matchMedia('(prefers-color-scheme: dark)')` with live updates, apply `data-theme`; `useThemeColors()` reading `--accent`, `--border`, `--dim`, `--bg-canvas` via `getComputedStyle` for Konva; tests for resolution
- [ ] 3.3 `lib/keys.ts`: declarative keymap table (id, label, keys, column, enabled) covering every shortcut in the design's overlay; `useKeymap()` dispatcher that ignores inputs/textareas/contenteditable and is inert while an overlay is open; tests for modifier matching and input suppression
- [ ] 3.4 `chrome/TopBar.tsx`: file name / dimensions (skeleton while loading), zoom readout + `ZoomMenu` (Fit, 100%, Zoom in, Zoom out, Checkerboard), Copy/Save/Save as (disabled) and close; drag region via `getCurrentWindow().startDragging()` on mousedown of empty space
- [ ] 3.5 `chrome/Toolbar.tsx` + `tools/registry.ts`: ordered tool list with Phosphor icons, shortcuts, enabled flags (only Select enabled), active styling, `Tooltip` with kbd chip (Radix tooltip or minimal own)
- [ ] 3.6 `chrome/OptionsStrip.tsx` slot (renders children for the active tool, collapsed when none; horizontal scroll with fading edge in compact mode), `chrome/StatusLine.tsx` (pointer image coords), `chrome/Toast.tsx` (queue, 2.5s, optional action), `chrome/EmptyState.tsx` from board 1e with drop highlight
- [ ] 3.7 `chrome/ShortcutOverlay.tsx`: three columns generated from the keymap table, `?`/Esc toggle, dim backdrop
- [ ] 3.8 `useViewportSize()` + compact rules (<960 w: truncate name, fold Fit/100% into menu, Save as icon-only; <600 h: Undo/Redo into top bar); test the threshold logic

## 4. Document store and canvas

- [ ] 4.1 `store/editor.ts` (zustand): `document: { base: ImageBitmap, width, height, sourcePath: string | null, name } | null`, `viewport: { x, y, scale }`, `activeTool`, `loading`, `toast`; actions `setDocument`, `setViewport`, `fit`, `zoomTo(scale, aroundScreenPoint)`, `zoomStep(dir)`, `actualSize`
- [ ] 4.2 `lib/viewport.ts` pure math: `fitTransform(image, canvas, padding=24)`, `zoomAround(view, factor, point)`, `clampScale(5%…3200%)`, `screenToImage`, `imageToScreen`; vitest for each `viewport-navigation` scenario
- [ ] 4.3 `lib/backend.ts`: typed wrappers for `take_launch_options`, `load_input`, `load_clipboard`, `exit_application`, and the dialog plugin `open()` filtered to png/jpg/jpeg/webp
- [ ] 4.4 `lib/decode.ts`: fetch the asset URL → blob → `createImageBitmap(blob, { imageOrientation: 'from-image' })`; error → "Could not read image" toast; load-id guard so a superseded load is dropped
- [ ] 4.5 `canvas/Stage.tsx`: react-konva `Stage` sized by `ResizeObserver`, pixelRatio = devicePixelRatio, layers `image` / `objects` / `ui`, `Konva.Image` of the bitmap, optional checkerboard background (CSS on the container), background `--bg-canvas`
- [ ] 4.6 `canvas/useNavigation.ts`: wheel handler (Ctrl → zoom to cursor; Shift+vertical → horizontal pan; else pan), `gesturestart/gesturechange` fallback for pinch, Space/middle drag pan with cursor changes, keyboard zoom commands wired through the keymap, resize behaviour (keep centre; re-fit if still fitted)
- [ ] 4.7 Wire input paths: on mount call `take_launch_options` and load accordingly; drag-and-drop via Tauri `onDragDropEvent`; `Ctrl+O` dialog; `Ctrl+V` clipboard; show loading skeleton; staged-file cleanup on replace
- [ ] 4.8 `App.tsx` composes TopBar, Toolbar, OptionsStrip, Stage or EmptyState, StatusLine, Toast, ShortcutOverlay; `main.tsx` imports fonts and awaits `document.fonts.ready` before rendering

## 5. Verification

- [ ] 5.1 `npm test` green: viewport math, keymap, theme resolution, compact thresholds, TopBar/Toolbar render tests
- [ ] 5.2 `cargo test` green: cli, config, input sniffing, Wayland error message
- [ ] 5.3 Manual check in `nix develop`: `npm run tauri dev -- -- image.png`, `grim - | woge -` equivalent via `cargo run -- -`, `--clipboard`, empty state, drag-drop, `Ctrl+O`, `Ctrl+V`, pan/zoom with mouse and touchpad, `?` overlay, theme switch, 640×520 window; record results in `docs/verification.md`
- [ ] 5.4 Fix the flake `npmDeps` hash and confirm `nix build` succeeds; write `README.md` with install, usage and shortcuts
