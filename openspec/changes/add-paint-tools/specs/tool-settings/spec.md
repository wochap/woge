## ADDED Requirements

### Requirement: Paint tool defaults are remembered
`state.json` SHALL also persist brush (colour, width, smooth), highlighter (colour, width), redact (mode, strength) and badge (colour, size) defaults. Built-in defaults: brush red M smooth on; highlighter yellow M; redact pixelate 12; badge mauve M. Config `badge_renumber` (default true) is a config key, not state.

#### Scenario: Redact persists
- **WHEN** the user sets Blur 16, quits and restarts
- **THEN** Redact starts in Blur mode with strength 16
