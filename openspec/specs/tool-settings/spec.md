# tool-settings Specification

## Purpose
Per-tool defaults: remembered settings, built-in defaults, config seeding with state precedence and sticky tools.

## Requirements

### Requirement: Per-tool defaults are remembered
The editor SHALL persist, per tool, the last chosen primary colour and its opacity, width, fill colour (or none) and fill opacity, arrowheads, font, size, bold, plate colour (or none) and plate opacity, plus the recent fonts list, to `$XDG_STATE_HOME/woge/state.json` (default `~/.local/state/woge/state.json`). Opacities are stored as numbers from 0 to 1. Writes are debounced (about 500ms) and performed by the backend. On startup the file is read and applied before the first tool is used. Out-of-range opacities SHALL be clamped. Unknown colour keys SHALL be ignored field by field.

#### Scenario: Restart keeps colour
- **WHEN** the user picks green for Rectangle, quits, and restarts
- **THEN** the Rectangle default colour is green

#### Scenario: Restart keeps fill and opacity
- **WHEN** the user sets the Rectangle fill to yellow at 40% and border opacity to 80%, quits, and restarts
- **THEN** the Rectangle defaults are yellow fill at 40% and border at 80%

#### Scenario: Corrupt state file
- **WHEN** `state.json` is not valid JSON or has a different `version`
- **THEN** built-in defaults apply, the problem is logged, and the file is overwritten on the next change

### Requirement: Built-in defaults
Without a state file the defaults SHALL be:
- colour red at 100% opacity, width M, no fill, fill opacity 25% (used when a fill is first set)
- arrow heads End
- font Inter Variable, size 24, bold off
- no plate, plate opacity 70% (used when a plate is first set)

#### Scenario: First run
- **WHEN** no state file exists
- **THEN** the first rectangle drawn has an opaque red border, width M, unfilled

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
`state.json` SHALL also persist brush (colour, opacity, width, smooth), highlighter (colour, opacity, width), redact (mode, strength) and badge (colour, size) defaults. Built-in defaults: brush red 100% M smooth on; highlighter yellow 50% M; redact pixelate 12; badge mauve M. Config `badge_renumber` (default true) is a config key, not state.

#### Scenario: Redact persists
- **WHEN** the user sets Blur 16, quits and restarts
- **THEN** Redact starts in Blur mode with strength 16

#### Scenario: Highlighter opacity persists
- **WHEN** the user sets the highlighter opacity to 70%, quits and restarts
- **THEN** Highlighter starts at 70%

### Requirement: Legacy fill and plate settings migrate
When `state.json` (same `version`) contains the pre-opacity booleans, the editor SHALL migrate them field by field instead of discarding the file. For rectangle and ellipse, `fill: true` SHALL become a fill in the stored border colour at 25% and `fill: false` SHALL become no fill. For text, `plate: true` SHALL become a plate in black or white, whichever contrasts more with the stored text colour, at 70%, and `plate: false` SHALL become no plate. Missing opacity fields SHALL take built-in defaults. The next write SHALL store only the new fields.

#### Scenario: Filled rectangle default
- **WHEN** `state.json` has `tools.rect = { "stroke": "blue", "fill": true }`
- **THEN** the Rectangle default is a blue border at 100% with a blue fill at 25%

#### Scenario: Plate default
- **WHEN** `state.json` has `tools.text = { "color": "white", "plate": true }`
- **THEN** the Text default plate is black at 70%
