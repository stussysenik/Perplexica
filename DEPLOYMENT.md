# Perplexica Deployment Guide

This document describes how to deploy the resilient Perplexica architecture (Phoenix Backend + Redwood Frontend).

## Deployment Options

### 1. NixOS (Recommended for self-hosting)

We provide a Nix Flake that packages both the backend and frontend, along with a NixOS module for easy configuration.

#### Prerequisites
- A NixOS system (or a system with Nix and the NixOS module system).

#### Usage
Add this flake to your system configuration:

```nix
{
  inputs.perplexica.url = "github:youruser/perplexica"; # or use a local path

  outputs = { self, nixpkgs, perplexica, ... }: {
    nixosConfigurations.mysystem = nixpkgs.lib.nixosSystem {
      modules = [
        perplexica.nixosModules.default
        {
          services.perplexica = {
            enable = true;
            package = perplexica.packages.x86_64-linux.phoenix-app;
            frontendPackage = perplexica.packages.x86_64-linux.redwood-web;
            domain = "perplexica.example.com";
            envFile = "/etc/perplexica/secrets.env";
            database.enable = true; # Automatically manages PostgreSQL + pgvector
          };
        }
      ];
    };
  };
}
```

#### Secrets.env
Create a file at `/etc/perplexica/secrets.env` with your API keys:
```env
NVIDIA_NIM_API_KEY=your_key_here
BRAVE_SEARCH_API_KEY=your_key_here
# Optional:
GLM_API_KEY=your_key_here
```

### 2. Multi-Service Cloud (Railway + Vercel)

This is the architecture described in `PROGRESS.md`:
- **Backend (Phoenix)**: Deploy to [Railway](https://railway.app) or [Fly.io](https://fly.io).
- **Frontend (Redwood)**: Deploy to [Vercel](https://vercel.com).
- **Database**: PostgreSQL with `pgvector` extension.

#### Phoenix to Fly.io
```bash
cd phoenix
fly launch
fly secrets set NVIDIA_NIM_API_KEY=... BRAVE_SEARCH_API_KEY=...
```

#### Redwood to Vercel
Connect your repository to Vercel and set the root directory to `redwood`.
Set the following environment variables:
- `PHOENIX_URL`: The URL of your deployed Phoenix backend.

### 3. Docker Monolith (Legacy)

The root directory contains a `Dockerfile` and `docker-compose.yml` for the legacy Next.js version of Perplexica.

```bash
docker compose up -d
```

## Maintenance

### Database Migrations
For the Phoenix backend, migrations are handled by Ecto:
```bash
cd phoenix
mix ecto.migrate
```

### Updates
To update your NixOS deployment:
```bash
nix flake update
nixos-rebuild switch
```
