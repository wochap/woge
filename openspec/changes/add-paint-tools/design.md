## Context

Last v1 change. Reuses `AnnotationObject` union, `ObjectsLayer`, `SelectionTransformer`, `useShapeTool` patterns, strips and settings from `add-shape-annotations`. Design boards: 1g/1g-b (Brush, Highlighter, Redact, Counter strips), 1j (redact on canvas), 1k (badges), 1h (component looks), 1i (`--badge-s/m/l` 22/28/36px).

## Goals / Non-Goals

**Goals:**
- Strokes feel immediate (no lag at 4k, 60fps while drawing).
- Redaction never leaks: what is under a redact region cannot be recovered from the export, and moving a region re-samples the new area.
- Badges stay numbered sensibly without the user managing numbers.

**Non-Goals:**
- Pressure sensitivity, brush textures, eraser (undo and delete cover it).
- Freeform (lasso) redaction.
- Badge connectors/leader lines.

## Decisions

### Object types
```ts
type StrokeObj = Base & { type: 'brush' | 'highlight'; points: number[]; stroke: ColorKey; strokeWidth: StrokeWidth };
type RedactObj = Base & { type: 'redact'; x; y; w; h; mode: 'pixelate' | 'blur'; strength: number };
type BadgeObj  = Base & { type: 'badge'; x; y; n: number; color: ColorKey; size: 'S' | 'M' | 'L' };
```
Points are in rotated-image space; rotation maps every point pair. Moving a stroke translates points; transformer scaling scales points about the box origin and resets scale (same fold-back pattern).

### Brush and highlighter rendering
Konva `Line` with `tension 0.3`, `lineCap/lineJoin round`, `strokeScaleEnabled=false`. Brush widths S/M/L = 2/4/8 scaled; highlighter = 12/20/32 scaled, `opacity 0.5`, `globalCompositeOperation 'multiply'`, default colour yellow. While drawing, points are appended to a transient object rendered on the `ui` layer (not in history); pointer-up commits once. Points are decimated with a 1.5px (image-space) minimum distance and a light Chaikin pass when the "Smooth" toggle is on (default on for brush; highlighter always straight segments). Shift with the highlighter snaps the stroke to a straight line from the first point (common "highlight a line of text" case); Shift with the brush constrains to horizontal/vertical. After pointer-up, `node.cache()` the stroke for cheap redraws.

### Redact rendering
A redact region is a Konva `Image` node whose `image` is the base bitmap, with `crop` set to the region's rect in *base* space (inverse-rotated from rotated-image space), `x/y/w/h` = region, and a filter: `Konva.Filters.Pixelate` (`pixelSize = strength`, 4–64, default 12) or `Konva.Filters.Blur` (`blurRadius = strength`, 2–40, default 8). The node is `cache()`d after any geometry change so the filter runs once. Because the source is the original bitmap, the region always shows redacted *original* pixels, never other annotations; and because the crop follows the region, moving it re-samples. Export runs the same node in `DocumentGroup`, so the filter is baked into the PNG; the original pixels are never in the output. Blur is offered because users ask for it, but pixelate is default (blur at low radius can be partially reversible; the strip hints "Pixelate is safer"). Redact regions render above all other objects regardless of `z`? No: keep normal z-order so a text label can sit on top of a redaction; default new redact goes to the top.

### Counter badge
Click places a badge with `n = max(existing n) + 1` at the pointer. Renumbering: deleting badges renumbers the remaining in creation order (stable by `z` among badges) so there is never a gap; config `badge_renumber = true` to allow turning it off. Double-click or Enter edits the number inline (small numeric input overlay); the strip shows `Next: N` and a Reset button that sets the counter so the next badge is 1 (existing badges unchanged). Badge draws a filled circle in the colour at `--badge-*` diameter scaled like strokes, with the number in bold Inter sized to 55% of the diameter, text colour `--on-accent`-equivalent for the flavour (crust on Mocha accents, base on Latte accents, chosen by luminance). Selection shows a 4-corner box; transformer disabled except moving (size comes from the S/M/L setting).

### Strips
Brush: swatches, width S/M/L, Smooth toggle. Highlighter: swatches, width, opacity readout "50% · multiply" (static label). Redact: Pixelate | Blur segmented, strength slider with mono readout (`12 px` / `8`). Counter: swatches, size S/M/L, `Next: N` readout, Reset.

### Hit testing
Strokes: Konva `hitStrokeWidth` ≥ 12 screen px so thin brush lines are selectable. Highlighter hit uses its full width. Redact and badges: shape bounds.

## Risks / Trade-offs

- [Konva filters on large regions are slow (full-region pixel loop)] → `cache()` once per change with `pixelRatio 1`; a 1920×1080 pixelate caches in ~20ms. Blur radius capped at 40.
- [Multiply blend inside a cached group may flatten against transparent] → highlighter nodes are not cached; they are cheap lines.
- [Decimation changes stroke look at high zoom] → threshold is in image space, so zoom does not alter sampling.
- [Badge renumbering surprises when deleting from the middle] → design choice from screenshot tools; config toggle exists.

## Migration Plan

Additive. Older documents simply lack these types.

## Open Questions

- None.
