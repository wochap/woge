# freehand-tools Specification

## Purpose
Brush and highlighter freehand tools: stroke capture, rendering, stroke objects, drawing performance and their options strips.

## Requirements

### Requirement: Brush strokes
With Brush (`B`) active, pressing and moving SHALL draw a freehand stroke in the current colour, opacity and width (S/M/L = 2/4/8 px scaled like shapes), round caps and joins, committed as one object on release. A translucent stroke SHALL render with uniform alpha, without darker spots where it overlaps itself. Points closer than 1.5 image px SHALL be decimated. Shift SHALL constrain the stroke to horizontal or vertical. Strokes under 2 points SHALL draw a dot.

#### Scenario: Draw stroke
- **WHEN** the user drags a curve with Brush active
- **THEN** one `brush` object with the sampled points is added and selected, one history entry

#### Scenario: Smooth toggle
- **WHEN** Smooth is on
- **THEN** the stroke is rendered with curve tension; when off, straight segments

#### Scenario: Dot
- **WHEN** the user clicks without moving
- **THEN** a round dot of the stroke width is created

#### Scenario: Translucent brush
- **WHEN** the brush opacity is 40% and the stroke crosses itself
- **THEN** the whole stroke renders at 40% alpha, including the crossing

### Requirement: Highlighter strokes
With Highlighter (`H`) active, strokes SHALL render at the highlighter's opacity (default 50%) with multiply blending, widths S/M/L = 12/20/32 px scaled, default colour yellow, straight segments. Shift SHALL snap the stroke to a straight line from its first point.

#### Scenario: Multiply over text
- **WHEN** a yellow highlight is drawn over dark text
- **THEN** the text stays readable and the background appears yellow-tinted

#### Scenario: Straight highlight
- **WHEN** the user holds Shift while highlighting a line of text
- **THEN** the stroke is a single straight segment following the pointer's end point

#### Scenario: Stronger highlight
- **WHEN** the highlighter opacity is set to 80%
- **THEN** new and selected highlights render at 80% with multiply blending

### Requirement: Strokes are objects
Brush and highlight strokes SHALL be selectable (hit area at least 12 screen px wide), movable, scalable via the transformer with stroke width unchanged, deletable, duplicable, part of z-order and the object clipboard, and SHALL rotate with the image.

#### Scenario: Select thin stroke
- **WHEN** the user clicks within 6px of a 2px brush line at 100% zoom
- **THEN** the stroke is selected

#### Scenario: Rotate
- **WHEN** the image is rotated clockwise
- **THEN** every stroke point is rotated accordingly

### Requirement: Drawing performance
While drawing, the in-progress stroke SHALL render on the UI layer without history commits and the canvas SHALL keep up with pointer events at 60fps on a 3840×2160 document.

#### Scenario: Long stroke
- **WHEN** the user draws a 2000-point stroke
- **THEN** no history entry exists until release and the stroke follows the pointer without visible lag

### Requirement: Freehand strips and settings
Brush strip: swatches, Opacity slider, width S/M/L, Smooth toggle. Highlighter strip: swatches, Opacity slider, width. The "50% · multiply" label is removed, and multiply stays implicit. Neither strip shows target chips or the ⊘ slot (board 1p "Arrow" row). Swatch tooltips name the colour and its digit key. Both tools' settings SHALL persist like other tools. Built-in defaults: brush red, 100%, M, smooth on; highlighter yellow, 50%, M.

#### Scenario: Highlighter default
- **WHEN** the user first activates Highlighter
- **THEN** the colour is yellow, opacity 50% and width M
