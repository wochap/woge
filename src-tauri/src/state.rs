//! `$XDG_STATE_HOME/woge/state.json`: remembered tool settings, owned by the backend.

use std::path::{Path, PathBuf};

use serde_json::Value;

pub const STATE_VERSION: u64 = 1;

pub fn state_path() -> Option<PathBuf> {
    let base = std::env::var_os("XDG_STATE_HOME")
        .map(PathBuf::from)
        .filter(|p| p.is_absolute())
        .or_else(|| directories::BaseDirs::new().map(|d| d.home_dir().join(".local/state")))?;
    Some(base.join("woge").join("state.json"))
}

/// `None` when missing, unreadable, invalid JSON or another version (logged; overwritten later).
pub fn read(path: &Path) -> Option<Value> {
    let text = match std::fs::read_to_string(path) {
        Ok(t) => t,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return None,
        Err(e) => {
            tracing::warn!(path = %path.display(), error = %e, "cannot read state");
            return None;
        }
    };
    let value: Value = match serde_json::from_str(&text) {
        Ok(v) => v,
        Err(e) => {
            tracing::warn!(path = %path.display(), error = %e, "ignoring corrupt state");
            return None;
        }
    };
    if value.get("version").and_then(Value::as_u64) != Some(STATE_VERSION) {
        tracing::warn!(path = %path.display(), "ignoring state with another version");
        return None;
    }
    Some(value)
}

/// Atomic write: temp file in the same directory, then rename.
pub fn write(path: &Path, value: &Value) -> std::io::Result<()> {
    let dir = path.parent().ok_or_else(|| std::io::Error::other("state path has no parent"))?;
    std::fs::create_dir_all(dir)?;
    let tmp = dir.join(format!(".state.json.{}", std::process::id()));
    std::fs::write(&tmp, serde_json::to_vec_pretty(value)?)?;
    std::fs::rename(&tmp, path)
}

#[tauri::command]
pub fn read_state() -> Option<Value> {
    state_path().and_then(|p| read(&p))
}

#[tauri::command]
pub fn write_state(state: Value) -> Result<(), String> {
    let path = state_path().ok_or("no state directory")?;
    write(&path, &state).map_err(|e| {
        tracing::warn!(path = %path.display(), error = %e, "cannot write state");
        e.to_string()
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn round_trip() {
        let dir = tempfile::tempdir().unwrap();
        let p = dir.path().join("woge/state.json");
        assert_eq!(read(&p), None);
        let v = json!({ "version": 1, "tools": { "rect": { "stroke": "green" } } });
        write(&p, &v).unwrap();
        assert_eq!(read(&p), Some(v));
    }

    #[test]
    fn corrupt_and_wrong_version_ignored_then_overwritten() {
        let dir = tempfile::tempdir().unwrap();
        let p = dir.path().join("state.json");
        std::fs::write(&p, "{not json").unwrap();
        assert_eq!(read(&p), None);
        std::fs::write(&p, r#"{"version": 2}"#).unwrap();
        assert_eq!(read(&p), None);
        let v = json!({ "version": 1 });
        write(&p, &v).unwrap();
        assert_eq!(read(&p), Some(v));
    }
}
