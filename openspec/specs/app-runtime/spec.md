# app-runtime Specification

## Purpose
Process lifecycle of woge: Wayland-only startup, the single undecorated window, exit codes, logging and Nix packaging.

## Requirements

### Requirement: Native Wayland session is required
The application SHALL set `GDK_BACKEND=wayland` before initialising GTK and SHALL refuse to start without a reachable Wayland display.

#### Scenario: Wayland display available
- **WHEN** `WAYLAND_DISPLAY` names a socket that accepts a connection
- **THEN** the application starts and opens its window on that display

#### Scenario: No Wayland display
- **WHEN** `WAYLAND_DISPLAY` is unset or the socket cannot be connected
- **THEN** the application prints a one-line diagnostic to stderr naming the problem and exits with status 2 before any window is created

### Requirement: Single undecorated main window
The application SHALL open exactly one window without server-side decorations, 1280×800 by default, resizable down to 640×520, with drag-and-drop enabled.

#### Scenario: Window opens
- **WHEN** the application starts successfully
- **THEN** one window titled "woge" appears with no title bar and the configured default size

#### Scenario: Window minimum size
- **WHEN** the user resizes the window below 640×520
- **THEN** the compositor is told the minimum size and the window does not shrink further

### Requirement: Window reveal without unstyled content
The main window SHALL start hidden and be shown by the backend during startup, after its native background colour is set to the base colour of the effective flavour (Mocha `#1e1e2e`, Latte `#eff1f5`). The effective flavour SHALL be the configured theme when it is `mocha` or `latte`, and the system colour scheme when it is `auto` (Mocha when the system preference cannot be read). The page SHALL paint the same base colour before any bundled stylesheet or script loads, and a forced flavour SHALL be applied to the document before first paint. The frontend SHALL NOT show the window.

#### Scenario: Dark system, auto theme
- **WHEN** the application starts with theme `auto` on a system that prefers dark
- **THEN** every frame from the window's first appearance until the editor paints is Mocha base `#1e1e2e`, with no white frame

#### Scenario: Light system, auto theme
- **WHEN** the application starts with theme `auto` on a system that prefers light
- **THEN** every frame from the window's first appearance until the editor paints is Latte base `#eff1f5`

#### Scenario: Forced flavour differs from the system
- **WHEN** the configuration sets `theme = "mocha"` and the system prefers light
- **THEN** the window background and the page background are Mocha from the first visible frame, and the editor renders in Mocha without switching flavour

#### Scenario: No stale-size editor frame
- **WHEN** the compositor tiles the window to a size other than 1280×800
- **THEN** no visible frame shows the editor UI laid out at 1280×800

#### Scenario: Frontend fails to load
- **WHEN** the page script throws before React mounts
- **THEN** the window is still shown with the themed background

### Requirement: Application icon
The application SHALL use the Transformer mark from design board 2d as its icon, and the simple variant from board 2d-s (corner handles only, thicker box stroke) at 16 and 32 px. The window icon, the favicon, and the icons installed for desktop launchers SHALL all come from these two SVG sources.

#### Scenario: Window icon
- **WHEN** the editor window is open
- **THEN** the compositor/taskbar shows the Transformer mark, not the placeholder "w"

#### Scenario: Small sizes use the simple mark
- **WHEN** the icon is rendered at 16 or 32 px
- **THEN** it shows the simple variant with only the four corner handles

#### Scenario: Large sizes use the full mark
- **WHEN** the icon is rendered at 48 px or larger
- **THEN** it shows the full mark with all eight handles

#### Scenario: Regenerating icons
- **WHEN** a developer runs `scripts/icons.sh`
- **THEN** every PNG listed in `tauri.conf.json` and every hicolor size is regenerated from the SVG sources

### Requirement: Exit codes are stable
The process SHALL exit 0 when the user closes the editor normally, 1 when an operation was cancelled (reserved for later changes), and 2 on startup errors.

#### Scenario: Close from the top bar
- **WHEN** the user activates the close control or presses `Ctrl+Q`
- **THEN** the process exits with status 0

#### Scenario: Startup failure
- **WHEN** configuration loading, Wayland validation or logging initialisation fails
- **THEN** the process exits with status 2 and the message is on stderr

### Requirement: Logging to the state directory
The application SHALL write structured logs to `$XDG_STATE_HOME/woge/woge.log` (default `~/.local/state/woge/`), with `-v` raising the level to debug. Application stdout SHALL stay clean for machine-readable output.

#### Scenario: Default verbosity
- **WHEN** the application runs without `-v`
- **THEN** only info and above are logged and nothing is printed to stdout during normal use

#### Scenario: Verbose
- **WHEN** the application runs with `-v`
- **THEN** debug logs including input decoding and viewport events are written to the log file

### Requirement: Reproducible Nix packaging
The repository SHALL provide a flake with `packages.x86_64-linux.default`, `apps.x86_64-linux.default` and `devShells.x86_64-linux.default`. The packaged binary SHALL wrap `GDK_BACKEND=wayland` and put `wl-paste` on `PATH`. The package SHALL install the application icon into the hicolor theme (PNG sizes and scalable SVG) and a desktop entry that references it.

#### Scenario: Build and run
- **WHEN** `nix run .#default -- image.png` is executed on a Wayland session
- **THEN** the editor opens with the image loaded

#### Scenario: Development shell
- **WHEN** a developer runs `nix develop` then `npm install` and `npm run tauri dev`
- **THEN** the application starts in development mode with hot reload

#### Scenario: Desktop icon installed
- **WHEN** the package is built
- **THEN** its output contains `share/icons/hicolor/<size>/apps/woge.png` for 16, 32, 48, 64, 128, 256 and 512, `share/icons/hicolor/scalable/apps/woge.svg`, and `share/applications/woge.desktop` with `Icon=woge`
