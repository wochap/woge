import type { StrokeWidth } from "../../model/objects";

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T | undefined;
  onChange(v: T): void;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          role="radio"
          aria-checked={value === o.id}
          className={value === o.id ? "seg active" : "seg"}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const WIDTHS: { id: StrokeWidth; label: string }[] = [
  { id: "S", label: "S" },
  { id: "M", label: "M" },
  { id: "L", label: "L" },
];

export function WidthSegmented(p: {
  value: StrokeWidth | undefined;
  onChange(v: StrokeWidth): void;
}) {
  return <Segmented label="Width" options={WIDTHS} {...p} />;
}

export function Toggle({
  label,
  on,
  onChange,
  children,
}: {
  label: string;
  on: boolean;
  onChange(v: boolean): void;
  children?: React.ReactNode;
}) {
  return (
    <button
      className={on ? "strip-toggle active" : "strip-toggle"}
      aria-pressed={on}
      aria-label={label}
      title={label}
      onClick={() => onChange(!on)}
    >
      {children ?? label}
    </button>
  );
}
