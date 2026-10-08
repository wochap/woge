import { useCallback, useState, type MouseEvent } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Copy, DownloadSimple, Minus, Plus, X } from "@phosphor-icons/react";
import { HISTORY } from "../tools/registry";
import { zoomPercent } from "../lib/viewport";
import { Tooltip } from "./Tooltip";
import { ZoomMenu } from "./ZoomMenu";

export interface TopBarProps {
  name: string | null;
  dims: { width: number; height: number } | null;
  loading: boolean;
  scale: number | null;
  compactNarrow: boolean;
  compactShort: boolean;
  checkerboard: boolean;
  onFit(): void;
  onActual(): void;
  onZoomIn(): void;
  onZoomOut(): void;
  onToggleCheckerboard(): void;
  onClose(): void;
}

function startDrag(e: MouseEvent) {
  if (e.button !== 0) return;
  if ((e.target as HTMLElement).closest("button, [role=menu]")) return;
  e.preventDefault();
  getCurrentWindow()
    .startDragging()
    .catch(() => {});
}

export function TopBar(p: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const hasDoc = p.scale !== null;

  return (
    <header className="topbar" onMouseDown={startDrag} data-tauri-drag-region>
      <div className="topbar-file">
        {p.name ? (
          <span className="topbar-name" title={p.name}>
            {p.name}
          </span>
        ) : (
          <span className="topbar-name empty">woge</span>
        )}
        {p.loading ? (
          <span className="skeleton" aria-label="Loading" />
        ) : (
          p.dims && (
            <span className="topbar-dims">
              {p.dims.width} × {p.dims.height}
            </span>
          )
        )}
      </div>

      <div className={hasDoc ? "zoom-group" : "zoom-group inactive"}>
        <Tooltip label="Zoom out" shortcut="Ctrl −">
          <button className="icon-btn-sm" disabled={!hasDoc} onClick={p.onZoomOut}>
            <Minus size={14} />
          </button>
        </Tooltip>
        <button
          className="zoom-readout"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          disabled={!hasDoc}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {hasDoc ? zoomPercent(p.scale!) : "—"}
        </button>
        <Tooltip label="Zoom in" shortcut="Ctrl +">
          <button className="icon-btn-sm" disabled={!hasDoc} onClick={p.onZoomIn}>
            <Plus size={14} />
          </button>
        </Tooltip>
        {!p.compactNarrow && (
          <>
            <div className="vdiv" />
            <button className="text-btn-sm" disabled={!hasDoc} onClick={p.onFit}>
              Fit
            </button>
            <button className="text-btn-sm" disabled={!hasDoc} onClick={p.onActual}>
              100%
            </button>
          </>
        )}
        {menuOpen && (
          <ZoomMenu
            onClose={closeMenu}
            onFit={p.onFit}
            onActual={p.onActual}
            onZoomIn={p.onZoomIn}
            onZoomOut={p.onZoomOut}
            checkerboard={p.checkerboard}
            onToggleCheckerboard={p.onToggleCheckerboard}
          />
        )}
      </div>

      <div className="topbar-actions">
        {p.compactShort &&
          HISTORY.map((h) => (
            <Tooltip key={h.id} label={h.name} shortcut={h.shortcut}>
              <button className="btn btn-ghost btn-icon" disabled={!h.enabled}>
                <h.icon size={15} />
              </button>
            </Tooltip>
          ))}
        {p.compactShort && <div className="vdiv" />}
        <Tooltip label="Copy" shortcut="Ctrl C">
          <button className="btn btn-primary" disabled>
            <Copy size={15} />
            Copy
          </button>
        </Tooltip>
        <Tooltip label="Save" shortcut="Ctrl S">
          <button className="btn btn-secondary" disabled>
            Save
          </button>
        </Tooltip>
        <Tooltip label="Save as" shortcut="Ctrl ⇧S">
          {p.compactNarrow ? (
            <button className="btn btn-ghost btn-icon" disabled>
              <DownloadSimple size={15} />
            </button>
          ) : (
            <button className="btn btn-ghost" disabled>
              Save as…
            </button>
          )}
        </Tooltip>
        <div className="vdiv" />
        <Tooltip label="Close" shortcut="Ctrl Q">
          <button className="btn btn-ghost btn-icon" onClick={p.onClose}>
            <X size={15} />
          </button>
        </Tooltip>
      </div>
    </header>
  );
}
