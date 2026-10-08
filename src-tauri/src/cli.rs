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
        let e = parse(&["--output", "x.png"]).unwrap_err();
        assert_eq!(e.exit_code(), 2);
    }

    #[test]
    fn theme_and_verbose() {
        let c = parse(&["--theme", "latte", "-v"]).unwrap();
        assert_eq!(c.theme, Some(Theme::Latte));
        assert!(c.verbose);
        assert!(parse(&["--theme", "nord"]).is_err());
    }
}
