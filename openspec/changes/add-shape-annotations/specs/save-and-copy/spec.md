## ADDED Requirements

### Requirement: Copy shortcut depends on selection
`Ctrl+C` SHALL copy the rendered image to the system clipboard only when no annotation object is selected; with a selection it SHALL copy the selected objects to the internal object clipboard. The Copy button SHALL always copy the image.

#### Scenario: Button with selection
- **WHEN** an object is selected and the user clicks Copy in the top bar
- **THEN** the image is copied to the system clipboard
