## Context

Builds on `scaffold-app-shell`: zustand store, react-konva stage with `image`/`objects`/`ui` layers, keymap table, options strip slot, status line. Design boards: 1c and 1m (crop), 1d (resize), 1i (handle sizes `--handle-size-crop: 10px`). Vendored Excalidraw at `~/Sandboxes/sandbox/vendor/_image/excalidraw/packages/element/src/{resizeElements,cropElement}.ts` is a reference for handle math only (do not import).

## Goals / Non-Goals

**Goals:**
- A single serialisable `Document` whose rendering is a pure function, so undo/redo, export and tests share one code path.
- Crop, rotate, resize feel instant on 4k screenshots.
- Shift/Alt semantics identical across crop and resize (and reused by later annotation tools).

**Non-Goals:**
- Free-angle rotation, perspective, flip (flip may come later; not now).
- Baking annotations into pixels.
- Export (next change) — but this change must make export trivial.

## Decisions

### Document shape
```ts
type Document = {
  source: { path: string | null; name: string; width: number; height: number }; // base bitmap dims
  rotation: 0 | 90 | 180 | 270;
  crop: Rect;             // in rotated-image space, integer pixels
  size: { w: number; h: number }; // output size; defaults to crop.w/h
  objects: AnnotationObject[];    // in rotated-image space (empty until later changes)
};
```
The `ImageBitmap` lives outside the document (in the store, not serialised); the document references it implicitly. Rotated-image space = coordinates after applying `rotation` to the base bitmap, before crop. This keeps crop and objects stable under crop changes and makes rotation a coordinate transform `rotatePoint90(p, w, h)` applied to crop and every object.

### Render pipeline is one Konva Group
`<Group x y scaleX scaleY>` (viewport) → `<Group offset=crop.x,crop.y scale=size.w/crop.w, size.h/crop.h>` (document transform) → `<Image rotation=… offset=… />` + `<Layer objects>`. Export (next change) reuses the inner group on an offscreen stage with the viewport group removed. Image smoothing on (`imageSmoothingEnabled`) for downscale; Konva draws from the full bitmap so quality is preserved until export.

### History: snapshot stack with explicit commits
`history = { past: Document[], present: Document, future: Document[] }` capped at 200 entries. Only `commit(nextDoc, label)` pushes; transient drag states live in tool-local state and are committed once on pointer-up/Enter. Undo/redo replace `present` and clear tool-transient state. Documents are small (no pixels) so structural sharing is unnecessary; `structuredClone` is fine. Alternative: command pattern with inverse ops; rejected — more code, same result at this document size.

### Modes vs tools
Crop and Resize are *modes*: entering one hides the transformer for objects, shows a mode overlay on the `ui` layer, swaps the options strip, and makes Enter/Esc confirm/cancel. The active tool returns to Select after confirm or cancel. Rotate is a command, not a mode.

### Crop interaction
- Enter mode: if a crop smaller than the image exists, show it; otherwise start with no rect and a crosshair cursor. Drag on empty space draws a new rect (Shift → square, Alt → from center). Drag inside moves; 10px handles resize (corners both axes, edges one axis). Shift while resizing locks to the current preset or square if Free.
- Presets Free/1:1/4:3/16:9 in the strip; picking one re-fits the current rect to that aspect around its centre.
- Rect is clamped to image bounds, integer-snapped. Outside area dimmed with `--dim`. Label `W × H` near the top-left corner, hint "Shift: square · Enter apply · Esc cancel" in the strip, floating ✓/✕ pair anchored to the rect's bottom-right (flips inside when near the edge).
- Confirm commits `crop` and sets `size` to the new crop dims scaled by the previous `size/crop` ratio (keeps a prior resize). Esc restores. Minimum crop 1×1.

### Rotate
`rotateDocument(doc, dir)`: new rotation, new rotated dims (swap w/h for 90/270), crop and objects mapped through `rotatePoint90`, `size` swapped. Each rotate is one history commit. Viewport re-fits if it was fitted.

### Resize mode
Overlay with eight 10px handles on the document bounds. Dragging a corner scales both dims around the opposite corner; aspect locked unless Shift; Alt scales around centre. Edge handles change one dim (locked aspect adjusts the other). Live label `1536 × 864` with original `1920 × 1080` greyed. Strip: `W` and `H` numeric inputs (Enter in a field applies that dimension respecting the lock), lock toggle button, `%` input, "from W × H", hint. Minimum 1×1, maximum 16384 per side. Confirm commits `size`. Values are integers; the lock computes the other dim with rounding.

### Keyboard in modes
Enter → confirm, Esc → cancel, arrows nudge crop rect by 1px (Shift 10px) and in resize nudge W/H by 1 (Shift 10) respecting lock. Tool shortcuts are inert inside a mode except `C`/`S` which cancel and switch.

### Status line
Crop mode: `x … y … crop W × H @ X,Y`. Resize mode: `x … y … scale 80%`. Otherwise just pointer coords.

## Risks / Trade-offs

- [Undo clearing transient tool state can surprise mid-drag] → disable undo/redo keys while a pointer drag is active.
- [Integer snapping at high zoom feels sticky] → snap only on commit; show fractional during drag at >400% zoom.
- [Konva Transformer is tempting for crop handles but its aspect/center semantics differ] → write a small `useHandles()` hook used by crop and resize; annotation tools use Konva's Transformer later.

## Migration Plan

Additive. No persisted data yet.

## Open Questions

- None blocking. Flip horizontal/vertical deferred.
