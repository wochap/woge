## 1. Object model

- [ ] 1.1 `model/objects.ts`: `ColorKey`, `StrokeWidth`, `RectObj`, `EllipseObj`, `ArrowObj`, `TextObj`, discriminated union `AnnotationObject`; `resolveColor(key, flavour)` from the `--ann-*` tokens; `strokePx(width, size)`; `boundsOf(obj)`, `translate`, `scaleObj`; `rotatePoint90` applied per type in `rotateDocument` (extend geometry change); tests
- [ ] 1.2 `model/palette.ts`: ordered swatch list and both flavours' hex values copied from design board 1i
- [ ] 1.3 Store: `selection: string[]`, `objectClipboard`, actions `addObject`, `updateObjects(ids, patch)`, `deleteObjects`, `duplicate`, `reorder(ids, dir)`, `select`, `toggleSelect`, `selectAll`, `clearSelection`; all mutating actions go through `history.commit`; tests for z-order and duplicate offsets

## 2. Rendering and selection

- [ ] 2.1 `canvas/ObjectsLayer.tsx`: Konva nodes per type (Rect, Ellipse, Arrow, Text + plate Rect) sorted by `z`, `strokeScaleEnabled=false`, fill at 25% alpha, hit testing enabled; fold scale into geometry on `transformend`
- [ ] 2.2 `tools/select/SelectionTransformer.tsx`: Konva `Transformer` on the `ui` layer, 8px anchors styled from theme colours, `rotateEnabled=false`, live `keepRatio` on Shift, `centeredScaling` on Alt, `ignoreStroke`; text corner anchors scale `size`, side anchors set `w`
- [ ] 2.3 `tools/select/ArrowHandles.tsx`: endpoint handles via `useHandles`, whole-arrow drag; arrows excluded from the box transformer in multi-select
- [ ] 2.4 `tools/select/useSelectTool.ts`: click/Shift+click/marquee/empty-click, drag move with one commit on `dragend`, `Alt+drag` duplicate, nudge keys, Delete/Backspace, `Ctrl+D`, `Ctrl+A`, z-order keys, object clipboard `Ctrl+C/X/V` with image-copy fallback when nothing is selected and system-image paste when the internal clipboard is empty
- [ ] 2.5 Status line `sel W × H` and live drawing size

## 3. Shape tools

- [ ] 3.1 `tools/shapes/useShapeTool.ts`: shared press-drag-release creation with Shift/Alt semantics, 3px discard, select-after-create, sticky behaviour from config `tool_sticky`
- [ ] 3.2 Rectangle and Ellipse tools using the shared hook; Arrow tool with 45° Shift snap and head option
- [ ] 3.3 `chrome/strips/Swatches.tsx` (ten swatches, selected ring, dark-on-dark rim), `WidthSegmented.tsx`, `RectStrip.tsx`, `EllipseStrip.tsx`, `ArrowStrip.tsx`; apply-to-selection + set-default semantics; strip follows selection type in Select mode; mixed selection shows shared controls only

## 4. Text tool

- [ ] 4.1 Rust `fonts.rs`: `list_fonts()` via `fc-list : family`, parse, dedupe, sort, cache, prepend bundled families; silent fallback when `fc-list` is missing; command registered; unit test for parsing sample output
- [ ] 4.2 `lib/fonts.ts`: fetch list once, `ensureFontLoaded(family)` via `document.fonts.load`, redraw on resolve; bundled JetBrains Mono Variable added to `main.tsx`
- [ ] 4.3 `chrome/strips/FontCombobox.tsx`: search, Recent group, All group, rows in own family, keyboard navigation, per design board 1o
- [ ] 4.4 `tools/text/TextEditorOverlay.tsx`: textarea positioned via stage absolute transform with `transform: scale()`, matching font/size/colour/bold, auto-grow, Ctrl+Enter/blur commit, Esc cancel, empty deletes; hide Konva node while editing
- [ ] 4.5 Text tool: click creates and opens editor; double-click and Enter open editor on existing; `TextStrip.tsx` with swatches, FontCombobox, size stepper, Bold, Plate; `Ctrl+Shift+>`/`<` size stepping; plate rendering

## 5. Settings persistence

- [ ] 5.1 Rust `state.rs`: `read_state() -> Option<Value>`, `write_state(Value)` atomic to `$XDG_STATE_HOME/woge/state.json`; commands registered; tests for corrupt file handling
- [ ] 5.2 `store/settings.ts`: per-tool defaults with built-ins, config `[defaults]` seeding (extend `config.rs` with `[defaults]` and `tool_sticky`), state precedence, `recentFonts`, debounced 500ms write; load before first render of tools
- [ ] 5.3 Keymap and toolbar: enable V/R/O/A/T, Enter-to-edit, Esc deselect-then-select-tool

## 6. Verification

- [ ] 6.1 `npm test` and `cargo test` green: object model, store actions, selection logic, font list parsing, settings precedence, overlay positioning math
- [ ] 6.2 Manual: draw each shape with Shift/Alt, transform with Shift/Alt, arrows endpoints, text create/edit/plate/fonts (system + bundled), strip applies to selection, duplicate/z-order/clipboard, settings survive restart, export contains everything at 1:1; append to `docs/verification.md`
- [ ] 6.3 README: tools, shortcuts, `[defaults]`, `tool_sticky`, state file
