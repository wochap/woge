import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type Konva from "konva";
import { Arrow, Ellipse, Group, Rect as KRect, Text } from "react-konva";
import { rotatedDims, type Document } from "../model/document";
import { measuredText, sortByZ, type AnnotationObject, type TextObj } from "../model/objects";
import { useEditor } from "../store/editor";
import { ensureFontLoaded } from "../lib/fonts";
import {
  arrowAttrs,
  ellipseAttrs,
  plateAttrs,
  rectAttrs,
  textAttrs,
  type RenderCtx,
} from "./objectNodes";
import {
  objectDragEnd,
  objectDragMove,
  objectDragStart,
  objectPointerDown,
} from "../tools/select/useSelectTool";
import { openTextEditor } from "../tools/text/editing";
import type { Flavour } from "../lib/theme";

/** Current `data-theme`, following changes. */
export function useFlavour(): Flavour {
  const read = (): Flavour =>
    window.document.documentElement.dataset.theme === "latte" ? "latte" : "mocha";
  const [flavour, setFlavour] = useState(read);
  useEffect(() => {
    const mo = new MutationObserver(() => setFlavour(read()));
    mo.observe(window.document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => mo.disconnect();
  }, []);
  return flavour;
}

interface NodeProps {
  obj: AnnotationObject;
  ctx: RenderCtx;
  interactive: boolean;
  hidden: boolean;
}

function handlers(obj: AnnotationObject, interactive: boolean) {
  if (!interactive) return { listening: false };
  return {
    draggable: true,
    onPointerDown: (e: Konva.KonvaEventObject<PointerEvent>) => {
      if (e.evt.button !== 0) return;
      e.cancelBubble = true;
      objectPointerDown(obj.id, e.evt.shiftKey);
    },
    onDragStart: (e: Konva.KonvaEventObject<DragEvent>) => objectDragStart(e, obj.id),
    onDragMove: objectDragMove,
    onDragEnd: objectDragEnd,
    onDblClick: () => obj.type === "text" && openTextEditor(obj.id),
    onMouseEnter: (e: Konva.KonvaEventObject<MouseEvent>) => {
      const c = e.target.getStage()?.container();
      if (c) c.style.cursor = "move";
    },
    onMouseLeave: (e: Konva.KonvaEventObject<MouseEvent>) => {
      const c = e.target.getStage()?.container();
      if (c) c.style.cursor = "";
    },
  };
}

function TextNode({ obj, ctx, interactive, hidden }: NodeProps & { obj: TextObj }) {
  const ref = useRef<Konva.Text>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [, setFontTick] = useState(0);
  useEffect(() => {
    ensureFontLoaded(obj.font, obj.bold, () => setFontTick((n) => n + 1));
  }, [obj.font, obj.bold]);
  useLayoutEffect(() => {
    const n = ref.current;
    if (!n) return;
    const m = { w: n.width(), h: n.height() };
    measuredText.set(obj.id, m);
    if (m.w !== size.w || m.h !== size.h) setSize(m);
  });
  useEffect(() => () => void measuredText.delete(obj.id), [obj.id]);
  return (
    <Group
      id={obj.id}
      name="object"
      x={obj.x}
      y={obj.y}
      visible={!hidden}
      {...handlers(obj, interactive)}
    >
      {obj.plate && <KRect {...plateAttrs(obj.w ?? size.w, size.h, ctx)} />}
      <Text ref={ref} {...textAttrs(obj, ctx)} />
    </Group>
  );
}

function ObjectNode(p: NodeProps) {
  const { obj, ctx, interactive, hidden } = p;
  switch (obj.type) {
    case "rect":
      return <KRect {...rectAttrs(obj, ctx)} visible={!hidden} {...handlers(obj, interactive)} />;
    case "ellipse":
      return (
        <Ellipse {...ellipseAttrs(obj, ctx)} visible={!hidden} {...handlers(obj, interactive)} />
      );
    case "arrow":
      return <Arrow {...arrowAttrs(obj, ctx)} visible={!hidden} {...handlers(obj, interactive)} />;
    case "text":
      return <TextNode {...p} obj={obj} />;
  }
}

/** Annotation objects in rotated-image space, inside the document transform. */
export function ObjectsLayer({ doc }: { doc: Document }) {
  const drawing = useEditor((s) => s.drawing);
  const editing = useEditor((s) => s.editingText);
  const tool = useEditor((s) => s.activeTool);
  const mode = useEditor((s) => s.mode);
  const flavour = useFlavour();
  const ctx: RenderCtx = { flavour, image: rotatedDims(doc) };
  const interactive = tool === "select" && mode === "none";
  return (
    <>
      {sortByZ(doc.objects).map((o) => (
        <ObjectNode
          key={o.id}
          obj={o}
          ctx={ctx}
          interactive={interactive}
          hidden={o.id === editing}
        />
      ))}
      {drawing && drawing.type !== "text" && (
        <ObjectNode obj={drawing} ctx={ctx} interactive={false} hidden={false} />
      )}
    </>
  );
}
