# text-tool Specification

## Purpose
Text tool: creation and in-place editing, text options, font list and font loading before drawing.

## Requirements

### Requirement: Text creation and in-place editing
With Text (`T`) active, a click SHALL create a text object at that point and open the in-place editor. Double-clicking a text object, or pressing Enter with exactly one text selected, SHALL open the editor. The editor is an overlay matching the object's font, size, colour and on-screen scale; `Ctrl+Enter` or blur commits, `Esc` cancels, Enter inserts a newline. Committing empty text SHALL delete the object.

#### Scenario: Create
- **WHEN** the user clicks at (500,300) with Text active and types "fix before 0.4" then presses Ctrl+Enter
- **THEN** a text object with that content exists at (500,300), selected, one history entry

#### Scenario: Empty commit
- **WHEN** the user opens the editor on new text and blurs without typing
- **THEN** no text object remains

#### Scenario: Edit existing
- **WHEN** the user double-clicks an existing text
- **THEN** the editor opens with the current content and caret at the end

### Requirement: Text options
Text objects SHALL have a colour with an opacity (0–100%), font family, size (8–200), bold, and a plate that is either none or a palette colour with a plate opacity (0–100%). The plate SHALL render as a rounded rectangle behind the text with 4px padding and unchanged radius. Its colour and opacity are independent of the theme, so canvas and export look the same in Mocha and Latte. Enabling the plate without choosing a colour (`}` while there is no plate) SHALL pick black or white, whichever contrasts more with the resolved text colour, at 70%. Setting a plate colour on text with no plate SHALL reuse the tool's last plate opacity (built-in 70%).

The strip SHALL follow boards 1p/1p-b, after the strip's existing tool-name label:
- Text and Plate target chips
- the swatch row with the reserved ⊘ slot, active only for the Plate target
- the Opacity slider for the active target, showing "—" and disabled when there is no plate
- a font combobox
- a size stepper (`Ctrl+Shift+>`/`<` also steps the size of a selection)
- Bold (ph-text-b)

The Plate toggle is removed. Resizing a selected text from a corner SHALL scale its size; resizing from a side SHALL change its wrap width.

#### Scenario: Plate colour
- **WHEN** a text has a black plate at 50%
- **THEN** a rounded black rectangle at 50% alpha renders behind the text with 4px padding

#### Scenario: Auto-contrast plate
- **WHEN** yellow text with no plate is selected and the user presses `}`
- **THEN** the plate becomes black at 70%

#### Scenario: Translucent text
- **WHEN** the text opacity is set to 60%
- **THEN** the glyphs render at 60% alpha and the plate opacity is unchanged

#### Scenario: Corner resize
- **WHEN** the user drags a corner handle of a 24px text to double its height
- **THEN** size becomes 48

### Requirement: Font list
The backend SHALL enumerate installed font families via fontconfig (`fc-list : family`), dedupe and sort them, and prepend the bundled `Inter Variable` and `JetBrains Mono Variable`. The combobox SHALL filter by substring, show a Recent group (last 5 used) then All, render each row in its own family, and support arrow/Enter/Esc navigation. Default font is `Inter Variable`.

#### Scenario: Enumerate
- **WHEN** `list_fonts` is called on a system with DejaVu Sans installed
- **THEN** the result includes "DejaVu Sans" once and starts with the two bundled families

#### Scenario: Search
- **WHEN** the user types "mono" in the combobox
- **THEN** only families containing "mono" (case-insensitive) are listed

#### Scenario: fc-list missing
- **WHEN** fontconfig is unavailable
- **THEN** the list contains only the bundled fonts and a toast is not shown (silent fallback, logged)

### Requirement: Fonts are loaded before drawing
Before a text object renders in a family for the first time the editor SHALL await the font load so canvas text and export never fall back to a default face.

#### Scenario: First use of a system font
- **WHEN** the user picks "Fira Code" for a text
- **THEN** the canvas redraws in Fira Code once loaded and the export uses it
