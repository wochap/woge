{
  description = "woge — Wayland screenshot and image editor";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};

      libs = with pkgs; [ webkitgtk_4_1 gtk3 glib librsvg dbus openssl libsoup_3 ];

      woge = pkgs.callPackage ./nix/package.nix { };
    in
    {
      packages.${system}.default = woge;

      apps.${system}.default = {
        type = "app";
        program = "${woge}/bin/woge";
      };

      devShells.${system}.default = pkgs.mkShell {
        nativeBuildInputs = with pkgs; [ pkg-config nodejs cargo rustc rustfmt clippy cargo-tauri wl-clipboard librsvg ];
        buildInputs = libs;
        GDK_BACKEND = "wayland";
        XDG_DATA_DIRS = "${pkgs.gsettings-desktop-schemas}/share/gsettings-schemas/${pkgs.gsettings-desktop-schemas.name}:${pkgs.gtk3}/share/gsettings-schemas/${pkgs.gtk3.name}";
      };
    };
}
