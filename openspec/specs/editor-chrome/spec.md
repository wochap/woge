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
The window SHALL be composed of a top bar (`--topbar-h`) spanning the full width, a left toolbar (`--toolbar-w`), an options strip (`--strip-h`) under the top bar that is always present, the canvas area filling the rest, and an optional status line (`--status-h`) at the bottom when `status_line` is enabled. The options strip row SHALL never collapse, so the canvas area keeps the same size when the active tool, the selection or the mode changes.

#### Scenario: Default layout
- **WHEN** an image is loaded and the Select tool is active with nothing selected
- **THEN** the top bar, toolbar, options strip (showing its empty-state hint), canvas and status line are visible

#### Scenario: Canvas does not shift on tool change
- **WHEN** the user switches from Select with nothing selected to the Rectangle tool, then presses Esc
- **THEN** the canvas area's position and size are unchanged throughout and no viewport refit is triggered

#### Scenario: Canvas does not shift on selection
- **WHEN** the user selects an object and then clears the selection
- **THEN** the canvas area's position and size are unchanged

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
With no document the canvas area SHALL show the empty state from board 1e: an image icon, "Drop an image, paste from clipboard (Ctrl V), or open (Ctrl O)", and a short list of Pan, Zoom, Copy result and All shortcuts hints. Dragging a file over the window SHALL highlight the drop zone. The options strip SHALL stay present and read `No image yet · drop, paste or open one`.

#### Scenario: Launch without input
- **WHEN** `woge` starts with no input
- **THEN** the empty state is shown, the toolbar tools are disabled and the options strip reads "No image yet · drop, paste or open one"

### Requirement: Shortcut overlay
Pressing `?` SHALL open a dimmed overlay listing all shortcuts in four columns (Tools, Navigation, Colour, File & edit) generated from the keymap table, per board 1f (1120px wide). The Colour column SHALL list "Border · text · stroke 1 … 0", "Fill · plate ⇧1 … ⇧0", "Border opacity −/+ 10% [ · ]" and "Fill opacity −/+ 10% { · }". A colour key row SHALL show each digit next to its swatch with the note "Hold ⇧ for fill / plate". When the window is narrower than the overlay, the overlay SHALL fit the window width with margins and lay out the columns in two per row. Its height SHALL be capped to the window with margins and its body SHALL scroll, so every shortcut is reachable at 640×520. `?` or `Esc` SHALL close it. While open, other shortcuts SHALL be inert.

#### Scenario: Open and close
- **WHEN** the user presses `?` then `Esc`
- **THEN** the overlay appears then disappears and no other action fires

#### Scenario: Colour column
- **WHEN** the overlay is open
- **THEN** a Colour column lists the colour and opacity keys, and Navigation lists Fit as Ctrl 0 and 100% as Ctrl 1

#### Scenario: Minimum window
- **WHEN** the overlay is opened in a 640×520 window
- **THEN** it does not overflow the window, shows two columns per row, and scrolling reaches the last shortcut

### Requirement: Keyboard shortcuts are ignored in text fields
Global shortcuts SHALL not fire while focus is in an input, textarea or contenteditable element.

#### Scenario: Typing in a field
- **WHEN** focus is in a text input and the user types `v`
- **THEN** the Select tool is not activated

### Requirement: Compact layout
Below 960px window width the file name SHALL truncate first (dimensions never), Fit and 100% SHALL move into the zoom menu, Save as SHALL become an icon button, and the options strip SHALL scroll horizontally with a fading right edge instead of wrapping. The strip row SHALL remain present at every window size. Below 600px height Undo and Redo SHALL move to the top bar.

#### Scenario: Minimum window
- **WHEN** the window is 640×520
- **THEN** no element overflows, the toolbar fits without scrolling, the options strip row is present and Undo/Redo are in the top bar

#### Scenario: Long strip in a narrow window
- **WHEN** the window is 640px wide and a tool with more options than fit is active
- **THEN** the strip scrolls sideways with a fading right edge and its height stays `--strip-h`

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
- **THEN** the options strip shows the crop presets and hint, and returns to the Select strip on confirm or cancel

### Requirement: Mode-aware status line
In crop mode the status line SHALL append `crop W × H @ X,Y`; in resize mode `scale N%`.

#### Scenario: Crop status
- **WHEN** the crop rect is (240,120,1240,720)
- **THEN** the status line ends with `crop 1240 × 720 @ 240,120`

### Requirement: Output actions are live
Copy, Save and Save as in the top bar SHALL be enabled whenever a document exists. Copy is the primary (filled accent) button. A dirty dot SHALL follow the file name when there are unsaved edits.

#### Scenario: Buttons enabled
- **WHEN** an image is loaded
- **THEN** Copy, Save and Save as are enabled with tooltips Ctrl+C, Ctrl+S, Ctrl+Shift+S

