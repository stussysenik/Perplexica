#!/bin/sh
set -e

# ── Database URL fallback ────────────────────────────────────────────
# Support SUPABASE_CONNECTION_STRING as an alternative to DATABASE_URL
# so Coolify users can paste the Supabase connection string directly.
if [ -z "$DATABASE_URL" ] && [ -n "$SUPABASE_CONNECTION_STRING" ]; then
  echo "[start] Using SUPABASE_CONNECTION_STRING as DATABASE_URL"
  export DATABASE_URL="$SUPABASE_CONNECTION_STRING"
fi

# ── Wait for database (up to 30s) ────────────────────────────────────
if [ -n "$DATABASE_URL" ]; then
  echo "[start] Waiting for database…"
  for i in $(seq 1 30); do
    if /app/bin/perplexica eval '
      {:ok, _} = Ecto.Adapters.SQL.query(Perplexica.Repo, "SELECT 1", [])
    ' >/dev/null 2>&1; then
      echo "[start] Database ready after ${i}s"
      break
    fi
    if [ "$i" -eq 30 ]; then
      echo "[start] WARNING: Database not reachable after 30s, continuing anyway…"
    fi
    sleep 1
  done
fi

# ── Run migrations (idempotent — Ecto only runs pending) ─────────────
echo "[start] Running migrations…"
if /app/bin/perplexica eval "Perplexica.Release.migrate" >/dev/null 2>&1; then
  echo "[start] Migrations complete"
else
  echo "[start] WARNING: Migration step failed — continuing anyway so diagnostics remain available"
fi

# ── Start Phoenix ────────────────────────────────────────────────────
echo "[start] Starting Phoenix server on port ${PORT:-8080}…"
exec /app/bin/server
