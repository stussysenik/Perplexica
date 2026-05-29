/**
 * Spec-compliant SSE (Server-Sent Events) parser.
 *
 * Parses raw SSE text streams into structured events per the W3C SSE spec:
 * https://html.spec.whatwg.org/multipage/server-sent-events.html
 *
 * Pure synchronous functions — these can be wrapped in Effect.sync()
 * at the call site for integration with effect.ts pipelines.
 */

/**
 * A parsed SSE event ready for consumption by the application layer.
 */
export interface ParsedSseEvent {
  /** The event type (from `event:` field), defaults to "message" */
  event: string
  /** The data payload (from `data:` field(s)), joined by newlines */
  data: string
  /** The event ID (from `id:` field), if present */
  id: string | null
  /** The reconnection time in ms (from `retry:` field), if present */
  retry: number | null
}

/**
 * Structured error type for SSE parsing failures.
 */
export interface SseParseError {
  readonly _tag: 'SseParseError'
  readonly message: string
  readonly raw?: string
}

/**
 * Internal accumulator for building events as lines arrive.
 */
interface FieldAccumulator {
  event: string
  data: string[]
  id: string | null
  retry: number | null
}

const emptyAccumulator = (): FieldAccumulator => ({
  event: 'message',
  data: [],
  id: null,
  retry: null,
})

/**
 * Parse a raw SSE buffer into an array of ParsedSseEvent.
 *
 * Handles:
 * - Standard `data:`, `event:`, `id:`, `retry:` fields
 * - Multi-line `data:` fields joined with `\n`
 * - Empty lines (event separators via \n\n)
 * - Comments (`:` lines without field name)
 * - Partial/incomplete events (last event held in buffer)
 *
 * Returns a tuple of [completedEvents, remainingBuffer].
 */
export function parseSseBuffer(
  buffer: string,
): readonly [ParsedSseEvent[], string] {
  // SSE events are terminated by \n\n (blank line). Split on event
  // boundaries first, then parse each event block line-by-line.
  const parts = buffer.split('\n\n')

  // If the buffer doesn't end with \n\n, the last part is incomplete —
  // it stays in the buffer for the next chunk.
  const endsWithDoubleNewline = buffer.endsWith('\n\n')
  const completeParts = endsWithDoubleNewline ? parts : parts.slice(0, -1)
  const remaining = endsWithDoubleNewline ? '' : (parts[parts.length - 1] ?? '')

  const events: ParsedSseEvent[] = []

  for (const part of completeParts) {
    if (part.trim() === '') continue

    const acc = emptyAccumulator()
    const lines = part.split('\n')

    for (const line of lines) {
      if (line === '') continue

      if (line.startsWith(':')) {
        // Comment line — skip
        continue
      }

      const colonIdx = line.indexOf(':')
      if (colonIdx === -1) {
        // Field with no colon — treat as field name with empty value
        dispatchField(acc, line, '')
      } else {
        const field = line.slice(0, colonIdx)
        let value = line.slice(colonIdx + 1)
        if (value.startsWith(' ')) {
          value = value.slice(1)
        }
        dispatchField(acc, field, value)
      }
    }

    const event = flushAccumulator(acc)
    if (event !== null) {
      events.push(event)
    }
  }

  return [events, remaining] as const
}

function dispatchField(acc: FieldAccumulator, field: string, value: string): void {
  switch (field) {
    case 'event':
      acc.event = value
      break
    case 'data':
      acc.data.push(value)
      break
    case 'id':
      acc.id = value
      break
    case 'retry':
      acc.retry = parseRetry(value)
      break
    default:
      // Unknown fields are ignored per spec
      break
  }
}

function flushAccumulator(acc: FieldAccumulator): ParsedSseEvent | null {
  if (acc.data.length === 0) {
    return null
  }
  return {
    event: acc.event || 'message',
    data: acc.data.join('\n'),
    id: acc.id,
    retry: acc.retry,
  }
}

function hasData(acc: FieldAccumulator): boolean {
  return acc.data.length > 0
}

function parseRetry(value: string): number | null {
  const ms = parseInt(value, 10)
  return isNaN(ms) ? null : ms
}

/**
 * Serialize a ParsedSseEvent back to a spec-compliant SSE string.
 * Includes the trailing `\n\n` that terminates the event.
 */
export function serializeSseEvent(event: ParsedSseEvent): string {
  const parts: string[] = []

  if (event.id !== null) {
    parts.push(`id: ${event.id}`)
  }
  if (event.event !== 'message') {
    parts.push(`event: ${event.event}`)
  }
  if (event.retry !== null) {
    parts.push(`retry: ${event.retry}`)
  }

  for (const dataLine of event.data.split('\n')) {
    parts.push(`data: ${dataLine}`)
  }

  return parts.join('\n') + '\n\n'
}

/**
 * Serialize any JSON-serializable value as an SSE event.
 * The value is JSON-stringified and sent as the `data` field.
 */
export function serializeJsonSseEvent(
  eventType: string,
  payload: unknown,
  opts?: { id?: string; retry?: number },
): string {
  return serializeSseEvent({
    event: eventType,
    data: JSON.stringify(payload),
    id: opts?.id ?? null,
    retry: opts?.retry ?? null,
  })
}
