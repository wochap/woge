import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Konva from "konva";
import {
  Arrow,
  Circle,
  Ellipse,
  Group,
  Image as KImage,
  Line,
  Rect as KRect,
  Text,
} from "react-konva";
import { rotatedDims, type Document } from "../model/document";
import {
  measuredText,
  sortByZ,
  type AnnotationObject,
  type BadgeObj,
  type RedactObj,
  type StrokeObj,
  type TextObj,
} from "../model/objects";
import { useEditor } from "../store/editor";
import { ensureFontLoaded } from "../lib/fonts";
import {
  arrowAttrs,
  badgeAttrs,
  ellipseAttrs,
  redactFilterAttrs,
  strokeAttrs,
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
import { redactLayout } from "../tools/redact/math";
import { openBadgeEditor } from "../tools/badge/editing";
import { docPerScreen } from "./pointer";

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
    onDblClick: () => {
      if (obj.type === "text") openTextEditor(obj.id);
      else if (obj.type === "badge") openBadgeEditor(obj.id);
    },
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

/** Max cache canvas side; larger strokes draw uncached. */
const CACHE_MAX = 8192;

function StrokeNode({ obj, ctx, interactive, hidden }: NodeProps & { obj: StrokeObj }) {
  const ref = useRef<Konva.Line>(null);
  const attrs = strokeAttrs(obj, ctx);
  // Brush strokes are cached at the on-screen resolution for cheap redraws; highlights
  // stay live so multiply blends against what is beneath them.
  const zoom = useEditor((s) => s.viewport.scale);
  useEffect(() => {
    const n = ref.current;
    if (!n || obj.type !== "brush") return;
    n.clearCache();
    if (hidden) return;
    const ratio = (Konva.pixelRatio || 1) / (docPerScreen(n.getStage()!) || 1);
    const r = n.getClientRect({ skipTransform: true });
    if (Math.max(r.width, r.height) * ratio > CACHE_MAX) return;
    n.cache({ pixelRatio: ratio });
  }, [obj, ctx.flavour, ctx.image.w, ctx.image.h, zoom, hidden]);
  return <Line ref={ref} {...attrs} visible={!hidden} {...handlers(obj, interactive)} />;
}

function RedactNode({ obj, ctx, interactive, hidden }: NodeProps & { obj: RedactObj }) {
  const ref = useRef<Konva.Image>(null);
  const lay = ctx.bitmap && ctx.base ? redactLayout(obj, ctx.rotation ?? 0, ctx.base) : null;
  const key = lay ? JSON.stringify([lay, obj.mode, obj.strength]) : "";
  useEffect(() => {
    const n = ref.current;
    if (!n) return;
    n.clearCache();
    n.cache({ pixelRatio: 1 });
    n.getLayer()?.batchDraw();
  }, [key, ctx.bitmap]);
  return (
    <Group
      id={obj.id}
      name="object"
      x={obj.x}
      y={obj.y}
      visible={!hidden}
      {...handlers(obj, interactive)}
    >
      {/* Full-size hit area: the visible crop may be clamped to the image. */}
      <KRect width={obj.w} height={obj.h} fill="transparent" />
      {lay && ctx.bitmap && (
        <Group x={lay.x} y={lay.y} listening={false}>
          <KImage
            ref={ref}
            image={ctx.bitmap}
            {...lay.image}
            crop={lay.crop}
            {...redactFilterAttrs(obj)}
          />
        </Group>
      )}
    </Group>
  );
}

function BadgeNode({ obj, ctx, interactive, hidden }: NodeProps & { obj: BadgeObj }) {
  const a = badgeAttrs(obj, ctx);
  const editing = useEditor((s) => s.editingBadge === obj.id);
  return (
    <Group
      id={obj.id}
      name="object"
      x={obj.x}
      y={obj.y}
      visible={!hidden}
      {...handlers(obj, interactive)}
    >
      <Circle {...a.circle} />
      {!editing && <Text {...a.text} />}
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
    case "brush":
    case "highlight":
      return <StrokeNode {...p} obj={obj} />;
    case "redact":
      return <RedactNode {...p} obj={obj} />;
    case "badge":
      return <BadgeNode {...p} obj={obj} />;
  }
}

/** Annotation objects in rotated-image space, inside the document transform. */
export function ObjectsLayer({ doc }: { doc: Document }) {
  const drawing = useEditor((s) => s.drawing);
  const editing = useEditor((s) => s.editingText);
  const tool = useEditor((s) => s.activeTool);
  const mode = useEditor((s) => s.mode);
  const bitmap = useEditor((s) => s.bitmap);
  const zoom = useEditor((s) => s.viewport.scale);
  const flavour = useFlavour();
  const ctx: RenderCtx = {
    flavour,
    image: rotatedDims(doc),
    unit: doc.crop.w / doc.size.w / zoom,
    bitmap,
    base: { w: doc.source.width, h: doc.source.height },
    rotation: doc.rotation,
  };
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
      {drawing &&
        drawing.type !== "text" &&
        drawing.type !== "brush" &&
        drawing.type !== "highlight" && (
          <ObjectNode obj={drawing} ctx={ctx} interactive={false} hidden={false} />
        )}
    </>
  );
}
