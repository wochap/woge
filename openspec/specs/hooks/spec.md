# hooks Specification

## Purpose
User-configured external commands run on load, save, copy and exit: configuration, placeholders, environment, execution model and timing.

## Requirements

### Requirement: Hook configuration
The config file SHALL accept a `[hooks]` table with optional `on_load`, `on_save`, `on_copy` and `on_exit` keys, each an array of strings forming an argv. An empty array or a missing key disables the hook. A non-array value SHALL fail startup with exit 2 naming the key.

#### Scenario: Valid hook
- **WHEN** config has `on_save = ["notify-send", "woge", "saved {output}"]`
- **THEN** startup succeeds and the hook is registered

#### Scenario: Invalid hook
- **WHEN** config has `on_save = "notify-send"`
- **THEN** startup fails with exit 2 and the message names `hooks.on_save`

### Requirement: Placeholders and environment
Before execution each argv element SHALL have `{input}`, `{output}`, `{width}`, `{height}` and `{format}` replaced with the current values (empty string when not applicable), without splitting the element. The child environment SHALL include `WOGE_INPUT`, `WOGE_OUTPUT`, `WOGE_WIDTH`, `WOGE_HEIGHT`, `WOGE_FORMAT` and, for `on_exit`, `WOGE_EXIT_CODE`.

#### Scenario: Path with spaces
- **WHEN** the output path is `/home/u/My Shots/a.png` and the hook is `["cp", "{output}", "/tmp/x"]`
- **THEN** `cp` receives exactly three arguments and the second is the full path with the space

#### Scenario: Environment
- **WHEN** `on_save` runs after saving a 1240×720 PNG
- **THEN** the child sees `WOGE_WIDTH=1240`, `WOGE_HEIGHT=720`, `WOGE_FORMAT=png`

### Requirement: Execution model
Hooks SHALL be executed directly (no shell), detached from the UI thread, with stdout and stderr captured to the log. `on_load`, `on_save` and `on_copy` SHALL NOT block the editor; `on_exit` SHALL be awaited for at most 2 seconds before the process exits. A hook that fails to spawn or exits non-zero SHALL be logged and SHALL NOT change the editor outcome.

#### Scenario: Missing executable
- **WHEN** `on_save = ["does-not-exist"]` and the user saves
- **THEN** the save succeeds, the path is printed, and the log records the spawn error

#### Scenario: Slow on_exit
- **WHEN** `on_exit` sleeps for 10 seconds
- **THEN** the process still exits within about 2 seconds

### Requirement: Hook timing
`on_load` SHALL run after an image is successfully loaded (including via drag-drop or paste). `on_save` SHALL run after a successful write, before any `on_save = exit`. `on_copy` SHALL run after the copy command was spawned. `on_exit` SHALL run once with the final exit code.

#### Scenario: Save then exit
- **WHEN** `on_save = "exit"` and the user saves
- **THEN** `on_save` is spawned, then `on_exit` runs with `WOGE_EXIT_CODE=0`, then the process exits
