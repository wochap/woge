{
  description = "woge — Wayland screenshot and image editor";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};

      nativeTools = with pkgs; [ pkg-config wrapGAppsHook3 nodejs cargo-tauri.hook ];
      libs = with pkgs; [ webkitgtk_4_1 gtk3 glib librsvg dbus openssl libsoup_3 ];
      runtimePath = pkgs.lib.makeBinPath [ pkgs.wl-clipboard pkgs.fontconfig ];

      woge = pkgs.rustPlatform.buildRustPackage {
        pname = "woge";
        version = "0.1.0";
        src = ./.;

        cargoRoot = "src-tauri";
        buildAndTestSubdir = "src-tauri";
        cargoLock.lockFile = ./src-tauri/Cargo.lock;

        npmDeps = pkgs.fetchNpmDeps {
          name = "woge-npm-deps";
          src = ./.;
          hash = "sha256-Jm9CuP78SriWAqAUX6q5RrD9mVrE9+S3WuXVw1lsNYM=";
        };

        nativeBuildInputs = nativeTools ++ [ pkgs.npmHooks.npmConfigHook ];
        buildInputs = libs;

        # Tests need a Wayland socket and run via `npm run test:rust` in the dev shell.
        doCheck = false;

        preFixup = ''
          gappsWrapperArgs+=(
            --set GDK_BACKEND wayland
            --prefix PATH : ${runtimePath}
          )
        '';

        meta = {
          description = "Wayland screenshot and image editor";
          mainProgram = "woge";
          platforms = [ system ];
        };
      };
    in
    {
      packages.${system}.default = woge;

      apps.${system}.default = {
        type = "app";
        program = "${woge}/bin/woge";
      };

      devShells.${system}.default = pkgs.mkShell {
        nativeBuildInputs = with pkgs; [ pkg-config nodejs cargo rustc rustfmt clippy cargo-tauri wl-clipboard imagemagick ];
        buildInputs = libs;
        GDK_BACKEND = "wayland";
        XDG_DATA_DIRS = "${pkgs.gsettings-desktop-schemas}/share/gsettings-schemas/${pkgs.gsettings-desktop-schemas.name}:${pkgs.gtk3}/share/gsettings-schemas/${pkgs.gtk3.name}";
      };
    };
}
