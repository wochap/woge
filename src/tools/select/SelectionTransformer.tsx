import { useEffect, useRef } from "react";
import type Konva from "konva";
import { Transformer } from "react-konva";
import { useEditor } from "../../store/editor";
import { clampTextSize, measuredText, type AnnotationObject } from "../../model/objects";
import { cssVar } from "../../canvas/useHandles";

export const ANCHOR_PX = 8;
const ALL = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
  "top-center",
  "middle-right",
  "bottom-center",
  "middle-left",
];

/** Fold a node's scale into object geometry; the node's scale is reset to 1. */
export function foldTransform<T extends AnnotationObject>(
  obj: T,
  node: Konva.Node,
  anchor: string | null,
): T {
  const o = obj as AnnotationObject;
  return fold(o, node, anchor) as T;
}

function fold(o: AnnotationObject, node: Konva.Node, anchor: string | null): AnnotationObject {
  const sx = node.scaleX();
  const sy = node.scaleY();
  node.scale({ x: 1, y: 1 });
  switch (o.type) {
    case "rect": {
      const w = node.width() * sx;
      const h = node.height() * sy;
      return {
        ...o,
        x: node.x() + Math.min(0, w),
        y: node.y() + Math.min(0, h),
        w: Math.abs(w),
        h: Math.abs(h),
      };
    }
    case "ellipse": {
      const n = node as Konva.Ellipse;
      const rx = Math.abs(n.radiusX() * sx);
      const ry = Math.abs(n.radiusY() * sy);
      return { ...o, x: n.x() - rx, y: n.y() - ry, w: rx * 2, h: ry * 2 };
    }
    case "text": {
      const side = anchor === "middle-left" || anchor === "middle-right";
      if (side) {
        const base = o.w ?? measuredText.get(o.id)?.w ?? 1;
        return { ...o, x: node.x(), y: node.y(), w: Math.max(1, Math.abs(base * sx)) };
      }
      return { ...o, x: node.x(), y: node.y(), size: clampTextSize(o.size * Math.abs(sy)) };
    }
    default:
      return o;
  }
}

/** Live: keep strokes unscaled while dragging handles. */
function liveFold(node: Konva.Node) {
  const sx = node.scaleX();
  const sy = node.scaleY();
  if (node.getClassName() === "Rect" && node.name() === "object") {
    node.scale({ x: 1, y: 1 });
    node.width(Math.max(1, node.width() * sx));
    node.height(Math.max(1, node.height() * sy));
  } else if (node.getClassName() === "Ellipse") {
    const n = node as Konva.Ellipse;
    n.scale({ x: 1, y: 1 });
    n.radiusX(Math.max(0.5, n.radiusX() * sx));
    n.radiusY(Math.max(0.5, n.radiusY() * sy));
  }
}

/** Box transformer for selected rects, ellipses and texts; arrows use endpoint handles. */
export function SelectionTransformer() {
  const ref = useRef<Konva.Transformer>(null);
  const selection = useEditor((s) => s.selection);
  const doc = useEditor((s) => s.document);
  const editing = useEditor((s) => s.editingText);
  const tool = useEditor((s) => s.activeTool);

  const sel = new Set(selection);
  const objs = doc?.objects.filter((o) => sel.has(o.id) && o.type !== "arrow") ?? [];
  const active = tool === "select" && !editing;

  useEffect(() => {
    const tr = ref.current;
    const stage = tr?.getStage();
    if (!tr || !stage) return;
    const nodes = active
      ? objs.map((o) => stage.findOne(`#${o.id}`)).filter((n): n is Konva.Node => !!n)
      : [];
    tr.nodes(nodes);
    tr.getLayer()?.batchDraw();
  });

  const onTransform = () => ref.current?.nodes().forEach(liveFold);
  const onTransformEnd = () => {
    const tr = ref.current;
    if (!tr) return;
    const anchor = tr.getActiveAnchor();
    const byId = new Map(tr.nodes().map((n) => [n.id(), n]));
    useEditor.getState().updateObjects([...byId.keys()], (o) => {
      const n = byId.get(o.id);
      return n ? foldTransform(o, n, anchor) : o;
    });
  };

  const accent = cssVar("--accent") || "#cba6f7";
  const bg = cssVar("--bg") || "#1e1e2e";
  return (
    <Transformer
      ref={ref}
      rotateEnabled={false}
      keepRatio={false}
      ignoreStroke
      flipEnabled={false}
      enabledAnchors={ALL}
      anchorSize={ANCHOR_PX}
      anchorStroke={accent}
      anchorFill={bg}
      anchorCornerRadius={1}
      borderStroke={accent}
      borderStrokeWidth={1}
      onTransform={onTransform}
      onTransformEnd={onTransformEnd}
      boundBoxFunc={(oldBox, box) => (box.width < 2 || box.height < 2 ? oldBox : box)}
    />
  );
}
