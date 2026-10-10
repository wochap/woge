# shape-tools Specification

## Purpose
Rectangle, ellipse and arrow tools: creation, fill toggle, arrow options and the shape options strip.

## Requirements

### Requirement: Rectangle and ellipse creation
With Rectangle (`R`) or Ellipse (`O`) active, dragging on the canvas SHALL create the shape from the press point to the pointer. Shift SHALL constrain to a square/circle, Alt SHALL draw from the centre. Releasing with both dimensions under 3px SHALL discard the shape. The new shape SHALL use the tool's current border colour, border opacity, width, fill colour and fill opacity and SHALL be selected after creation while the tool stays active (unless `tool_sticky = false`).

#### Scenario: Draw rectangle
- **WHEN** the user drags from (100,100) to (400,300) with Rectangle active
- **THEN** a rectangle at (100,100) 300×200 is added, selected, and one history entry exists

#### Scenario: Shift circle
- **WHEN** the user drags 300×120 with Ellipse active and Shift held
- **THEN** a 300×300 circle is created

#### Scenario: Tiny drag discarded
- **WHEN** the user clicks without dragging with Rectangle active
- **THEN** no object is created

#### Scenario: Uses tool fill
- **WHEN** the Rectangle tool's fill is blue at 30% and the user draws a rectangle
- **THEN** the new rectangle has a blue fill at 30%

### Requirement: Arrow creation and options
With Arrow (`A`) active, dragging SHALL create an arrow from the press point to the pointer with a head at the end; Shift SHALL snap the angle to 45° steps. Options: colour, opacity (0–100%, applied to shaft and heads), width S/M/L, heads End or Both. Arrows have no fill. Selected arrows SHALL show two endpoint handles instead of a box and SHALL be movable as a whole.

#### Scenario: Snap angle
- **WHEN** the user drags an arrow at 40° with Shift held
- **THEN** the arrow is at exactly 45°

#### Scenario: Both heads
- **WHEN** heads is set to Both
- **THEN** arrowheads render at both endpoints

#### Scenario: Endpoint edit
- **WHEN** the user drags the end handle of a selected arrow
- **THEN** only that endpoint moves

#### Scenario: Translucent arrow
- **WHEN** an arrow's opacity is 60%
- **THEN** its shaft and heads render at 60% alpha without a darker overlap where they meet

### Requirement: Shape options strip
The options strip SHALL follow boards 1p/1p-b (compact 1q); the controls below follow the strip's existing tool-name label. For Rectangle/Ellipse it SHALL show:
- Border and Fill target chips, each showing its current colour and opacity (checkerboard behind translucent values, ⊘ for none). The active chip is highlighted, and clicking a chip makes it the target.
- One row of ten swatches (Catppuccin accents + white + black, the active target's colour ringed in `--accent`, dark-on-dark swatches with a 1px `--surface-rim` rim) preceded by a ⊘ no-fill slot. The slot keeps its space at all times but is invisible and inert unless the Fill target is active, so the row never changes width.
- An Opacity slider (0–100%, with a percentage readout) for the active target. With the Fill target active and no fill, the slider is disabled and its readout shows "—".
- The width S/M/L segmented control.

For Arrow it SHALL show swatches, the Opacity slider (stroke), width and End/Both, without chips or the ⊘ slot. Swatch tooltips SHALL name the colour and its key: "Peach 2" for the Border target, "Peach ⇧2" for the Fill target. Changing a value SHALL update selected objects of that type (one history entry) and set the tool default. The active target is strip state, not persisted. It SHALL reset to Border when the strip's object type changes.

#### Scenario: Change colour with selection
- **WHEN** a blue rectangle is selected, the Border target is active, and the user clicks the green swatch
- **THEN** the rectangle's border turns green (one history entry) and the next rectangle drawn has a green border

#### Scenario: Change colour without selection
- **WHEN** nothing is selected and the user clicks the yellow swatch with Arrow active
- **THEN** only the Arrow tool default changes

#### Scenario: Set fill from strip
- **WHEN** a rectangle with no fill is selected, the user clicks the Fill chip, then the blue swatch
- **THEN** the rectangle gets a blue fill at the tool's fill opacity and the Fill chip shows blue

#### Scenario: Remove fill
- **WHEN** the Fill target is active and the user clicks ⊘
- **THEN** the fill becomes none, the opacity readout shows "—" and the slider is disabled

#### Scenario: Reserved slot
- **WHEN** the user switches the target between Border and Fill
- **THEN** the swatch row keeps its width and position; ⊘ is only visible for Fill

#### Scenario: Opacity slider
- **WHEN** the Border target is active and the user drags the slider to 40%
- **THEN** the selected shape's border opacity becomes 40% in one history entry when the drag ends

### Requirement: Border and fill colours with opacity
Rectangles and ellipses SHALL have a border colour (one of the ten palette keys) with a border opacity, and a fill that is either none or a palette colour with a fill opacity. Opacities are continuous from 0 to 100%. The border SHALL render in its colour at its opacity, and the interior SHALL render in the fill colour at the fill opacity, or stay empty when the fill is none. Setting a fill colour on a shape with no fill SHALL reuse the tool's last fill opacity (built-in 25%). Enabling a fill without choosing a colour (`}` while there is no fill) SHALL pick black or white, whichever contrasts more with the resolved border colour.

#### Scenario: Different fill colour
- **WHEN** a rectangle has a red border at 100% and a yellow fill at 40%
- **THEN** its border renders opaque red and its interior renders yellow at 40% alpha

#### Scenario: No fill
- **WHEN** the fill is none
- **THEN** the interior is transparent and only the border renders

#### Scenario: Translucent border
- **WHEN** the border opacity is set to 50%
- **THEN** the border renders at 50% alpha and the fill opacity is unchanged
