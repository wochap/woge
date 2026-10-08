# shell-completions Specification

## Purpose
Shell completion support: the embedded zsh script, the `--completions` flag that prints it, drift checks against the clap definition and installation through the Nix package.

## Requirements

### Requirement: Built-in zsh completion script
The binary SHALL embed one hand-written zsh completion script `_woge`, starting with `#compdef woge`. It SHALL complete every clap flag in short and long form. Enum flags (`--theme`, `--format`, `--on-save`, `--completions`) SHALL complete their values with a short description each. `INPUT` SHALL complete image files only (png, jpg, jpeg, webp, matched case-insensitively), directories, and `-` for stdin. `-o/--output` SHALL complete any file. `INPUT` and `--clipboard` SHALL exclude each other.

#### Scenario: Image-only input
- **WHEN** the user types `woge <Tab>` in a directory holding `a.png`, `B.JPG` and `notes.txt`
- **THEN** `a.png` and `B.JPG` are offered and `notes.txt` is not

#### Scenario: Enum values
- **WHEN** the user types `woge --theme <Tab>`
- **THEN** `auto`, `mocha` and `latte` are offered with descriptions

#### Scenario: Mutual exclusion
- **WHEN** the user has typed `woge --clipboard ` and presses Tab
- **THEN** no input files are offered

### Requirement: Dual-mode loading
The script SHALL work both when autoloaded from `fpath` and when sourced or eval'd, including through `zsh-defer`. When autoloaded, the first Tab SHALL already complete. When eval'd, it SHALL register itself with `compdef`.

#### Scenario: Autoload from fpath
- **WHEN** `_woge` sits in a directory on `fpath`, `compinit` has run, and the user types `woge --th<Tab>` for the first time
- **THEN** it completes to `--theme`

#### Scenario: Eval after compinit
- **WHEN** `eval "$(woge --completions zsh)"` runs after `compinit`
- **THEN** `woge --th<Tab>` completes to `--theme`

### Requirement: Completions flag
The CLI SHALL accept `--completions <SHELL>`, listed in `--help`, where `SHELL` accepts only `zsh`. It SHALL print the embedded script to stdout byte for byte and exit 0, without needing a display, config file or network. Any other value SHALL fail with clap's usage error and exit 2.

#### Scenario: Print zsh script
- **WHEN** `woge --completions zsh` runs
- **THEN** stdout equals the embedded `_woge` file and the exit status is 0

#### Scenario: Unsupported shell
- **WHEN** `woge --completions fish` runs
- **THEN** clap reports an invalid value and the process exits 2

### Requirement: No drift from the CLI
A test SHALL check that every argument clap defines, including `--help` and `--version`, appears in the embedded script by its long flag and, if it has one, its short flag.

#### Scenario: Undocumented flag
- **WHEN** a new clap flag is added without updating `_woge`
- **THEN** `cargo test` fails and names the missing flag

### Requirement: Nix package installs completions by default
The flake's default package SHALL install `share/zsh/site-functions/_woge`. The package SHALL be overridable with `withZshCompletion = false`, which leaves the file out.

#### Scenario: Default build
- **WHEN** `nix build` runs
- **THEN** `result/share/zsh/site-functions/_woge` exists and matches the embedded script

#### Scenario: Opt out
- **WHEN** the package is built with `.override { withZshCompletion = false; }`
- **THEN** no `share/zsh` directory is installed and `woge --completions zsh` still works
