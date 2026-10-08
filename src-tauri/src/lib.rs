//! woge: Wayland screenshot and image editor.

mod app;
mod cli;
mod config;
mod input;
mod lifecycle;
mod logging;

use clap::Parser;
use tauri::Manager;

use cli::{Cli, InputKind, InputRequest, LaunchOptions};
use lifecycle::{EXIT_OK, EXIT_STARTUP};

fn fail(msg: impl std::fmt::Display) -> i32 {
    eprintln!("{msg}");
    EXIT_STARTUP
}

/// Entry point; returns the process exit code.
pub fn run() -> i32 {
    // clap prints usage and exits 2 on bad arguments.
    let cli = Cli::parse();

    if let Err(e) = lifecycle::validate_wayland() {
        return fail(e);
    }

    let file = match config::config_path() {
        Some(path) => match config::load(&path) {
            Ok(f) => f,
            Err(e) => return fail(e),
        },
        None => config::FileConfig::default(),
    };
    let eff = config::resolve(&cli, &file);

    let _guard = match logging::init(eff.verbose) {
        Ok(g) => g,
        Err(e) => return fail(e),
    };
    tracing::info!(version = env!("CARGO_PKG_VERSION"), "starting");

    let mut staged = None;
    let (input_kind, input_path, source_path) = match cli.input_request() {
        InputRequest::None => (InputKind::None, None, None),
        InputRequest::Clipboard => (InputKind::Clipboard, None, None),
        InputRequest::Path(p) => {
            let s = p.to_string_lossy().into_owned();
            (InputKind::Path, Some(s.clone()), Some(s))
        }
        InputRequest::Stdin => {
            let path = match input::read_stdin().and_then(|b| input::stage(&input::cache_dir(), &b)) {
                Ok(p) => p,
                Err(e) => return fail(format!("woge: {e}")),
            };
            tracing::debug!(path = %path.display(), "stdin staged");
            staged = Some(path.clone());
            (InputKind::Stdin, Some(path.to_string_lossy().into_owned()), None)
        }
    };

    let launch = LaunchOptions {
        input_kind,
        input_path,
        source_path,
        theme: eff.theme,
        status_line: eff.status_line,
        checkerboard: eff.checkerboard,
    };

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(app::AppState::new(launch, staged))
        .invoke_handler(tauri::generate_handler![
            app::take_launch_options,
            app::load_input,
            app::load_clipboard,
            app::exit_application,
        ])
        .build(tauri::generate_context!());
    let app = match app {
        Ok(a) => a,
        Err(e) => return fail(format!("woge: {e}")),
    };

    let code = app.run_return(|handle, event| {
        if let tauri::RunEvent::Exit = event {
            handle.state::<app::AppState>().cleanup();
        }
    });
    tracing::info!(code, "exiting");
    if code == 0 { EXIT_OK } else { code }
}
