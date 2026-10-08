//! Atomic image writes with a per-session backup of overwritten files.

use std::collections::HashMap;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{Duration, SystemTime};

use serde::Serialize;

use crate::cli::Format;
use crate::input::{self, ImageFormat};

#[derive(Debug, thiserror::Error)]
pub enum OutputError {
    #[error("{0} is a directory")]
    IsDirectory(PathBuf),
    #[error("Data is not a valid {0:?} image")]
    BadData(Format),
    #[error("Cannot write {path}: {source}")]
    Io { path: PathBuf, source: std::io::Error },
    #[error("No backup for {0}")]
    NoBackup(PathBuf),
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WriteReport {
    pub path: String,
    pub overwrote: bool,
}

fn matches(format: Format, bytes: &[u8]) -> bool {
    let want = match format {
        Format::Png => ImageFormat::Png,
        Format::Jpeg => ImageFormat::Jpeg,
        Format::Webp => ImageFormat::Webp,
    };
    input::sniff(bytes) == Some(want)
}

/// Originals of overwritten paths, kept under `dir` until the session ends.
pub struct Backups {
    dir: PathBuf,
    map: Mutex<HashMap<PathBuf, PathBuf>>,
}

impl Backups {
    pub fn new(dir: PathBuf) -> Self {
        Self { dir, map: Mutex::new(HashMap::new()) }
    }

    pub fn default_dir() -> PathBuf {
        input::cache_dir().join("backup")
    }

    /// Copy (not move) the current file so the destination never disappears.
    fn keep(&self, path: &Path) -> std::io::Result<bool> {
        let mut map = self.map.lock().unwrap();
        if map.contains_key(path) {
            return Ok(false);
        }
        std::fs::create_dir_all(&self.dir)?;
        let backup = self.dir.join(input::unique_name());
        std::fs::copy(path, &backup)?;
        map.insert(path.to_owned(), backup);
        Ok(true)
    }

    /// Put the backup back at `path`; the next save backs up again.
    pub fn restore(&self, path: &Path) -> Result<(), OutputError> {
        let backup = self.map.lock().unwrap().remove(path).ok_or_else(|| OutputError::NoBackup(path.to_owned()))?;
        let bytes = std::fs::read(&backup).map_err(|source| OutputError::Io { path: backup.clone(), source })?;
        atomic_replace(&bytes, path)?;
        let _ = std::fs::remove_file(&backup);
        Ok(())
    }

    /// Delete every backup of this session.
    pub fn cleanup(&self) {
        for (_, b) in self.map.lock().unwrap().drain() {
            let _ = std::fs::remove_file(b);
        }
    }

    /// Remove leftovers from crashed sessions older than `age`.
    pub fn purge_older_than(&self, age: Duration) {
        let Ok(entries) = std::fs::read_dir(&self.dir) else { return };
        let now = SystemTime::now();
        for e in entries.flatten() {
            let old = e
                .metadata()
                .and_then(|m| m.modified())
                .ok()
                .and_then(|t| now.duration_since(t).ok())
                .is_some_and(|d| d > age);
            if old {
                let _ = std::fs::remove_file(e.path());
            }
        }
    }
}

/// Temp file beside `path`, fsync, rename over. The temp is removed on any failure.
fn atomic_replace(bytes: &[u8], path: &Path) -> Result<(), OutputError> {
    let io = |source| OutputError::Io { path: path.to_owned(), source };
    let dir = path.parent().filter(|d| !d.as_os_str().is_empty()).unwrap_or(Path::new("."));
    let tmp = dir.join(format!(".woge-{}.tmp", input::unique_name()));
    let result = (|| {
        let mut f = std::fs::File::create(&tmp)?;
        f.write_all(bytes)?;
        f.sync_all()?;
        std::fs::rename(&tmp, path)
    })();
    if let Err(e) = result {
        let _ = std::fs::remove_file(&tmp);
        return Err(io(e));
    }
    if let Ok(d) = std::fs::File::open(dir) {
        let _ = d.sync_all();
    }
    Ok(())
}

pub fn write_output(bytes: &[u8], path: &Path, format: Format, backups: &Backups) -> Result<WriteReport, OutputError> {
    if path.is_dir() {
        return Err(OutputError::IsDirectory(path.to_owned()));
    }
    if !matches(format, bytes) {
        return Err(OutputError::BadData(format));
    }
    let overwrote = if path.is_file() {
        backups.keep(path).map_err(|source| OutputError::Io { path: path.to_owned(), source })?
    } else {
        false
    };
    if let Err(e) = atomic_replace(bytes, path) {
        if overwrote {
            if let Some(b) = backups.map.lock().unwrap().remove(path) {
                let _ = std::fs::remove_file(b);
            }
        }
        return Err(e);
    }
    let abs = std::fs::canonicalize(path).unwrap_or_else(|_| path.to_owned());
    tracing::info!(path = %abs.display(), overwrote, "saved");
    Ok(WriteReport { path: abs.to_string_lossy().into_owned(), overwrote })
}

#[cfg(test)]
mod tests {
    use super::*;

