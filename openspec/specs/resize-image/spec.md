# resize-image Specification

## Purpose
Resize mode: handle drags and numeric entry that set the non-destructive output size.

## Requirements

### Requirement: Resize mode
Pressing `S` or the Resize button SHALL enter resize mode: eight 10px handles on the document bounds, a live `W × H` label with the original `W × H` greyed beside it, and an options strip with `W`, `H`, lock toggle, `%` field, "from W × H" and the hint "Shift: unlock aspect · Enter apply". Enter applies, Esc cancels, both return to Select.

#### Scenario: Enter
- **WHEN** the user presses `S` on a 1920×1080 document
- **THEN** the strip shows W 1920, H 1080, 100 %, lock on, and the handles appear

### Requirement: Dragging handles scales the output size
Corner drags SHALL scale both dimensions around the opposite corner with aspect locked by default; Shift SHALL unlock; Alt SHALL scale around the centre. Edge drags SHALL change one dimension and, when locked, the other follows. Dimensions SHALL be integers between 1 and 16384.

#### Scenario: Locked corner drag
- **WHEN** the user drags the bottom-right handle so width becomes 1536 on a 1920×1080 document
- **THEN** height becomes 864 and the label reads "1536 × 864"

#### Scenario: Shift unlocks
- **WHEN** the user holds Shift and drags the bottom-right handle
- **THEN** width and height change independently

#### Scenario: Lower bound
- **WHEN** a drag would make width 0
- **THEN** width stays 1

### Requirement: Numeric entry
Typing in `W` or `H` and pressing Enter (or blurring) SHALL set that dimension, adjusting the other when locked. The `%` field SHALL scale both from the original dimensions. The lock toggle SHALL flip the lock for fields and handles.

#### Scenario: Percent
- **WHEN** the user types 80 in `%`
- **THEN** W becomes 1536 and H 864 for a 1920×1080 original

#### Scenario: Unlocked field
- **WHEN** the lock is off and the user sets H to 500
- **THEN** W is unchanged

### Requirement: Resize is non-destructive
Confirming SHALL only set `size`; the base bitmap and crop are untouched and rendering scales from the original pixels. Undo restores the previous size.

#### Scenario: Resize then undo
- **WHEN** the user confirms 50% then presses `Ctrl+Z`
- **THEN** size returns to the crop dimensions with no quality loss

#### Scenario: Status line
- **WHEN** resize mode is active at 80%
- **THEN** the status line reads `scale 80%` after the pointer coordinates
