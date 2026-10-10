import type { ReactNode } from "react";
import { toolById, type ToolId } from "../tools/registry";

/** Grid rows for the editor: the strip row is fixed so the canvas never shifts. */
export function editorRows(statusLine: boolean): string {
  return `var(--topbar-h) var(--strip-h) 1fr ${statusLine ? "auto" : "0"}`;
}

/** Strip label: the tool or mode name as shown in the toolbar tooltips. */
export function stripLabel(tool: ToolId): string {
  return toolById(tool)?.name ?? tool;
}

interface Props {
  compact: boolean;
  /** Active tool or mode name, shown first. */
  label: string;
  hasDocument: boolean;
  /** Options for the active tool; the empty-state hint shows when absent. */
  children?: ReactNode;
}

export function OptionsStrip({ compact, label, hasDocument, children }: Props) {
  return (
    <div
      className={compact ? "options-strip compact" : "options-strip"}
      role="toolbar"
      aria-label="Tool options"
    >
      {hasDocument && <span className="strip-label">{label}</span>}
      {!hasDocument ? (
        <span className="strip-empty">No image yet · drop, paste or open one</span>
      ) : children ? (
        children
      ) : (
        <>
          <span className="strip-empty">Click an object to edit its style</span>
          <span className="strip-empty strip-meta">Del removes · ? shortcuts</span>
        </>
      )}
    </div>
  );
}
