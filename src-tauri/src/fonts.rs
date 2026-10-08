//! Installed font families via fontconfig (`fc-list : family`).

use std::process::Command;
use std::sync::OnceLock;

pub const BUNDLED: [&str; 2] = ["Inter Variable", "JetBrains Mono Variable"];

/// Split `fc-list : family` output (one comma-separated alias list per line), dedupe, sort.
pub fn parse_fc_list(out: &str) -> Vec<String> {
    let mut families: Vec<String> = out
        .lines()
        .flat_map(|l| l.split(','))
        .map(|f| f.trim().replace("\\-", "-"))
        .filter(|f| !f.is_empty())
        .collect();
    families.sort_by_key(|f| f.to_lowercase());
    families.dedup();
    families
}

/// Bundled families first, then the system list without duplicates of them.
pub fn with_bundled(system: Vec<String>) -> Vec<String> {
    let mut out: Vec<String> = BUNDLED.iter().map(|s| (*s).to_owned()).collect();
    out.extend(system.into_iter().filter(|f| !BUNDLED.contains(&f.as_str())));
    out
}

fn query() -> Vec<String> {
    match Command::new("fc-list").args([":", "family"]).output() {
        Ok(o) if o.status.success() => parse_fc_list(&String::from_utf8_lossy(&o.stdout)),
        Ok(o) => {
            tracing::warn!(status = %o.status, "fc-list failed; using bundled fonts only");
            Vec::new()
        }
        Err(e) => {
            tracing::warn!(error = %e, "fc-list unavailable; using bundled fonts only");
            Vec::new()
        }
    }
}

#[tauri::command]
pub async fn list_fonts() -> Vec<String> {
    static CACHE: OnceLock<Vec<String>> = OnceLock::new();
    if let Some(c) = CACHE.get() {
        return c.clone();
    }
    let list = tauri::async_runtime::spawn_blocking(|| with_bundled(query())).await.unwrap_or_else(|_| with_bundled(Vec::new()));
    CACHE.get_or_init(|| list).clone()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_and_dedupes() {
        let out = "DejaVu Sans\nDejaVu Sans,DejaVu Sans Condensed\nNoto Sans\\-Mono\n\nabc\n";
        let list = parse_fc_list(out);
        assert_eq!(list, vec!["abc", "DejaVu Sans", "DejaVu Sans Condensed", "Noto Sans-Mono"]);
        assert_eq!(list.iter().filter(|f| *f == "DejaVu Sans").count(), 1);
    }

    #[test]
    fn bundled_first() {
        let list = with_bundled(vec!["Inter Variable".into(), "DejaVu Sans".into()]);
        assert_eq!(list, vec!["Inter Variable", "JetBrains Mono Variable", "DejaVu Sans"]);
        assert_eq!(with_bundled(Vec::new()).len(), 2);
    }
}
