{
  description = "Flow Command Center Production-Ready Environment";

  inputs = {
    nixpkgs.url = "github:Nixos/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_22
            pnpm
            postgresql_16
            process-compose
          ];

          shellHook = ''
            echo "⚡ Flow Command Center Environment Active ⚡"
            export TZ="Africa/Johannesburg"
            
            # Setup local postgres data directory if it doesn't exist
            if [ ! -d "./.nix-db" ]; then
              mkdir -p ./.nix-db
              initdb -D ./.nix-db --no-locale -E UTF8
            fi
          '';
        };
      });
}
