## ADDED Requirements

### Requirement: Supported image formats
The editor SHALL load PNG, JPEG and WebP images. Decoding happens in the webview with EXIF orientation applied, so the loaded bitmap is always upright. Unsupported or corrupt data SHALL produce a toast "Could not read image" and leave the current state unchanged.

#### Scenario: EXIF-rotated JPEG
- **WHEN** a JPEG whose EXIF orientation is 6 (rotate 90° CW) is loaded
- **THEN** the displayed bitmap is upright and its reported dimensions are the rotated ones

#### Scenario: Corrupt file
- **WHEN** a file with a `.png` extension that is not a valid image is loaded
- **THEN** a toast "Could not read image" appears and the editor keeps its previous document or empty state

### Requirement: Path input is scoped and read through the asset protocol
When the input is a file path, the backend SHALL canonicalise it, verify it is a readable regular file, add only that file to the asset-protocol scope and return a `convertFileSrc`-compatible URL together with the file name and byte size.

#### Scenario: Readable file
- **WHEN** `load_input` is called with a readable image path
- **THEN** the command returns the asset URL, the canonical path and the file name, and the webview can fetch it

#### Scenario: Unreadable path
- **WHEN** `load_input` is called with a directory or a missing file
- **THEN** the command returns an error naming the path and nothing is added to the asset scope

### Requirement: Byte inputs are staged in the cache directory
Stdin and clipboard bytes SHALL be written to a unique temp file under `$XDG_CACHE_HOME/woge/` and loaded like a path, with `sourcePath` set to `null`. Staged files SHALL be deleted when a new input replaces them and on normal exit.

#### Scenario: Stdin
- **WHEN** the CLI received `-` and stdin held 2 MiB of PNG data
- **THEN** the webview loads that image and the top bar shows "stdin" with the pixel dimensions

#### Scenario: Clipboard via wl-paste
- **WHEN** `load_clipboard` is invoked and `wl-paste --list-types` includes `image/png`
- **THEN** the backend runs `wl-paste --no-newline --type image/png`, stages the bytes and loads them

#### Scenario: Clipboard without an image
- **WHEN** `load_clipboard` is invoked and no `image/*` type is offered
- **THEN** a toast "Clipboard has no image" appears and the document is unchanged

#### Scenario: wl-paste missing
- **WHEN** `wl-paste` is not on `PATH`
- **THEN** a toast "wl-paste not found" appears and the document is unchanged

### Requirement: Interactive ways to open an image
The editor SHALL accept a dropped file anywhere on the window, `Ctrl+O` opening a native file dialog filtered to PNG/JPEG/WebP, and `Ctrl+V` loading the clipboard image. All three go through the same load path.

#### Scenario: Drag and drop
- **WHEN** the user drops an image file onto the window
- **THEN** the file is loaded and the drop target highlight disappears

#### Scenario: Open dialog
- **WHEN** the user presses `Ctrl+O` and picks a file
- **THEN** the file is loaded; cancelling the dialog changes nothing

#### Scenario: Paste
- **WHEN** the user presses `Ctrl+V` while focus is not in a text field
- **THEN** the clipboard image is loaded

### Requirement: Loading state
While an input is being read and decoded the top bar SHALL show the file name with a skeleton in place of the dimensions, and the canvas SHALL keep showing the previous document or empty state. A second load request while one is in flight SHALL supersede the first.

#### Scenario: Superseded load
- **WHEN** two loads start in quick succession
- **THEN** only the later one updates the document
