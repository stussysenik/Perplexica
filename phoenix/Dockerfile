# Use Elixir official image (stable, multi-arch)
FROM elixir:1.17-slim AS builder

RUN apt-get update -y && apt-get install -y build-essential git && apt-get clean

WORKDIR /app

RUN mix local.hex --force && mix local.rebar --force

ENV MIX_ENV="prod"

COPY mix.exs mix.lock ./
RUN mix deps.get --only $MIX_ENV && mkdir config

COPY config/config.exs config/${MIX_ENV}.exs config/runtime.exs config/
RUN mix deps.compile

COPY priv priv
COPY lib lib
COPY rel rel

RUN mix compile

RUN mix release

# ── Runtime Stage ────────────────────────────────────────────────────
FROM debian:bookworm-slim

RUN apt-get update -y && \
  apt-get install -y libstdc++6 openssl libncurses5 locales ca-certificates && \
  apt-get clean && rm -f /var/lib/apt/lists/*_*

RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && locale-gen

ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en
ENV LC_ALL en_US.UTF-8

WORKDIR /app

RUN chown nobody /app

ENV MIX_ENV="prod"

COPY --from=builder --chown=nobody:root /app/_build/${MIX_ENV}/rel/perplexica ./

USER nobody

CMD ["/app/bin/server"]
