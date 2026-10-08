import { Fragment } from "react";
import { HISTORY, TOOLBAR, type ToolId } from "../tools/registry";
import { Tooltip } from "./Tooltip";

interface Props {
  activeTool: ToolId;
  hasDocument: boolean;
  /** Undo/Redo live in the top bar when the window is short. */
  showHistory: boolean;
  onSelect(tool: ToolId): void;
}

export function Toolbar({ activeTool, hasDocument, showHistory, onSelect }: Props) {
  return (
    <nav className="toolbar" aria-label="Tools">
      {TOOLBAR.map((entry, i) => {
        if (entry.kind === "divider") return <div key={`d${i}`} className="tool-div" />;
        const id = entry.id as ToolId;
        const active = hasDocument && id === activeTool;
        return (
          <Tooltip key={id} label={entry.name} shortcut={entry.shortcut} side="right">
            <button
              className={active ? "tool-btn active" : "tool-btn"}
              aria-pressed={active}
              disabled={!entry.enabled || !hasDocument}
              onClick={() => onSelect(id)}
            >
              <entry.icon size="var(--toolbar-icon)" />
            </button>
          </Tooltip>
        );
      })}
      {showHistory && (
        <>
          <div className="tool-div" />
          {HISTORY.map((h) => (
            <Fragment key={h.id}>
              <Tooltip label={h.name} shortcut={h.shortcut} side="right">
                <button className="tool-btn" disabled={!h.enabled}>
                  <h.icon size="var(--toolbar-icon)" />
                </button>
              </Tooltip>
            </Fragment>
          ))}
        </>
      )}
    </nav>
  );
}
