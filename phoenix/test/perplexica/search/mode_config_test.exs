defmodule Perplexica.Search.ModeConfigTest do
  use Perplexica.DataCase, async: false

  alias Perplexica.Search.ModeConfig

  setup do
    # Re-warm from DB (migrations ran via the sandbox already).
    ModeConfig.warm_cache()
    :ok
  end

  describe "warm_cache/0 + get_all/0" do
    test "caches the three default modes" do
      all = ModeConfig.get_all()
      assert Map.has_key?(all, "speed")
      assert Map.has_key?(all, "balanced")
      assert Map.has_key?(all, "quality")
    end

    test "each entry has max_iterations and budget_ms" do
      for {_mode, config} <- ModeConfig.get_all() do
        assert is_integer(config.max_iterations)
        assert is_integer(config.budget_ms)
      end
    end
  end

  describe "get/1" do
    test "returns a specific mode's config" do
      config = ModeConfig.get("balanced")
      assert config.max_iterations == 6
      assert config.budget_ms == 16_000
    end

    test "unknown mode falls back to balanced defaults" do
      config = ModeConfig.get("definitely_not_a_mode")
      assert config.max_iterations == 6
      assert config.budget_ms == 16_000
    end
  end

  describe "update/2" do
    test "upserts and refreshes cache" do
      assert {:ok, row} =
               ModeConfig.update("quality", %{max_iterations: 10, budget_ms: 20_000})

      assert row.max_iterations == 10
      assert row.budget_ms == 20_000

      cached = ModeConfig.get("quality")
      assert cached.max_iterations == 10
      assert cached.budget_ms == 20_000
    end

    test "rejects max_iterations out of range" do
      assert {:error, errors} =
               ModeConfig.update("speed", %{max_iterations: 100, budget_ms: 7_000})

      assert Keyword.has_key?(errors, :max_iterations)
    end

    test "rejects budget_ms out of range" do
      assert {:error, errors} =
               ModeConfig.update("speed", %{max_iterations: 2, budget_ms: 500})

      assert Keyword.has_key?(errors, :budget_ms)
    end

    test "rejects invalid mode" do
      assert {:error, errors} =
               ModeConfig.update("ultra", %{max_iterations: 5, budget_ms: 10_000})

      assert Keyword.has_key?(errors, :mode)
    end
  end

  describe "reset/1" do
    test "restores a mode to seed defaults" do
      {:ok, _} = ModeConfig.update("quality", %{max_iterations: 10, budget_ms: 20_000})
      {:ok, row} = ModeConfig.reset("quality")
      assert row.max_iterations == 25
      assert row.budget_ms == 35_000
    end

    test "rejects unknown mode" do
      assert {:error, _} = ModeConfig.reset("ultra")
    end
  end
end
