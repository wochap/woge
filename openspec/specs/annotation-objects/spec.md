# annotation-objects Specification

## Purpose
Vector annotation objects in the document: selection, move and transform, delete/duplicate/z-order, object clipboard, export and crop clipping.

## Requirements

### Requirement: Objects live in the document
Annotation objects SHALL be stored in `document.objects` with a unique id, a type, a z-order and geometry in rotated-image space. Colours SHALL be stored as palette keys (red, peach, yellow, green, teal, blue, mauve, pink, white, black) and resolved to the active flavour's `--ann-*` value at render and export. Stroke widths SHALL be stored as S/M/L and resolve to 2/4/8 px scaled by `max(1, min(size.w, size.h) / 1080)`.

#### Scenario: Width scaling
- **WHEN** a rectangle with width M is drawn on a 3840×2160 document
- **THEN** its stroke renders 8px wide in image pixels

#### Scenario: Flavour-aware colour
- **WHEN** a red rectangle is exported under Latte
- **THEN** the exported stroke is `#d20f39`

### Requirement: Selection
In the Select tool a click SHALL select the topmost object under the pointer, Shift+click SHALL toggle, dragging on empty space SHALL marquee-select intersecting objects, clicking empty space SHALL clear. `Ctrl+A` SHALL select all. Selected objects SHALL show the transformer with 8px corner and edge handles and no rotation handle.

#### Scenario: Marquee
- **WHEN** the user drags a marquee that intersects two of three objects
- **THEN** exactly those two are selected

#### Scenario: Toggle
- **WHEN** one object is selected and the user Shift+clicks another
- **THEN** both are selected

### Requirement: Move and transform
Dragging a selected object SHALL move it; dragging handles SHALL resize it; Shift SHALL keep the aspect ratio, Alt SHALL scale from the centre. Stroke width SHALL NOT scale with the object. Arrow keys SHALL nudge 1px, Shift+arrows 10px. Each completed drag or transform SHALL be one history entry.

#### Scenario: Transform keeps stroke
- **WHEN** a rectangle with width M is scaled to twice its size
- **THEN** its stroke is still M

#### Scenario: Nudge
- **WHEN** two objects are selected and the user presses Shift+Right
- **THEN** both move 10px right and one history entry is created

### Requirement: Delete, duplicate, z-order
`Delete`/`Backspace` SHALL remove the selection. `Ctrl+D` SHALL duplicate with a 10px offset and select the copies; `Alt+drag` SHALL duplicate then move. `Ctrl+]`/`Ctrl+[` SHALL move the selection one step forward/backward; with Shift to front/back.

#### Scenario: Duplicate
- **WHEN** the user presses `Ctrl+D` with one object selected
- **THEN** a copy appears 10px right and down and is the new selection

#### Scenario: Bring to front
- **WHEN** the bottom object is selected and the user presses `Ctrl+Shift+]`
- **THEN** it renders above all others

### Requirement: Object clipboard
`Ctrl+C` with a selection SHALL copy the selected objects to an in-memory clipboard; `Ctrl+X` SHALL also delete them; `Ctrl+V` SHALL paste copies offset by 10px when the internal clipboard is non-empty, otherwise fall back to pasting a system clipboard image. `Ctrl+C` with no selection SHALL copy the image as before.

#### Scenario: Copy objects
- **WHEN** two objects are selected and the user presses `Ctrl+C` then `Ctrl+V`
- **THEN** two copies are pasted and selected, and the image was not copied to the system clipboard

### Requirement: Objects are exported and hidden outside the crop
Objects SHALL render inside the document transform so they are exported with the image and clipped by the crop.

#### Scenario: Object outside crop
- **WHEN** an object lies entirely outside the crop rect
- **THEN** it is not visible and not exported, but reappears if the crop is undone

### Requirement: Status line selection size
With a selection the status line SHALL append `sel W × H` of the selection bounds; while drawing a shape it SHALL show the live size.

#### Scenario: Selection size
- **WHEN** a 760×224 rectangle is selected
- **THEN** the status line ends with `sel 760 × 224`

### Requirement: Paint object types
`brush`, `highlight`, `redact` and `badge` objects SHALL be members of the annotation object union and SHALL participate in selection, move, z-order, duplicate, delete, object clipboard and image rotation. Transform scaling SHALL apply to `brush`, `highlight` and `redact` (stroke widths unchanged) and SHALL NOT apply to `badge`.

#### Scenario: Mixed selection
- **WHEN** a rectangle, a brush stroke and a badge are selected and nudged
- **THEN** all three move together in one history entry

#### Scenario: Transformer with badge
- **WHEN** only a badge is selected
- **THEN** no resize handles are shown, only a selection outline

### Requirement: Colour opacity is part of the object
Rectangle, ellipse, arrow, text, brush and highlight objects SHALL store their primary colour opacity. Rectangle and ellipse SHALL also store a fill colour (or none) and a fill opacity. Text SHALL also store a plate colour (or none) and a plate opacity. Opacities SHALL be numbers in [0, 1]. They SHALL be part of the document snapshot, so they are undoable. They SHALL be carried by duplicate, the object clipboard and image rotation. They SHALL render identically on the canvas and in export. Badge and redact objects SHALL have no opacity fields. A style patch SHALL apply only the fields an object type supports: a fill patch SHALL be ignored by arrows, and a plate patch SHALL be ignored by shapes.

#### Scenario: Export keeps opacity
- **WHEN** a rectangle with a yellow fill at 40% is exported as PNG
- **THEN** the exported pixels inside the rectangle are the image blended with yellow at 40%

#### Scenario: Undo opacity change
- **WHEN** the user changes a selected arrow's opacity to 30% and presses `Ctrl+Z`
- **THEN** the arrow's opacity returns to its previous value

#### Scenario: Mixed selection fill
- **WHEN** a rectangle and an arrow are selected and the fill colour is set to blue
- **THEN** the rectangle gets a blue fill and the arrow is unchanged
