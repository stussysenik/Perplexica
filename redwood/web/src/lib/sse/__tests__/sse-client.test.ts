/**
 * Unit tests for the SSE client (fetch-based, ReadableStream parser).
 *
 * Mocks fetch to return controlled SSE streams for testing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { connectSseStream, type SseStreamMessage } from '../sse-client'
import { serializeSseEvent, type ParsedSseEvent } from '../sse-parser'

/**
 * Creates a mock ReadableStream that emits SSE-formatted text chunks.
 */
function createMockSseStream(chunks: string[], delayMs = 0): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  let index = 0

  return new ReadableStream({
    async pull(controller) {
      if (index >= chunks.length) {
        controller.close()
        return
      }
      if (delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs))
      }
      controller.enqueue(encoder.encode(chunks[index]))
      index++
    },
  })
}

function createMockResponse(
  stream: ReadableStream<Uint8Array>,
  status = 200,
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    body: stream as unknown as ReadableStream<Uint8Array>,
    headers: new Headers({ 'Content-Type': 'text/event-stream' }),
    redirected: false,
    type: 'basic' as ResponseType,
    url: 'http://test/sse',
    clone: () => createMockResponse(stream, status),
    blob: () => Promise.resolve(new Blob()),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    formData: () => Promise.resolve(new FormData()),
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    bodyUsed: false,
  } as Response
}

describe('connectSseStream', () => {
  let messages: SseStreamMessage[]

  beforeEach(() => {
    messages = []
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function collect(msg: SseStreamMessage) {
    messages.push(msg)
  }

  it('receives a single SSE event', async () => {
    const event: ParsedSseEvent = {
      event: 'block',
      data: '{"type":"text"}',
      id: '1',
      retry: null,
    }
    const sseText = serializeSseEvent(event)
    const stream = createMockSseStream([sseText])
    const response = createMockResponse(stream)

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response)

    await connectSseStream({ url: 'http://test/sse' }, collect)


    const events = messages.filter((m) => m._tag === 'SseEvent')
    expect(events).toHaveLength(1)
    if (events[0]._tag === 'SseEvent') {
      expect(events[0].event.event).toBe('block')
      expect(events[0].event.data).toBe('{"type":"text"}')
      expect(events[0].event.id).toBe('1')
    }
  })

  it('receives multiple SSE events', async () => {
    const event1 = serializeSseEvent({ event: 'block', data: 'a', id: null, retry: null })
    const event2 = serializeSseEvent({ event: 'update', data: 'b', id: null, retry: null })
    const stream = createMockSseStream([event1 + event2])
    const response = createMockResponse(stream)

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response)

    await connectSseStream({ url: 'http://test/sse' }, collect)


    const events = messages.filter((m) => m._tag === 'SseEvent')
    expect(events).toHaveLength(2)
  })

  it('handles chunked event delivery', async () => {
    // Simulate a slow network where one event arrives in two chunks
    const stream = createMockSseStream(['data: hello\n\n', 'data: world\n\n'])
    const response = createMockResponse(stream)

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response)

    await connectSseStream({ url: 'http://test/sse' }, collect)


    const events = messages.filter((m) => m._tag === 'SseEvent')
    expect(events).toHaveLength(2)
    if (events[0]._tag === 'SseEvent') expect(events[0].event.data).toBe('hello')
    if (events[1]._tag === 'SseEvent') expect(events[1].event.data).toBe('world')
  })

  it('handles split events across chunks', async () => {
    // First chunk: "data: he" — second chunk: "llo\n\n"
    const event: ParsedSseEvent = { event: 'message', data: 'hello', id: null, retry: null }
    const fullEvent = serializeSseEvent(event) // "data: hello\n\n"

    const stream = createMockSseStream([
      fullEvent.substring(0, 10),
      fullEvent.substring(10),
    ])
    const response = createMockResponse(stream)

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response)

    await connectSseStream({ url: 'http://test/sse' }, collect)


    const events = messages.filter((m) => m._tag === 'SseEvent')
    expect(events).toHaveLength(1)
    if (events[0]._tag === 'SseEvent') {
      expect(events[0].event.data).toBe('hello')
    }
  })

  it('emits error on non-2xx response', async () => {
    const response = createMockResponse(createMockSseStream([]), 500)

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response)

    await connectSseStream({ url: 'http://test/sse' }, collect)


    const errors = messages.filter((m) => m._tag === 'SseStreamError')
    expect(errors).toHaveLength(1)
    if (errors[0]._tag === 'SseStreamError') {
      expect(errors[0].statusCode).toBe(500)
    }
  })

  it('emits error on fetch rejection', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network down'))

    await connectSseStream({ url: 'http://test/sse' }, collect)


    const errors = messages.filter((m) => m._tag === 'SseStreamError')
    expect(errors).toHaveLength(1)
    if (errors[0]._tag === 'SseStreamError') {
      expect(errors[0].error).toContain('Network down')
    }
  })

  it('handles abort signal (fetch rejection)', async () => {
    const controller = new AbortController()
    // Abort before fetch resolves — fetch will reject with AbortError
    controller.abort()

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new DOMException('The operation was aborted.', 'AbortError'),
    )

    await connectSseStream({ url: 'http://test/sse', signal: controller.signal }, collect)


    // When aborted before connection, SseStreamComplete is emitted
    const completes = messages.filter((m) => m._tag === 'SseStreamComplete')
    expect(completes).toHaveLength(1)
  })

  it('emits SseStreamComplete on stream end', async () => {
    const event = serializeSseEvent({ event: 'message', data: 'done', id: null, retry: null })
    const stream = createMockSseStream([event])
    const response = createMockResponse(stream)

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response)

    await connectSseStream({ url: 'http://test/sse' }, collect)


    const completes = messages.filter((m) => m._tag === 'SseStreamComplete')
    expect(completes).toHaveLength(1)
  })

  it('handles empty stream', async () => {
    const stream = createMockSseStream([])
    const response = createMockResponse(stream)

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response)

    await connectSseStream({ url: 'http://test/sse' }, collect)


    const events = messages.filter((m) => m._tag === 'SseEvent')
    expect(events).toHaveLength(0)
    const completes = messages.filter((m) => m._tag === 'SseStreamComplete')
    expect(completes).toHaveLength(1)
  })

  it('handles comments and empty events', async () => {
    const sseText = ': ping\n\ndata: real event\n\n'
    const stream = createMockSseStream([sseText])
    const response = createMockResponse(stream)

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response)

    await connectSseStream({ url: 'http://test/sse' }, collect)


    const events = messages.filter((m) => m._tag === 'SseEvent')
    expect(events).toHaveLength(1)
    if (events[0]._tag === 'SseEvent') {
      expect(events[0].event.data).toBe('real event')
    }
  })

  it('uses POST method when configured', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      createMockResponse(createMockSseStream([])),
    )

    await connectSseStream({ url: 'http://test/sse', method: 'POST', body: '{"query":"test"}' }, collect)


    expect(fetchSpy).toHaveBeenCalledWith(
      'http://test/sse',
      expect.objectContaining({
        method: 'POST',
        body: '{"query":"test"}',
      }),
    )
  })
})
