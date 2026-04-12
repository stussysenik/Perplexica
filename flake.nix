{
  description = "Perplexica - Resilient AI Search Engine";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [ ];
        };

        nodejs = pkgs.nodejs_20;
        yarn = pkgs.yarn.override { inherit nodejs; };

        # Phoenix Backend
        phoenix-app = pkgs.beam.packages.erlang_27.buildMix {
          pname = "perplexica-backend";
          version = "0.1.0";
          src = ./phoenix;

          # We'll need to provide the mix dependencies
          # For a real flake, we would use a tool like mix2nix or provide fixed-output deps
          # For now, we'll assume the user might want to use nix-shell or we provide a devShell
          
          # In a real scenario, we'd do:
          # mixFodHash = "..."; 
        };

        # Redwood Frontend (Static)
        redwood-web = pkgs.stdenv.mkDerivation {
          pname = "perplexica-frontend";
          version = "0.1.0";
          src = ./redwood;

          nativeBuildInputs = [ nodejs yarn ];

          buildPhase = ''
            export HOME=$TMPDIR
            export PHOENIX_URL="" 
            yarn install --immutable
            yarn rw build web
          '';

          installPhase = ''
            mkdir -p $out/var/www/perplexica
            cp -r web/dist/* $out/var/www/perplexica/
          '';
        };

      in
      {
        packages = {
          inherit phoenix-app redwood-web;
          default = phoenix-app;
        };

        devShells.default = pkgs.mkShell {
          buildInputs = [
            pkgs.elixir_1_17
            pkgs.erlang_27
            nodejs
            yarn
            pkgs.postgresql_16
            pkgs.postgresql16Packages.pgvector
          ];

          shellHook = ''
            export PHOENIX_URL="http://localhost:4000"
            echo "Perplexica Dev Shell"
            echo "Phoenix: cd phoenix && mix phx.server"
            echo "Redwood: cd redwood && yarn rw dev web"
          '';
        };
      }
    ) // {
      nixosModules.default = import ./nixos/default.nix;
    };
}
