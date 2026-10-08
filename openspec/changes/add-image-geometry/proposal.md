## Why

After `scaffold-app-shell` the editor only displays an image. The first editing features the user needs for screenshots are the whole-image operations: crop, rotate and resize. They also define the document model and undo/redo history that every annotation tool later builds on, so they come before annotations.

## What Changes

- Document model gains `rotation` (0/90/180/270), `crop` rect, `size` (output dimensions) and an empty `objects` array; rendering composes base → rotate → crop → scale.
- Undo/redo as a snapshot stack of the serialisable document (never pixels), with `Ctrl+Z` / `Ctrl+Shift+Z`, toolbar buttons enabled/disabled by availability.
- Crop tool (`C`): draw a marquee, move and resize it with 10px handles, aspect presets Free/1:1/4:3/16:9, Shift constrains to square, dimension label, floating Enter/Esc pair, dim outside. Confirm applies the crop; annotations outside remain in the document (hidden) and return on undo.
- Rotate (`L` clockwise, `Shift+L` counter-clockwise) in 90° steps, rotating crop and object coordinates with the image.
- Resize mode (`S`): eight handles on the whole image, aspect locked by default, Shift unlocks, options strip with W/H/% fields and original dimensions, Enter applies, Esc cancels. Non-destructive: only `size` changes; scaling happens at render/export from the original pixels.
- Status line shows crop/resize details per the design (`crop 1240 × 720 @ 240,120`, `scale 80%`).

## Capabilities

### New Capabilities
- `document-history`: document shape, invariants, snapshot undo/redo semantics.
- `crop-tool`: crop interaction and confirmation.
- `rotate-image`: 90° rotation and its effect on crop, size and objects.
- `resize-image`: resize mode interaction and numeric entry.

### Modified Capabilities
- `editor-chrome`: toolbar enables Crop, Resize, Rotate, Undo, Redo; options strip gets Crop and Resize contents; status line gains mode details.

## Impact

- Frontend: `store/editor.ts` grows a `document` slice and `history`; new `tools/crop`, `tools/resize`, `lib/geometry.ts`; Konva `ui` layer gets crop/resize overlays and a `Transformer`.
- No Rust changes.
- Later changes (output, annotations) depend on the document model and `history.commit()` defined here.
