import { useEffect, useState, type KeyboardEvent } from "react";
import { LockSimple, LockSimpleOpen } from "@phosphor-icons/react";
import { useEditor } from "../../store/editor";
import { originalSize, percentOf, setHeight, setPercent, setWidth } from "./math";

function NumField({
  label,
  value,
  suffix,
  onApply,
}: {
  label: string;
  value: number;
  suffix?: string;
  onApply(n: number): void;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const apply = () => {
    const n = Number(text);
    if (Number.isFinite(n) && n > 0) onApply(n);
    else setText(String(value));
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      apply();
    } else if (e.key === "Escape") {
      setText(String(value));
      e.currentTarget.blur();
    }
  };
  return (
    <label className="strip-field">
      <span>{label}</span>
      <input
        type="text"
        inputMode="numeric"
        aria-label={label}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={apply}
        onKeyDown={onKey}
      />
      {suffix && <span>{suffix}</span>}
    </label>
  );
}

export function ResizeStrip() {
  const doc = useEditor((s) => s.document);
  const size = useEditor((s) => s.resizeDraft);
  const lock = useEditor((s) => s.resizeLock);
  if (!doc || !size) return null;
  const orig = originalSize(doc);
  const set = (d: { w: number; h: number }) =>
    useEditor.setState({ resizeDraft: { x: size.x, y: size.y, w: d.w, h: d.h } });
  return (
    <>
      <NumField label="W" value={size.w} onApply={(n) => set(setWidth(orig, size, n, lock))} />
      <button
        className={lock ? "btn btn-ghost btn-icon active" : "btn btn-ghost btn-icon"}
        aria-label="Lock aspect"
        aria-pressed={lock}
        onClick={() => useEditor.setState({ resizeLock: !lock })}
      >
        {lock ? <LockSimple size={14} /> : <LockSimpleOpen size={14} />}
      </button>
      <NumField label="H" value={size.h} onApply={(n) => set(setHeight(orig, size, n, lock))} />
      <NumField label="%" value={percentOf(orig, size)} onApply={(n) => set(setPercent(orig, n))} />
      <span className="strip-muted">
        from {orig.w} × {orig.h}
      </span>
      <span className="strip-hint">Opposite corner stays put · Shift unlock aspect · Enter apply</span>
    </>
  );
}
