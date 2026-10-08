## ADDED Requirements

### Requirement: Save in place
`Ctrl+S` or the Save button SHALL write the exported image to the `-o` path when given, otherwise to the source path when the input was a file, otherwise SHALL behave as Save as.

#### Scenario: File input
- **WHEN** the user opened `shot.png` and presses `Ctrl+S`
- **THEN** `shot.png` is replaced with the exported image

#### Scenario: Output flag
- **WHEN** the app was started with `-o out.png` and the user presses `Ctrl+S`
- **THEN** `out.png` is written and `shot.png` is untouched

#### Scenario: Stdin input
- **WHEN** the input came from stdin and the user presses `Ctrl+S`
- **THEN** the Save as dialog opens

### Requirement: Atomic writes with session backup
The backend SHALL write to a temp file in the destination directory, fsync, verify the magic bytes match the format, and rename over the destination. When the destination exists and has not been overwritten before in this process, the previous file SHALL be moved to a session backup first. Failures SHALL leave the destination untouched and remove the temp file.

#### Scenario: Overwrite
- **WHEN** Save writes over an existing `shot.png`
- **THEN** the old `shot.png` is kept as a backup for the session and the new file appears atomically

#### Scenario: Write failure
- **WHEN** the destination directory is not writable
- **THEN** a toast names the path and the error, no temp file remains, and the old file is intact

#### Scenario: Destination is a directory
- **WHEN** `-o` points at a directory
- **THEN** Save fails with a toast and nothing is written

### Requirement: Save as
`Ctrl+Shift+S` or the Save as button SHALL open the native save dialog prefilled with `<stem>-edited.<ext>` in the source directory, or `~/Pictures/woge-<YYYYMMDD-HHMMSS>.<ext>` when there is no source path. Cancelling SHALL do nothing. Save as SHALL never exit the app regardless of `on_save`.

#### Scenario: Default name
- **WHEN** the source is `/tmp/shot.png` and the user presses `Ctrl+Shift+S`
- **THEN** the dialog proposes `/tmp/shot-edited.png`

#### Scenario: Extension mismatch
- **WHEN** the user types `out.bmp` in the dialog
- **THEN** the file is saved as `out.bmp.png` in the resolved format and a toast explains the extension

### Requirement: Feedback and undo of an overwrite
After a save a toast SHALL read "Saved to <path>"; when a backup was made it SHALL add " · overwrote previous" and an Undo action that restores the backup. The saved path SHALL be printed to stdout as one line.

#### Scenario: Undo overwrite
- **WHEN** the user activates Undo on the saved toast
- **THEN** the previous file content is restored at the path and the document stays as edited

#### Scenario: stdout
- **WHEN** a save succeeds
- **THEN** exactly one line with the absolute path is written to stdout and flushed

### Requirement: After-save behaviour
With `on_save = exit` (default) a successful Save SHALL exit the process with status 0. With `stay` the editor SHALL remain open with the dirty flag cleared. `--copy` or `copy_on_save = true` SHALL also copy the result to the clipboard before exiting.

#### Scenario: Default exit
- **WHEN** the user presses `Ctrl+S` and the write succeeds
- **THEN** the on_save hook runs, the path is printed and the process exits 0

#### Scenario: Stay
- **WHEN** `on_save = "stay"` and the user saves
- **THEN** the window stays open and the dirty dot disappears

### Requirement: Copy to clipboard
`Ctrl+C` with no annotation selected, or the Copy button, SHALL export PNG, write it to the cache dir and run the configured copy command, default `shotclip --paste-once {path}`, falling back to `wl-copy --type image/png` when `shotclip` is not found and the default command is in use. A toast "Copied to clipboard" SHALL confirm. Copy SHALL NOT change the dirty state or exit the app.

#### Scenario: Default copy
- **WHEN** the user presses `Ctrl+C` and shotclip is installed
- **THEN** shotclip is spawned with the PNG path and the toast appears within 300ms for a 4k image

#### Scenario: Fallback
- **WHEN** shotclip is missing and wl-copy exists
- **THEN** wl-copy receives the PNG on stdin and the toast appears

#### Scenario: Neither tool
- **WHEN** neither shotclip nor wl-copy is found
- **THEN** a toast "No clipboard tool found (shotclip or wl-copy)" appears

#### Scenario: Custom command
- **WHEN** config has `[copy] command = ["wl-copy", "--type", "image/png"]`
- **THEN** that command is used with the PNG on stdin when no `{path}` placeholder is present

### Requirement: Dirty state and closing
The top bar SHALL show a dirty indicator after the file name whenever the current document differs from the last saved or loaded one. Closing with a dirty document SHALL ask Discard / Cancel / Save. Closing without saving SHALL exit 1 when the run was scripted (`-o` given or stdin input), otherwise 0.

#### Scenario: Close dirty
- **WHEN** the user presses `Ctrl+Q` with unsaved edits
- **THEN** a dialog offers Discard, Cancel and Save

#### Scenario: Scripted cancel
- **WHEN** `grim - | woge -` is running and the user discards and closes
- **THEN** the process exits 1 and prints nothing to stdout
