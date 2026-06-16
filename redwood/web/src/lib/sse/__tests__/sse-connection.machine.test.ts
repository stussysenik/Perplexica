/**
 * Unit tests for the xstate connection machine.
 *
 * Tests the full lifecycle: connect → subscribe → receive → error → retry → disconnect.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createActor } from 'xstate'
import { connectionMachine, type ConnectionContext } from '../sse-connection.machine'

function createMachine() {
  const actor = createActor(connectionMachine)
  actor.start()
  return actor
}

function expectState(actor: ReturnType<typeof createMachine>, state: string) {
  expect(actor.getSnapshot().value).toBe(state)
}

/**
 * Drive one full failure cycle deterministically:
 * connecting → TRANSPORT_FAILED → deciding → retrying → (flush backoff) → connecting.
 *
 * Reads the current backoffMs and advances fake time by exactly that amount so the
 * `retrying.after.backoffDelay` delayed transition fires and the machine re-enters
 * `connecting` on the (possibly downgraded) transport. If the failure pushed the
 * machine to `disconnected` instead, there is no pending timer and the advance is a
 * harmless no-op.
 */
function failOnce(actor: ReturnType<typeof createMachine>) {
  actor.send({ type: 'TRANSPORT_FAILED', error: 'boom' })
  vi.advanceTimersByTime(actor.getSnapshot().context.backoffMs)
}

describe('connectionMachine', () => {
  // Fake timers let us flush the machine's `after` backoff delays synchronously.
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('starts in disconnected state', () => {
      const actor = createMachine()
      expectState(actor, 'disconnected')
      expect(actor.getSnapshot().context.transport).toBe('sse')
    })

    it('has default context values', () => {
      const actor = createMachine()
      const ctx = actor.getSnapshot().context
      expect(ctx.attemptCount).toBe(0)
      expect(ctx.maxAttempts).toBe(10)
      expect(ctx.backoffMs).toBe(500)
      expect(ctx.sessionId).toBeNull()
      expect(ctx.lastError).toBeNull()
      expect(ctx.failuresOnCurrentTransport).toBe(0)
      expect(ctx.isStreaming).toBe(false)
    })
  })

  describe('happy path: CONNECT → receiving', () => {
    it('transitions through connecting → subscribing → receiving', () => {
      const actor = createMachine()

      actor.send({ type: 'CONNECT', sessionId: 'abc123', endpoint: 'http://localhost/sse' })
      expectState(actor, 'connecting')
      expect(actor.getSnapshot().context.sessionId).toBe('abc123')
      expect(actor.getSnapshot().context.endpoint).toBe('http://localhost/sse')

      actor.send({ type: 'TRANSPORT_CONNECTED' })
      expectState(actor, 'subscribing')

      actor.send({ type: 'SUBSCRIPTION_CONFIRMED' })
      expectState(actor, 'receiving')

      // Attempt counter reset once in receiving state
      expect(actor.getSnapshot().context.attemptCount).toBe(0)
    })
  })

  describe('error handling during connecting', () => {
    it('retries on transport failure', () => {
      const actor = createMachine()
      actor.send({ type: 'CONNECT', sessionId: 'abc', endpoint: 'http://x' })

      actor.send({ type: 'TRANSPORT_FAILED', error: 'Network error' })
      expect(actor.getSnapshot().context.lastError).toBe('Network error')
      expect(actor.getSnapshot().context.failuresOnCurrentTransport).toBe(1)

      // Should go to deciding → retrying (canRetry is true, attemptCount 1 < maxAttempts 10)
      // But in vitest, delayed transitions might need time to resolve
      // For the test, we check the deciding state first
    })

    it('gives up and disconnects once max attempts are exhausted', () => {
      const actor = createMachine()
      actor.send({ type: 'CONNECT', sessionId: 'abc', endpoint: 'http://x' })

      // maxAttempts is 10. Each failure cycles connecting → deciding → retrying →
      // connecting (incrementing attemptCount). Once attemptCount reaches the cap and
      // no further downgrade is available, `deciding` falls through to `disconnected`.
      for (let i = 0; i < 10; i++) {
        failOnce(actor)
      }

      expectState(actor, 'disconnected')
      // Entering `disconnected` runs `resetConnection`, clearing transport/attempts.
      expect(actor.getSnapshot().context.attemptCount).toBe(0)
      expect(actor.getSnapshot().context.transport).toBe('sse')
    })
  })

  describe('transport upgrade/downgrade', () => {
    it('downgrades sse → websocket after exactly 3 consecutive failures', () => {
      const actor = createMachine()
      actor.send({ type: 'CONNECT', sessionId: 'abc', endpoint: 'http://x' })
      expect(actor.getSnapshot().context.transport).toBe('sse')

      failOnce(actor)
      expect(actor.getSnapshot().context.transport).toBe('sse')
      expect(actor.getSnapshot().context.failuresOnCurrentTransport).toBe(1)

      failOnce(actor)
      expect(actor.getSnapshot().context.transport).toBe('sse')
      expect(actor.getSnapshot().context.failuresOnCurrentTransport).toBe(2)

      // The 3rd failure crosses the shouldDowngrade threshold (>= 3).
      failOnce(actor)
      expect(actor.getSnapshot().context.transport).toBe('websocket')
      // Regression guard: the per-transport failure counter must reset on downgrade,
      // otherwise the next transport would downgrade again on its very first failure.
      expect(actor.getSnapshot().context.failuresOnCurrentTransport).toBe(0)
    })

    it('downgrade chain: sse → websocket → polling, then stays on polling', () => {
      const actor = createMachine()
      actor.send({ type: 'CONNECT', sessionId: 'abc', endpoint: 'http://x' })
      expect(actor.getSnapshot().context.transport).toBe('sse')

      // 3 failures: sse → websocket
      failOnce(actor)
      failOnce(actor)
      failOnce(actor)
      expect(actor.getSnapshot().context.transport).toBe('websocket')

      // 3 more failures: websocket → polling
      failOnce(actor)
      failOnce(actor)
      failOnce(actor)
      expect(actor.getSnapshot().context.transport).toBe('polling')

      // polling is the terminal fallback — further failures keep it on polling
      // (downgradeTransport maps polling → polling) and reset the counter each cycle.
      failOnce(actor)
      failOnce(actor)
      failOnce(actor)
      expect(actor.getSnapshot().context.transport).toBe('polling')
    })
  })

  describe('session completion', () => {
    it('returns to disconnected on SESSION_COMPLETE', () => {
      const actor = createMachine()
      actor.send({ type: 'CONNECT', sessionId: 'abc', endpoint: 'http://x' })
      actor.send({ type: 'TRANSPORT_CONNECTED' })
      actor.send({ type: 'SUBSCRIPTION_CONFIRMED' })
      expectState(actor, 'receiving')

      actor.send({ type: 'SESSION_COMPLETE' })
      expectState(actor, 'disconnected')
    })
  })

  describe('DISCONNECT event', () => {
    it('goes to disconnected from any retry state', () => {
      const actor = createMachine()
      actor.send({ type: 'CONNECT', sessionId: 'abc', endpoint: 'http://x' })
      actor.send({ type: 'TRANSPORT_FAILED', error: 'fail' })

      actor.send({ type: 'DISCONNECT' })
      expectState(actor, 'disconnected')
    })
  })
})
