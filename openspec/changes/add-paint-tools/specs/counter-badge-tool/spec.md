## ADDED Requirements

### Requirement: Placing badges
With Counter badge (`N`) active, a click SHALL place a badge at the pointer with number `max(existing) + 1` (1 when none), in the current colour and size (S/M/L = 22/28/36 px scaled like strokes), with the number centred in bold. The new badge SHALL be selected and the tool stays active.

#### Scenario: Sequence
- **WHEN** the user clicks three times
- **THEN** badges 1, 2, 3 exist and the strip reads "Next: 4"

#### Scenario: Contrast
- **WHEN** a badge uses the yellow colour under Mocha
- **THEN** the number renders in crust (dark) for contrast; under Latte accents the number renders in base (light)

### Requirement: Renumbering
Deleting a badge SHALL renumber the remaining badges in creation order so numbers stay contiguous from 1, unless config `badge_renumber = false`.

#### Scenario: Delete middle
- **WHEN** badges 1–4 exist and badge 2 is deleted
- **THEN** the remaining badges read 1, 2, 3 and "Next: 4"

#### Scenario: Renumber disabled
- **WHEN** `badge_renumber = false` and badge 2 of 4 is deleted
- **THEN** badges 1, 3, 4 remain and "Next: 5"

### Requirement: Editing a badge number
Double-click or Enter on a selected badge SHALL open an inline numeric editor; committing sets the number without renumbering others. Reset in the strip SHALL make the next badge 1 without changing existing badges.

#### Scenario: Manual number
- **WHEN** the user edits badge 3 to 7
- **THEN** it reads 7 and "Next: 8"

#### Scenario: Reset
- **WHEN** badges 1–3 exist and the user clicks Reset
- **THEN** the next placed badge is 1

### Requirement: Badges are objects
Badges SHALL be selectable, movable, deletable, duplicable (the duplicate takes the next number), part of z-order and clipboard, and rotate with the image. The transformer SHALL not resize badges; size comes from S/M/L.

#### Scenario: Duplicate
- **WHEN** badge 2 is duplicated with `Ctrl+D` while badges 1–3 exist
- **THEN** the copy reads 4

### Requirement: Badge strip and settings
The strip SHALL show swatches, size S/M/L, the `Next: N` mono readout and a Reset button. Colour and size persist like other tools; defaults mauve M.

#### Scenario: Change size with selection
- **WHEN** a badge is selected and L is chosen
- **THEN** that badge becomes L and the next badge defaults to L
