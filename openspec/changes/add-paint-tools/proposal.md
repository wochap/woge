## Why

Shapes and text cover structured markup; screenshots also need freehand strokes, highlighting, hiding sensitive content and numbered callouts. These four tools complete the v1 tool set from the design and reuse the object, selection and settings systems from `add-shape-annotations`.

## What Changes

- Brush (`B`): freehand polyline strokes with colour and width, smoothed, selectable and movable as objects.
- Highlighter (`H`): wide translucent multiply-blended strokes, default yellow, straight-line snap with Shift.
- Redact (`X`): rectangular regions that pixelate (default) or blur the underlying image; resampled from the original pixels when moved or resized; strength setting; exported baked.
- Counter badge (`N`): numbered circles placed by click, auto-incrementing, renumbered on delete, editable number, colour and size S/M/L.
- Options strips for all four per design boards 1g/1g-b, 1j, 1k; settings persisted like other tools.
- Component sheet looks from 1h: redact pixelate/blur, badge idle/selected, brush/highlighter strokes.

## Capabilities

### New Capabilities
- `freehand-tools`: brush and highlighter behaviour.
- `redact-tool`: redaction regions and their rendering guarantees.
- `counter-badge-tool`: numbered badges.

### Modified Capabilities
- `annotation-objects`: new object types participate in selection, transform, z-order, clipboard and rotation.
- `editor-chrome`: toolbar enables Brush, Highlighter, Redact, Counter badge; strips added.
- `tool-settings`: new per-tool defaults.

## Impact

- Frontend: `tools/freehand`, `tools/redact`, `tools/badge`, strips, Konva `Line` with `globalCompositeOperation`, Konva filters (`Pixelate`, `Blur`) on cached image crops.
- No Rust changes beyond state keys.
- Export path unchanged; redact filters run inside `DocumentGroup`.
