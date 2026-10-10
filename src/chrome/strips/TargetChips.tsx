import type { ColorRole } from "../../model/roles";
import { resolveColor } from "../../model/objects";
import { useFlavour } from "../../canvas/ObjectsLayer";
import { withAlpha } from "../../canvas/objectNodes";
import type { RoleValue } from "./apply";

interface Props {
  labels: [string, string];
  value: ColorRole;
  primary: RoleValue;
  secondary: RoleValue;
  onChange(role: ColorRole): void;
}

function ChipColor({ v }: { v: RoleValue }) {
  const flavour = useFlavour();
  if (v.color === null) return <span className="chip-color none">⊘</span>;
  if (!v.color) return <span className="chip-color mixed" />;
  const alpha = v.opacity ?? 1;
  return (
    <span className={alpha < 1 ? "chip-color checker" : "chip-color"}>
      <span style={{ background: withAlpha(resolveColor(v.color, flavour), alpha) }} />
    </span>
  );
}

/** Border/Fill (or Text/Plate) target selector for the swatches and opacity slider. */
export function TargetChips({ labels, value, primary, secondary, onChange }: Props) {
  const roles: [ColorRole, RoleValue][] = [
    ["primary", primary],
    ["secondary", secondary],
  ];
  return (
    <div className="target-chips" role="radiogroup" aria-label="Colour target">
      {roles.map(([role, v], i) => (
        <button
          key={role}
          role="radio"
          aria-checked={value === role}
          className={value === role ? "target-chip active" : "target-chip"}
          onClick={() => onChange(role)}
        >
          <ChipColor v={v} />
          {labels[i]}
        </button>
      ))}
    </div>
  );
}
