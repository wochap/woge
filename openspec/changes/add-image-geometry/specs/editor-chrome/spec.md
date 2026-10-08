## ADDED Requirements

### Requirement: Geometry tools are enabled in the chrome
The toolbar SHALL enable Crop, Resize, Rotate, Undo and Redo. Undo/Redo enablement follows history availability. The options strip SHALL show the Crop contents in crop mode and the Resize contents in resize mode, per design boards 1c, 1d, 1m.

#### Scenario: After loading an image
- **WHEN** a document exists and no mode is active
- **THEN** Crop, Resize and Rotate are enabled, Undo and Redo are disabled

#### Scenario: Mode strip
- **WHEN** the user enters crop mode
- **THEN** the options strip appears with the crop presets and hint, and disappears on confirm or cancel

### Requirement: Mode-aware status line
In crop mode the status line SHALL append `crop W × H @ X,Y`; in resize mode `scale N%`.

#### Scenario: Crop status
- **WHEN** the crop rect is (240,120,1240,720)
- **THEN** the status line ends with `crop 1240 × 720 @ 240,120`
