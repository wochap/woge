import { useEffect, useRef } from "react";

interface Props {
  onDiscard(): void;
  onCancel(): void;
  onSave(): void;
}

/** "Discard changes?" before closing with unsaved edits. Focus starts on Cancel; Esc cancels. */
export function CloseDialog({ onDiscard, onCancel, onSave }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => cancelRef.current?.focus(), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      onCancel();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onCancel]);

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Discard changes?">
      <div className="dialog-panel">
        <div className="dialog-title">Discard changes?</div>
        <p className="dialog-body">The image has unsaved edits.</p>
        <div className="dialog-actions">
          <button className="btn btn-ghost" onClick={onDiscard}>
            Discard
          </button>
          <button className="btn btn-secondary" ref={cancelRef} onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
