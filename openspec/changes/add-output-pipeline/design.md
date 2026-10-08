## Context

Builds on `scaffold-app-shell` (Rust runtime, config, CLI) and `add-image-geometry` (document, `DocumentGroup` render pipeline, history). video-trimmer's `export.rs` has the transactional write pattern (temp beside destination, validate, fsync, rename). The user's clipboard tool is `shotclip` (on `PATH`, not in nixpkgs), which advertises file URIs and image bytes; `wl-copy` from wl-clipboard is the fallback.

## Goals / Non-Goals

**Goals:**
- Export output is pixel-identical regardless of viewport zoom or display scale.
- Save never leaves a partial file and never loses the original until the new file is fully written.
- Copy takes under 300ms for a 4k PNG on a typical machine.
- Everything scriptable: flags, stdout path, exit codes, hooks.

**Non-Goals:**
- Multiple output formats per save, quality dialogs (JPEG quality is a config key, no UI).
- Cloud/share targets.
- Copying individual annotation objects (that is annotation-change territory).

## Decisions

### Export renders through the same `DocumentGroup`
`exportDocument(doc, bitmap, format, quality): Promise<Blob>` creates a detached Konva `Stage` of `size.w × size.h`, `pixelRatio: 1`, mounts the same `DocumentGroup` without the viewport group, calls `stage.toCanvas()` then `canvas.convertToBlob({type, quality})`, and destroys the stage. Fonts are already loaded (shell change). Redact filters (later) will also run here because they are part of `DocumentGroup`. Alternative: `stage.toDataURL` on the live stage with a computed pixelRatio; rejected because the live stage includes UI overlays and the viewport.

### Bytes cross IPC as `Uint8Array`
`write_output(bytes, path, overwrite_policy)` and `copy_image(bytes)` take raw bytes (Tauri 2 supports binary IPC via `ArrayBuffer`). No base64, no temp files from the frontend.

### Format resolution
Priority: `--format` flag > `-o` extension > config `format` > source extension (png/jpeg/webp) > png. Save as uses the dialog's chosen extension if it is one of the three, otherwise appends the resolved one. JPEG quality from config `jpeg_quality` (default 92); WebP `webp_quality` (default 90). JPEG export flattens transparency onto `--bg` of the *image*, i.e. white, since screenshots with alpha are rare.

### Atomic write with session backup
`output.rs`: write to `<dir>/.woge-<uuid>.tmp`, fsync, verify the file decodes as an image header of the expected format (magic bytes), then if the destination exists and this is the first overwrite of that path in this process, rename the existing file to `$XDG_CACHE_HOME/woge/backup/<uuid>` and remember the mapping; finally rename temp → destination. `restore_backup(path)` renames the backup back (used by the toast's Undo). Backups are deleted on normal exit. Writing to the source path itself is allowed (that is the point of Save); writing to a directory or unwritable path returns a typed error shown as a toast.

### Save semantics
- `Ctrl+S`: target = `-o` path if given, else source path if the input was a file, else fall through to Save as. After success: toast "Saved to <path>" (+ " · overwrote previous" with an Undo action when a backup was made), stdout prints the path, `on_save` hook runs, dirty flag clears, then `on_save = exit` exits 0 or `stay` keeps the editor open.
- `Ctrl+Shift+S`: `plugin-dialog` save dialog, default name `<stem>-edited.<ext>` in the source directory (or `~/Pictures/woge-YYYYMMDD-HHMMSS.<ext>`); then the same path as Save. Save as never triggers exit regardless of `on_save`.
- `--copy` or config `copy_on_save = true`: also copy after each save.

### Copy
Frontend exports PNG and calls `copy_image`. Rust writes `$XDG_CACHE_HOME/woge/clip-<uuid>.png`, then runs the copy command: config `[copy] command` (default `["shotclip", "--paste-once", "{path}"]`); if the executable is not found and the default was in use, fall back to `["wl-copy", "--type", "image/png"]` with the file piped to stdin. The command is spawned detached (both tools daemonise themselves; we do not wait beyond exec). Previous clip files are deleted when a new one is written, and all are deleted on exit. Toast "Copied to clipboard". `on_copy` hook runs with `WOGE_OUTPUT=<clip path>`. Alternative: `tauri-plugin-clipboard-manager`; rejected (Wayland image support unreliable, and the user prefers shotclip's richer MIME set).

### Hooks
```toml
[hooks]
on_load = ["notify-send", "woge", "loaded {input}"]
on_save = ["notify-send", "woge", "saved {output}"]
on_copy = []
on_exit = []
```
Each hook is an argv array; `{input}`, `{output}`, `{width}`, `{height}`, `{format}` are replaced inside single argv elements (no word splitting, no shell). Environment adds `WOGE_INPUT`, `WOGE_OUTPUT`, `WOGE_WIDTH`, `WOGE_HEIGHT`, `WOGE_FORMAT`, `WOGE_EXIT_CODE` where applicable. Hooks run detached and failures are logged, never block the UI. `on_exit` is awaited up to 2s.

### Dirty tracking and close
`dirty = history.present !== lastSavedDocument` (reference equality after commit, since documents are immutable snapshots). The top bar shows a dot after the file name when dirty. Closing the window with dirty state asks "Discard changes?" via a small in-app dialog (Discard / Cancel / Save). Exit code on close without saving: 1 when scripted (`-o` or stdin input), else 0.

### stdout contract
Only saved paths go to stdout, one per line, flushed immediately. Logs stay in the log file. `--copy`/copy actions print nothing.

## Risks / Trade-offs

- [`convertToBlob` WebP support in WebKitGTK] → feature-detect; if unsupported, show a toast and fall back to PNG with the correct extension warning.
- [Memory for 8k+ exports] → offscreen canvas of 8192×8192 is ~256MB; acceptable for v1, log a warning above 64 Mpx.
- [Backup directory filling up] → backups are per path per session and deleted on exit; crash leaves at most a handful of files, cleaned on next start (purge files older than 1 day).
- [shotclip semantics `--paste-once` exits after the first paste, so a second paste finds nothing] → make it the default per the user's preference but document `[copy] command` to drop the flag.

## Migration Plan

Additive. New config keys are optional and default sensibly.

## Open Questions

- None.
