//! `$XDG_CONFIG_HOME/woge/config.toml` loading and precedence.

use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::cli::{Cli, Format, OnSave, Theme};

pub const DEFAULT_JPEG_QUALITY: u8 = 92;
pub const DEFAULT_WEBP_QUALITY: u8 = 90;

#[derive(Debug, Default, Clone, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct CopyConfig {
    pub command: Option<Vec<String>>,
}

#[derive(Debug, Default, Clone, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct Hooks {
    #[serde(default)]
    pub on_load: Vec<String>,
    #[serde(default)]
    pub on_save: Vec<String>,
    #[serde(default)]
    pub on_copy: Vec<String>,
    #[serde(default)]
    pub on_exit: Vec<String>,
}

/// `[defaults]`: seeds per-tool settings; remembered state wins.
#[derive(Debug, Default, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct Defaults {
    pub color: Option<String>,
    pub stroke: Option<String>,
    pub font: Option<String>,
    pub font_size: Option<u32>,
}

const COLORS: [&str; 10] = ["red", "peach", "yellow", "green", "teal", "blue", "mauve", "pink", "white", "black"];

#[derive(Debug, Default, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct FileConfig {
    pub theme: Option<Theme>,
    pub status_line: Option<bool>,
    pub checkerboard: Option<bool>,
    pub format: Option<Format>,
    pub on_save: Option<OnSave>,
    pub copy_on_save: Option<bool>,
    pub jpeg_quality: Option<i64>,
    pub webp_quality: Option<i64>,
    #[serde(default)]
    pub copy: CopyConfig,
    #[serde(default)]
    pub hooks: Hooks,
    pub tool_sticky: Option<bool>,
    pub badge_renumber: Option<bool>,
    #[serde(default)]
    pub defaults: Defaults,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Effective {
    pub theme: Theme,
    pub status_line: bool,
    pub checkerboard: bool,
    pub verbose: bool,
    /// Explicit format (flag > `-o` extension > config); `None` defers to the source.
    pub format: Option<Format>,
    pub on_save: OnSave,
    pub copy_on_save: bool,
    pub jpeg_quality: u8,
    pub webp_quality: u8,
    /// `None` means the default shotclip command with the wl-copy fallback.
    pub copy_command: Option<Vec<String>>,
    pub hooks: Hooks,
    pub tool_sticky: bool,
    pub badge_renumber: bool,
    pub defaults: Defaults,
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

fn is_argv(v: &toml::Value) -> bool {
    v.as_array().is_some_and(|a| a.iter().all(toml::Value::is_str))
}

/// Shape checks serde would report without the key path.
fn check_shapes(value: &toml::Value) -> Result<(), String> {
    for table in ["hooks", "copy"] {
        let Some(t) = value.get(table).and_then(toml::Value::as_table) else { continue };
        for (key, v) in t {
            if !is_argv(v) {
                return Err(format!("`{table}.{key}` must be an array of strings"));
            }
        }
    }
    Ok(())
}

fn check_quality(key: &str, q: Option<i64>) -> Result<(), String> {
    match q {
        Some(q) if !(1..=100).contains(&q) => Err(format!("`{key}` must be between 1 and 100, got {q}")),
        _ => Ok(()),
    }
}

fn check_defaults(d: &Defaults) -> Result<(), String> {
    if let Some(c) = &d.color {
        if !COLORS.contains(&c.as_str()) {
            return Err(format!("`defaults.color` must be one of {}, got \"{c}\"", COLORS.join(", ")));
        }
    }
    if let Some(s) = &d.stroke {
        if !["S", "M", "L"].contains(&s.as_str()) {
            return Err(format!("`defaults.stroke` must be S, M or L, got \"{s}\""));
        }
    }
    if let Some(n) = d.font_size {
        if !(8..=200).contains(&n) {
            return Err(format!("`defaults.font_size` must be between 8 and 200, got {n}"));
        }
    }
    Ok(())
}

pub fn parse(path: &Path, text: &str) -> Result<FileConfig, ConfigError> {
    let err = |message: String| ConfigError::Parse { path: path.to_owned(), message };
    let value: toml::Value = toml::from_str(text).map_err(|e: toml::de::Error| err(e.message().trim().to_owned()))?;
    check_shapes(&value).map_err(err)?;
    let file: FileConfig = toml::from_str(text).map_err(|e: toml::de::Error| err(e.message().trim().to_owned()))?;
    check_quality("jpeg_quality", file.jpeg_quality).map_err(err)?;
    check_quality("webp_quality", file.webp_quality).map_err(err)?;
    check_defaults(&file.defaults).map_err(err)?;
    Ok(file)
}

/// Flag > `-o` extension > config.
pub fn explicit_format(flag: Option<Format>, output_ext: Option<&str>, config: Option<Format>) -> Option<Format> {
    flag.or_else(|| output_ext.and_then(Format::from_ext)).or(config)
}

/// Full precedence: flag > `-o` extension > config > source extension > PNG.
pub fn resolve_format(
    flag: Option<Format>,
    output_ext: Option<&str>,
    config: Option<Format>,
    source_ext: Option<&str>,
) -> Format {
    explicit_format(flag, output_ext, config)
        .or_else(|| source_ext.and_then(Format::from_ext))
        .unwrap_or(Format::Png)
}

/// Keep a matching extension, replace another image extension, append otherwise.
pub fn rewrite_extension(path: &Path, format: Format) -> PathBuf {
    match path.extension().and_then(|e| e.to_str()) {
        Some(ext) if Format::from_ext(ext) == Some(format) => path.to_owned(),
        Some(ext) if Format::from_ext(ext).is_some() => path.with_extension(format.ext()),
        _ => {
            let mut s = path.as_os_str().to_owned();
            s.push(".");
            s.push(format.ext());
            PathBuf::from(s)
        }
    }
}

fn ext_of(path: &Path) -> Option<&str> {
    path.extension().and_then(|e| e.to_str())
}

pub fn resolve(cli: &Cli, file: &FileConfig) -> Effective {
    let output_ext = cli.output.as_deref().and_then(ext_of);
    Effective {
        theme: cli.theme.or(file.theme).unwrap_or_default(),
        status_line: file.status_line.unwrap_or(true),
        checkerboard: file.checkerboard.unwrap_or(false),
        verbose: cli.verbose,
        format: explicit_format(cli.format, output_ext, file.format),
        on_save: cli.on_save.or(file.on_save).unwrap_or_default(),
        copy_on_save: cli.copy || file.copy_on_save.unwrap_or(false),
        jpeg_quality: file.jpeg_quality.map_or(DEFAULT_JPEG_QUALITY, |q| q as u8),
        webp_quality: file.webp_quality.map_or(DEFAULT_WEBP_QUALITY, |q| q as u8),
        copy_command: file.copy.command.clone().filter(|c| !c.is_empty()),
        hooks: file.hooks.clone(),
        tool_sticky: file.tool_sticky.unwrap_or(true),
        badge_renumber: file.badge_renumber.unwrap_or(true),
        defaults: file.defaults.clone(),
    }
}

/// The `-o` path, absolute, with the extension rewritten to the resolved format.
pub fn output_path(cli: &Cli, file: &FileConfig) -> Option<PathBuf> {
    let out = cli.output.as_deref()?;
    let source_ext = cli.input.as_deref().and_then(ext_of);
    let format = resolve_format(cli.format, ext_of(out), file.format, source_ext);
    let out = rewrite_extension(out, format);
    Some(if out.is_absolute() {
        out
    } else {
        std::env::current_dir().map(|d| d.join(&out)).unwrap_or(out)
    })
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

    #[test]
    fn output_defaults() {
        let e = resolve(&cli(&[]), &FileConfig::default());
        assert_eq!(e.format, None);
        assert_eq!(e.on_save, OnSave::Exit);
        assert!(!e.copy_on_save);
        assert_eq!((e.jpeg_quality, e.webp_quality), (92, 90));
        assert_eq!(e.copy_command, None);
        assert!(e.hooks.on_save.is_empty());
    }

    #[test]
    fn output_keys() {
        let f = parse(
            Path::new("c"),
            "format = \"jpeg\"\non_save = \"stay\"\ncopy_on_save = true\njpeg_quality = 80\n\
             [copy]\ncommand = [\"wl-copy\"]\n[hooks]\non_save = [\"notify-send\", \"woge\", \"saved {output}\"]\n",
        )
        .unwrap();
        let e = resolve(&cli(&[]), &f);
        assert_eq!(e.format, Some(Format::Jpeg));
        assert_eq!(e.on_save, OnSave::Stay);
        assert!(e.copy_on_save);
        assert_eq!(e.jpeg_quality, 80);
        assert_eq!(e.copy_command, Some(vec!["wl-copy".to_owned()]));
        assert_eq!(e.hooks.on_save.len(), 3);
        assert_eq!(resolve(&cli(&["--on-save", "exit"]), &f).on_save, OnSave::Exit);
    }

    #[test]
    fn quality_bounds() {
        let msg = parse(Path::new("c"), "jpeg_quality = 150").unwrap_err().to_string();
        assert!(msg.contains("jpeg_quality"), "{msg}");
        let msg = parse(Path::new("c"), "webp_quality = 0").unwrap_err().to_string();
        assert!(msg.contains("webp_quality"), "{msg}");
        assert!(parse(Path::new("c"), "jpeg_quality = 1\nwebp_quality = 100").is_ok());
    }

    #[test]
    fn non_array_hook_names_key() {
        let msg = parse(Path::new("c"), "[hooks]\non_save = \"notify-send\"").unwrap_err().to_string();
        assert!(msg.contains("hooks.on_save"), "{msg}");
        let msg = parse(Path::new("c"), "[hooks]\non_exit = [1, 2]").unwrap_err().to_string();
        assert!(msg.contains("hooks.on_exit"), "{msg}");
        let msg = parse(Path::new("c"), "[hooks]\non_lunch = []").unwrap_err().to_string();
        assert!(msg.contains("on_lunch"), "{msg}");
    }

    #[test]
    fn defaults_and_sticky() {
        let e = resolve(&cli(&[]), &FileConfig::default());
        assert!(e.tool_sticky);
        assert!(e.badge_renumber);
        assert_eq!(e.defaults, Defaults::default());
        let f = parse(Path::new("c"), "tool_sticky = false\nbadge_renumber = false\n[defaults]\ncolor = \"blue\"\nstroke = \"L\"\nfont_size = 32\n").unwrap();
        let e = resolve(&cli(&[]), &f);
        assert!(!e.tool_sticky);
        assert!(!e.badge_renumber);
        assert_eq!(e.defaults.color.as_deref(), Some("blue"));
        assert_eq!(e.defaults.font_size, Some(32));
        let msg = parse(Path::new("c"), "[defaults]\ncolor = \"chartreuse\"").unwrap_err().to_string();
        assert!(msg.contains("defaults.color"), "{msg}");
        assert!(parse(Path::new("c"), "[defaults]\nstroke = \"XL\"").is_err());
        assert!(parse(Path::new("c"), "[defaults]\nfont_size = 1").is_err());
    }

    #[test]
    fn format_precedence() {
        use Format::*;
        assert_eq!(resolve_format(Some(Png), Some("jpg"), Some(Webp), Some("webp")), Png);
        assert_eq!(resolve_format(None, Some("jpg"), Some(Webp), Some("png")), Jpeg);
        assert_eq!(resolve_format(None, Some("bmp"), Some(Webp), Some("png")), Webp);
        assert_eq!(resolve_format(None, None, None, Some("JPG")), Jpeg);
        assert_eq!(resolve_format(None, None, None, Some("gif")), Png);
        assert_eq!(resolve_format(None, None, None, None), Png);
    }

    #[test]
    fn extension_rewrite() {
        assert_eq!(rewrite_extension(Path::new("out.jpg"), Format::Webp), PathBuf::from("out.webp"));
        assert_eq!(rewrite_extension(Path::new("out.jpeg"), Format::Jpeg), PathBuf::from("out.jpeg"));
        assert_eq!(rewrite_extension(Path::new("out.bmp"), Format::Png), PathBuf::from("out.bmp.png"));
        assert_eq!(rewrite_extension(Path::new("out"), Format::Png), PathBuf::from("out.png"));
    }

    #[test]
    fn output_path_rewritten_and_absolute() {
        let p = output_path(&cli(&["shot.png", "-o", "/tmp/out.jpg", "--format", "png"]), &FileConfig::default());
        assert_eq!(p, Some(PathBuf::from("/tmp/out.png")));
        let p = output_path(&cli(&["shot.png", "-o", "rel.png"]), &FileConfig::default()).unwrap();
        assert!(p.is_absolute());
        assert_eq!(output_path(&cli(&["shot.png"]), &FileConfig::default()), None);
    }
}
