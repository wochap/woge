## 1. Object model extension

- [ ] 1.1 `model/objects.ts`: add `StrokeObj` (`brush` | `highlight`), `RedactObj`, `BadgeObj`; `boundsOf`, `translate`, `scaleObj`, rotation mapping for points and rects; badge excluded from scaling; tests
- [ ] 1.2 Store: `nextBadgeNumber` selector, `renumberBadges` (respecting config `badge_renumber`, extend `config.rs`), `resetBadgeCounter`; duplicate assigns next number for badges; tests for sequence, delete-middle, reset, duplicate

## 2. Freehand tools

- [ ] 2.1 `tools/freehand/useFreehandTool.ts`: transient stroke on the `ui` layer while drawing, 1.5px image-space decimation, Shift constraints (brush H/V, highlighter straight line), dot on click, single commit on release
- [ ] 2.2 Rendering in `ObjectsLayer`: `Line` with round caps/joins, `tension 0.3` when smooth, `strokeScaleEnabled=false`, `hitStrokeWidth` ≥ 12 screen px, `cache()` brush strokes after commit; highlighter `opacity 0.5`, `globalCompositeOperation 'multiply'`, widths 12/20/32 scaled, never cached
- [ ] 2.3 `BrushStrip.tsx` (swatches, width, Smooth) and `HighlighterStrip.tsx` (swatches, width, "50% · multiply"); defaults and persistence entries

## 3. Redact tool

- [ ] 3.1 `tools/redact/useRedactTool.ts`: drag-create via the shared shape hook, new region to top of z-order
- [ ] 3.2 Rendering: Konva `Image` of the base bitmap with `crop` = region in base space (inverse rotation helper), filters `Pixelate(pixelSize)` or `Blur(blurRadius)`, `cache({pixelRatio: 1})` on any geometry/strength change; verify export bakes the filter via an offscreen render test comparing pixels inside the region to the original
- [ ] 3.3 `RedactStrip.tsx`: Pixelate | Blur segmented, strength slider (4–64 / 2–40) with mono readout, hint "Pixelate is safer"; apply to selection + default; persistence

## 4. Counter badge tool

- [ ] 4.1 `tools/badge/useBadgeTool.ts`: click to place with next number, sticky tool, selection outline only (transformer disabled for badges)
- [ ] 4.2 Rendering: `Group` of `Circle` (diameter 22/28/36 scaled) + bold Inter `Text` at 55% diameter, number colour by luminance of the badge colour (crust vs base per flavour)
- [ ] 4.3 Inline number editor overlay (double-click / Enter), `BadgeStrip.tsx` with swatches, size, `Next: N`, Reset; persistence

## 5. Chrome and keys

- [ ] 5.1 Enable B/H/X/N in toolbar and keymap; strips follow single-type selection; status line live stroke/region size

## 6. Verification

- [ ] 6.1 `npm test` green: decimation, constraints, renumbering, inverse-rotation crop math, redact bake test
- [ ] 6.2 Manual: long brush strokes at 4k, highlighter over text with Shift, redact move/resize re-sampling, blur vs pixelate, badges place/delete/edit/reset/duplicate, rotation of all types, export at 1:1 and inspect redaction; append to `docs/verification.md`
- [ ] 6.3 README: tool list complete, `badge_renumber`
