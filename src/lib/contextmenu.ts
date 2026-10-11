/** Suppress the native webview context menu everywhere. */
export function suppressContextMenu() {
  document.addEventListener("contextmenu", (e) => e.preventDefault());
}
