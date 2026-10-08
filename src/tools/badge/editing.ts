import type { Point } from "../../model/geometry";
import { useEditor } from "../../store/editor";
import { useSettings } from "../../store/settings";
import { afterCreate } from "../text/editing";

const store = useEditor.getState;

/** Counter tool click: a badge with the next number at `p`, selected. */
export function placeBadge(p: Point) {
  const s = store();
  if (!s.document) return;
  const { color, size } = useSettings.getState().tools.badge;
  const n = s.takeBadgeNumber();
  s.addObject({ type: "badge", x: p.x, y: p.y, n, color, size });
  afterCreate();
}

export function openBadgeEditor(id: string) {
  const s = store();
  const o = s.document?.objects.find((x) => x.id === id);
  if (!o || o.type !== "badge") return;
  s.select([id]);
  s.setEditingBadge(id);
}

export function commitBadge(value: string) {
  const s = store();
  const id = s.editingBadge;
  s.setEditingBadge(null);
  const n = Number(value);
  if (!id || value.trim() === "" || !Number.isFinite(n)) return;
  s.setBadgeNumber(id, n);
}
