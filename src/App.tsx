import { useCallback, useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Stage } from "./canvas/Stage";
import { EmptyState } from "./chrome/EmptyState";
import { OptionsStrip } from "./chrome/OptionsStrip";
import { ShortcutOverlay } from "./chrome/ShortcutOverlay";
import { StatusLine } from "./chrome/StatusLine";
import { Toast } from "./chrome/Toast";
import { Toolbar } from "./chrome/Toolbar";
import { TopBar } from "./chrome/TopBar";
import { CloseDialog } from "./chrome/CloseDialog";
import type { LaunchOptions } from "./lib/backend";
import { useCompact } from "./lib/compact";
import { useKeymap, type KeyHandlers } from "./lib/keys";
import { useTheme, type ThemeSetting } from "./lib/theme";
import { useEditor } from "./store/editor";
import {
  copyResult,
  discardAndClose,
  requestClose,
  save,
  saveAndClose,
  saveAs,
  useDirty,
  useOutput,
} from "./store/output";
import { useInputs } from "./useInputs";
import { canRedo, canUndo } from "./store/history";
import { visibleSize } from "./model/document";
import type { ToolId } from "./tools/registry";
import { cancelMode, confirmMode, enterMode, nudge } from "./tools/mode";
import { CropStrip } from "./tools/crop/CropStrip";
import { ResizeStrip } from "./tools/resize/ResizeStrip";
import { formatCropStatus } from "./tools/crop/math";
import { originalSize, percentOf } from "./tools/resize/math";

/** Annotation selection lands with the annotation tools; until then Ctrl+C always copies. */
function hasSelection(): boolean {
  return false;
}

export default function App() {
  const [themeSetting, setThemeSetting] = useState<ThemeSetting>("auto");
  const [overlayOpen, setOverlayOpen] = useState(false);
  useTheme(themeSetting);
  const compact = useCompact();

  const s = useEditor();
  const onLaunch = useCallback((opts: LaunchOptions) => {
    setThemeSetting(opts.theme);
    useEditor.getState().setStatusLine(opts.statusLine);
    useEditor.getState().setCheckerboard(opts.checkerboard);
    useOutput.getState().configure(opts);
  }, []);
  const { dropActive, openDialog, openClipboard } = useInputs(onLaunch);

  const dirty = useDirty();
  const closeDialog = useOutput((o) => o.closeDialog);
  const cancelClose = useCallback(() => useOutput.getState().setCloseDialog(false), []);

  // The window manager's close goes through the same confirmation.
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    try {
      getCurrentWindow()
        .onCloseRequested((e) => {
          e.preventDefault();
          requestClose();
        })
        .then((fn) => (cancelled ? fn() : (unlisten = fn)))
        .catch(() => {});
    } catch {
      /* Not running inside Tauri. */
    }
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  const inMode = s.mode !== "none";
  const selectTool = (tool: ToolId, e: { shiftKey: boolean }) => {
    if (!s.document) return;
    if (tool === "crop" || tool === "resize") enterMode(tool);
    else if (inMode) return;
    else if (tool === "rotate") s.rotate(e.shiftKey ? "ccw" : "cw");
    else s.setActiveTool(tool);
  };
  const undo = () => {
    cancelMode();
    useEditor.getState().undo();
  };
  const redo = () => {
    cancelMode();
    useEditor.getState().redo();
  };

  const handlers: KeyHandlers = {
    "tool.select": (e) => selectTool("select", e),
    "tool.crop": (e) => selectTool("crop", e),
    "tool.resize": (e) => selectTool("resize", e),
    "tool.rotate": (e) => selectTool("rotate", e),
    "edit.undo": (e) => {
      if (s.pointerDrag) return;
      if (e.shiftKey) redo();
      else undo();
    },
    "edit.applyCancel": (e) => {
      if (!inMode) return;
      if (e.key === "Enter") confirmMode();
      else cancelMode();
    },
    "edit.nudge": (e) => {
      if (!inMode) return;
      const step = e.shiftKey ? 10 : 1;
      const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
      const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
      nudge(dx, dy);
    },
    "view.fit": s.fit,
    "view.actual": s.actualSize,
    "view.zoomIn": () => s.zoomStep(1),
    "view.zoomOut": () => s.zoomStep(-1),
    "file.open": openDialog,
    "file.paste": openClipboard,
    "app.shortcuts": () => setOverlayOpen(true),
    "file.copy": () => {
      if (s.document && !inMode && !hasSelection()) copyResult();
    },
    "file.save": () => {
      if (s.document && !inMode) save();
    },
    "file.saveAs": () => {
      if (s.document && !inMode) saveAs();
    },
    "app.quit": requestClose,
    "overlay.close": () => setOverlayOpen(false),
  };
  useKeymap(handlers, { overlayOpen: overlayOpen || closeDialog });

  const doc = s.document;
  const loadingName = s.loading?.name ?? null;
  const dims = doc ? visibleSize(doc) : null;
  let statusDetail: string | null = null;
  if (s.mode === "crop" && s.cropDraft) statusDetail = formatCropStatus(s.cropDraft);
  else if (s.mode === "resize" && doc && s.resizeDraft)
    statusDetail = `scale ${percentOf(originalSize(doc), s.resizeDraft)}%`;
  const history = {
    canUndo: !!doc && canUndo(s.history),
    canRedo: !!doc && canRedo(s.history),
    onUndo: undo,
    onRedo: redo,
  };

  return (
    <div
      className="editor"
      style={{ gridTemplateRows: `var(--topbar-h) auto 1fr ${s.statusLine ? "auto" : "0"}` }}
    >
      <TopBar
        name={loadingName ?? doc?.source.name ?? null}
        dims={dims && !s.loading ? { width: dims.w, height: dims.h } : null}
        loading={!!s.loading}
        scale={doc ? s.viewport.scale : null}
        compactNarrow={compact.narrow}
        compactShort={compact.short}
        checkerboard={s.checkerboard}
        dirty={dirty}
        {...history}
        onFit={s.fit}
        onActual={s.actualSize}
        onZoomIn={() => s.zoomStep(1)}
        onZoomOut={() => s.zoomStep(-1)}
        onToggleCheckerboard={() => s.setCheckerboard(!s.checkerboard)}
        onClose={requestClose}
        onCopy={copyResult}
        onSave={() => save()}
        onSaveAs={() => saveAs()}
      />
      <Toolbar
        activeTool={s.activeTool}
        hasDocument={!!doc}
        showHistory={!compact.short}
        {...history}
        onSelect={selectTool}
      />
      {/* Modes render their controls here; Select has none. */}
      <OptionsStrip compact={compact.narrow}>
        {s.mode === "crop" ? <CropStrip /> : s.mode === "resize" ? <ResizeStrip /> : null}
      </OptionsStrip>
      <Stage checkerboard={s.checkerboard}>
        {!doc && <EmptyState dropActive={dropActive} />}
        {doc && dropActive && <div className="drop-outline" />}
      </Stage>
      {s.statusLine && <StatusLine pointer={s.pointer} detail={statusDetail} />}
      <Toast toast={s.toast} onDismiss={s.dismissToast} />
      {overlayOpen && <ShortcutOverlay onClose={() => setOverlayOpen(false)} />}
      {closeDialog && (
        <CloseDialog onDiscard={discardAndClose} onCancel={cancelClose} onSave={saveAndClose} />
      )}
    </div>
  );
}
