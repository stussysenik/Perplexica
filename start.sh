#!/bin/bash
export PORT=${PORT:-5000}
export HOSTNAME="0.0.0.0"
export NODE_ENV=production

node searxng-proxy.mjs &
PROXY_PID=$!

node .next/standalone/server.js
kill $PROXY_PID 2>/dev/null
