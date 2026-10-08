//! `$XDG_CONFIG_HOME/woge/config.toml` loading and precedence.

use std::path::{Path, PathBuf};

use serde::Deserialize;

use crate::cli::{Cli, Theme};

#[derive(Debug, Default, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct FileConfig {
    pub theme: Option<Theme>,
    pub status_line: Option<bool>,
    pub checkerboard: Option<bool>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Effective {
    pub theme: Theme,
    pub status_line: bool,
    pub checkerboard: bool,
    pub verbose: bool,
}

#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("woge: cannot read {path}: {source}")]
    Io { path: PathBuf, source: std::io::Error },
    #[error("woge: invalid config {path}: {message}")]
    Parse { path: PathBuf, message: String },
}

pub fn config_path() -> Option<PathBuf> {
    directories::BaseDirs::new().map(|d| d.config_dir().join("woge").join("config.toml"))
}

/// Missing file means defaults; any other problem is an error naming file and key.
pub fn load(path: &Path) -> Result<FileConfig, ConfigError> {
    match std::fs::read_to_string(path) {
        Ok(text) => parse(path, &text),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(FileConfig::default()),
        Err(source) => Err(ConfigError::Io { path: path.to_owned(), source }),
    }
}

pub fn parse(path: &Path, text: &str) -> Result<FileConfig, ConfigError> {
    toml::from_str(text).map_err(|e| ConfigError::Parse {
        path: path.to_owned(),
        message: e.message().trim().to_owned(),
    })
}

pub fn resolve(cli: &Cli, file: &FileConfig) -> Effective {
    Effective {
        theme: cli.theme.or(file.theme).unwrap_or_default(),
        status_line: file.status_line.unwrap_or(true),
        checkerboard: file.checkerboard.unwrap_or(false),
        verbose: cli.verbose,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use clap::Parser;

    fn cli(args: &[&str]) -> Cli {
        Cli::parse_from(std::iter::once("woge").chain(args.iter().copied()))
    }

    #[test]
    fn missing_file_defaults() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("config.toml");
        let f = load(&path).unwrap();
        assert_eq!(f, FileConfig::default());
        assert!(!path.exists());
        let e = resolve(&cli(&[]), &f);
        assert_eq!(e.theme, Theme::Auto);
        assert!(e.status_line);
        assert!(!e.checkerboard);
    }

    #[test]
    fn unknown_key_names_file_and_key() {
        let msg = parse(Path::new("/x/config.toml"), "colour = \"red\"").unwrap_err().to_string();
        assert!(msg.contains("config.toml"), "{msg}");
        assert!(msg.contains("colour"), "{msg}");
    }

    #[test]
    fn invalid_value() {
        let msg = parse(Path::new("config.toml"), "theme = \"nord\"").unwrap_err().to_string();
        assert!(msg.contains("nord") || msg.contains("variant"), "{msg}");
        assert!(parse(Path::new("config.toml"), "status_line = 3").is_err());
        assert!(parse(Path::new("config.toml"), "theme = ").is_err());
    }

    #[test]
    fn file_override() {
        let f = parse(Path::new("c"), "theme = \"latte\"\nstatus_line = false\ncheckerboard = true").unwrap();
        let e = resolve(&cli(&[]), &f);
        assert_eq!(e.theme, Theme::Latte);
        assert!(!e.status_line);
        assert!(e.checkerboard);
    }

    #[test]
    fn flag_beats_file() {
        let f = parse(Path::new("c"), "theme = \"latte\"").unwrap();
        assert_eq!(resolve(&cli(&["--theme", "mocha"]), &f).theme, Theme::Mocha);
    }
}
