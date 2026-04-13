/**
 * WebSocket client for Absinthe GraphQL subscriptions.
 */

import { Socket } from 'phoenix'
import * as AbsintheSocket from '@absinthe/socket'
import { phoenixWsUrl } from './phoenix'

let socket: Socket | null = null
let absintheSocket: any = null

function getAbsintheSocket() {
  if (!absintheSocket) {
    socket = new Socket(phoenixWsUrl, {
      reconnectAfterMs: (tries: number) => Math.min(tries * 500, 5000),
      // Bump the per-push timeout so a slow first-join doesn't immediately
      // trip onError and cascade the client into the polling fallback.
      timeout: 20000,
    })
    socket.connect()
    absintheSocket = AbsintheSocket.create(socket)
  }
  return absintheSocket
}

export interface SearchEvent {
  type: 'block' | 'update_block' | 'research_complete' | 'message_end' | 'error'
  block?: Record<string, any>
  blockId?: string
  patch?: Record<string, any>[]
  data?: string
  /** Wall-clock ms when Phoenix emitted the event. Added in Slice 4. */
  emittedAtMs?: number
  /** Pipeline stage (`classifier` | `researcher` | `answer` | …) for the event. */
  step?: string | null
  /** Milliseconds elapsed in `step` at emission time. */
  elapsedMs?: number | null
}

interface SubscriptionCallbacks {
  onEvent: (event: SearchEvent) => void
  onError: (error: Error) => void
  onComplete: () => void
}

export function subscribeToSearch(
  sessionId: string,
  callbacks: SubscriptionCallbacks
): () => void {
  const as = getAbsintheSocket()

  const notifier = AbsintheSocket.send(as, {
    operation: `
      subscription SearchUpdated($sessionId: ID!) {
        searchUpdated(sessionId: $sessionId) {
          type block blockId patch data
          emittedAtMs step elapsedMs
        }
      }
    `,
    variables: { sessionId },
  })

  AbsintheSocket.observe(as, notifier, {
    onResult: (result: any) => {
      if (result.data?.searchUpdated) {
        callbacks.onEvent(result.data.searchUpdated)
      }
    },
    onError: (error: any) => {
      callbacks.onError(error instanceof Error ? error : new Error(String(error)))
    },
    onAbort: (error: any) => {
      callbacks.onError(error instanceof Error ? error : new Error(String(error)))
    },
  })

  return () => {
    AbsintheSocket.cancel(as, notifier)
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
    absintheSocket = null
  }
}
