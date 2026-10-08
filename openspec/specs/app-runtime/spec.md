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
The repository SHALL provide a flake with `packages.x86_64-linux.default`, `apps.x86_64-linux.default` and `devShells.x86_64-linux.default`. The packaged binary SHALL wrap `GDK_BACKEND=wayland` and put `wl-paste` on `PATH`.

#### Scenario: Build and run
- **WHEN** `nix run .#default -- image.png` is executed on a Wayland session
- **THEN** the editor opens with the image loaded

#### Scenario: Development shell
- **WHEN** a developer runs `nix develop` then `npm install` and `npm run tauri dev`
- **THEN** the application starts in development mode with hot reload
