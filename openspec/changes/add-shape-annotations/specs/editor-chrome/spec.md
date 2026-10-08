## ADDED Requirements

### Requirement: Shape and text tools in the chrome
The toolbar SHALL enable Select, Rectangle, Ellipse, Arrow and Text. The options strip SHALL show the Rectangle, Ellipse, Arrow or Text strip for the active tool per design boards 1g/1g-b/1o, and SHALL also show the strip for the selected object's type when the Select tool is active and exactly one object type is selected.

#### Scenario: Strip follows selection
- **WHEN** Select is active and a text object is selected
- **THEN** the Text strip is shown and edits it

#### Scenario: Mixed selection
- **WHEN** a rectangle and an arrow are selected
- **THEN** only the shared swatches and width controls are shown
