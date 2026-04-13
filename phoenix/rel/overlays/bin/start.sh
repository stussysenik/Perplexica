#!/bin/sh
set -e

# Run migrations
/app/bin/perplexica eval "Perplexica.Release.migrate"

# Start the Phoenix server
exec /app/bin/server
