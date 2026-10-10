//! Main window creation: themed native background, shown before the page paints.

use tauri::{App, WebviewWindowBuilder};

use crate::cli::Theme;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Flavour {
    Mocha,
    Latte,
}

impl Flavour {
    pub fn name(self) -> &'static str {
        match self {
            Flavour::Mocha => "mocha",
            Flavour::Latte => "latte",
        }
    }

    /// Catppuccin base colour as RGB.
    pub fn base(self) -> (u8, u8, u8) {
        match self {
            Flavour::Mocha => (0x1e, 0x1e, 0x2e),
            Flavour::Latte => (0xef, 0xf1, 0xf5),
        }
    }
}

/// Effective flavour: forced themes as-is, `auto` follows the system (Mocha when unknown).
pub fn resolve_flavour(theme: Theme, system: Option<tauri::Theme>) -> Flavour {
    match theme {
        Theme::Mocha => Flavour::Mocha,
        Theme::Latte => Flavour::Latte,
        Theme::Auto => match system {
            Some(tauri::Theme::Light) => Flavour::Latte,
            _ => Flavour::Mocha,
        },
    }
}

/// Builds the main window from config, sets its background by theme and shows it.
pub fn create_main(app: &mut App, theme: Theme) -> tauri::Result<()> {
    let config = app
        .config()
        .app
        .windows
        .iter()
        .find(|w| w.label == "main")
        .cloned()
        .ok_or_else(|| tauri::Error::WindowNotFound)?;
    let mut builder = WebviewWindowBuilder::from_config(app.handle(), &config)?;
    if theme != Theme::Auto {
        let flavour = resolve_flavour(theme, None);
        builder = builder
            .initialization_script(format!("document.documentElement.dataset.theme = \"{}\";", flavour.name()));
    }
    let window = builder.build()?;
    let system = if theme == Theme::Auto { window.theme().ok() } else { None };
    let flavour = resolve_flavour(theme, system);
    tracing::debug!(flavour = flavour.name(), ?system, "main window theme");
    let (r, g, b) = flavour.base();
    window.set_background_color(Some(tauri::window::Color(r, g, b, 255)))?;
    window.show()?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn auto_follows_system() {
        assert_eq!(resolve_flavour(Theme::Auto, Some(tauri::Theme::Dark)), Flavour::Mocha);
        assert_eq!(resolve_flavour(Theme::Auto, Some(tauri::Theme::Light)), Flavour::Latte);
        assert_eq!(resolve_flavour(Theme::Auto, None), Flavour::Mocha);
    }

    #[test]
    fn forced_ignores_system() {
        assert_eq!(resolve_flavour(Theme::Mocha, Some(tauri::Theme::Light)), Flavour::Mocha);
        assert_eq!(resolve_flavour(Theme::Latte, Some(tauri::Theme::Dark)), Flavour::Latte);
        assert_eq!(resolve_flavour(Theme::Latte, None), Flavour::Latte);
    }

    #[test]
    fn base_colours() {
        assert_eq!(Flavour::Mocha.base(), (0x1e, 0x1e, 0x2e));
        assert_eq!(Flavour::Latte.base(), (0xef, 0xf1, 0xf5));
    }
}
