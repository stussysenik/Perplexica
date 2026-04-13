# ── Build Stage: Redwood Frontend ──────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /app
RUN corepack enable && corepack prepare yarn@4.6.0 --activate
COPY redwood ./redwood
WORKDIR /app/redwood
# Build both api and web to ensure types are generated and build passes
RUN yarn install && yarn rw build
# Note: we only need the web/dist for Phoenix to serve

# ── Build Stage: Phoenix Backend ───────────────────────────────────
FROM elixir:1.17-slim AS backend-builder
RUN apt-get update -y && apt-get install -y build-essential git && apt-get clean
WORKDIR /app
RUN mix local.hex --force && mix local.rebar --force
ENV MIX_ENV="prod"
COPY phoenix/mix.exs phoenix/mix.lock ./
RUN mix deps.get --only $MIX_ENV && mkdir config
COPY phoenix/config/config.exs phoenix/config/${MIX_ENV}.exs phoenix/config/runtime.exs config/
RUN mix deps.compile
COPY phoenix/priv priv
COPY phoenix/lib lib
COPY phoenix/rel rel
# Copy built frontend to Phoenix priv/static
COPY --from=frontend-builder /app/redwood/web/dist/ priv/static/
RUN mix compile
RUN mix release

# ── Runtime Stage ──────────────────────────────────────────────────
FROM debian:bookworm-slim
RUN apt-get update -y && \
  apt-get install -y libstdc++6 openssl libncurses5 locales ca-certificates curl && \
  apt-get clean && rm -f /var/lib/apt/lists/*_*
RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && locale-gen
ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en
ENV LC_ALL en_US.UTF-8
WORKDIR /app
RUN chown nobody /app
ENV MIX_ENV="prod"
COPY --from=backend-builder --chown=nobody:root /app/_build/${MIX_ENV}/rel/perplexica ./

USER root
RUN chmod +x /app/bin/start.sh
USER nobody

# Expose Phoenix port
EXPOSE 8080
ENV PORT=8080
ENV PHX_SERVER=true
CMD ["/app/bin/start.sh"]
