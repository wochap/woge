//! Process exit codes and the Wayland gate.

use std::os::unix::net::UnixStream;
use std::path::PathBuf;

pub const EXIT_OK: i32 = 0;
#[allow(dead_code)] // reserved for the output change
pub const EXIT_CANCELLED: i32 = 1;
pub const EXIT_STARTUP: i32 = 2;

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum WaylandError {
    #[error("woge: WAYLAND_DISPLAY is not set; woge requires a Wayland session")]
    NoDisplay,
    #[error("woge: cannot connect to Wayland display {0}")]
    Unreachable(String),
}

/// Resolve the socket path the way libwayland does.
pub fn wayland_socket(display: &str, runtime_dir: Option<&str>) -> PathBuf {
    let p = PathBuf::from(display);
    if p.is_absolute() {
        return p;
    }
    PathBuf::from(runtime_dir.unwrap_or("/run/user/0")).join(display)
}

/// Force GTK onto Wayland and check that the compositor socket accepts connections.
pub fn validate_wayland() -> Result<(), WaylandError> {
    std::env::set_var("GDK_BACKEND", "wayland");
    let display = std::env::var("WAYLAND_DISPLAY").ok().filter(|d| !d.is_empty());
    let runtime = std::env::var("XDG_RUNTIME_DIR").ok();
    check_display(display.as_deref(), runtime.as_deref())
}

pub fn check_display(display: Option<&str>, runtime_dir: Option<&str>) -> Result<(), WaylandError> {
    let display = display.ok_or(WaylandError::NoDisplay)?;
    let socket = wayland_socket(display, runtime_dir);
    UnixStream::connect(&socket)
        .map(|_| ())
        .map_err(|_| WaylandError::Unreachable(socket.display().to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn missing_display_message() {
        let err = check_display(None, None).unwrap_err();
        assert_eq!(err, WaylandError::NoDisplay);
        assert!(err.to_string().contains("WAYLAND_DISPLAY is not set"));
    }

    #[test]
    fn unreachable_socket_names_path() {
        let dir = tempfile::tempdir().unwrap();
        let err = check_display(Some("wayland-x"), dir.path().to_str()).unwrap_err();
        assert!(err.to_string().contains("wayland-x"));
    }

    #[test]
    fn reachable_socket() {
        let dir = tempfile::tempdir().unwrap();
        let _l = std::os::unix::net::UnixListener::bind(dir.path().join("wl-0")).unwrap();
        assert!(check_display(Some("wl-0"), dir.path().to_str()).is_ok());
    }

    #[test]
    fn absolute_display() {
        assert_eq!(wayland_socket("/tmp/s", Some("/r")), PathBuf::from("/tmp/s"));
    }
}
