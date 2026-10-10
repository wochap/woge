{
  lib,
  rustPlatform,
  fetchNpmDeps,
  npmHooks,
  pkg-config,
  wrapGAppsHook3,
  nodejs,
  cargo-tauri,
  installShellFiles,
  webkitgtk_4_1,
  gtk3,
  glib,
  librsvg,
  dbus,
  openssl,
  libsoup_3,
  wl-clipboard,
  fontconfig,
  withZshCompletion ? true,
}:

rustPlatform.buildRustPackage {
  pname = "woge";
  version = "0.1.0";
  src = ../.;

  cargoRoot = "src-tauri";
  buildAndTestSubdir = "src-tauri";
  cargoLock.lockFile = ../src-tauri/Cargo.lock;

  npmDeps = fetchNpmDeps {
    name = "woge-npm-deps";
    src = ../.;
    hash = "sha256-Jm9CuP78SriWAqAUX6q5RrD9mVrE9+S3WuXVw1lsNYM=";
  };

  nativeBuildInputs = [
    pkg-config
    wrapGAppsHook3
    nodejs
    cargo-tauri.hook
    npmHooks.npmConfigHook
    installShellFiles
  ];
  buildInputs = [ webkitgtk_4_1 gtk3 glib librsvg dbus openssl libsoup_3 ];

  # Tests need a Wayland socket and run via `npm run test:rust` in the dev shell.
  doCheck = false;

  postInstall = ''
    for s in 16 32 48 64 128 256 512; do
      install -Dm644 src-tauri/icons/''${s}x''${s}.png $out/share/icons/hicolor/''${s}x''${s}/apps/woge.png
    done
    install -Dm644 src-tauri/icons/icon.svg $out/share/icons/hicolor/scalable/apps/woge.svg
    install -Dm644 share/applications/woge.desktop $out/share/applications/woge.desktop
  '' + lib.optionalString withZshCompletion ''
    installShellCompletion --cmd woge --zsh src-tauri/completions/_woge
  '';

  preFixup = ''
    gappsWrapperArgs+=(
      --set GDK_BACKEND wayland
      --prefix PATH : ${lib.makeBinPath [ wl-clipboard fontconfig ]}
    )
  '';

  meta = {
    description = "Wayland screenshot and image editor";
    mainProgram = "woge";
    platforms = [ "x86_64-linux" ];
  };
}
