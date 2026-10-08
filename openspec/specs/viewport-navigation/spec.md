# viewport-navigation Specification

## Purpose
Canvas viewport behaviour: fit on load, pan, zoom, zoom commands and limits, resize handling and HiDPI rendering.

## Requirements

### Requirement: Image is fitted on load
When a document loads, the viewport SHALL fit the whole image inside the canvas area with 24px padding, centred, never scaling above 100% for images smaller than the canvas.

#### Scenario: Large image
- **WHEN** a 1920×1080 image loads into a 1200×700 canvas area
- **THEN** the zoom becomes about 60% and the image is centred

#### Scenario: Small image
- **WHEN** a 300×200 image loads into a 1200×700 canvas area
- **THEN** the zoom is 100% and the image is centred

### Requirement: Scrolling pans, Ctrl+scroll and pinch zoom
Wheel events without Ctrl SHALL pan by their delta on both axes. Wheel events with Ctrl (including touchpad pinch as reported by WebKitGTK) SHALL zoom around the pointer. Shift with a vertical-only wheel SHALL pan horizontally.

#### Scenario: Touchpad two-finger scroll
- **WHEN** a wheel event with deltaX 30 and deltaY −12 and no modifiers arrives
- **THEN** the image moves 30px left and 12px down on screen; zoom is unchanged

#### Scenario: Zoom to cursor
- **WHEN** a Ctrl+wheel event arrives with the pointer over an image pixel
- **THEN** the zoom changes and that same image pixel stays under the pointer

#### Scenario: Shift+wheel on a mouse
- **WHEN** a wheel event with deltaY 100, deltaX 0 and Shift arrives
- **THEN** the view pans horizontally by 100px

### Requirement: Drag panning
Holding Space and dragging with the left button, or dragging with the middle button, SHALL pan the view and show a grabbing cursor. Space alone changes only the cursor.

#### Scenario: Space drag
- **WHEN** the user holds Space, presses the left button and moves 50px right
- **THEN** the image moves 50px right and no tool action is triggered

#### Scenario: Middle drag
- **WHEN** the user drags with the middle button
- **THEN** the view pans and the active tool is not invoked

### Requirement: Zoom commands and limits
`Shift+1` SHALL fit, `Shift+0` SHALL set 100% keeping the view centre, `Ctrl+=` and `Ctrl+-` SHALL step zoom by ×1.25 around the canvas centre. Zoom SHALL be clamped to 5%–3200%. The zoom readout SHALL show the rounded percentage and the zoom menu SHALL expose Fit, 100%, Zoom in, Zoom out and the Checkerboard toggle.

#### Scenario: Fit
- **WHEN** the user presses `Shift+1` after zooming in
- **THEN** the view returns to the fitted state

#### Scenario: Upper clamp
- **WHEN** the user keeps zooming in
- **THEN** the zoom stops at 3200% and the readout shows "3200%"

#### Scenario: Zoom menu
- **WHEN** the user clicks the zoom readout
- **THEN** a menu opens with Fit (⇧1), 100% (⇧0), Zoom in (Ctrl +), Zoom out (Ctrl −), a divider and Checkerboard

### Requirement: Viewport follows window resizes
When the canvas area changes size the view SHALL keep the same image point at the canvas centre, and SHALL re-fit if the view was in the fitted state and the user has not zoomed or panned since.

#### Scenario: Resize while fitted
- **WHEN** the window grows while the view is still fitted
- **THEN** the image is re-fitted to the new size

#### Scenario: Resize after zooming
- **WHEN** the window grows after the user zoomed to 200%
- **THEN** zoom stays 200% and the image centre stays put

### Requirement: Crisp rendering on HiDPI
The canvas SHALL render at `devicePixelRatio` so 1px strokes and handles are sharp on 1x and 2x displays.

#### Scenario: 2x display
- **WHEN** the window is on a scale-2 output
- **THEN** the Konva stage uses pixelRatio 2 and the image is not blurry at 100%
