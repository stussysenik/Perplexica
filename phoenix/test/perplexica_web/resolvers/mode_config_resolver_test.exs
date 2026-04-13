defmodule PerplexicaWeb.Resolvers.ModeConfigResolverTest do
  use Perplexica.DataCase, async: false

  alias PerplexicaWeb.Resolvers.ModeConfigResolver
  alias Perplexica.Search.ModeConfig

  setup do
    ModeConfig.warm_cache()
    on_exit(fn ->
      ModeConfig.reset("speed")
      ModeConfig.reset("balanced")
      ModeConfig.reset("quality")
    end)
    :ok
  end

  describe "list/3" do
    test "returns three items ordered speed → balanced → quality" do
      assert {:ok, configs} = ModeConfigResolver.list(nil, %{}, %{})
      assert length(configs) == 3
      assert Enum.map(configs, & &1.mode) == ["speed", "balanced", "quality"]
    end

    test "each item carries max_iterations and budget_ms" do
      {:ok, configs} = ModeConfigResolver.list(nil, %{}, %{})

      for c <- configs do
        assert is_integer(c.max_iterations)
        assert is_integer(c.budget_ms)
      end
    end
  end

  describe "update/3" do
    test "persists and refreshes cache" do
      args = %{mode: "balanced", max_iterations: 10, budget_ms: 20_000}
      assert {:ok, payload} = ModeConfigResolver.update(nil, args, %{})
      assert payload.mode == "balanced"
      assert payload.max_iterations == 10
      assert payload.budget_ms == 20_000

      assert ModeConfig.get("balanced").max_iterations == 10
    end

    test "surfaces validation errors" do
      args = %{mode: "speed", max_iterations: 999, budget_ms: 7_000}
      assert {:error, err} = ModeConfigResolver.update(nil, args, %{})
      assert Keyword.get(err, :message) == "validation failed"
      ext = Keyword.get(err, :extensions)
      assert ext.code == "validation_failed"
      assert Map.has_key?(ext.fields, "max_iterations")
    end

    test "rejects invalid mode" do
      args = %{mode: "ultra", max_iterations: 5, budget_ms: 10_000}
      assert {:error, err} = ModeConfigResolver.update(nil, args, %{})
      ext = Keyword.get(err, :extensions)
      assert Map.has_key?(ext.fields, "mode")
    end
  end

  describe "reset/3" do
    test "restores defaults" do
      {:ok, _} = ModeConfigResolver.update(nil, %{mode: "quality", max_iterations: 10, budget_ms: 20_000}, %{})
      assert {:ok, payload} = ModeConfigResolver.reset(nil, %{mode: "quality"}, %{})
      assert payload.max_iterations == 25
      assert payload.budget_ms == 35_000
    end
  end
end
