defmodule PerplexicaWeb.Resolvers.ProviderResolver do
  @moduledoc "GraphQL resolvers for AI model provider operations."

  alias Perplexica.Models.Registry

  def list_providers(_parent, _args, _context) do
    providers =
      Registry.list_providers()
      |> Enum.map(fn p ->
        %{
          key: p.key,
          health: to_string(p.health),
          chat_models: p.module.chat_models(),
          embedding_models: p.module.embedding_models()
        }
      end)

    {:ok, providers}
  end
end
