import type { Point } from "../lib/viewport";

export function formatPointer(p: Point | null): string {
  return p ? `x ${p.x}  y ${p.y}` : "";
}

export function StatusLine({ pointer, detail }: { pointer: Point | null; detail?: string | null }) {
  return (
    <footer className="status" aria-live="off">
      <span>{formatPointer(pointer)}</span>
      {detail && <span className="status-detail">{detail}</span>}
    </footer>
  );
}
