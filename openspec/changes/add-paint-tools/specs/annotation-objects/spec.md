## ADDED Requirements

### Requirement: Paint object types
`brush`, `highlight`, `redact` and `badge` objects SHALL be members of the annotation object union and SHALL participate in selection, move, z-order, duplicate, delete, object clipboard and image rotation. Transform scaling SHALL apply to `brush`, `highlight` and `redact` (stroke widths unchanged) and SHALL NOT apply to `badge`.

#### Scenario: Mixed selection
- **WHEN** a rectangle, a brush stroke and a badge are selected and nudged
- **THEN** all three move together in one history entry

#### Scenario: Transformer with badge
- **WHEN** only a badge is selected
- **THEN** no resize handles are shown, only a selection outline
