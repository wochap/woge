# crop-tool Specification

## Purpose
Interactive crop mode: drawing, moving and resizing the crop rect, aspect presets, visual feedback and committing a non-destructive crop.

## Requirements

### Requirement: Entering and leaving crop mode
Pressing `C` or the Crop button SHALL enter crop mode: object selection is hidden, the options strip shows Free/1:1/4:3/16:9 presets, the live `W × H` readout and the hint "Shift: square · Enter apply · Esc cancel". Enter SHALL apply, Esc SHALL cancel, both returning to the Select tool.

#### Scenario: Enter mode with an existing crop
- **WHEN** the document already has a crop smaller than the image and the user presses `C`
- **THEN** the existing crop rect is shown with handles and the area outside is dimmed

#### Scenario: Cancel
- **WHEN** the user changes the rect and presses Esc
- **THEN** the previous crop is kept and the tool returns to Select

### Requirement: Drawing, moving and resizing the crop rect
Dragging on empty canvas SHALL draw a new rect. Dragging inside the rect SHALL move it. Eight 10px handles SHALL resize it: corners on both axes, edges on one. The rect SHALL be clamped to the image bounds, at least 1×1, with integer coordinates on commit.

#### Scenario: Draw
- **WHEN** the user drags from image point (240,120) to (1480,840)
- **THEN** the rect becomes (240,120,1240,720) and the label reads "1240 × 720"

#### Scenario: Move clamps
- **WHEN** the user drags the rect past the right image edge
- **THEN** the rect stops flush with the edge

#### Scenario: Corner resize
- **WHEN** the user drags the bottom-right handle 100px right and 50px down at 100% zoom
- **THEN** width grows by 100 and height by 50

### Requirement: Aspect constraints
Shift while drawing or resizing SHALL constrain to a square when the preset is Free, or to the active preset otherwise. Alt SHALL draw or resize around the centre. Selecting a preset SHALL re-fit the current rect to that aspect around its centre and keep it locked for subsequent handle drags.

#### Scenario: Shift square
- **WHEN** the user holds Shift while drawing 300 wide and 200 high
- **THEN** the rect is 300×300

#### Scenario: 16:9 preset
- **WHEN** the user picks 16:9 with a 1000×1000 rect
- **THEN** the rect becomes 1000×562 (rounded) centred on the previous centre, and corner drags keep 16:9

#### Scenario: Alt from centre
- **WHEN** the user holds Alt while dragging a corner handle
- **THEN** the opposite side moves symmetrically

### Requirement: Visual feedback
Outside the rect the image SHALL be dimmed with `--dim`. A `W × H` label SHALL sit at the rect's top-left. A floating ✕ / ✓ pair (Esc / Enter) SHALL anchor to the rect's bottom-right and flip inside when it would leave the canvas. The status line SHALL read `crop W × H @ X,Y`.

#### Scenario: Pair near edge
- **WHEN** the rect touches the bottom-right of the canvas area
- **THEN** the ✕ / ✓ pair renders inside the rect instead of below it

### Requirement: Confirming the crop
Enter or ✓ SHALL commit the rect as the new crop, scale `size` by the same ratio the previous size had to the previous crop, and return to Select. Objects outside the crop stay in the document and are hidden.

#### Scenario: Confirm
- **WHEN** the rect is (240,120,1240,720) on an unresized document and the user presses Enter
- **THEN** the document crop is (240,120,1240,720), size is 1240×720, the viewport re-fits, and one history entry exists

#### Scenario: Confirm after a prior resize
- **WHEN** the document size was 50% of the crop and the user confirms a new crop
- **THEN** the new size is 50% of the new crop dimensions

#### Scenario: Keyboard nudge
- **WHEN** the user presses the right arrow in crop mode
- **THEN** the rect moves 1px right (10px with Shift)
