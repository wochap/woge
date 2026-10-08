## ADDED Requirements

### Requirement: Rectangle and ellipse creation
With Rectangle (`R`) or Ellipse (`O`) active, dragging on the canvas SHALL create the shape from the press point to the pointer. Shift SHALL constrain to a square/circle, Alt SHALL draw from the centre. Releasing with both dimensions under 3px SHALL discard the shape. The new shape SHALL use the tool's current colour, width and fill and SHALL be selected after creation while the tool stays active (unless `tool_sticky = false`).

#### Scenario: Draw rectangle
- **WHEN** the user drags from (100,100) to (400,300) with Rectangle active
- **THEN** a rectangle at (100,100) 300×200 is added, selected, and one history entry exists

#### Scenario: Shift circle
- **WHEN** the user drags 300×120 with Ellipse active and Shift held
- **THEN** a 300×300 circle is created

#### Scenario: Tiny drag discarded
- **WHEN** the user clicks without dragging with Rectangle active
- **THEN** no object is created

### Requirement: Fill toggle
Rectangles and ellipses SHALL have a fill toggle. When on, the interior is filled with the stroke colour at 25% opacity.

#### Scenario: Fill on
- **WHEN** Fill is enabled and a red rectangle is drawn
- **THEN** its interior renders red at 25% alpha

### Requirement: Arrow creation and options
With Arrow (`A`) active, dragging SHALL create an arrow from the press point to the pointer with a head at the end; Shift SHALL snap the angle to 45° steps. Options: colour, width S/M/L, heads End or Both. Selected arrows SHALL show two endpoint handles instead of a box and SHALL be movable as a whole.

#### Scenario: Snap angle
- **WHEN** the user drags an arrow at 40° with Shift held
- **THEN** the arrow is at exactly 45°

#### Scenario: Both heads
- **WHEN** heads is set to Both
- **THEN** arrowheads render at both endpoints

#### Scenario: Endpoint edit
- **WHEN** the user drags the end handle of a selected arrow
- **THEN** only that endpoint moves

### Requirement: Shape options strip
The options strip SHALL show, for Rectangle/Ellipse: ten colour swatches (Catppuccin accents + white + black, selected swatch ringed in `--accent`, dark-on-dark swatches get a 1px `--surface-rim` rim), width S/M/L segmented control and the Fill toggle; for Arrow: swatches, width and End/Both. Changing a value SHALL update selected objects of that type and set the tool default.

#### Scenario: Change colour with selection
- **WHEN** a blue rectangle is selected and the user clicks the green swatch
- **THEN** the rectangle turns green (one history entry) and the next rectangle drawn is green

#### Scenario: Change colour without selection
- **WHEN** nothing is selected and the user clicks the yellow swatch with Arrow active
- **THEN** only the Arrow tool default changes
