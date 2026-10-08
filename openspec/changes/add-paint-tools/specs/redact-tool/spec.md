## ADDED Requirements

### Requirement: Redact regions
With Redact (`X`) active, dragging SHALL create a rectangular region (Shift square, Alt from centre, under 3px discarded) that obscures the image beneath it using the current mode: Pixelate (default, block size 4–64, default 12) or Blur (radius 2–40, default 8). The region SHALL be selected after creation and placed on top of the z-order.

#### Scenario: Pixelate
- **WHEN** the user drags a region over text with Pixelate 12
- **THEN** the region shows 12px blocks sampled from the original image

#### Scenario: Blur
- **WHEN** mode is Blur with strength 8
- **THEN** the region shows the original image blurred with radius 8

### Requirement: Redaction samples the original pixels only
A redact region SHALL always display the obscured *original* image pixels under its current rect, never other annotations, and SHALL re-sample when moved or resized.

#### Scenario: Move region
- **WHEN** a region is dragged to a new location
- **THEN** it obscures the new location's content and the previous location is fully visible again

#### Scenario: Annotation underneath
- **WHEN** a text object lies under a redact region in z-order
- **THEN** the text is hidden by the region but not pixelated into it (it is simply covered)

### Requirement: Redaction is baked into export
Exported images SHALL contain the obscured pixels; the original pixels under a region SHALL NOT be present in the output in any form.

#### Scenario: Export
- **WHEN** a document with a pixelated region is exported
- **THEN** the output pixels inside the region are the pixelated values

### Requirement: Redact options
The strip SHALL show a Pixelate | Blur segmented control and a strength slider with a mono readout (`12 px` for pixelate, `8` for blur) and the hint "Pixelate is safer". Changing values with a region selected SHALL update it (one history entry) and set the default. Settings persist like other tools.

#### Scenario: Change strength on selection
- **WHEN** a region is selected and the slider moves to 24
- **THEN** the region re-renders with 24px blocks and the next region defaults to 24

### Requirement: Regions are objects
Redact regions SHALL be selectable, movable, resizable, deletable, duplicable, part of z-order and clipboard, and rotate with the image.

#### Scenario: Rotate
- **WHEN** the image is rotated
- **THEN** the region covers the same image content after rotation
