/**
 * Search Transport Orchestrator — manages the connection lifecycle for
 * real-time search event streaming using xstate as the decision machine.
 *
 * Transport priority: SSE → WebSocket → Polling
 *
 * The xstate connectionMachine decides which transport to use. Transports
 * fail over to the next after 3 consecutive failures on the current one.
 *
 * All events from any transport are normalized to SearchEvent and fed
 * through the same callback pipeline.
 */

import { createActor } from 'xstate'
import { connectionMachine, type TransportType } from './sse/sse-connection.machine'
import { createSseConnection } from './sse/sse-client'
import { subscribeToSearch, type SearchEvent } from './phoenix-ws'
import { phoenixGql } from './phoenix'

export { type SearchEvent } from './phoenix-ws'

interface TransportCallbacks {
  onEvent: (event: SearchEvent) => void
  onError: (error: string) => void
  onComplete: () => void
}

/**
 * Unified transport handle — returned by subscribeToSearchTransport.
 * Call unsubscribe() to tear down the connection.
 */
export interface TransportHandle {
  unsubscribe: () => void
}

/**
 * Subscribe to search events using the optimal transport.
 *
 * The xstate machine manages transport selection and failover:
 *   1. SSE (primary) — fetch-based, spec-compliant
 *   2. WebSocket (secondary) — Absinthe/Phoenix subscription
 *   3. Polling (tertiary) — HTTP GET every 2s with exponential backoff
 *
 * When a transport fails 3 times, it downgrades to the next.
 */
