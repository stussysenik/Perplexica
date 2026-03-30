defmodule Perplexica.SearchSources.RateLimiter do
  @moduledoc "ETS-backed rate limiter for external API calls."
  use Hammer, backend: :ets
end
