defmodule PerplexicaWeb.CorsController do
  use PerplexicaWeb, :controller

  @doc """
  Handles CORS preflight (OPTIONS) requests.
  CORSPlug in the :api pipeline adds the Access-Control-* headers;
  this action just completes the response with 204 No Content.
  """
  def preflight(conn, _params), do: send_resp(conn, 204, "")
end
