import { useEditor } from "../../store/editor";
import { useSettings, type SettingsPatch } from "../../store/settings";
import type { AnnotationObject, ObjectType } from "../../model/objects";
import { isShapeTool } from "../../tools/shapes/math";

export type StripKind = ObjectType | "mixed";

export interface StripContext {
  kind: StripKind;
  /** Object types the strip edits (selected types, or the active tool). */
  types: ObjectType[];
  /** Selected objects the strip applies to. */
  targets: AnnotationObject[];
}

/** Object type a drawing tool creates, if any. */
export function toolObjectType(tool: string): ObjectType | null {
  if (isShapeTool(tool) || tool === "text") return tool;
  if (tool === "brush") return "brush";
  if (tool === "highlighter") return "highlight";
  if (tool === "counter") return "badge";
  return null;
}

/** Which strip to show: the drawing tool's, or the selection's type(s) in Select. */
export function stripContext(
  tool: string,
  selection: string[],
  objects: AnnotationObject[],
): StripContext | null {
  const sel = new Set(selection);
  const selected = objects.filter((o) => sel.has(o.id));
  const type = toolObjectType(tool);
  if (type) return { kind: type, types: [type], targets: selected.filter((o) => o.type === type) };
  if (tool !== "select" || !selected.length) return null;
  const types = [...new Set(selected.map((o) => o.type))];
  return { kind: types.length === 1 ? types[0] : "mixed", types, targets: selected };
}

/** Change a style: selected objects update (one history entry) and the tool defaults follow. */
export function applyStyle(ctx: StripContext, patch: SettingsPatch) {
  const settings = useSettings.getState();
  for (const t of ctx.types) {
    const p: SettingsPatch = { ...patch };
    if ((t === "text" || t === "badge") && patch.stroke) p.color = patch.stroke;
    settings.setTool(t, p);
  }
  if (ctx.targets.length)
    useEditor.getState().updateObjects(
      ctx.targets.map((o) => o.id),
      patch,
    );
}

/** Value shared by all targets, else the tool default. */
export function currentValue<K extends keyof SettingsPatch>(
  ctx: StripContext,
  key: K,
): SettingsPatch[K] {
  const read = (o: object) =>
    (o as Record<string, unknown>)[key === "stroke" && "color" in o ? "color" : key];
  if (ctx.targets.length) {
    const vals = new Set(ctx.targets.map(read));
    return vals.size === 1 ? ([...vals][0] as SettingsPatch[K]) : undefined;
  }
  const tools = useSettings.getState().tools;
  return read(tools[ctx.types[0]]) as SettingsPatch[K];
}
