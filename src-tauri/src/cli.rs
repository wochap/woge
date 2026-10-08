//! Command line surface.

use std::path::PathBuf;

use clap::{Parser, ValueEnum};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, ValueEnum, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    #[default]
    Auto,
    Mocha,
    Latte,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, ValueEnum, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Format {
    Png,
    Jpeg,
    Webp,
}

impl Format {
    pub fn ext(self) -> &'static str {
        match self {
            Self::Png => "png",
            Self::Jpeg => "jpg",
            Self::Webp => "webp",
        }
    }

    pub fn from_ext(ext: &str) -> Option<Self> {
        match ext.to_ascii_lowercase().as_str() {
            "png" => Some(Self::Png),
            "jpg" | "jpeg" => Some(Self::Jpeg),
            "webp" => Some(Self::Webp),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, ValueEnum, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum OnSave {
    #[default]
    Exit,
    Stay,
}

#[derive(Debug, Parser)]
#[command(name = "woge", version, about = "Wayland screenshot and image editor")]
pub struct Cli {
    /// Image file to open, or `-` to read image bytes from stdin
    #[arg(conflicts_with = "clipboard")]
    pub input: Option<PathBuf>,

    /// Load the image currently on the Wayland clipboard
    #[arg(long)]
    pub clipboard: bool,

    /// Colour theme (overrides config)
    #[arg(long, value_enum)]
    pub theme: Option<Theme>,

    /// Write Save to PATH instead of the source file
    #[arg(short, long, value_name = "PATH")]
    pub output: Option<PathBuf>,

    /// Output format (overrides the -o extension and config)
    #[arg(long, value_enum)]
    pub format: Option<Format>,

    /// What a successful Save does next
    #[arg(long, value_enum)]
    pub on_save: Option<OnSave>,

    /// Also copy the result to the clipboard after each save
    #[arg(long)]
    pub copy: bool,

    /// Verbose logging (debug level)
    #[arg(short, long)]
    pub verbose: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum InputRequest {
    None,
    Path(PathBuf),
    Stdin,
    Clipboard,
}

impl Cli {
    pub fn input_request(&self) -> InputRequest {
        if self.clipboard {
            InputRequest::Clipboard
        } else {
            match &self.input {
                Some(p) if p.as_os_str() == "-" => InputRequest::Stdin,
                Some(p) => InputRequest::Path(p.clone()),
                None => InputRequest::None,
            }
        }
    }

    /// Scripted runs (`-o` or stdin input) exit 1 when closed without saving.
    pub fn scripted(&self) -> bool {
        self.output.is_some() || self.input_request() == InputRequest::Stdin
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum InputKind {
    None,
    Path,
    Stdin,
    Clipboard,
}

/// What the webview receives from `take_launch_options`.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchOptions {
    pub input_kind: InputKind,
    /// Path to load (the staged file for stdin input).
    pub input_path: Option<String>,
    /// Original source path; `None` for byte inputs.
    pub source_path: Option<String>,
    pub theme: Theme,
    pub status_line: bool,
    pub checkerboard: bool,
    /// Absolute `-o` path with its extension already matching the format.
    pub output_path: Option<String>,
    /// Flag > `-o` extension > config; `None` lets the source extension decide.
    pub format: Option<Format>,
    pub on_save: OnSave,
    pub copy_on_save: bool,
    pub jpeg_quality: u8,
    pub webp_quality: u8,
    pub scripted: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse(args: &[&str]) -> Result<Cli, clap::Error> {
        Cli::try_parse_from(std::iter::once("woge").chain(args.iter().copied()))
    }

    #[test]
    fn open_file() {
        let c = parse(&["shot.png"]).unwrap();
        assert_eq!(c.input_request(), InputRequest::Path("shot.png".into()));
    }

    #[test]
    fn stdin() {
        assert_eq!(parse(&["-"]).unwrap().input_request(), InputRequest::Stdin);
    }

    #[test]
    fn clipboard() {
        assert_eq!(parse(&["--clipboard"]).unwrap().input_request(), InputRequest::Clipboard);
    }

    #[test]
    fn conflict_exits_2() {
        let e = parse(&["shot.png", "--clipboard"]).unwrap_err();
        assert_eq!(e.kind(), clap::error::ErrorKind::ArgumentConflict);
        assert_eq!(e.exit_code(), 2);
    }

    #[test]
    fn no_input() {
        assert_eq!(parse(&[]).unwrap().input_request(), InputRequest::None);
    }

    #[test]
    fn unknown_flag_exits_2() {
        let e = parse(&["--frobnicate"]).unwrap_err();
        assert_eq!(e.exit_code(), 2);
    }

    #[test]
    fn theme_and_verbose() {
        let c = parse(&["--theme", "latte", "-v"]).unwrap();
        assert_eq!(c.theme, Some(Theme::Latte));
        assert!(c.verbose);
        assert!(parse(&["--theme", "nord"]).is_err());
    }

    #[test]
    fn output_flags() {
        let c = parse(&["shot.png", "-o", "out.jpg", "--format", "webp", "--on-save", "stay", "--copy"]).unwrap();
        assert_eq!(c.output, Some("out.jpg".into()));
        assert_eq!(c.format, Some(Format::Webp));
        assert_eq!(c.on_save, Some(OnSave::Stay));
        assert!(c.copy);
        assert!(parse(&["--format", "bmp"]).is_err());
        assert!(parse(&["--on-save", "later"]).is_err());
        assert_eq!(parse(&["shot.png", "--output", "out.png"]).unwrap().output, Some("out.png".into()));
    }

    #[test]
    fn scripted_runs() {
        assert!(!parse(&["shot.png"]).unwrap().scripted());
        assert!(parse(&["shot.png", "-o", "shot.png"]).unwrap().scripted());
        assert!(parse(&["-"]).unwrap().scripted());
        assert!(!parse(&["--clipboard"]).unwrap().scripted());
    }

    #[test]
    fn format_ext_roundtrip() {
        assert_eq!(Format::from_ext("JPEG"), Some(Format::Jpeg));
        assert_eq!(Format::from_ext("jpg"), Some(Format::Jpeg));
        assert_eq!(Format::from_ext("bmp"), None);
        assert_eq!(Format::Webp.ext(), "webp");
    }
}
