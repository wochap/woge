import { Image } from "@phosphor-icons/react";

export function EmptyState({ dropActive }: { dropActive: boolean }) {
  return (
    <div className="empty">
      <div className={dropActive ? "empty-zone drop" : "empty-zone"}>
        <Image className="empty-icon" />
        <div className="empty-title">
          Drop an image, paste from clipboard <kbd>Ctrl V</kbd>, or open <kbd>Ctrl O</kbd>
        </div>
        <div className="empty-hints">
          <span>Pan</span>
          <span className="k">Scroll · Space+drag</span>
          <span>Zoom</span>
          <span className="k">Ctrl+Scroll · pinch</span>
          <span>Copy result</span>
          <span className="k">Ctrl+C</span>
          <span>All shortcuts</span>
          <span className="k">?</span>
        </div>
      </div>
    </div>
  );
}
