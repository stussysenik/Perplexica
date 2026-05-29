/**
 * XState v5 finite-state machine for managing the search event transport layer.
 *
 * Models the lifecycle of real-time search connections:
 *
 *   disconnected → connecting → connected → subscribed → receiving
 *                                                         ↓
 *                                                    errored / disconnected
 *
 * Parent/child relationship: This machine is the parent. Child actors handle
 * the actual transport (SSE, WebSocket, polling). The machine decides which
 * transport to activate based on context (capabilities, failures).
 *
 * Single source of truth: All connection state lives in this machine's context.
 * UI components derive their display from `state.value` and `state.context`.
 */

import { setup, assign, fromPromise, raise } from 'xstate'

export type TransportType = 'sse' | 'websocket' | 'polling'

export interface ConnectionContext {
  sessionId: string | null
  transport: TransportType
  /** The URL endpoint for SSE/WS connections */
  endpoint: string | null
  /** Cumulative connection attempts in the current session */
  attemptCount: number
  /** Maximum reconnection attempts before giving up */
  maxAttempts: number
  /** Backoff delay in ms (grows with each attempt) */
  backoffMs: number
  /** When the current transition started (for timeout detection) */
  transitionStartedAt: number | null
  /** Error from the last failed attempt */
  lastError: string | null
  /** Number of consecutive transport failures (for transport upgrade/downgrade) */
  failuresOnCurrentTransport: number
  /** Whether the current transport supports streaming (SSE/WS do, polling doesn't) */
  isStreaming: boolean
}

export type ConnectionEvent =
  | { type: 'CONNECT'; sessionId: string; endpoint: string }
  | { type: 'DISCONNECT' }
  | { type: 'TRANSPORT_CONNECTED' }
  | { type: 'SUBSCRIPTION_CONFIRMED' }
  | { type: 'TRANSPORT_FAILED'; error: string }
  | { type: 'TRANSPORT_LOST' }
  | { type: 'SESSION_COMPLETE' }
  | { type: 'RETRY' }

export const connectionMachine = setup({
  types: {
    context: {} as ConnectionContext,
    events: {} as ConnectionEvent,
  },
  actions: {
    incrementAttempt: assign({
      attemptCount: ({ context }) => context.attemptCount + 1,
      backoffMs: ({ context }) => Math.min(context.backoffMs * 2, 30_000),
      transitionStartedAt: () => Date.now(),
    }),
    recordError: assign({
      lastError: ({ event }) => (event.type === 'TRANSPORT_FAILED' ? event.error : null),
      failuresOnCurrentTransport: ({ context }) => context.failuresOnCurrentTransport + 1,
    }),
    setSession: assign({
      sessionId: ({ event }) => (event.type === 'CONNECT' ? event.sessionId : null),
      endpoint: ({ event }) => (event.type === 'CONNECT' ? event.endpoint : null),
      attemptCount: () => 0,
      backoffMs: () => 500,
      failuresOnCurrentTransport: () => 0,
      transitionStartedAt: () => Date.now(),
      lastError: () => null,
    }),
    resetForRetry: assign({
      transitionStartedAt: () => Date.now(),
    }),
    markStreaming: assign({
      isStreaming: ({ context }) => context.transport !== 'polling',
    }),
    downgradeTransport: assign({
      transport: ({ context }) => downgradeTransport(context.transport),
    }),
    resetConnection: assign({
      sessionId: () => null,
      endpoint: () => null,
      attemptCount: () => 0,
      backoffMs: () => 500,
      failuresOnCurrentTransport: () => 0,
      transitionStartedAt: () => null,
      lastError: () => null,
      isStreaming: () => false,
      transport: () => 'sse' as TransportType,
    }),
  },
  guards: {
    canRetry: ({ context }) => context.attemptCount < context.maxAttempts,
    shouldDowngrade: ({ context }) => context.failuresOnCurrentTransport >= 3,
  },
  delays: {
    backoffDelay: ({ context }) => context.backoffMs,
  },
}).createMachine({
  id: 'searchConnection',
  initial: 'disconnected',
  context: {
    sessionId: null,
    transport: 'sse',
    endpoint: null,
    attemptCount: 0,
    maxAttempts: 10,
    backoffMs: 500,
    transitionStartedAt: null,
    lastError: null,
    failuresOnCurrentTransport: 0,
    isStreaming: false,
  },
  states: {
    disconnected: {
      entry: 'resetConnection',
      on: {
        CONNECT: {
          target: 'connecting',
          actions: 'setSession',
        },
      },
    },

    connecting: {
      entry: ['incrementAttempt', 'markStreaming'],
      on: {
        TRANSPORT_CONNECTED: {
          target: 'subscribing',
        },
        TRANSPORT_FAILED: {
          actions: 'recordError',
          target: 'deciding',
        },
      },
    },

    subscribing: {
      entry: 'markStreaming',
      on: {
        SUBSCRIPTION_CONFIRMED: {
          target: 'receiving',
        },
        TRANSPORT_FAILED: {
          actions: 'recordError',
          target: 'deciding',
        },
      },
    },

    receiving: {
      entry: assign({
        attemptCount: () => 0,
        backoffMs: () => 500,
        failuresOnCurrentTransport: () => 0,
      }),
      on: {
        TRANSPORT_LOST: {
          target: 'deciding',
        },
        SESSION_COMPLETE: {
          target: 'disconnected',
        },
        TRANSPORT_FAILED: {
          actions: 'recordError',
          target: 'deciding',
        },
      },
    },

    deciding: {
      entry: 'resetForRetry',
      always: [
        {
          guard: 'shouldDowngrade',
          target: 'retrying',
          actions: 'downgradeTransport',
        },
        {
          guard: 'canRetry',
          target: 'retrying',
        },
        {
          target: 'disconnected',
        },
      ],
    },

    retrying: {
      after: {
        backoffDelay: {
          target: 'connecting',
          actions: assign({
            transitionStartedAt: () => Date.now(),
          }),
        },
      },
      on: {
        DISCONNECT: {
          target: 'disconnected',
        },
      },
    },
  },
})

function downgradeTransport(current: TransportType): TransportType {
  switch (current) {
    case 'sse':
      return 'websocket'
    case 'websocket':
      return 'polling'
    default:
      return 'polling'
  }
}
