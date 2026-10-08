# tool-settings Specification

## Purpose
Per-tool defaults: remembered settings, built-in defaults, config seeding with state precedence and sticky tools.

## Requirements

### Requirement: Per-tool defaults are remembered
The editor SHALL persist, per tool, the last chosen colour, width, fill, arrowheads, font, size, bold and plate, plus the recent fonts list, to `$XDG_STATE_HOME/woge/state.json` (default `~/.local/state/woge/state.json`). Writes are debounced (about 500ms) and performed by the backend. On startup the file is read and applied before the first tool is used.

#### Scenario: Restart keeps colour
- **WHEN** the user picks green for Rectangle, quits, and restarts
- **THEN** the Rectangle default colour is green

#### Scenario: Corrupt state file
- **WHEN** `state.json` is not valid JSON or has a different `version`
- **THEN** built-in defaults apply, the problem is logged, and the file is overwritten on the next change

### Requirement: Built-in defaults
Without a state file the defaults SHALL be: colour red, width M, fill off, arrow heads End, font Inter Variable, size 24, bold off, plate off.

#### Scenario: First run
- **WHEN** no state file exists
- **THEN** the first rectangle drawn is red, width M, unfilled

### Requirement: Config seeds, state wins
Config `[defaults]` (`color`, `stroke`, `font`, `font_size`) MAY seed the defaults; a value in `state.json` SHALL take precedence over config.

#### Scenario: Seed
- **WHEN** config has `[defaults] color = "blue"` and no state exists
- **THEN** all tools start blue

### Requirement: Sticky tools are configurable
Config `tool_sticky = true` (default) SHALL keep a drawing tool active after creating an object; `false` SHALL return to Select after each creation.

#### Scenario: Non-sticky
- **WHEN** `tool_sticky = false` and the user draws a rectangle
- **THEN** the active tool becomes Select

### Requirement: Paint tool defaults are remembered
`state.json` SHALL also persist brush (colour, width, smooth), highlighter (colour, width), redact (mode, strength) and badge (colour, size) defaults. Built-in defaults: brush red M smooth on; highlighter yellow M; redact pixelate 12; badge mauve M. Config `badge_renumber` (default true) is a config key, not state.

#### Scenario: Redact persists
- **WHEN** the user sets Blur 16, quits and restarts
- **THEN** Redact starts in Blur mode with strength 16
