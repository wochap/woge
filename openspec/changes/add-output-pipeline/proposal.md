## Why

With geometry editing in place the editor can change an image but not get it out. The screenshot workflow is "edit, then copy or save, then close", so export, clipboard copy, in-place save, hooks and the CLI output flags are the next step and the point where the app becomes useful.

## What Changes

- Export renderer: composes the document at `size` with pixelRatio 1 on an offscreen Konva stage, independent of viewport zoom, encodes PNG (default), JPEG or WebP, and hands bytes to Rust.
- Save (`Ctrl+S`): writes back to the source path atomically (temp file beside, fsync, rename). With no source path (stdin/clipboard) it behaves as Save as. `-o PATH` from the CLI redirects Save to that path.
- Save as (`Ctrl+Shift+S`): native save dialog prefilled with `<stem>-edited.<ext>` next to the source, or `~/Pictures/woge-<timestamp>.png` otherwise.
- Copy (`Ctrl+C` with nothing selected, or the Copy button): writes a PNG to the cache dir and runs the configured copy command, default `shotclip --paste-once {path}` with a fallback to `wl-copy --type image/png`.
- Hooks in config: `on_load`, `on_save`, `on_copy`, `on_exit` as argv arrays with `{path}`-style placeholders and `WOGE_*` environment variables, executed by Rust without a shell.
- CLI gains `-o/--output PATH`, `--format png|jpeg|webp`, `--on-save exit|stay`, `--copy` (copy after each save). Every save prints the output path on stdout as one line. Closing the window without having saved exits 1 when the run was scripted (`-o` given or input from stdin), 0 otherwise.
- Toasts "Copied to clipboard" and "Saved to <path> · overwrote previous" with an Undo action that restores the overwritten file from a backup kept for the session.
- Copy, Save and Save as buttons become enabled; a dirty indicator and a confirm-on-close when there are unsaved edits.

## Capabilities

### New Capabilities
- `image-export`: offscreen rendering and encoding rules.
- `save-and-copy`: save, save as, copy behaviours and feedback.
- `hooks`: configurable external commands and their environment.

### Modified Capabilities
- `cli-and-config`: new flags and config keys (`format`, `on_save`, `copy_on_save`, `[copy] command`, `[hooks]`), stdout contract.
- `editor-chrome`: Copy/Save/Save as enabled, dirty state, close confirmation.

## Impact

- Rust: new `output.rs` (atomic write, backup, format sniffing), `hooks.rs`, `clipboard.rs`; commands `write_output`, `copy_image`, `run_hook`; config struct extension.
- Frontend: `lib/export.ts`, save/copy actions, toast actions, dirty tracking in the store.
- Flake: `wl-clipboard` already present; `shotclip` is the user's own tool and is only looked up on `PATH`.
