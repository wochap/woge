//! Tauri commands and managed state.

use std::path::{Path, PathBuf};
use std::sync::Mutex;

use serde::Serialize;
use tauri::{AppHandle, Manager, State};

use crate::cli::LaunchOptions;
use crate::input::{self, InputSource};

pub struct AppState {
    launch: Mutex<Option<LaunchOptions>>,
    /// Staged stdin/clipboard file backing the current document, deleted on replace and exit.
    staged: Mutex<Option<PathBuf>>,
}

impl AppState {
    pub fn new(launch: LaunchOptions, staged: Option<PathBuf>) -> Self {
        Self { launch: Mutex::new(Some(launch)), staged: Mutex::new(staged) }
    }

    /// Replace the tracked staged file, deleting the previous one unless it is `keep`.
    fn replace_staged(&self, next: Option<PathBuf>, keep: Option<&Path>) {
        let mut slot = self.staged.lock().unwrap();
        if let Some(old) = slot.take() {
            if Some(old.as_path()) != keep {
                let _ = std::fs::remove_file(&old);
            }
        }
        *slot = next;
    }

    pub fn cleanup(&self) {
        self.replace_staged(None, None);
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadedInput {
    pub url: String,
    pub path: String,
    pub name: String,
    pub bytes: u64,
    pub source_path: Option<String>,
}

/// Same encoding as `convertFileSrc` (encodeURIComponent) on Linux.
pub fn asset_url(path: &Path) -> String {
    let mut out = String::from("asset://localhost/");
    for b in path.to_string_lossy().bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'!' | b'~' | b'*' | b'\'' | b'(' | b')' => {
                out.push(b as char)
            }
            _ => out.push_str(&format!("%{b:02X}")),
        }
    }
    out
}

pub fn canonical_file(path: &Path) -> Result<(PathBuf, u64), String> {
    let canon = std::fs::canonicalize(path).map_err(|e| format!("Cannot open {}: {e}", path.display()))?;
    let meta = std::fs::metadata(&canon).map_err(|e| format!("Cannot open {}: {e}", path.display()))?;
    if !meta.is_file() {
        return Err(format!("Not a file: {}", path.display()));
    }
    std::fs::File::open(&canon).map_err(|e| format!("Cannot read {}: {e}", path.display()))?;
    Ok((canon, meta.len()))
}

fn scope_and_describe(app: &AppHandle, path: &Path, source: InputSource) -> Result<LoadedInput, String> {
    let (canon, bytes) = canonical_file(path)?;
    app.asset_protocol_scope()
        .allow_file(&canon)
        .map_err(|e| format!("Cannot allow {}: {e}", canon.display()))?;
    let name = match source {
        InputSource::Path => canon.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default(),
        InputSource::Stdin => "stdin".into(),
        InputSource::Clipboard => "clipboard".into(),
    };
    let source_path = (source == InputSource::Path).then(|| canon.to_string_lossy().into_owned());
    tracing::debug!(path = %canon.display(), bytes, ?source, "input scoped");
    Ok(LoadedInput { url: asset_url(&canon), path: canon.to_string_lossy().into_owned(), name, bytes, source_path })
}

#[tauri::command]
pub fn take_launch_options(state: State<'_, AppState>) -> Option<LaunchOptions> {
    state.launch.lock().unwrap().take()
}

/// Load a user-chosen path. `staged` is true only for the CLI stdin file handed out in the
/// launch options, so it keeps its "stdin" name and stays tracked for cleanup.
#[tauri::command]
pub fn load_input(app: AppHandle, state: State<'_, AppState>, path: String, staged: Option<bool>) -> Result<LoadedInput, String> {
    let path = PathBuf::from(path);
    if staged.unwrap_or(false) {
        return scope_and_describe(&app, &path, InputSource::Stdin);
    }
    let loaded = scope_and_describe(&app, &path, InputSource::Path)?;
    state.replace_staged(None, None);
    Ok(loaded)
}

#[tauri::command]
pub async fn load_clipboard(app: AppHandle, state: State<'_, AppState>) -> Result<LoadedInput, String> {
    let bytes = tauri::async_runtime::spawn_blocking(input::read_clipboard)
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string())?;
    let staged = input::stage(&input::cache_dir(), &bytes).map_err(|e| e.to_string())?;
    match scope_and_describe(&app, &staged, InputSource::Clipboard) {
        Ok(loaded) => {
            state.replace_staged(Some(staged), None);
            Ok(loaded)
        }
        Err(e) => {
            let _ = std::fs::remove_file(&staged);
            Err(e)
        }
    }
}

#[tauri::command]
pub fn exit_application(app: AppHandle, state: State<'_, AppState>, code: i32) {
    tracing::info!(code, "exit requested");
    state.cleanup();
    app.exit(code);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn asset_url_encodes_like_convert_file_src() {
        assert_eq!(asset_url(Path::new("/tmp/a b/shot(1).png")), "asset://localhost/%2Ftmp%2Fa%20b%2Fshot(1).png");
    }

    #[test]
    fn canonical_file_rejects_dirs_and_missing() {
        let dir = tempfile::tempdir().unwrap();
        assert!(canonical_file(dir.path()).unwrap_err().contains("Not a file"));
        let missing = dir.path().join("nope.png");
        assert!(canonical_file(&missing).unwrap_err().contains("nope.png"));
        let f = dir.path().join("x.png");
        std::fs::write(&f, b"abc").unwrap();
        assert_eq!(canonical_file(&f).unwrap().1, 3);
    }
}