export function subscribeToSearchTransport(
  sessionId: string,
  chatId: string,
  messageId: string,
  phoenixBaseUrl: string,
  callbacks: TransportCallbacks,
): TransportHandle {
  let currentAbort: (() => void) | null = null
  let wsUnsubscribe: (() => void) | null = null
  let pollingActive = false
  let pollingCancel: AbortController | null = null
  let transportComplete = false
  let activationId = 0

  const actor = createActor(connectionMachine)
  actor.start()

  // Observe xstate transitions to know which transport to activate
  const sub = actor.subscribe((snapshot) => {
    if (transportComplete) return

    const ctx = snapshot.context
    const state = snapshot.value as string

    if (state === 'connecting') {
      activateTransport(ctx.transport as TransportType)
    }

    if (state === 'disconnected') {
      cleanup()
      callbacks.onComplete()
    }
  })

  function activateTransport(t: TransportType) {
    const id = ++activationId

    // Clean up previous transport
    if (currentAbort) currentAbort()
    if (wsUnsubscribe) wsUnsubscribe()

    switch (t) {
      case 'sse':
        activateSse(id)
        break
      case 'websocket':
        activateWebSocket(id)
        break
      case 'polling':
        activatePolling()
        break
    }
  }

  function activateSse(id: number) {
    const sseUrl = phoenixBaseUrl
      ? `${phoenixBaseUrl}/api/sse/search/${sessionId}`
      : `/api/sse/search/${sessionId}`

    const conn = createSseConnection(
      { url: sseUrl },
      (parsedEvent) => {
        // Parse SSE event data (JSON) into SearchEvent
        try {
          const event = JSON.parse(parsedEvent.data)
          // Enrich with timing info from event fields
          if (parsedEvent.id) {
            event.emittedAtMs = event.emittedAtMs ?? undefined
          }
          callbacks.onEvent(event as SearchEvent)
          actor.send({ type: 'SUBSCRIPTION_CONFIRMED' })

          if (parsedEvent.event === 'message_end' || event.type === 'message_end') {
            transportComplete = true
            actor.send({ type: 'SESSION_COMPLETE' })
          }
        } catch {
          // Non-JSON SSE events (e.g., keepalive) — ignore
        }
      },
      (error) => {
        actor.send({ type: 'TRANSPORT_FAILED', error })
        callbacks.onError(error)
      },
      () => {
        if (!transportComplete) {
          actor.send({ type: 'TRANSPORT_LOST' })
        }
      },
    )

    currentAbort = conn.abort

    // After brief delay, if connection is still active, mark as connected
    setTimeout(() => {
      const snapshot = actor.getSnapshot()
      if (
        activationId === id &&
        snapshot.value === 'connecting' &&
        activeTransport() === 'sse'
      ) {
        actor.send({ type: 'TRANSPORT_CONNECTED' })
      }
    }, 1000)
  }

  function activateWebSocket(id: number) {
    wsUnsubscribe = subscribeToSearch(sessionId, {
      onEvent: (event: SearchEvent) => {
        actor.send({ type: 'SUBSCRIPTION_CONFIRMED' })
        callbacks.onEvent(event)

        if (event.type === 'message_end') {
          transportComplete = true
          actor.send({ type: 'SESSION_COMPLETE' })
        }
      },
      onError: (error) => {
        actor.send({ type: 'TRANSPORT_FAILED', error: error.message })
        callbacks.onError(error.message)
      },
      onComplete: () => {
        if (!transportComplete) {
          actor.send({ type: 'TRANSPORT_LOST' })
        }
      },
    })

    setTimeout(() => {
      const snapshot = actor.getSnapshot()
      if (
        activationId === id &&
        snapshot.value === 'connecting' &&
        activeTransport() === 'websocket'
      ) {
        actor.send({ type: 'TRANSPORT_CONNECTED' })
      }
    }, 1000)
  }

  function activatePolling() {
    if (pollingActive) return
    pollingActive = true
    pollingCancel = new AbortController()

    let attempt = 0
    const maxAttempts = 40
    const baseDelay = 2000

    const poll = async () => {
      while (attempt < maxAttempts && !pollingCancel!.signal.aborted) {
        const delay = Math.min(baseDelay * Math.pow(1.5, attempt), 15_000)
        await new Promise((r) => setTimeout(r, delay))
        attempt++

        try {
          const res = await phoenixGql(`{
            messages(chatId: ${JSON.stringify(chatId)}) {
              messageId status responseBlocks
            }
          }`)

          const msg = res.data.messages?.find((m: any) => m.messageId === messageId)
          if (!msg) continue

          if (msg.status === 'completed' && msg.responseBlocks) {
            const blocks = msg.responseBlocks
            const sourceBlock = blocks.find((b: any) => b.type === 'source')
            const textBlock = blocks.find((b: any) => b.type === 'text')

            callbacks.onEvent({
              type: 'block',
              block: { type: 'source', data: sourceBlock?.data || [] },
            })

            callbacks.onEvent({
              type: 'block',
              block: { type: 'text', data: textBlock?.data || '' },
            })

            callbacks.onEvent({ type: 'message_end' })
            transportComplete = true
            actor.send({ type: 'SESSION_COMPLETE' })
            return
          }

          if (msg.status === 'error') {
            callbacks.onEvent({
              type: 'error',
              data: 'Search encountered an error',
            })
            transportComplete = true
            actor.send({ type: 'SESSION_COMPLETE' })
            return
          }
        } catch {
          // Continue polling
        }
      }

      if (!transportComplete) {
        callbacks.onEvent({
          type: 'error',
          data: 'Search timed out',
        })
        transportComplete = true
        actor.send({ type: 'SESSION_COMPLETE' })
      }
    }

    poll()
  }

  function activeTransport(): TransportType | null {
    return actor.getSnapshot().context.transport
  }

  function cleanup() {
    activationId++
    if (currentAbort) {
      currentAbort()
      currentAbort = null
    }
    if (wsUnsubscribe) {
      wsUnsubscribe()
      wsUnsubscribe = null
    }
    if (pollingCancel) {
      pollingCancel.abort()
      pollingCancel = null
    }
    pollingActive = false
  }

  // Kick off: connect
  actor.send({
    type: 'CONNECT',
    sessionId,
    endpoint: phoenixBaseUrl || window.location.origin,
  })

  return {
    unsubscribe: () => {
      transportComplete = true
      cleanup()
      sub.unsubscribe()
      actor.stop()
    },
  }
}
