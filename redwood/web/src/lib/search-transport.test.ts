import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { subscribeToSearchTransport } from './search-transport'
import type { ParsedSseEvent } from './sse/sse-parser'

const mocks = vi.hoisted(() => ({
  sseConnections: [] as Array<{
    onEvent: (event: ParsedSseEvent) => void
    onError: (error: string, statusCode?: number) => void
    onComplete: () => void
    abort: ReturnType<typeof vi.fn>
  }>,
  wsConnections: [] as Array<{
    onEvent: (event: unknown) => void
    onError: (error: Error) => void
    onComplete: () => void
    unsubscribe: ReturnType<typeof vi.fn>
  }>,
  phoenixGql: vi.fn(),
}))

vi.mock('./sse/sse-client', () => ({
  createSseConnection: vi.fn((_config, onEvent, onError, onComplete) => {
    const connection = {
      onEvent,
      onError,
      onComplete,
      abort: vi.fn(),
    }
    mocks.sseConnections.push(connection)
    return { abort: connection.abort }
  }),
}))

vi.mock('./phoenix-ws', () => ({
  subscribeToSearch: vi.fn((_sessionId, callbacks) => {
    const connection = {
      onEvent: callbacks.onEvent,
      onError: callbacks.onError,
      onComplete: callbacks.onComplete,
      unsubscribe: vi.fn(),
    }
    mocks.wsConnections.push(connection)
    return connection.unsubscribe
  }),
}))

vi.mock('./phoenix', () => ({
  phoenixGql: mocks.phoenixGql,
}))

describe('subscribeToSearchTransport', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mocks.sseConnections.length = 0
    mocks.wsConnections.length = 0
    mocks.phoenixGql.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not reopen SSE when the connection advances to subscribing', () => {
    const callbacks = {
      onEvent: vi.fn(),
      onError: vi.fn(),
      onComplete: vi.fn(),
    }

    const handle = subscribeToSearchTransport(
      'session-1',
      'chat-1',
      'message-1',
      'http://phoenix.test',
      callbacks,
    )

    expect(mocks.sseConnections).toHaveLength(1)

    vi.advanceTimersByTime(1000)

    expect(mocks.sseConnections).toHaveLength(1)

    handle.unsubscribe()
  })

  it('requires three failures on each transport before downgrading again', () => {
    const callbacks = {
      onEvent: vi.fn(),
      onError: vi.fn(),
      onComplete: vi.fn(),
    }

    const handle = subscribeToSearchTransport(
      'session-2',
      'chat-2',
      'message-2',
      'http://phoenix.test',
      callbacks,
    )

    mocks.sseConnections[0].onError('sse failed 1')
    vi.advanceTimersByTime(1000)
    expect(mocks.sseConnections).toHaveLength(2)

    mocks.sseConnections[1].onError('sse failed 2')
    vi.advanceTimersByTime(2000)
    expect(mocks.sseConnections).toHaveLength(3)

    mocks.sseConnections[2].onError('sse failed 3')
    vi.advanceTimersByTime(4000)
    expect(mocks.wsConnections).toHaveLength(1)

    mocks.wsConnections[0].onError(new Error('ws failed 1'))
    vi.advanceTimersByTime(8000)

    expect(mocks.wsConnections).toHaveLength(2)
    expect(mocks.phoenixGql).not.toHaveBeenCalled()

    handle.unsubscribe()
  })
})
