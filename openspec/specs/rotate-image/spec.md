# rotate-image Specification

## Purpose
Rotating the document in 90° steps, carrying crop, size and objects with it.

## Requirements

### Requirement: Rotate in 90° steps
`L` or the Rotate button SHALL rotate the document 90° clockwise; `Shift+L` SHALL rotate counter-clockwise. Each rotation SHALL be one history entry and SHALL re-fit the viewport if it was fitted.

#### Scenario: Clockwise
- **WHEN** the user presses `L` on a 1920×1080 document
- **THEN** rotation becomes 90, the displayed image is 1080×1920 and the top bar reads "1080 × 1920"

#### Scenario: Full circle
- **WHEN** the user presses `L` four times
- **THEN** the document equals the starting document and four history entries exist

### Requirement: Crop, size and objects rotate with the image
Rotation SHALL map the crop rect, the output size and every object's coordinates through the same 90° transform so that visible content stays identical relative to the image.

#### Scenario: Rotated crop
- **WHEN** crop is (100,50,800,600) on a 1920×1080 image and the user rotates clockwise
- **THEN** crop becomes (430,100,600,800) and size is swapped accordingly

#### Scenario: Rotated object
- **WHEN** an object sits at the top-left of the visible crop and the user rotates clockwise
- **THEN** the object appears at the top-right of the visible crop
