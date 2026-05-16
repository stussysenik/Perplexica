# Infrastructure Documentation

## Server
- **Provider**: Hetzner Cloud
- **Model**: CPX22 (2 vCPU, 4GB RAM, 80GB SSD)
- **IP**: 178.105.136.131
- **Location**: Nuremberg, Germany (nbg1)
- **Hetzner API**: Token in `.env.local`

## DNS (Spaceship)
- **Registrar**: Spaceship (launch1.spaceship.net / launch2.spaceship.net)
- **API**: Token + Secret in `.env.local`

### DNS Records
| Domain | Type | Value |
|--------|------|-------|
| byoa.stussysenik.com | A | 178.105.136.131 |
| perplexica.stussysenik.com | A | 178.105.136.131 |

## Coolify
- **Version**: 4.0.0
- **Dashboard**: http://178.105.136.131:8000
- **Proxy**: Traefik v3.6 (ports 80, 443, 8080)
- **SSL**: Let's Encrypt via Traefik (auto-renewal)

## Deployed Applications

### 1. Perplexica (`perplexica.stussysenik.com`)
- **Container**: Coolify-managed (c6b5o3czv5n7erxsgu0ewdtf)
- **Stack**: Phoenix (Elixir) + RedwoodJS (React) SPA
- **Port**: 8080 (internal)
- **Database**: Supabase (remote) — `db.prhpdrfktooncxeoytfg.supabase.co`
- **Health**: `/health` endpoint
- **Auth**: GitHub OAuth (gated by allowlist)

### 2. BYOA (`byoa.stussysenik.com`)
- **Container**: byoa-app (standalone Docker, not Coolify-managed)
- **Stack**: RedwoodJS (React + GraphQL Yoga API)
- **Ports**: 8910 (web), 8911 (API, internal only)
- **Database**: pgvector container (local) — database `byoa` on `s1w2j8oxy05xdomwpyf8m2oc`
- **Supabase**: Remote (for additional features)
- **Source**: `/app/byoa/` on VPS

## Deploying New Apps

### To add a new DNS record:
```bash
# Use Spaceship API to add A record
# Or manually via Spaceship dashboard
```

### To deploy a new Docker app:
```bash
# 1. Build locally or on VPS
docker build -t myapp:latest .

# 2. Run with Traefik labels
docker run -d \
  --name myapp \
  --network coolify \
  --restart unless-stopped \
  --label 'traefik.enable=true' \
  --label 'traefik.http.routers.myapp.rule=Host(`myapp.stussysenik.com`)' \
  --label 'traefik.http.services.myapp.loadbalancer.server.port=<port>' \
  --label 'traefik.http.routers.myapp.tls.certresolver=letsencrypt' \
  --label 'traefik.http.routers.myapp.tls=true' \
  myapp:latest
```

## Resource Limits
- **RAM**: ~2.3GB available (out of 3.7GB) for new apps
- **Disk**: ~52GB free (out of 75GB)
- **Comfortable capacity**: 5-8 additional small apps or 3-5 medium apps

## SSH Access
```bash
ssh hetzner
# Or: ssh -i ~/.ssh/opencode_deploy root@178.105.136.131
```

## Database
- **pgvector**: `postgresql://perplexica:p3rpl3x1ca_DB_2026!@10.0.1.x:5432/`
  - Database `perplexica_prod` — Perplexica app
  - Database `byoa` — BYOA app
- **Supabase**: `postgresql://postgres:***@db.prhpdrfktooncxeoytfg.supabase.co:5432/postgres`

## Maintenance

### Restart BYOA:
```bash
ssh hetzner "docker restart byoa-app"
```

### Rebuild BYOA:
```bash
# Sync latest code
rsync -avz --exclude 'node_modules' --exclude '.git' \
  ~/Desktop/redwood-mymind-clone-web/ root@178.105.136.131:/app/byoa/
# Rebuild
ssh hetzner "cd /app/byoa && docker build -t byoa-app:latest . && docker rm -f byoa-app && docker run -d ..."
```

### View logs:
```bash
ssh hetzner "docker logs byoa-app --tail 50"
ssh hetzner "docker logs c6b5o3czv5n7erxsgu0ewdtf-233403678168 --tail 50"
```

### Coolify dashboard:
http://178.105.136.131:8000 (user: s3nik / senik456@gmail.com)
