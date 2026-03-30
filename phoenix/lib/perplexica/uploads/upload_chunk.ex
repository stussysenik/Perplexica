defmodule Perplexica.Uploads.UploadChunk do
  @moduledoc """
  Ecto schema for the upload_chunks table.

  Each chunk represents a segment of an uploaded file (~512 chars)
  with its vector embedding (1024-dim from NV EmbedQA).
  Used for vector similarity search during the uploads_search action.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @foreign_key_type :binary_id

  schema "upload_chunks" do
    field :content, :string
    field :embedding, Pgvector.Ecto.Vector
    field :chunk_index, :integer

    belongs_to :upload, Perplexica.Uploads.Upload
  end

  def changeset(chunk, attrs) do
    chunk
    |> cast(attrs, [:upload_id, :content, :embedding, :chunk_index])
    |> validate_required([:upload_id, :content, :embedding, :chunk_index])
    |> foreign_key_constraint(:upload_id)
  end
end
