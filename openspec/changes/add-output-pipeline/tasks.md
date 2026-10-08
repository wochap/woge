## 1. CLI and config extension

- [ ] 1.1 `cli.rs`: add `-o/--output`, `--format`, `--on-save`, `--copy`; `Format` and `OnSave` enums (serde + ValueEnum); `scripted` flag = `-o` given or stdin input; tests for each `cli-and-config` scenario
- [ ] 1.2 `config.rs`: add `format`, `on_save`, `copy_on_save`, `jpeg_quality`, `webp_quality` (1–100 validation), `[copy] command: Vec<String>`, `[hooks] { on_load, on_save, on_copy, on_exit: Vec<String> }`; defaults; error messages naming the key; tests for quality bounds and non-array hook
- [ ] 1.3 `resolve_format(flag, output_ext, config, source_ext) -> Format` and `rewrite_extension(path, format)`; tests for the precedence table

## 2. Rust output, clipboard, hooks

- [ ] 2.1 `output.rs`: `write_output(bytes, path, format) -> Result<WriteReport{path, overwrote: bool}>`: temp file beside destination, fsync, magic-byte check (png/jpeg/webp), first-overwrite backup to `$XDG_CACHE_HOME/woge/backup/<uuid>` with an in-memory map, rename; `restore_backup(path)`; cleanup of backups on exit and purge of >1 day old on start; tests with tempdirs for overwrite, failure, directory destination, restore
- [ ] 2.2 `clipboard.rs`: `copy_image(bytes)`: write `clip-<uuid>.png` to cache, delete previous clip files, run `[copy] command` with `{path}` substitution or stdin piping, fallback to `wl-copy --type image/png` when the default command's executable is missing, distinct error when nothing is found; tests for argv substitution and fallback selection (mock `which`)
- [ ] 2.3 `hooks.rs`: `Hook::run(kind, ctx)` with placeholder substitution per argv element, `WOGE_*` env, detached spawn, stdout/stderr to log, `on_exit` awaited ≤2s; tests for placeholder substitution with spaces and for missing executable not erroring
- [ ] 2.4 `app.rs`: commands `write_output`, `restore_backup`, `copy_image`, `run_hook(kind, ctx)`, `print_saved_path(path)` (stdout line + flush), `exit_application(code)` running `on_exit`; binary IPC for bytes; `dialog:allow-save` capability

## 3. Frontend export and actions

- [ ] 3.1 `lib/export.ts`: `exportDocument(doc, bitmap, format, quality)` using an offscreen Konva Stage + `DocumentGroup` at pixelRatio 1, `convertToBlob`, WebP feature detection with PNG fallback; test that two viewport states produce identical bytes (jsdom with canvas mock or node-canvas)
- [ ] 3.2 `store/output.ts`: `lastSaved` document reference, `dirty` selector, `outputTarget` from launch options (`-o`), `save()`, `saveAs()`, `copy()` actions with toasts, stdout print, hook invocations, `on_save` exit/stay, `copy_on_save`
- [ ] 3.3 Save as default name: `<stem>-edited.<ext>` beside source or `~/Pictures/woge-<timestamp>.<ext>`; extension mismatch handling; dialog filters
- [ ] 3.4 Toast with Undo action for overwrites calling `restore_backup`
- [ ] 3.5 Keymap: `Ctrl+S`, `Ctrl+Shift+S`, `Ctrl+C` (only when no object is selected — leave a hook for the annotations change), `Ctrl+Q`; top bar buttons enabled; dirty dot
- [ ] 3.6 Close flow: intercept window close and `Ctrl+Q`; `CloseDialog` (Discard / Cancel / Save); exit code 1 when scripted and discarded, else 0; `on_load` hook fired from the load path

## 4. Verification

- [ ] 4.1 `cargo test` and `npm test` green
- [ ] 4.2 Manual: save in place, `-o`, `--format`, stdin → Save as, copy with shotclip and with the wl-copy fallback (temporarily rename shotclip), hooks with notify-send, overwrite Undo, close dialog, exit codes via `echo $?`; append to `docs/verification.md`
- [ ] 4.3 README: document flags, config keys, hooks, stdout/exit contract, shotclip default
