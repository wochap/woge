## Context

Builds on the document model, history and `DocumentGroup` from `add-image-geometry`, and the strip/keymap/status infrastructure from the shell. Design boards: 1a (rect selected), 1b (text editing), 1g/1g-b (strips), 1o (font combobox), 1h (handles: `--handle-size: 8px` transformer, selected arrow/text looks). Konva's `Transformer` is used for objects (crop/resize keep the custom handles from the geometry change).

## Goals / Non-Goals

**Goals:**
- Create a shape in one drag, adjust it without switching tools, and never think about layers.
- Text editing in place with real fonts, exported identically.
- Settings remembered across runs per tool.

**Non-Goals:**
- Object rotation, grouping, alignment guides, snapping (maybe later).
- Rich text (mixed styles inside one text object).
- Brush, highlighter, redact, badge (next change) — but the object model must accommodate them.

## Decisions

### Object model
```ts
type Style = { stroke: ColorKey; strokeWidth: 'S' | 'M' | 'L'; fill: boolean };
type ColorKey = 'red' | 'peach' | 'yellow' | 'green' | 'teal' | 'blue' | 'mauve' | 'pink' | 'white' | 'black';
type Base = { id: string; type: string; z: number };
type RectObj = Base & { type: 'rect'; x; y; w; h } & Style;
type EllipseObj = Base & { type: 'ellipse'; x; y; w; h } & Style;
type ArrowObj = Base & { type: 'arrow'; x1; y1; x2; y2; heads: 'end' | 'both'; stroke; strokeWidth };
type TextObj = Base & { type: 'text'; x; y; w?: number; text: string; color: ColorKey; font: string; size: number; bold: boolean; plate: boolean };
```
Colours are stored as palette keys, not hex, so the exported colour follows the theme flavour's palette at export time (Mocha red vs Latte red); this matches the design's `--ann-*` tokens. Stroke width keys map to pixels relative to the image: S = 2, M = 4, L = 8 (scaled by `max(1, min(size)/1080)` so widths look the same on 4k and 1080p). Objects are in rotated-image space; the geometry change already rotates them.

### Rendering
`ObjectsLayer` maps objects to `Rect`, `Ellipse`, `Arrow`, `Text` (+ `Rect` plate) Konva nodes keyed by id, sorted by `z`. Fill uses the stroke colour at 25% alpha when `fill` is on (design 1a). `strokeScaleEnabled=false` so the transformer never fattens strokes; on `transformend` the node's scale is folded back into the object's geometry and scale reset to 1 (the known Konva pattern). `perfectDrawEnabled=false` and `listening` only on the objects layer for performance.

### Selection and transformer
Store holds `selection: string[]`. One Konva `Transformer` on the `ui` layer attached to the selected nodes: `rotateEnabled=false`, anchors 8px (`--handle-size`), `--accent` stroke, `keepRatio` toggled live by Shift, `centeredScaling` by Alt, `ignoreStroke=true`. Arrows use two endpoint anchors instead of a box (custom `ArrowHandles` using the `useHandles` hook from the geometry change). Text resizes by scaling `size` (font size) from corner anchors and `w` (wrap width) from side anchors. Marquee select on empty-space drag in Select mode; Shift+click toggles. Click on empty space clears. Transient drag state is committed once on `dragend`/`transformend`.

### Creation flow
Each shape tool: pointer down on canvas starts a new object at the pointer with zero size; drag sets size (Shift → square/circle/45° arrow, Alt → from centre); pointer up commits unless the object is smaller than 3px in both axes (then it is discarded, except Text which creates at a click). After creating, the tool stays active (fast repeated drawing) but the new object is selected so it can be adjusted immediately; Esc or `V` returns to Select. Design note: stays-active behaviour mirrors Excalidraw with its lock off? No — Excalidraw returns to select by default; we stay active because screenshot markup usually draws several of the same shape. Config key `tool_sticky = true` lets the user flip it.

### Text editing
Double click a text object, or press Enter with one selected, or finish placing with the Text tool → an HTML `<textarea>` overlay positioned over the node in screen space with matching font, size, colour and scale; auto-grows; `Esc` cancels, `Ctrl+Enter` or blur commits (plain Enter inserts a newline). Empty text on commit deletes the object. The Konva node is hidden while editing. Font loading: before rendering a text with a system font the first time, `document.fonts.load('16px "Family"')` is awaited; Konva redraws on resolve.

### Fonts
Rust `list_fonts()` runs `fc-list : family` (fontconfig), splits on commas, dedupes, sorts, caches for the process. The bundled families `Inter Variable` and `JetBrains Mono Variable` are prepended. Combobox: search input filters case-insensitively; groups "Recent" (last 5 used, persisted) then "All"; each row rendered in its own family; keyboard navigation. Default font: Inter Variable.

### Options strips
`RectStrip`/`EllipseStrip`: swatches, width S/M/L segmented, Fill toggle. `ArrowStrip`: swatches, width, heads End/Both. `TextStrip`: swatches, font combobox, size stepper (8–200), Bold toggle, Plate toggle. Changing a strip value with a selection applies to the selected objects (one history entry) and also becomes the tool default; without a selection it only changes the default.

### Tool settings persistence
`state.json` in `$XDG_STATE_HOME/woge/`: `{ version: 1, tools: { rect: {...}, ellipse: {...}, arrow: {...}, text: {...} }, recentFonts: [...] }`. Rust owns reads/writes (`read_state`, `write_state`), frontend debounces writes 500ms. Corrupt or incompatible files are ignored and overwritten. Alternative: `localStorage`; rejected because it is hidden inside WebKit's data dir and not inspectable or editable by the user.

### Keyboard
`V R O A T` tools; `Delete`/`Backspace` delete; arrows nudge 1/10px; `Ctrl+D` duplicate (offset 10px); `Ctrl+A` select all; `Ctrl+C`/`Ctrl+X`/`Ctrl+V` object clipboard in-memory (image copy only when nothing is selected; paste of an image from the system clipboard still works when the internal clipboard is empty); `Ctrl+]`/`Ctrl+[` bring forward/send backward, `Ctrl+Shift+]`/`[` to front/back; Enter edits text; Esc deselects then returns to Select.

### Status line
With a selection: `sel W × H` (bounding box) appended; while drawing: live size.

## Risks / Trade-offs

- [Konva Transformer with mixed node types in one selection] → it supports it; arrows are excluded from the box transformer and only movable in multi-select.
- [System fonts not available at export on another machine] → export happens here, fonts are rasterised; fine.
- [Palette-key colours change if the user switches flavour before export] → by design, documented; `--ann-*` are intentionally theme-aware.
- [Textarea overlay misaligned at non-integer zoom] → position using the stage's absolute transform and `transform: scale()` on the textarea, verified in tests via computed style.

## Migration Plan

Additive. Documents from earlier changes have `objects: []`.

## Open Questions

- None.
