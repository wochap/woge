import type { Point } from "../lib/viewport";
import { useEditor } from "../store/editor";

export function formatPointer(p: Point | null): string {
  return p ? `x ${p.x}  y ${p.y}` : "";
}

export function StatusLine({ detail }: { detail?: string | null }) {
  const pointer = useEditor((s) => s.pointer);
  return (
    <footer className="status" aria-live="off">
      <span>{formatPointer(pointer)}</span>
      {detail && <span className="status-detail">{detail}</span>}
    </footer>
  );
}
