## ADDED Requirements

### Requirement: Output actions are live
Copy, Save and Save as in the top bar SHALL be enabled whenever a document exists. Copy is the primary (filled accent) button. A dirty dot SHALL follow the file name when there are unsaved edits.

#### Scenario: Buttons enabled
- **WHEN** an image is loaded
- **THEN** Copy, Save and Save as are enabled with tooltips Ctrl+C, Ctrl+S, Ctrl+Shift+S

#### Scenario: Dirty dot
- **WHEN** the user commits a crop
- **THEN** a dot appears after the file name until the next successful save

### Requirement: Close confirmation dialog
Closing with unsaved edits SHALL show an in-app dialog with Discard, Cancel and Save, styled with the theme tokens, focus on Cancel, Esc = Cancel.

#### Scenario: Save from dialog
- **WHEN** the user chooses Save in the dialog
- **THEN** the normal Save flow runs and the window closes after success
