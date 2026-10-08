# editor-chrome Specification

## Purpose
Editor UI shell around the canvas: Catppuccin theming, layout, top bar, toolbar, empty state, shortcut overlay, status line and toasts.

## Requirements

### Requirement: Catppuccin theming from design tokens
The UI SHALL define all colours, fonts, radii and chrome geometry as CSS custom properties exactly as listed in design board 1i (`:root[data-theme="mocha"]`, `:root[data-theme="latte"]`, shared geometry block). No component SHALL hard-code a colour or a chrome dimension.

#### Scenario: System dark
- **WHEN** `theme = "auto"` and the system prefers dark
- **THEN** `data-theme="mocha"` is set on the root and the chrome uses the Mocha values

#### Scenario: System changes at runtime
- **WHEN** the system colour scheme flips while the app runs under `theme = "auto"`
- **THEN** the theme switches without a restart

#### Scenario: Forced theme
- **WHEN** `theme = "latte"` is configured
- **THEN** `data-theme="latte"` is set regardless of system preference

### Requirement: Layout matches the design
The window SHALL be composed of a top bar (`--topbar-h`) spanning the full width, a left toolbar (`--toolbar-w`), an options strip (`--strip-h`) under the top bar that is present only when the active tool has options, the canvas area filling the rest, and an optional status line (`--status-h`) at the bottom when `status_line` is enabled.

#### Scenario: Default layout
- **WHEN** an image is loaded and the Select tool is active
- **THEN** the top bar, toolbar, canvas and status line are visible and no options strip is shown

#### Scenario: Status line disabled
- **WHEN** `status_line = false`
- **THEN** the canvas extends to the bottom edge

### Requirement: Top bar contents and behaviour
The top bar SHALL show, left to right: file name (or "woge" when empty, "stdin" or "clipboard" for byte inputs) and `W × H` in the mono font; a centred zoom readout that opens the zoom menu; Copy (primary), Save, Save as… buttons and a close control on the right. The whole bar except its buttons SHALL act as a window drag region. Copy, Save and Save as SHALL be rendered disabled in this change.

#### Scenario: Drag the window
- **WHEN** the user presses on empty top bar space and drags
- **THEN** the window moves (Tauri `startDragging`)

#### Scenario: Disabled actions
- **WHEN** an image is loaded
- **THEN** Copy, Save and Save as are visible, disabled, with tooltips naming their shortcuts

### Requirement: Toolbar lists every tool with shortcut tooltips
The toolbar SHALL show, in order with dividers: Select (V), Crop (C), Resize (S), Rotate (L, Shift+L reverse) | Rectangle (R), Ellipse (O), Arrow (A), Text (T), Brush (B), Highlighter (H), Redact (X), Counter badge (N) | Undo (Ctrl+Z), Redo (Ctrl+Shift+Z). Icons are Phosphor regular at `--toolbar-icon`. Tools not yet implemented SHALL be disabled; Select SHALL be active by default. Hovering or focusing a button SHALL show a tooltip with the name and a kbd chip.

#### Scenario: Tooltip
- **WHEN** the user hovers the Rectangle button
- **THEN** a tooltip "Rectangle  R" appears after a short delay

#### Scenario: Active state
- **WHEN** Select is the active tool
- **THEN** its button shows the `--surface-hover` background and `--accent` icon colour

### Requirement: Empty state
With no document the canvas area SHALL show the empty state from board 1e: an image icon, "Drop an image, paste from clipboard (Ctrl V), or open (Ctrl O)", and a short list of Pan, Zoom, Copy result and All shortcuts hints. Dragging a file over the window SHALL highlight the drop zone.

#### Scenario: Launch without input
- **WHEN** `woge` starts with no input
- **THEN** the empty state is shown and the toolbar tools are disabled

### Requirement: Shortcut overlay
Pressing `?` SHALL open a dimmed overlay listing all shortcuts in three columns (Tools, Navigation, File & edit) generated from the keymap table. `?` or `Esc` SHALL close it. While open, other shortcuts SHALL be inert.

#### Scenario: Open and close
- **WHEN** the user presses `?` then `Esc`
- **THEN** the overlay appears then disappears and no other action fires

### Requirement: Keyboard shortcuts are ignored in text fields
Global shortcuts SHALL not fire while focus is in an input, textarea or contenteditable element.

#### Scenario: Typing in a field
- **WHEN** focus is in a text input and the user types `v`
- **THEN** the Select tool is not activated

### Requirement: Compact layout
Below 960px window width the file name SHALL truncate first (dimensions never), Fit and 100% SHALL move into the zoom menu, Save as SHALL become an icon button, and the options strip SHALL scroll horizontally with a fading right edge instead of wrapping. Below 600px height Undo and Redo SHALL move to the top bar.

#### Scenario: Minimum window
- **WHEN** the window is 640×520
- **THEN** no element overflows, the toolbar fits without scrolling and Undo/Redo are in the top bar

### Requirement: Status line
When enabled the status line SHALL show the pointer position in image pixels as `x 1532 y 860` in the mono font, blank when the pointer is outside the image. Later changes append selection and mode details.

#### Scenario: Pointer over image
- **WHEN** the pointer is over image pixel (120, 45)
- **THEN** the status line reads `x 120 y 45`

### Requirement: Toast feedback
A non-blocking toast at the bottom centre SHALL show short messages for 2.5 seconds, newest replacing the previous one, optionally with one action button.

#### Scenario: Error toast
- **WHEN** an image fails to load
- **THEN** a toast "Could not read image" appears and dismisses itself after 2.5 seconds

### Requirement: Geometry tools are enabled in the chrome
The toolbar SHALL enable Crop, Resize, Rotate, Undo and Redo. Undo/Redo enablement follows history availability. The options strip SHALL show the Crop contents in crop mode and the Resize contents in resize mode, per design boards 1c, 1d, 1m.

#### Scenario: After loading an image
- **WHEN** a document exists and no mode is active
- **THEN** Crop, Resize and Rotate are enabled, Undo and Redo are disabled

#### Scenario: Mode strip
- **WHEN** the user enters crop mode
- **THEN** the options strip appears with the crop presets and hint, and disappears on confirm or cancel

### Requirement: Mode-aware status line
In crop mode the status line SHALL append `crop W × H @ X,Y`; in resize mode `scale N%`.

#### Scenario: Crop status
- **WHEN** the crop rect is (240,120,1240,720)
- **THEN** the status line ends with `crop 1240 × 720 @ 240,120`
