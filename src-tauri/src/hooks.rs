//! User hooks from `[hooks]`: argv arrays run without a shell.

use std::io::Read;
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};

use serde::Deserialize;

use crate::config::Hooks;

pub const ON_EXIT_TIMEOUT: Duration = Duration::from_secs(2);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum HookKind {
    OnLoad,
    OnSave,
    OnCopy,
    OnExit,
}

impl HookKind {
    pub fn argv(self, hooks: &Hooks) -> &[String] {
        match self {
            Self::OnLoad => &hooks.on_load,
            Self::OnSave => &hooks.on_save,
            Self::OnCopy => &hooks.on_copy,
            Self::OnExit => &hooks.on_exit,
        }
    }
}

/// Values for placeholders and `WOGE_*`; missing ones become empty strings.
#[derive(Debug, Default, Clone, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct HookContext {
    pub input: Option<String>,
    pub output: Option<String>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub format: Option<String>,
    pub exit_code: Option<i32>,
}

impl HookContext {
    fn values(&self) -> [(&'static str, String); 5] {
        let num = |v: Option<u32>| v.map(|n| n.to_string()).unwrap_or_default();
        [
            ("input", self.input.clone().unwrap_or_default()),
            ("output", self.output.clone().unwrap_or_default()),
            ("width", num(self.width)),
            ("height", num(self.height)),
            ("format", self.format.clone().unwrap_or_default()),
        ]
    }

    pub fn env(&self) -> Vec<(String, String)> {
        let mut env: Vec<_> =
            self.values().into_iter().map(|(k, v)| (format!("WOGE_{}", k.to_uppercase()), v)).collect();
        if let Some(code) = self.exit_code {
            env.push(("WOGE_EXIT_CODE".into(), code.to_string()));
        }
        env
    }
}

/// Replace placeholders inside each element; elements are never split.
pub fn substitute(argv: &[String], ctx: &HookContext) -> Vec<String> {
    let values = ctx.values();
    argv.iter()
        .map(|arg| values.iter().fold(arg.clone(), |a, (k, v)| a.replace(&format!("{{{k}}}"), v)))
        .collect()
}

fn spawn(kind: HookKind, argv: &[String], ctx: &HookContext) -> Option<Child> {
    if argv.is_empty() {
        return None;
    }
    let argv = substitute(argv, ctx);
    match Command::new(&argv[0])
        .args(&argv[1..])
        .envs(ctx.env())
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
    {
        Ok(child) => {
            tracing::info!(?kind, ?argv, "hook started");
            Some(child)
        }
        Err(e) => {
            tracing::warn!(?kind, ?argv, error = %e, "hook failed to spawn");
            None
        }
    }
}

fn log_finished(kind: HookKind, mut child: Child) {
    let mut out = String::new();
    let mut err = String::new();
    if let Some(mut s) = child.stdout.take() {
        let _ = s.read_to_string(&mut out);
    }
    if let Some(mut s) = child.stderr.take() {
        let _ = s.read_to_string(&mut err);
    }
    match child.wait() {
        Ok(status) if status.success() => tracing::info!(?kind, stdout = %out.trim(), stderr = %err.trim(), "hook done"),
        Ok(status) => tracing::warn!(?kind, %status, stdout = %out.trim(), stderr = %err.trim(), "hook failed"),
        Err(e) => tracing::warn!(?kind, error = %e, "hook wait failed"),
    }
}

/// Fire and forget; output goes to the log from a background thread.
pub fn run(kind: HookKind, hooks: &Hooks, ctx: &HookContext) {
    if let Some(child) = spawn(kind, kind.argv(hooks), ctx) {
        std::thread::spawn(move || log_finished(kind, child));
    }
}

/// Run and wait up to `timeout`; a slower hook is left running.
pub fn run_bounded(kind: HookKind, hooks: &Hooks, ctx: &HookContext, timeout: Duration) {
    let Some(mut child) = spawn(kind, kind.argv(hooks), ctx) else { return };
    let start = Instant::now();
    while start.elapsed() < timeout {
        match child.try_wait() {
            Ok(Some(status)) => {
                tracing::info!(?kind, %status, "hook done");
                return;
            }
            Ok(None) => std::thread::sleep(Duration::from_millis(20)),
            Err(_) => return,
        }
    }
    tracing::warn!(?kind, "hook still running after timeout, not waiting");
}

#[cfg(test)]
mod tests {
    use super::*;

    fn s(v: &[&str]) -> Vec<String> {
        v.iter().map(|x| x.to_string()).collect()
    }

    #[test]
    fn placeholder_with_spaces_stays_one_arg() {
        let ctx = HookContext { output: Some("/home/u/My Shots/a.png".into()), ..Default::default() };
        let argv = substitute(&s(&["cp", "{output}", "/tmp/x"]), &ctx);
        assert_eq!(argv, s(&["cp", "/home/u/My Shots/a.png", "/tmp/x"]));
    }

    #[test]
    fn missing_values_are_empty() {
        let ctx = HookContext { width: Some(1240), height: Some(720), format: Some("png".into()), ..Default::default() };
        assert_eq!(substitute(&s(&["{width}x{height} {format} [{input}]"]), &ctx), s(&["1240x720 png []"]));
    }

    #[test]
    fn env_vars() {
        let ctx = HookContext { width: Some(1240), height: Some(720), format: Some("png".into()), ..Default::default() };
        let env = ctx.env();
        assert!(env.contains(&("WOGE_WIDTH".into(), "1240".into())));
        assert!(env.contains(&("WOGE_HEIGHT".into(), "720".into())));
        assert!(env.contains(&("WOGE_FORMAT".into(), "png".into())));
        assert!(!env.iter().any(|(k, _)| k == "WOGE_EXIT_CODE"));
        let env = HookContext { exit_code: Some(0), ..Default::default() }.env();
        assert!(env.contains(&("WOGE_EXIT_CODE".into(), "0".into())));
    }

    #[test]
    fn missing_executable_does_not_error() {
        let hooks = Hooks { on_save: s(&["does-not-exist-woge"]), ..Default::default() };
        run(HookKind::OnSave, &hooks, &HookContext::default());
        run_bounded(HookKind::OnSave, &hooks, &HookContext::default(), ON_EXIT_TIMEOUT);
        run(HookKind::OnLoad, &hooks, &HookContext::default()); // empty argv
    }

    #[test]
    fn bounded_wait() {
        let hooks = Hooks { on_exit: s(&["sleep", "10"]), ..Default::default() };
        let start = Instant::now();
        run_bounded(HookKind::OnExit, &hooks, &HookContext::default(), Duration::from_millis(200));
        assert!(start.elapsed() < Duration::from_secs(2));
    }

    #[test]
    fn env_reaches_child() {
        let dir = tempfile::tempdir().unwrap();
        let out = dir.path().join("env");
        let hooks = Hooks {
            on_exit: s(&["sh", "-c", &format!("echo $WOGE_EXIT_CODE:$WOGE_FORMAT > '{}'", out.display())]),
            ..Default::default()
        };
        let ctx = HookContext { exit_code: Some(1), format: Some("jpeg".into()), ..Default::default() };
        run_bounded(HookKind::OnExit, &hooks, &ctx, ON_EXIT_TIMEOUT);
        assert_eq!(std::fs::read_to_string(&out).unwrap().trim(), "1:jpeg");
    }
}
