import { useEditor } from "../../store/editor";
import { useSettings, type SettingsPatch } from "../../store/settings";
import {
  applyPatch,
  clampOpacity,
  type AnnotationObject,
  type ObjectPatch,
  type ObjectType,
} from "../../model/objects";
import { contrastKey, type ColorKey } from "../../model/palette";
import { roleFields, type ColorRole } from "../../model/roles";
import { currentFlavour } from "../../canvas/objectNodes";
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

// --- Colour roles (primary: border/text/stroke; secondary: fill/plate) ---

type Fields = Record<string, unknown>;

export interface RoleValue {
  color: ColorKey | null | undefined;
  /** 0–1; undefined when mixed or the type has none. */
  opacity: number | undefined;
}

/** Types in `ctx` that have `role`. */
export function roleTypes(ctx: StripContext, role: ColorRole): ObjectType[] {
  return ctx.types.filter((t) => roleFields(t, role));
}

function readRole(o: object, type: ObjectType, role: ColorRole): RoleValue | undefined {
  const f = roleFields(type, role);
  if (!f) return undefined;
  const r = o as Fields;
  return {
    color: r[f.color] as ColorKey | null,
    opacity: f.opacity ? (r[f.opacity] as number) : undefined,
  };
}

/** Value of `role` shared by all targets that have it, else the tool default. */
export function currentRole(ctx: StripContext, role: ColorRole): RoleValue {
  const tools = useSettings.getState().tools;
  const vals = ctx.targets.length
    ? ctx.targets.map((o) => readRole(o, o.type, role)).filter((v) => v !== undefined)
    : roleTypes(ctx, role)
        .slice(0, 1)
        .map((t) => readRole(tools[t], t, role)!);
  if (!vals.length) return { color: undefined, opacity: undefined };
  const one = <T>(xs: T[]) => (new Set(xs).size === 1 ? xs[0] : undefined);
  return { color: one(vals.map((v) => v.color)), opacity: one(vals.map((v) => v.opacity)) };
}

/** Patch for one object or tool default computed from its current role value. */
type RoleUpdate = (cur: RoleValue, type: ObjectType, src: Fields) => Partial<RoleValue> | null;

function toFields(type: ObjectType, role: ColorRole, v: Partial<RoleValue>): Fields {
  const f = roleFields(type, role)!;
  const out: Fields = {};
  if (v.color !== undefined) out[f.color] = v.color;
  if (v.opacity !== undefined && f.opacity) out[f.opacity] = clampOpacity(v.opacity);
  return out;
}

/**
 * Change `role` on every target (one history entry, none when nothing changes) and on the
 * tool defaults of each type in `ctx`. With targets, defaults follow the first target per type.
 */
export function updateRole(ctx: StripContext, role: ColorRole, update: RoleUpdate) {
  const settings = useSettings.getState();
  const types = roleTypes(ctx, role);
  for (const t of types) {
    const first = ctx.targets.find((o) => o.type === t);
    const src = (first ?? settings.tools[t]) as unknown as Fields;
    const v = update(readRole(src, t, role)!, t, settings.tools[t] as unknown as Fields);
    if (v) useSettings.getState().setTool(t, toFields(t, role, v) as SettingsPatch);
  }
  const ids = ctx.targets.filter((o) => roleFields(o.type, role)).map((o) => o.id);
  if (!ids.length) return;
  const tools = settings.tools;
  useEditor.getState().updateObjects(ids, (o) => {
    const v = update(readRole(o, o.type, role)!, o.type, tools[o.type] as unknown as Fields);
    return v ? applyPatch(o, toFields(o.type, role, v) as ObjectPatch) : o;
  });
}

/** Set `role`'s colour; a new fill/plate takes the tool's last secondary opacity. */
export function setColour(ctx: StripContext, role: ColorRole, color: ColorKey | null) {
  updateRole(ctx, role, (cur, type, tool) => {
    if (role === "secondary" && cur.color === null && color !== null) {
      const f = roleFields(type, role)!;
      return { color, opacity: tool[f.opacity!] as number };
    }
    return { color };
  });
}

/** Next multiple of 10% in `dir`, clamped to 0–100%. */
export function snapStep(cur: number, dir: 1 | -1): number {
  const tenths = dir > 0 ? Math.floor(cur * 10 + 1e-6) + 1 : Math.ceil(cur * 10 - 1e-6) - 1;
  return Math.min(10, Math.max(0, tenths)) / 10;
}

/** `[ ]` / `{ }`: step opacity; `}` on a missing fill/plate enables the auto-contrast colour. */
export function stepOpacity(ctx: StripContext, role: ColorRole, dir: 1 | -1) {
  updateRole(ctx, role, (cur, type, tool) => {
    if (cur.opacity === undefined) return null;
    if (role === "secondary" && cur.color === null) {
      if (dir < 0) return null;
      const primary = readRole(tool, type, "primary")!;
      const f = roleFields(type, role)!;
      return {
        color: contrastKey(primary.color as ColorKey, currentFlavour()),
        opacity: tool[f.opacity!] as number,
      };
    }
    return { opacity: snapStep(cur.opacity, dir) };
  });
}

/** Set `role`'s opacity to `value` (slider). */
export function setOpacity(ctx: StripContext, role: ColorRole, value: number) {
  updateRole(ctx, role, (cur) =>
    cur.opacity === undefined || (role === "secondary" && cur.color === null)
      ? null
      : { opacity: value },
  );
}

/** Preview `role`'s opacity on targets without a history entry; `commitOpacity` ends it. */
export function previewOpacity(ctx: StripContext, role: ColorRole, value: number) {
  const s = useEditor.getState();
  const doc = s.document;
  if (!doc || !ctx.targets.length) return;
  const ids = new Set(ctx.targets.map((o) => o.id));
  const objects = doc.objects.map((o) => {
    const cur = ids.has(o.id) ? readRole(o, o.type, role) : undefined;
    if (!cur || cur.opacity === undefined || (role === "secondary" && cur.color === null)) return o;
    return applyPatch(o, toFields(o.type, role, { opacity: value }) as ObjectPatch);
  });
  useEditor.setState({ document: { ...doc, objects } });
}

/** Restore the committed document, then apply `value` as one history entry. */
export function commitOpacity(ctx: StripContext, role: ColorRole, value: number) {
  const h = useEditor.getState().history;
  if (h) useEditor.setState({ document: h.present });
  const doc = useEditor.getState().document;
  const ids = new Set(ctx.targets.map((o) => o.id));
  const targets = doc ? doc.objects.filter((o) => ids.has(o.id)) : [];
  setOpacity({ ...ctx, targets }, role, value);
}
