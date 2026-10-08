import { COLUMNS, KEYMAP } from "../lib/keys";

export function ShortcutOverlay({ onClose }: { onClose(): void }) {
  return (
    <div
      className="overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onPointerDown={onClose}
    >
      <div className="overlay-panel" onPointerDown={(e) => e.stopPropagation()}>
        <div className="overlay-head">
          <span className="overlay-title">Keyboard shortcuts</span>
          <span className="overlay-hint">
            Press <kbd>?</kbd> or <kbd>Esc</kbd> to close
          </span>
        </div>
        <div className="overlay-cols">
          {COLUMNS.map((col) => (
            <div key={col.id} className="overlay-col">
              <div className="overlay-col-title">{col.title}</div>
              {KEYMAP.filter((k) => k.column === col.id).map((k) => (
                <div key={k.id} className="overlay-row">
                  <span>{k.label}</span>
                  <kbd>{k.display}</kbd>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
