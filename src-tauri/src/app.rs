//! Tauri commands and managed state.

use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

use serde::Serialize;
use tauri::ipc::{InvokeBody, Request};
use tauri::{AppHandle, Manager, State};

use crate::cli::{Format, LaunchOptions};
use crate::clipboard;
use crate::config::Hooks;
use crate::hooks::{self, HookContext, HookKind};
use crate::input::{self, InputSource};
use crate::output::{self, Backups, WriteReport};

pub struct AppState {
    launch: Mutex<Option<LaunchOptions>>,
    /// Staged stdin/clipboard file backing the current document, deleted on replace and exit.
    staged: Mutex<Option<PathBuf>>,
    backups: Backups,
    copy_command: Option<Vec<String>>,
    hooks: Hooks,
    on_exit_ran: AtomicBool,
}

impl AppState {
    pub fn new(
        launch: LaunchOptions,
        staged: Option<PathBuf>,
        backups: Backups,
        copy_command: Option<Vec<String>>,
        hooks: Hooks,
    ) -> Self {
        Self {
            launch: Mutex::new(Some(launch)),
            staged: Mutex::new(staged),
            backups,
            copy_command,
            hooks,
            on_exit_ran: AtomicBool::new(false),
        }
    }

    /// Run `on_exit` once, waiting at most two seconds.
    pub fn run_on_exit(&self, mut ctx: HookContext, code: i32) {
        if self.on_exit_ran.swap(true, Ordering::SeqCst) {
            return;
        }
        ctx.exit_code = Some(code);
        hooks::run_bounded(HookKind::OnExit, &self.hooks, &ctx, hooks::ON_EXIT_TIMEOUT);
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
        self.backups.cleanup();
        clipboard::remove_clips(&input::cache_dir());
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
pub fn exit_application(app: AppHandle, state: State<'_, AppState>, code: i32, ctx: Option<HookContext>) {
    tracing::info!(code, "exit requested");
    state.run_on_exit(ctx.unwrap_or_default(), code);
    state.cleanup();
    app.exit(code);
}

/// Inverse of `encodeURIComponent`, for non-ASCII paths carried in headers.
pub fn percent_decode(s: &str) -> String {
    let b = s.as_bytes();
    let mut out = Vec::with_capacity(b.len());
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'%' && i + 2 < b.len() {
            if let Some(v) = std::str::from_utf8(&b[i + 1..i + 3]).ok().and_then(|h| u8::from_str_radix(h, 16).ok()) {
                out.push(v);
                i += 3;
                continue;
            }
        }
        out.push(b[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

fn raw_body<'a>(request: &'a Request<'_>) -> Result<&'a [u8], String> {
    match request.body() {
        InvokeBody::Raw(bytes) => Ok(bytes),
        InvokeBody::Json(_) => Err("expected binary body".into()),
    }
}

fn header(request: &Request<'_>, name: &str) -> Result<String, String> {
    request
        .headers()
        .get(name)
        .and_then(|v| v.to_str().ok())
        .map(percent_decode)
        .ok_or_else(|| format!("missing header {name}"))
}

/// Body: encoded image bytes. Headers: `x-woge-path` (URI-encoded), `x-woge-format`.
#[tauri::command]
pub async fn write_output(state: State<'_, AppState>, request: Request<'_>) -> Result<WriteReport, String> {
    let bytes = raw_body(&request)?;
    let path = PathBuf::from(header(&request, "x-woge-path")?);
    let format: Format = serde_json::from_value(serde_json::Value::String(header(&request, "x-woge-format")?))
        .map_err(|e| e.to_string())?;
    output::write_output(bytes, &path, format, &state.backups).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn restore_backup(state: State<'_, AppState>, path: String) -> Result<(), String> {
    state.backups.restore(Path::new(&path)).map_err(|e| e.to_string())
}

/// Body: PNG bytes. Returns the staged clip path.
#[tauri::command]
pub async fn copy_image(state: State<'_, AppState>, request: Request<'_>) -> Result<String, String> {
    let bytes = raw_body(&request)?;
    let path = clipboard::copy_image(bytes, state.copy_command.as_deref()).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn run_hook(state: State<'_, AppState>, kind: HookKind, ctx: HookContext) {
    if kind == HookKind::OnExit {
        return; // only via exit_application
    }
    hooks::run(kind, &state.hooks, &ctx);
}

/// The stdout contract: one saved path per line, flushed.
#[tauri::command]
pub fn print_saved_path(path: String) {
    use std::io::Write;
    let mut out = std::io::stdout().lock();
    let _ = writeln!(out, "{path}");
    let _ = out.flush();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn asset_url_encodes_like_convert_file_src() {
        assert_eq!(asset_url(Path::new("/tmp/a b/shot(1).png")), "asset://localhost/%2Ftmp%2Fa%20b%2Fshot(1).png");
    }

    #[test]
    fn percent_decode_roundtrip() {
        assert_eq!(percent_decode("%2Fhome%2Fu%2FMy%20Shots%2F%C3%A9.png"), "/home/u/My Shots/é.png");
        assert_eq!(percent_decode("plain%"), "plain%");
        assert_eq!(percent_decode("bad%zz"), "bad%zz");
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
