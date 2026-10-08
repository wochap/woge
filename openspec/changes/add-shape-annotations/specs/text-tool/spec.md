## ADDED Requirements

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
Text objects SHALL have colour, font family, size (8–200), bold and a background plate toggle. The strip SHALL show swatches, a font combobox, a size stepper (also `Ctrl+Shift+>`/`<` to step size on a selection), Bold (ph-text-b) and Plate toggles. Resizing a selected text from a corner SHALL scale its size; from a side SHALL change its wrap width.

#### Scenario: Plate
- **WHEN** Plate is on
- **THEN** a rounded `--bg-deep`-coloured rectangle at 70% alpha renders behind the text with 4px padding

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
