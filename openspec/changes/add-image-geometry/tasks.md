## 1. Document model and history

- [ ] 1.1 `src/model/document.ts`: `Document`, `Rect`, `Rotation` types, `newDocument(source)`, `visibleSize(doc)`, `rotatedDims(doc)`, `scaleFactor(doc)`; vitest round-trip and fresh-document tests
- [ ] 1.2 `src/model/geometry.ts`: `rotatePoint90`, `rotateRect90`, `rotateDocument(doc, dir)`, `clampRect`, `fitAspect(rect, ratio, anchor)`, `resizeFromHandle(bounds, handle, delta, {lockAspect, fromCenter})`, `snapInt`; unit tests for every scenario in `rotate-image`, `crop-tool` aspect/clamp cases and `resize-image` bounds
- [ ] 1.3 `src/store/history.ts`: `{past, present, future}` with `commit`, `undo`, `redo`, `canUndo`, `canRedo`, cap 200, `reset(doc)`; integrate into the editor store; `Ctrl+Z` / `Ctrl+Shift+Z` in the keymap, inert while `pointerDrag` flag is set; tests for cap, redo clearing, transient-not-history
- [ ] 1.4 Load path calls `history.reset(newDocument(...))`; Undo/Redo toolbar buttons bound to `canUndo`/`canRedo`

## 2. Render pipeline

- [ ] 2.1 `canvas/DocumentGroup.tsx`: inner Konva `Group` applying crop offset and `size/crop` scale, containing the rotated `Image` and the `objects` layer content; `Stage` wraps it in the viewport group; `fit` uses `visibleSize(doc)`
- [ ] 2.2 Status line and top bar read `visibleSize`/`size` (dimensions update after crop, rotate, resize)

## 3. Modes infrastructure

- [ ] 3.1 `tools/mode.ts`: `mode: 'none' | 'crop' | 'resize'` in the store, `enterMode`, `confirmMode`, `cancelMode`; Enter/Esc keymap entries active only in a mode; `C`/`S` switch modes; other tool keys inert in a mode; returning to Select on exit
- [ ] 3.2 `canvas/useHandles.ts`: shared eight-handle overlay on the `ui` layer (10px squares, `--accent` fill, `--bg` rim, cursors per handle), pointer drag reporting `{handle, delta, shift, alt}` in image space, `pointerDrag` flag for history
- [ ] 3.3 `chrome/FloatingConfirm.tsx`: ✕ / ✓ pair anchored to a rect with edge flipping

## 4. Crop

- [ ] 4.1 `tools/crop/CropOverlay.tsx`: dim outside with `--dim` (four rects), rect outline, handles via `useHandles`, `W × H` label, draw-new on empty drag, move on inside drag, Shift/Alt semantics, clamp to image, nudge with arrows
- [ ] 4.2 `tools/crop/CropStrip.tsx`: Free/1:1/4:3/16:9 segmented control, live readout, hint text; preset re-fits rect around centre and locks subsequent drags
- [ ] 4.3 Confirm: commit crop, rescale `size` by prior ratio, re-fit viewport, return to Select; Esc restores; status line `crop W × H @ X,Y`; tests for confirm math and cancel

## 5. Rotate

- [ ] 5.1 Wire `L` / `Shift+L` and the Rotate button (click = CW, Shift+click = CCW) to `rotateDocument` + `commit`; re-fit viewport if fitted; top bar dims update

## 6. Resize

- [ ] 6.1 `tools/resize/ResizeOverlay.tsx`: handles on document bounds via `useHandles`, locked aspect by default, Shift unlock, Alt from centre, live label with greyed original, bounds 1…16384
- [ ] 6.2 `tools/resize/ResizeStrip.tsx`: W/H numeric fields (Enter/blur apply, lock-aware), lock toggle (ph-lock-simple), `%` field, "from W × H", hint; arrow-key nudge of W/H
- [ ] 6.3 Confirm commits `size` only; Esc restores; status line `scale N%`; tests for percent, locked/unlocked fields, lower bound

## 7. Verification

- [ ] 7.1 `npm test` green including geometry, history, crop/resize math
- [ ] 7.2 Manual run: crop with presets and Shift/Alt, rotate four times, resize by drag and by fields, undo/redo through all of it, 2x display check; append results to `docs/verification.md`
