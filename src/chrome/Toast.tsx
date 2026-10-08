import { useEffect } from "react";
import { Check, WarningCircle } from "@phosphor-icons/react";
import type { ToastMessage } from "../store/editor";

export const TOAST_MS = 2500;

interface Props {
  toast: ToastMessage | null;
  onDismiss(id: number): void;
}

/** Shows the newest message; a new toast replaces the previous one and restarts the timer. */
export function Toast({ toast, onDismiss }: Props) {
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => onDismiss(toast.id), TOAST_MS);
    return () => window.clearTimeout(t);
  }, [toast, onDismiss]);

  if (!toast) return null;
  return (
    <div className={toast.action ? "toast has-action" : "toast"} role="status">
      {toast.kind === "success" && <Check className="ok" />}
      {toast.kind === "error" && <WarningCircle className="err" />}
      <span>{toast.text}</span>
      {toast.action && (
        <button
          onClick={() => {
            toast.action!.run();
            onDismiss(toast.id);
          }}
        >
          {toast.action.label}
        </button>
      )}
    </div>
  );
}
