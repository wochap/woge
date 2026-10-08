import { useCallback, useState } from "react";
import { Stage } from "./canvas/Stage";
import { EmptyState } from "./chrome/EmptyState";
import { OptionsStrip } from "./chrome/OptionsStrip";
import { ShortcutOverlay } from "./chrome/ShortcutOverlay";
import { StatusLine } from "./chrome/StatusLine";
import { Toast } from "./chrome/Toast";
import { Toolbar } from "./chrome/Toolbar";
import { TopBar } from "./chrome/TopBar";
import { exitApplication, type LaunchOptions } from "./lib/backend";
import { useCompact } from "./lib/compact";
import { useKeymap, type KeyHandlers } from "./lib/keys";
import { useTheme, type ThemeSetting } from "./lib/theme";
import { useEditor } from "./store/editor";
import { useInputs } from "./useInputs";

function quit() {
  exitApplication(0).catch(() => window.close());
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
  }, []);
  const { dropActive, openDialog, openClipboard } = useInputs(onLaunch);

  const handlers: KeyHandlers = {
    "tool.select": () => s.document && s.setActiveTool("select"),
    "view.fit": s.fit,
    "view.actual": s.actualSize,
    "view.zoomIn": () => s.zoomStep(1),
    "view.zoomOut": () => s.zoomStep(-1),
    "file.open": openDialog,
    "file.paste": openClipboard,
    "app.shortcuts": () => setOverlayOpen(true),
    "app.quit": quit,
    "overlay.close": () => setOverlayOpen(false),
  };
  useKeymap(handlers, { overlayOpen });

  const doc = s.document;
  const loadingName = s.loading?.name ?? null;

  return (
    <div
      className="editor"
      style={{ gridTemplateRows: `var(--topbar-h) auto 1fr ${s.statusLine ? "auto" : "0"}` }}
    >
      <TopBar
        name={loadingName ?? doc?.name ?? null}
        dims={doc && !s.loading ? { width: doc.width, height: doc.height } : null}
        loading={!!s.loading}
        scale={doc ? s.viewport.scale : null}
        compactNarrow={compact.narrow}
        compactShort={compact.short}
        checkerboard={s.checkerboard}
        onFit={s.fit}
        onActual={s.actualSize}
        onZoomIn={() => s.zoomStep(1)}
        onZoomOut={() => s.zoomStep(-1)}
        onToggleCheckerboard={() => s.setCheckerboard(!s.checkerboard)}
        onClose={quit}
      />
      <Toolbar
        activeTool={s.activeTool}
        hasDocument={!!doc}
        showHistory={!compact.short}
        onSelect={s.setActiveTool}
      />
      {/* Tools with options render their controls here; Select has none. */}
      <OptionsStrip compact={compact.narrow} />
      <Stage checkerboard={s.checkerboard}>
        {!doc && <EmptyState dropActive={dropActive} />}
        {doc && dropActive && <div className="drop-outline" />}
      </Stage>
      {s.statusLine && <StatusLine pointer={s.pointer} />}
      <Toast toast={s.toast} onDismiss={s.dismissToast} />
      {overlayOpen && <ShortcutOverlay onClose={() => setOverlayOpen(false)} />}
    </div>
  );
}
