{ config, lib, pkgs, ... }:

let
  cfg = config.services.perplexica;
in
{
  options.services.perplexica = {
    enable = lib.mkEnableOption "Perplexica Search Engine";

    package = lib.mkOption {
      type = lib.types.package;
      description = "The Perplexica Phoenix backend package.";
    };

    frontendPackage = lib.mkOption {
      type = lib.types.package;
      description = "The Perplexica Redwood frontend (static) package.";
    };

    port = lib.mkOption {
      type = lib.types.port;
      default = 4000;
      description = "Internal port for the Phoenix backend.";
    };

    envFile = lib.mkOption {
      type = lib.types.path;
      description = "Path to environment file containing secrets (NVIDIA_NIM_API_KEY, etc.)";
    };

    domain = lib.mkOption {
      type = lib.types.str;
      default = "localhost";
      description = "The domain name Perplexica will be served on.";
    };

    database = {
      enable = lib.mkOption {
        type = lib.types.bool;
        default = true;
        description = "Whether to manage the PostgreSQL database automatically.";
      };
      package = lib.mkOption {
        type = lib.types.package;
        default = pkgs.postgresql_16.withPackages (p: [ p.pgvector ]);
        description = "The PostgreSQL package to use.";
      };
    };
  };

  config = lib.mkIf cfg.enable {
    # 1. PostgreSQL Database
    services.postgresql = lib.mkIf cfg.database.enable {
      enable = true;
      package = cfg.database.package;
      ensureDatabases = [ "perplexica_prod" ];
      ensureUsers = [{
        name = "perplexica";
        ensureDBOwnership = true;
      }];
      authentication = pkgs.lib.mkOverride 10 ''
        # TYPE  DATABASE        USER            ADDRESS                 METHOD
        local   all             perplexica                              trust
        local   all             all                                     trust
      '';
    };

    # 2. Phoenix Backend Service
    systemd.services.perplexica-backend = {
      description = "Perplexica Phoenix Backend";
      after = [ "network.target" "postgresql.service" ];
      wantedBy = [ "multi-user.target" ];

      serviceConfig = {
        ExecStart = "${cfg.package}/bin/perplexica start";
        Restart = "always";
        User = "perplexica";
        Group = "perplexica";
        EnvironmentFile = cfg.envFile;
        # Standard Phoenix production envs
        Environment = [
          "PORT=${toString cfg.port}"
          "PHX_SERVER=true"
          "PHX_HOST=${cfg.domain}"
          "CORS_ORIGINS=https://${cfg.domain}"
          "DATABASE_URL=postgresql://perplexica@localhost/perplexica_prod"
          "MIX_ENV=prod"
        ];
      };
    };

    # 3. Nginx Reverse Proxy & Frontend
    services.nginx = {
      enable = true;
      virtualHosts."${cfg.domain}" = {
        root = "${cfg.frontendPackage}/var/www/perplexica";
        
        # Static files (Redwood web)
        locations."/" = {
          tryFiles = "$uri $uri/ /index.html";
        };

        # API proxy to Phoenix
        locations."/api" = {
          proxyPass = "http://127.0.0.1:${toString cfg.port}";
          proxyWebsockets = true;
        };

        # Socket proxy for Absinthe subscriptions
        locations."/socket" = {
          proxyPass = "http://127.0.0.1:${toString cfg.port}/socket";
          proxyWebsockets = true;
        };
      };
    };

    # 4. Users and Groups
    users.users.perplexica = {
      isSystemUser = true;
      group = "perplexica";
    };
    users.groups.perplexica = {};
  };
}
