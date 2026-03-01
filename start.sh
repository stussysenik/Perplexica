#!/bin/bash
node searxng-proxy.mjs &
PROXY_PID=$!
npx next dev --webpack -p 5000
kill $PROXY_PID 2>/dev/null
