/**
 * Fetch-based SSE client using ReadableStream + spec-compliant parser.
 *
 * Unlike the browser EventSource API, this gives us full control over:
 * - HTTP method (supports POST for authenticated endpoints)
 * - Custom headers (auth tokens, etc.)
 * - Reconnection strategy (delegated to xstate machine)
 * - Parsing (uses our spec-compliant parser)
 */

import { parseSseBuffer, type ParsedSseEvent } from './sse-parser'

export interface SseClientConfig {
  url: string
  method?: 'GET' | 'POST'
  headers?: Record<string, string>
  body?: string
  signal?: AbortSignal
  credentials?: RequestCredentials
}

export interface SseStreamEvent {
  readonly _tag: 'SseEvent'
  readonly event: ParsedSseEvent
}

export interface SseStreamError {
  readonly _tag: 'SseStreamError'
  readonly error: string
  readonly statusCode?: number
}

export interface SseStreamComplete {
  readonly _tag: 'SseStreamComplete'
}

export type SseStreamMessage = SseStreamEvent | SseStreamError | SseStreamComplete

/**
 * Open an SSE stream to the given URL and emit events as they arrive.
 *
 * Returns a Promise that resolves when the stream ends or errors.
 * The onMessage callback is called for each parsed SSE event or error.
 *
 * Cancellation is handled via the AbortSignal in the config.
 */
export async function connectSseStream(
  config: SseClientConfig,
  onMessage: (msg: SseStreamMessage) => void,
): Promise<void> {
  const signal = config.signal ?? new AbortController().signal

  let response: Response
  try {
    response = await fetch(config.url, {
      method: config.method ?? 'GET',
      headers: {
        Accept: 'text/event-stream',
        ...(config.headers ?? {}),
      },
      body: config.body ?? undefined,
      signal,
      credentials: config.credentials ?? 'include',
    })
  } catch (err: unknown) {
    if (signal.aborted) {
      onMessage({ _tag: 'SseStreamComplete' })
      return
    }
    onMessage({
      _tag: 'SseStreamError',
      error: `SSE connection failed: ${err instanceof Error ? err.message : String(err)}`,
    })
    return
  }

  if (!response.ok) {
    onMessage({
      _tag: 'SseStreamError',
      error: `SSE server returned ${response.status}: ${response.statusText}`,
      statusCode: response.status,
    })
    return
  }

  const reader = response.body?.getReader()
  if (!reader) {
    onMessage({ _tag: 'SseStreamError', error: 'Response body is not readable' })
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      let readResult: ReadableStreamReadResult<Uint8Array>
      try {
        readResult = await reader.read()
      } catch (err: unknown) {
        const isAbort =
          signal.aborted ||
          (err instanceof DOMException && err.name === 'AbortError')
        if (isAbort) {
          onMessage({ _tag: 'SseStreamComplete' })
        } else {
          onMessage({
            _tag: 'SseStreamError',
            error: err instanceof Error ? err.message : String(err),
          })
        }
        break
      }

      if (readResult.done) {
        onMessage({ _tag: 'SseStreamComplete' })
        break
      }

      buffer += decoder.decode(readResult.value, { stream: true })

      const [events, remaining] = parseSseBuffer(buffer)
      buffer = remaining

      for (const evt of events) {
        onMessage({ _tag: 'SseEvent', event: evt })
      }
    }
  } finally {
    if (buffer.trim()) {
      const [events] = parseSseBuffer(buffer + '\n\n')
      for (const evt of events) {
        onMessage({ _tag: 'SseEvent', event: evt })
      }
    }
    try {
      reader.releaseLock()
    } catch {
      // Lock may already be released
    }
  }
}

/**
 * A simpler, callback-based SSE connector that wraps connectSseStream.
 * Runs the effect immediately and returns an abort function for cancellation.
 */
export function createSseConnection(
  config: SseClientConfig,
  onEvent: (event: ParsedSseEvent) => void,
  onError: (error: string, statusCode?: number) => void,
  onComplete: () => void,
): { abort: () => void } {
  const abortController = new AbortController()

  const cfg: SseClientConfig = {
    ...config,
    signal: abortController.signal,
  }

  // Fire-and-forget: start the stream
  connectSseStream(cfg, (msg) => {
    switch (msg._tag) {
      case 'SseEvent':
        onEvent(msg.event)
        break
      case 'SseStreamError':
        onError(msg.error, msg.statusCode)
        break
      case 'SseStreamComplete':
        onComplete()
        break
    }
  })

  return {
    abort: () => abortController.abort(),
  }
}
