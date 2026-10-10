import { useEffect, useRef } from "react";

interface Props {
  onClose(): void;
  onFit(): void;
  onActual(): void;
  onZoomIn(): void;
  onZoomOut(): void;
  checkerboard: boolean;
  onToggleCheckerboard(): void;
}

export function ZoomMenu(p: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.parentElement?.contains(e.target as Node)) p.onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        p.onClose();
      }
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey, true);
    ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [p.onClose]);

  const item = (label: string, hint: string, run: () => void) => (
    <button
      role="menuitem"
      className="menu-item"
      onClick={() => {
        run();
        p.onClose();
      }}
    >
      <span>{label}</span>
      <span className="hint">{hint}</span>
    </button>
  );

  return (
    <div ref={ref} role="menu" className="menu" data-role="zoom-menu">
      {item("Fit", "Ctrl 0", p.onFit)}
      {item("100%", "Ctrl 1", p.onActual)}
      {item("Zoom in", "Ctrl +", p.onZoomIn)}
      {item("Zoom out", "Ctrl −", p.onZoomOut)}
      <div className="menu-sep" />
      <button
        role="menuitemcheckbox"
        aria-checked={p.checkerboard}
        className="menu-item"
        onClick={p.onToggleCheckerboard}
      >
        <span>Checkerboard</span>
        <span className={p.checkerboard ? "switch on" : "switch"} />
      </button>
    </div>
  );
}
