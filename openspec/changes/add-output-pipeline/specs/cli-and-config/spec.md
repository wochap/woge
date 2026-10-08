## ADDED Requirements

### Requirement: Output flags
The CLI SHALL accept `-o, --output PATH`, `--format png|jpeg|webp`, `--on-save exit|stay` and `--copy`. `--format` SHALL override the `-o` extension and rewrite it. `-o` pointing at the input path is allowed (same as Save in place).

#### Scenario: Output redirect
- **WHEN** `woge shot.png -o out.png` runs and the user saves
- **THEN** `out.png` is written and printed on stdout

#### Scenario: Format rewrites extension
- **WHEN** `woge shot.png -o out.jpg --format webp` runs and the user saves
- **THEN** `out.webp` is written

#### Scenario: Stay open
- **WHEN** `--on-save stay` is given
- **THEN** saving does not exit the process

### Requirement: Output config keys
The config file SHALL accept `format`, `on_save`, `copy_on_save`, `jpeg_quality` (1–100), `webp_quality` (1–100), a `[copy]` table with `command` (argv array, `{path}` placeholder optional) and a `[hooks]` table. Precedence stays default < file < flag.

#### Scenario: Config format
- **WHEN** config has `format = "jpeg"` and the source is PNG with no flags
- **THEN** Save as proposes a `.jpg` name and writes JPEG

#### Scenario: Quality bounds
- **WHEN** config has `jpeg_quality = 150`
- **THEN** startup fails with exit 2 naming `jpeg_quality`

### Requirement: stdout and exit codes
Only saved output paths SHALL be written to stdout, one per line. Exit SHALL be 0 after a save with `on_save = exit` or a normal close with nothing to lose, 1 when a scripted run closes without saving, 2 on startup errors.

#### Scenario: Pipeline friendly
- **WHEN** `grim - | woge - -o /tmp/a.png --on-save exit` runs and the user saves
- **THEN** stdout is exactly `/tmp/a.png\n` and the exit status is 0
