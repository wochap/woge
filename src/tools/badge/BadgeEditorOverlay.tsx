import { useEffect, useRef } from "react";
import { useEditor } from "../../store/editor";
import { badgePx, resolveColor, badgeTextColor } from "../../model/objects";
import { rotatedDims } from "../../model/document";
import { useFlavour } from "../../canvas/ObjectsLayer";
import { textOverlayPosition } from "../text/editing";
import { commitBadge } from "./editing";

/** Small numeric input over the badge being edited. */
export function BadgeEditorOverlay() {
  const id = useEditor((s) => s.editingBadge);
  const doc = useEditor((s) => s.document);
  const view = useEditor((s) => s.viewport);
  const flavour = useFlavour();
  const ref = useRef<HTMLInputElement>(null);
  const done = useRef(false);
  useEffect(() => {
    done.current = false;
    ref.current?.focus();
    ref.current?.select();
  }, [id]);
  const obj = doc?.objects.find((o) => o.id === id);
  if (!doc || !obj || obj.type !== "badge") return null;
  const d = badgePx(obj.size, rotatedDims(doc));
  const pos = textOverlayPosition(doc, view, { x: obj.x - d / 2, y: obj.y - d / 2 });
  const fill = resolveColor(obj.color, flavour);
  const finish = (commit: boolean) => {
    if (done.current) return;
    done.current = true;
    if (commit) commitBadge(ref.current?.value ?? "");
    else useEditor.getState().setEditingBadge(null);
  };
  return (
    <input
      ref={ref}
      className="badge-editor"
      data-testid="badge-editor"
      type="number"
      min={0}
      defaultValue={obj.n}
      onBlur={() => finish(true)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") finish(true);
        else if (e.key === "Escape") finish(false);
      }}
      style={{
        position: "absolute",
        left: pos.left,
        top: pos.top,
        width: d,
        height: d,
        transform: `scale(${pos.scale})`,
        transformOrigin: "0 0",
        borderRadius: "50%",
        border: "none",
        outline: "none",
        padding: 0,
        textAlign: "center",
        font: `bold ${d * 0.55}px "Inter Variable"`,
        background: fill,
        color: badgeTextColor(fill),
        MozAppearance: "textfield",
      }}
    />
  );
}
