import { SWATCHES, needsRim, type ColorKey } from "../../model/palette";
import { resolveColor } from "../../model/objects";
import { useFlavour } from "../../canvas/ObjectsLayer";

interface Props {
  value: ColorKey | undefined;
  onChange(c: ColorKey): void;
}

/** Ten annotation colours; the chosen one is ringed in `--accent`. */
export function Swatches({ value, onChange }: Props) {
  const flavour = useFlavour();
  return (
    <div className="swatches" role="radiogroup" aria-label="Colour">
      {SWATCHES.map((c) => (
        <button
          key={c}
          role="radio"
          aria-checked={value === c}
          aria-label={c}
          title={c}
          className={["swatch", value === c && "active", needsRim(c, flavour) && "rim"]
            .filter(Boolean)
            .join(" ")}
          style={{ background: resolveColor(c, flavour) }}
          onClick={() => onChange(c)}
        />
      ))}
    </div>
  );
}