    const PNG: &[u8] = b"\x89PNG\r\n\x1a\nnew";

    fn setup() -> (tempfile::TempDir, Backups) {
        let dir = tempfile::tempdir().unwrap();
        let b = Backups::new(dir.path().join("backup"));
        (dir, b)
    }

    fn entries(dir: &Path) -> Vec<String> {
        let mut v: Vec<_> =
            std::fs::read_dir(dir).unwrap().flatten().map(|e| e.file_name().to_string_lossy().into_owned()).collect();
        v.sort();
        v
    }

    #[test]
    fn new_file() {
        let (dir, b) = setup();
        let p = dir.path().join("out.png");
        let r = write_output(PNG, &p, Format::Png, &b).unwrap();
        assert!(!r.overwrote);
        assert_eq!(std::fs::read(&p).unwrap(), PNG);
        assert!(Path::new(&r.path).is_absolute());
        assert_eq!(entries(dir.path()), vec!["out.png"]);
    }

    #[test]
    fn overwrite_backs_up_once_and_restores() {
        let (dir, b) = setup();
        let p = dir.path().join("shot.png");
        std::fs::write(&p, b"old").unwrap();
        assert!(write_output(PNG, &p, Format::Png, &b).unwrap().overwrote);
        assert!(!write_output(b"\x89PNG\r\n\x1a\nnewer", &p, Format::Png, &b).unwrap().overwrote);
        b.restore(&p).unwrap();
        assert_eq!(std::fs::read(&p).unwrap(), b"old");
        assert!(entries(&dir.path().join("backup")).is_empty());
        assert!(matches!(b.restore(&p), Err(OutputError::NoBackup(_))));
    }

    #[test]
    fn wrong_magic_rejected() {
        let (dir, b) = setup();
        let p = dir.path().join("out.jpg");
        assert!(matches!(write_output(PNG, &p, Format::Jpeg, &b), Err(OutputError::BadData(_))));
        assert!(!p.exists());
    }

    #[test]
    fn directory_destination() {
        let (dir, b) = setup();
        let e = write_output(PNG, dir.path(), Format::Png, &b).unwrap_err();
        assert!(matches!(e, OutputError::IsDirectory(_)));
    }

    #[test]
    fn failure_leaves_original_and_no_temp() {
        let (dir, b) = setup();
        let p = dir.path().join("missing-dir").join("out.png");
        let e = write_output(PNG, &p, Format::Png, &b).unwrap_err();
        assert!(e.to_string().contains("out.png"), "{e}");
        assert_eq!(entries(dir.path()), Vec::<String>::new());
    }

    #[cfg(unix)]
    #[test]
    fn unwritable_dir_keeps_old_file() {
        use std::os::unix::fs::PermissionsExt;
        let (dir, b) = setup();
        let sub = dir.path().join("ro");
        std::fs::create_dir(&sub).unwrap();
        let p = sub.join("shot.png");
        std::fs::write(&p, b"old").unwrap();
        std::fs::set_permissions(&sub, std::fs::Permissions::from_mode(0o555)).unwrap();
        let r = write_output(PNG, &p, Format::Png, &b);
        std::fs::set_permissions(&sub, std::fs::Permissions::from_mode(0o755)).unwrap();
        if r.is_ok() {
            return; // running as root
        }
        assert_eq!(std::fs::read(&p).unwrap(), b"old");
        assert_eq!(entries(&sub), vec!["shot.png"]);
    }

    #[test]
    fn cleanup_and_purge() {
        let (dir, b) = setup();
        let p = dir.path().join("shot.png");
        std::fs::write(&p, b"old").unwrap();
        write_output(PNG, &p, Format::Png, &b).unwrap();
        b.cleanup();
        assert!(entries(&dir.path().join("backup")).is_empty());
        std::fs::write(dir.path().join("backup").join("stale"), b"x").unwrap();
        b.purge_older_than(Duration::from_secs(3600));
        assert_eq!(entries(&dir.path().join("backup")), vec!["stale"]);
        b.purge_older_than(Duration::ZERO);
        std::thread::sleep(Duration::from_millis(5));
        b.purge_older_than(Duration::ZERO);
        assert!(entries(&dir.path().join("backup")).is_empty());
    }
}
