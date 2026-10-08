//! Copying the exported PNG with an external tool (shotclip, wl-copy fallback).

use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

use crate::input;

pub const DEFAULT_COMMAND: [&str; 3] = ["shotclip", "--paste-once", "{path}"];
pub const FALLBACK_COMMAND: [&str; 3] = ["wl-copy", "--type", "image/png"];

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum ClipError {
    #[error("No clipboard tool found (shotclip or wl-copy)")]
    NoTool,
    #[error("Copy command not found: {0}")]
    CommandMissing(String),
    #[error("Copy command is empty")]
    Empty,
    #[error("Copy failed: {0}")]
    Io(String),
}

#[derive(Debug, PartialEq, Eq)]
pub struct CopyPlan {
    pub argv: Vec<String>,
    /// Pipe the PNG to stdin when no `{path}` placeholder is present.
    pub stdin: bool,
}

/// Executable lookup on `PATH` (or a direct path when it contains a slash).
pub fn which(exe: &str) -> bool {
    if exe.contains('/') {
        return Path::new(exe).is_file();
    }
    std::env::var_os("PATH")
        .map(|p| std::env::split_paths(&p).any(|d| d.join(exe).is_file()))
        .unwrap_or(false)
}

fn substitute(argv: &[String], path: &Path) -> CopyPlan {
    let p = path.to_string_lossy();
    let stdin = !argv.iter().any(|a| a.contains("{path}"));
    CopyPlan { argv: argv.iter().map(|a| a.replace("{path}", &p)).collect(), stdin }
}

/// `custom` is the config `[copy] command`; `None` selects the default with fallback.
pub fn plan(custom: Option<&[String]>, path: &Path, found: impl Fn(&str) -> bool) -> Result<CopyPlan, ClipError> {
    let owned = |c: &[&str]| c.iter().map(|s| s.to_string()).collect::<Vec<_>>();
    match custom {
        Some(cmd) => {
            let exe = cmd.first().ok_or(ClipError::Empty)?;
            if !found(exe) {
                return Err(ClipError::CommandMissing(exe.clone()));
            }
            Ok(substitute(cmd, path))
        }
        None if found(DEFAULT_COMMAND[0]) => Ok(substitute(&owned(&DEFAULT_COMMAND), path)),
        None if found(FALLBACK_COMMAND[0]) => Ok(substitute(&owned(&FALLBACK_COMMAND), path)),
        None => Err(ClipError::NoTool),
    }
}

fn clip_files(dir: &Path) -> Vec<PathBuf> {
    std::fs::read_dir(dir)
        .map(|it| {
            it.flatten()
                .map(|e| e.path())
                .filter(|p| p.file_name().and_then(|n| n.to_str()).is_some_and(|n| n.starts_with("clip-") && n.ends_with(".png")))
                .collect()
        })
        .unwrap_or_default()
}

pub fn remove_clips(dir: &Path) {
    for p in clip_files(dir) {
        let _ = std::fs::remove_file(p);
    }
}

/// Write `clip-<id>.png` (deleting older clips) and return its path.
pub fn stage_clip(dir: &Path, bytes: &[u8]) -> std::io::Result<PathBuf> {
    std::fs::create_dir_all(dir)?;
    remove_clips(dir);
    let path = dir.join(format!("clip-{}.png", input::unique_name()));
    std::fs::write(&path, bytes)?;
    Ok(path)
}

/// Spawn the copy tool without waiting for it (both tools daemonise); a thread reaps it.
pub fn spawn(plan: &CopyPlan, file: &Path) -> Result<(), ClipError> {
    let io = |e: std::io::Error| ClipError::Io(e.to_string());
    let mut cmd = Command::new(&plan.argv[0]);
    cmd.args(&plan.argv[1..]).stdout(Stdio::null()).stderr(Stdio::piped());
    if plan.stdin {
        cmd.stdin(std::fs::File::open(file).map_err(io)?);
    } else {
        cmd.stdin(Stdio::null());
    }
    let child = cmd.spawn().map_err(io)?;
    tracing::debug!(argv = ?plan.argv, "copy command spawned");
    std::thread::spawn(move || match child.wait_with_output() {
        Ok(out) if !out.status.success() => {
            tracing::warn!(status = %out.status, stderr = %String::from_utf8_lossy(&out.stderr).trim(), "copy command failed")
        }
        Err(e) => tracing::warn!(error = %e, "copy command wait failed"),
        _ => {}
    });
    Ok(())
}

pub fn copy_image(bytes: &[u8], custom: Option<&[String]>) -> Result<PathBuf, ClipError> {
    let dir = input::cache_dir();
    let path = stage_clip(&dir, bytes).map_err(|e| ClipError::Io(e.to_string()))?;
    let plan = plan(custom, &path, which)?;
    spawn(&plan, &path)?;
    Ok(path)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn s(v: &[&str]) -> Vec<String> {
        v.iter().map(|x| x.to_string()).collect()
    }

    #[test]
    fn default_uses_shotclip_with_path() {
        let p = plan(None, Path::new("/c/clip 1.png"), |_| true).unwrap();
        assert_eq!(p.argv, s(&["shotclip", "--paste-once", "/c/clip 1.png"]));
        assert!(!p.stdin);
    }

    #[test]
    fn fallback_to_wl_copy_on_stdin() {
        let p = plan(None, Path::new("/c/x.png"), |e| e == "wl-copy").unwrap();
        assert_eq!(p.argv, s(&["wl-copy", "--type", "image/png"]));
        assert!(p.stdin);
    }

    #[test]
    fn nothing_found() {
        assert_eq!(plan(None, Path::new("/x"), |_| false), Err(ClipError::NoTool));
        assert_eq!(ClipError::NoTool.to_string(), "No clipboard tool found (shotclip or wl-copy)");
    }

    #[test]
    fn custom_command_no_fallback() {
        let cmd = s(&["wl-copy", "--type", "image/png"]);
        let p = plan(Some(&cmd), Path::new("/x.png"), |_| true).unwrap();
        assert!(p.stdin);
        assert_eq!(p.argv, cmd);
        let cmd = s(&["myclip", "file://{path}"]);
        let p = plan(Some(&cmd), Path::new("/x.png"), |_| true).unwrap();
        assert_eq!(p.argv[1], "file:///x.png");
        assert!(!p.stdin);
        assert_eq!(plan(Some(&cmd), Path::new("/x"), |e| e == "wl-copy"), Err(ClipError::CommandMissing("myclip".into())));
    }

    #[test]
    fn stage_replaces_previous_clip() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join("other.png"), b"keep").unwrap();
        let a = stage_clip(dir.path(), b"a").unwrap();
        let b = stage_clip(dir.path(), b"b").unwrap();
        assert!(!a.exists());
        assert_eq!(std::fs::read(&b).unwrap(), b"b");
        remove_clips(dir.path());
        assert!(!b.exists());
        assert!(dir.path().join("other.png").exists());
    }

    #[test]
    fn spawn_pipes_stdin() {
        let dir = tempfile::tempdir().unwrap();
        let f = dir.path().join("clip-x.png");
        std::fs::write(&f, b"data").unwrap();
        let out = dir.path().join("out");
        let plan = CopyPlan { argv: s(&["sh", "-c", &format!("cat > '{}'", out.display())]), stdin: true };
        spawn(&plan, &f).unwrap();
        for _ in 0..100 {
            if std::fs::read(&out).map(|b| b == b"data").unwrap_or(false) {
                return;
            }
            std::thread::sleep(std::time::Duration::from_millis(20));
        }
        panic!("stdin not piped");
    }
}
