defmodule Perplexica.SharedLink do
  @moduledoc """
  Ecto schema for the shared_links table.

  A shared link makes a single message publicly accessible via a short,
  URL-safe slug. Links may optionally expire.

  The slug is an 8-character Base64url string generated from 6 bytes of
  cryptographically strong randomness, yielding ~2.8 billion unique values.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}

  schema "shared_links" do
    field :slug, :string
    field :expires_at, :utc_datetime_usec

    belongs_to :message, Perplexica.Message

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(shared_link, attrs) do
    shared_link
    |> cast(attrs, [:message_id, :slug, :expires_at])
    |> validate_required([:message_id])
    |> maybe_generate_slug()
    |> unique_constraint(:slug)
    |> foreign_key_constraint(:message_id)
  end

  # Generates an 8-character URL-safe slug from 6 random bytes when one is
  # not already present. The Base64url alphabet (A-Z, a-z, 0-9, -, _) makes
  # the slug safe for use in URLs without encoding.
  defp maybe_generate_slug(changeset) do
    case get_field(changeset, :slug) do
      nil ->
        slug = :crypto.strong_rand_bytes(6) |> Base.url_encode64(padding: false)
        put_change(changeset, :slug, slug)

      _existing ->
        changeset
    end
  end
end
