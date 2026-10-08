//! Reading image bytes from stdin and the Wayland clipboard, staged under the cache dir.

use std::io::Read;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::atomic::{AtomicU64, Ordering};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InputSource {
    Path,
    Stdin,
    Clipboard,
}

#[derive(Debug, thiserror::Error)]
pub enum InputError {
    #[error("wl-paste not found")]
    WlPasteMissing,
    #[error("Clipboard has no image")]
    NoClipboardImage,
    #[error("wl-paste failed: {0}")]
    WlPasteFailed(String),
    #[error("No image data on stdin")]
    EmptyStdin,
    #[error("Cannot stage image: {0}")]
    Io(#[from] std::io::Error),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ImageFormat {
    Png,
    Jpeg,
    Webp,
}

impl ImageFormat {
    pub fn ext(self) -> &'static str {
        match self {
            Self::Png => "png",
            Self::Jpeg => "jpg",
            Self::Webp => "webp",
        }
    }
}

/// Identify the format from magic bytes.
pub fn sniff(bytes: &[u8]) -> Option<ImageFormat> {
    if bytes.starts_with(b"\x89PNG\r\n\x1a\n") {
        Some(ImageFormat::Png)
    } else if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        Some(ImageFormat::Jpeg)
    } else if bytes.len() >= 12 && &bytes[0..4] == b"RIFF" && &bytes[8..12] == b"WEBP" {
        Some(ImageFormat::Webp)
    } else {
        None
    }
}

pub fn cache_dir() -> PathBuf {
    std::env::var_os("XDG_CACHE_HOME")
        .filter(|v| !v.is_empty())
        .map(PathBuf::from)
        .or_else(|| directories::BaseDirs::new().map(|d| d.cache_dir().to_owned()))
        .unwrap_or_else(std::env::temp_dir)
        .join("woge")
}

pub fn unique_name() -> String {
    static N: AtomicU64 = AtomicU64::new(0);
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    format!("{:x}-{:x}-{}", std::process::id(), nanos, N.fetch_add(1, Ordering::Relaxed))
}

/// Write bytes to a unique file in `dir`; extension from sniffing (unknown → `bin`, the
/// webview reports it as unreadable).
pub fn stage(dir: &Path, bytes: &[u8]) -> Result<PathBuf, InputError> {
    std::fs::create_dir_all(dir)?;
    let ext = sniff(bytes).map(ImageFormat::ext).unwrap_or("bin");
    let path = dir.join(format!("{}.{ext}", unique_name()));
    std::fs::write(&path, bytes)?;
    Ok(path)
}

pub fn read_stdin() -> Result<Vec<u8>, InputError> {
    let mut buf = Vec::new();
    std::io::stdin().lock().read_to_end(&mut buf)?;
    if buf.is_empty() {
        return Err(InputError::EmptyStdin);
    }
    Ok(buf)
}

/// Prefer `image/png`, else the first `image/*` type offered.
pub fn pick_image_type(types: &str) -> Option<&str> {
    let images: Vec<&str> = types.lines().map(str::trim).filter(|t| t.starts_with("image/")).collect();
    images.iter().copied().find(|t| *t == "image/png").or_else(|| images.first().copied())
}

fn wl_paste(args: &[&str]) -> Result<Vec<u8>, InputError> {
    let out = Command::new("wl-paste").args(args).output().map_err(|e| {
        if e.kind() == std::io::ErrorKind::NotFound {
            InputError::WlPasteMissing
        } else {
            InputError::Io(e)
        }
    })?;
    if !out.status.success() {
        let err = String::from_utf8_lossy(&out.stderr).trim().to_owned();
        // wl-paste exits non-zero with "No selection" / "Nothing is copied" on an empty clipboard.
        if err.to_lowercase().contains("no selection") || err.to_lowercase().contains("nothing is copied") {
            return Err(InputError::NoClipboardImage);
        }
        return Err(InputError::WlPasteFailed(err));
    }
    Ok(out.stdout)
}

pub fn read_clipboard() -> Result<Vec<u8>, InputError> {
    let types = wl_paste(&["--list-types"])?;
    let types = String::from_utf8_lossy(&types);
    let mime = pick_image_type(&types).ok_or(InputError::NoClipboardImage)?;
    tracing::debug!(mime, "reading clipboard");
    let bytes = wl_paste(&["--no-newline", "--type", mime])?;
    if bytes.is_empty() {
        return Err(InputError::NoClipboardImage);
    }
    Ok(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sniff_png() {
        assert_eq!(sniff(b"\x89PNG\r\n\x1a\n\0\0\0\rIHDR"), Some(ImageFormat::Png));
    }

    #[test]
    fn sniff_jpeg() {
        assert_eq!(sniff(&[0xFF, 0xD8, 0xFF, 0xE1, 0, 0]), Some(ImageFormat::Jpeg));
    }

    #[test]
    fn sniff_webp() {
        assert_eq!(sniff(b"RIFF\x10\0\0\0WEBPVP8 "), Some(ImageFormat::Webp));
    }

    #[test]
    fn sniff_garbage() {
        assert_eq!(sniff(b"not an image"), None);
        assert_eq!(sniff(b"RIFF"), None);
    }

    #[test]
    fn stage_uses_sniffed_extension() {
        let dir = tempfile::tempdir().unwrap();
        let a = stage(dir.path(), b"\x89PNG\r\n\x1a\nrest").unwrap();
        let b = stage(dir.path(), b"\x89PNG\r\n\x1a\nrest").unwrap();
        assert_eq!(a.extension().unwrap(), "png");
        assert_ne!(a, b);
        assert_eq!(std::fs::read(&a).unwrap(), b"\x89PNG\r\n\x1a\nrest");
    }

    #[test]
    fn pick_type() {
        assert_eq!(pick_image_type("text/plain\nimage/jpeg\nimage/png\n"), Some("image/png"));
        assert_eq!(pick_image_type("text/plain\nimage/webp"), Some("image/webp"));
        assert_eq!(pick_image_type("text/plain\nUTF8_STRING"), None);
    }

    #[test]
    fn error_messages_match_toasts() {
        assert_eq!(InputError::WlPasteMissing.to_string(), "wl-paste not found");
        assert_eq!(InputError::NoClipboardImage.to_string(), "Clipboard has no image");
    }
}
