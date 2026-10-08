## ADDED Requirements

### Requirement: Document is serialisable and pixel-free
The editor document SHALL consist of source metadata, `rotation` (0, 90, 180 or 270), an integer `crop` rect in rotated-image space, an integer output `size`, and an `objects` array. The base bitmap SHALL NOT be part of the document. Serialising and deserialising the document SHALL round-trip exactly.

#### Scenario: Fresh document
- **WHEN** a 1920×1080 image is loaded
- **THEN** the document has rotation 0, crop (0,0,1920,1080), size 1920×1080 and no objects

#### Scenario: Round trip
- **WHEN** a document with a crop, a rotation and a resized size is serialised to JSON and parsed back
- **THEN** the result deep-equals the original

### Requirement: Rendering is a pure function of document and viewport
The canvas SHALL draw the base bitmap rotated, offset by the crop origin, scaled by `size / crop`, inside the viewport transform. Objects SHALL be drawn in the same document transform.

#### Scenario: Crop and resize together
- **WHEN** crop is (100,50,800,600) and size is 400×300
- **THEN** the document pixel (100,50) renders at document origin and the visible content is scaled by 0.5

### Requirement: Snapshot undo and redo
Every committed edit SHALL push the previous document onto an undo stack capped at 200 entries and clear the redo stack. `Ctrl+Z` SHALL restore the previous document; `Ctrl+Shift+Z` SHALL reapply. Undo/Redo toolbar buttons SHALL be disabled when their stack is empty.

#### Scenario: Undo a crop
- **WHEN** the user confirms a crop then presses `Ctrl+Z`
- **THEN** the document returns to the pre-crop state and Redo becomes enabled

#### Scenario: New edit clears redo
- **WHEN** the user undoes, then rotates
- **THEN** Redo is disabled

#### Scenario: Cap
- **WHEN** 201 edits are committed
- **THEN** only the last 200 can be undone

### Requirement: Transient interaction is not history
Pointer drags and numeric typing SHALL NOT create history entries until confirmed; one confirmed interaction SHALL be exactly one entry. Undo/redo SHALL be inert during an active pointer drag.

#### Scenario: Drag then confirm
- **WHEN** the user drags a crop handle five times and then presses Enter
- **THEN** exactly one history entry is created

#### Scenario: Cancel
- **WHEN** the user drags a crop rect and presses Esc
- **THEN** no history entry is created and the document is unchanged

### Requirement: Loading a new image resets history
Replacing the document with a new image SHALL clear both stacks.

#### Scenario: Open another file
- **WHEN** the user opens a second image after editing the first
- **THEN** Undo and Redo are disabled
