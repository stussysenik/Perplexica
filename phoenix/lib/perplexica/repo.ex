defmodule Perplexica.Repo do
  use Ecto.Repo,
    otp_app: :perplexica,
    adapter: Ecto.Adapters.Postgres
end
