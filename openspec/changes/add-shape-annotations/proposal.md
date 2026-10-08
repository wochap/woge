## Why

The editor can now crop, rotate, resize and save, but cannot mark anything up. Vector annotations are the core of a screenshot tool: rectangles, ellipses, arrows and text, each movable, resizable and editable, with remembered colour and size. This change adds them on top of the document model and introduces the selection system the paint tools reuse.

## What Changes

- Annotation objects in the document: `rect`, `ellipse`, `arrow`, `text`, each with id, geometry in rotated-image space, style and z-order.
- Select tool (`V`): click to select, marquee to multi-select, Konva Transformer with corner and edge handles (no rotation), Shift keeps aspect, Alt from centre, drag to move, arrows nudge, `Delete`, `Ctrl+D` duplicate, `Alt+drag` duplicate, `Ctrl+A`, `Ctrl+C`/`Ctrl+V` copy and paste objects within the session, z-order commands.
- Rectangle (`R`), Ellipse (`O`) with stroke colour, stroke width S/M/L and fill toggle; Arrow (`A`) with width and head at end or both ends; Text (`T`) with colour, font family (system fonts via fontconfig plus bundled Inter and JetBrains Mono), size, bold and background plate toggle; in-place editing on double click or Enter.
- Options strip per tool from design boards 1g/1g-b/1o; colour swatches use the Catppuccin accent palette plus white and black.
- Tool settings persistence: last colour, width, fill, arrowheads, font, size, bold per tool in `~/.local/state/woge/state.json`, written by Rust, restored at startup.
- Font enumeration command in Rust (`fc-list : family`), cached, with a searchable combobox and a Recent group.
- Hit testing and transformer live on the `objects` and `ui` layers; export includes objects automatically through `DocumentGroup`.

## Capabilities

### New Capabilities
- `annotation-objects`: object model, z-order, selection, transform and clipboard semantics.
- `shape-tools`: rectangle, ellipse and arrow creation and options.
- `text-tool`: text creation, editing, fonts and options.
- `tool-settings`: remembered per-tool style and the state file.

### Modified Capabilities
- `editor-chrome`: toolbar enables Select/Rectangle/Ellipse/Arrow/Text, options strip contents, status line selection size.
- `save-and-copy`: `Ctrl+C` copies the image only when nothing is selected; with a selection it copies objects.

## Impact

- Frontend: `model/objects.ts`, `tools/select`, `tools/shapes`, `tools/text`, `chrome/strips/*`, `lib/fonts.ts`; Konva `Transformer` on the `ui` layer; HTML textarea overlay for text editing.
- Rust: `fonts.rs` (`list_fonts` via fontconfig), `state.rs` (`read_state`, `write_state` debounced), capability for both.
- Flake: `fontconfig` on PATH at runtime.
