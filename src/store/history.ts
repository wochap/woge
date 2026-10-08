import type { Document } from "../model/document";

export const HISTORY_CAP = 200;

/** Snapshot undo/redo over the serialisable document (never pixels). */
export interface History {
  past: Document[];
  present: Document;
  future: Document[];
}

export function reset(doc: Document): History {
  return { past: [], present: doc, future: [] };
}

export function commit(h: History, next: Document): History {
  const past = [...h.past, h.present];
  if (past.length > HISTORY_CAP) past.splice(0, past.length - HISTORY_CAP);
  return { past, present: structuredClone(next), future: [] };
}

export function undo(h: History): History {
  if (!canUndo(h)) return h;
  return {
    past: h.past.slice(0, -1),
    present: h.past[h.past.length - 1],
    future: [h.present, ...h.future],
  };
}

export function redo(h: History): History {
  if (!canRedo(h)) return h;
  return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) };
}

export const canUndo = (h: History | null) => !!h && h.past.length > 0;
export const canRedo = (h: History | null) => !!h && h.future.length > 0;
