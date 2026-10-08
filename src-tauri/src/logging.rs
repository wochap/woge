//! Tracing to `$XDG_STATE_HOME/woge/woge.log`; stdout stays clean.

use std::path::PathBuf;

use tracing_appender::non_blocking::WorkerGuard;
use tracing_subscriber::EnvFilter;

pub fn state_dir() -> Option<PathBuf> {
    let base = std::env::var_os("XDG_STATE_HOME")
        .filter(|v| !v.is_empty())
        .map(PathBuf::from)
        .or_else(|| directories::BaseDirs::new().map(|d| d.home_dir().join(".local/state")))?;
    Some(base.join("woge"))
}

pub fn init(verbose: bool) -> Result<WorkerGuard, String> {
    let dir = state_dir().ok_or("woge: cannot determine state directory")?;
    std::fs::create_dir_all(&dir).map_err(|e| format!("woge: cannot create {}: {e}", dir.display()))?;
    let appender = tracing_appender::rolling::never(&dir, "woge.log");
    let (writer, guard) = tracing_appender::non_blocking(appender);
    let level = if verbose { "debug" } else { "info" };
    let filter = EnvFilter::try_from_env("WOGE_LOG").unwrap_or_else(|_| EnvFilter::new(level));
    tracing_subscriber::fmt()
        .with_env_filter(filter)
        .with_writer(writer)
        .with_ansi(false)
        .try_init()
        .map_err(|e| format!("woge: cannot initialise logging: {e}"))?;
    Ok(guard)
}