#### Scenario: Dirty dot
- **WHEN** the user commits a crop
- **THEN** a dot appears after the file name until the next successful save

### Requirement: Close confirmation dialog
Closing with unsaved edits SHALL show an in-app dialog with Discard, Cancel and Save, styled with the theme tokens, focus on Cancel, Esc = Cancel.

#### Scenario: Save from dialog
- **WHEN** the user chooses Save in the dialog
- **THEN** the normal Save flow runs and the window closes after success

### Requirement: Shape and text tools in the chrome
The toolbar SHALL enable Select, Rectangle, Ellipse, Arrow and Text. The options strip SHALL show the Rectangle, Ellipse, Arrow or Text strip for the active tool per design boards 1g/1g-b/1o, and SHALL also show the strip for the selected object's type when the Select tool is active and exactly one object type is selected.

#### Scenario: Strip follows selection
- **WHEN** Select is active and a text object is selected
- **THEN** the Text strip is shown and edits it

#### Scenario: Mixed selection
- **WHEN** a rectangle and an arrow are selected
- **THEN** only the shared swatches and width controls are shown

### Requirement: Paint tools in the chrome
The toolbar SHALL enable Brush, Highlighter, Redact and Counter badge, completing the tool set. The options strip SHALL show the Brush, Highlighter, Redact or Counter strip for the active tool or for a single-type selection, per design boards 1g/1g-b, 1j, 1k.

#### Scenario: All tools enabled
- **WHEN** a document exists
- **THEN** every toolbar button is enabled and shows its shortcut tooltip
### Requirement: Options strip label and empty hint
Every options strip SHALL begin with the active tool or mode name (for example "Select", "Rectangle", "Crop", "Resize") as a muted label of at least 64px width, per board 1p. When the active tool and selection have no options to show and a document is open, the strip SHALL show the hint `Click an object to edit its style` after the label and `Del removes · ? shortcuts` aligned to the right edge, per boards 1p, 1p-b, 1f and 1l.

#### Scenario: Select with nothing selected
- **WHEN** an image is loaded, the Select tool is active and nothing is selected
- **THEN** the strip reads "Select", then "Click an object to edit its style", with "Del removes · ? shortcuts" on the right

#### Scenario: Tool with options
- **WHEN** the Rectangle tool is active
- **THEN** the strip begins with the label "Rectangle" followed by the rectangle options and no empty-state hint

#### Scenario: Mode label
- **WHEN** resize mode is active
- **THEN** the strip begins with the label "Resize"

### Requirement: Colour and opacity shortcuts
With a document loaded and no crop/resize mode active, the following keys SHALL act on the current strip context: the active drawing tool's default plus any selected objects of that type, or, with Select active, the selected objects.
- `1`…`9`, `0` SHALL set the primary colour (border, text, stroke or badge colour) to red, peach, yellow, green, teal, blue, mauve, pink, white, black respectively.
- `⇧1`…`⇧0` SHALL set the fill colour (rectangle, ellipse) or plate colour (text).
- `[` / `]` SHALL lower / raise the primary opacity by 10%.
- `{` / `}` (Shift+`[` / Shift+`]`) SHALL lower / raise the fill or plate opacity by 10%.

Opacity steps SHALL snap to the nearest multiple of 10% in the step direction and clamp to 0–100%. Held keys SHALL repeat. `}` on an object with no fill or plate SHALL enable it with the auto-contrast colour (see shape-tools / text-tool). Keys SHALL be matched by physical key (`Digit1`…`Digit0`, `BracketLeft`, `BracketRight`) so they work on any layout. They SHALL do nothing for types that lack the property, and with Select active and nothing selected. Each key press on a selection SHALL be one history entry. The keys SHALL be ignored in text fields and while the text or badge editor is open.

#### Scenario: Digit sets border
- **WHEN** a rectangle is selected and the user presses `6`
- **THEN** its border becomes blue in one history entry and the Rectangle default border becomes blue

#### Scenario: Shift digit sets fill
- **WHEN** Rectangle is active with nothing selected and the user presses `⇧3`
- **THEN** the Rectangle tool's fill becomes yellow and the next rectangle drawn is yellow-filled

#### Scenario: Opacity step snaps
- **WHEN** a rectangle with fill opacity 25% is selected and the user presses `}`
- **THEN** the fill opacity becomes 30%; pressing `{` twice then gives 10%

#### Scenario: Clamp
- **WHEN** an arrow at 100% opacity is selected and the user presses `]`
- **THEN** the opacity stays 100% and no history entry is added

#### Scenario: Fill key on arrow
- **WHEN** only arrows are selected and the user presses `⇧2`
- **THEN** nothing changes

#### Scenario: Typing digits in text
- **WHEN** the text editor is open and the user types `3`
- **THEN** "3" is inserted and no colour changes
