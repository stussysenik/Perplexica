defmodule Perplexica.Uploads.Upload do
  @moduledoc """
  Ecto schema for the uploads table.

  Stores metadata about uploaded files (PDF, DOCX, TXT).
  The actual file content is processed into chunks with embeddings
  stored in the upload_chunks table.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}

  schema "uploads" do
    field :name, :string
    field :mime_type, :string
    field :size_bytes, :integer
    field :storage_key, :string

    has_many :chunks, Perplexica.Uploads.UploadChunk

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(upload, attrs) do
    upload
    |> cast(attrs, [:name, :mime_type, :size_bytes, :storage_key])
    |> validate_required([:name, :mime_type, :size_bytes, :storage_key])
  end
end
