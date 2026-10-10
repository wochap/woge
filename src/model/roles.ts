import type { ObjectType } from "./objects";

/** Primary: border, text, stroke or badge colour. Secondary: fill (shapes) or plate (text). */
export type ColorRole = "primary" | "secondary";

export interface RoleFields {
  color: string;
  /** Absent for types whose colour has no opacity (badge). */
  opacity?: string;
}

const ROLES: Record<ObjectType, Partial<Record<ColorRole, RoleFields>>> = {
  rect: {
    primary: { color: "stroke", opacity: "strokeOpacity" },
    secondary: { color: "fill", opacity: "fillOpacity" },
  },
  ellipse: {
    primary: { color: "stroke", opacity: "strokeOpacity" },
    secondary: { color: "fill", opacity: "fillOpacity" },
  },
  arrow: { primary: { color: "stroke", opacity: "strokeOpacity" } },
  brush: { primary: { color: "stroke", opacity: "strokeOpacity" } },
  highlight: { primary: { color: "stroke", opacity: "strokeOpacity" } },
  text: {
    primary: { color: "color", opacity: "colorOpacity" },
    secondary: { color: "plate", opacity: "plateOpacity" },
  },
  badge: { primary: { color: "color" } },
  redact: {},
};

/** Field names holding `role`'s colour and opacity on `type`, if it has that role. */
export function roleFields(type: ObjectType, role: ColorRole): RoleFields | undefined {
  return ROLES[type][role];
}
