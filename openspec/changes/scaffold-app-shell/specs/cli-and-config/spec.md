## ADDED Requirements

### Requirement: Command line surface
The binary SHALL accept `woge [INPUT] [--clipboard] [--theme auto|mocha|latte] [-v]`. `INPUT` is a file path or `-` for standard input. `INPUT` and `--clipboard` are mutually exclusive. Unknown flags SHALL fail with clap's usage error and exit status 2.

#### Scenario: Open a file
- **WHEN** `woge shot.png` runs
- **THEN** the editor opens with `shot.png` loaded and its name in the top bar

#### Scenario: Read standard input
- **WHEN** `grim - | woge -` runs
- **THEN** the editor reads all bytes from stdin before showing the window and loads them as the image, with no source path

#### Scenario: Load from clipboard
- **WHEN** `woge --clipboard` runs and the clipboard holds an image
- **THEN** the editor loads the clipboard image, with no source path

#### Scenario: Conflicting inputs
- **WHEN** `woge shot.png --clipboard` runs
- **THEN** clap reports the conflict and the process exits 2

#### Scenario: No input
- **WHEN** `woge` runs with no input
- **THEN** the editor opens in the empty state

### Requirement: Configuration file
The application SHALL read `$XDG_CONFIG_HOME/woge/config.toml` (default `~/.config/woge/config.toml`). All keys are optional. Unknown keys, invalid values or malformed TOML SHALL abort startup with exit 2 and a message naming the file and the key. Keys defined by this change: `theme = "auto" | "mocha" | "latte"` (default `auto`), `status_line = bool` (default `true`), `checkerboard = bool` (default `false`).

#### Scenario: Missing file
- **WHEN** no config file exists
- **THEN** built-in defaults apply and nothing is written

#### Scenario: Unknown key
- **WHEN** the file contains `colour = "red"`
- **THEN** startup fails with exit 2 and the message names `config.toml` and `colour`

#### Scenario: Valid override
- **WHEN** the file contains `theme = "latte"`
- **THEN** the editor renders in Latte regardless of the system colour scheme

### Requirement: Precedence
Effective settings SHALL resolve as built-in default, then config file, then command line flag, later wins.

#### Scenario: Flag beats file
- **WHEN** the file says `theme = "latte"` and the command line has `--theme mocha`
- **THEN** the editor renders in Mocha

### Requirement: Launch options reach the webview once
The backend SHALL expose a `take_launch_options` command returning the resolved input kind, source path (if any), theme, status line and checkerboard flags. It SHALL return the options only on the first call.

#### Scenario: First call
- **WHEN** the frontend calls `take_launch_options` after mount
- **THEN** it receives the resolved options and uses them to load the input and apply the theme

#### Scenario: Second call
- **WHEN** `take_launch_options` is called again (for example after a dev hot reload)
- **THEN** it returns `null` and the frontend keeps its current state
