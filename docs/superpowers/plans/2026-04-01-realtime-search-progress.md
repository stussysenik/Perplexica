# Real-Time Search Progress Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace 2-second HTTP polling with WebSocket subscriptions for instant search progress updates.

**Architecture:** The Phoenix backend already publishes search events via Absinthe subscriptions over Phoenix PubSub. We add a WebSocket client (`phoenix` JS package + `@absinthe/socket`) to the RedwoodJS frontend, rewrite `useSearch.ts` to subscribe to `search_updated(sessionId)`, and update MessageBox to render staged progress indicators as events arrive.

**Tech Stack:** `phoenix` (JS client), `@absinthe/socket` (Absinthe WS adapter), existing Framer Motion for progress animations.

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `redwood/web/src/lib/phoenix-ws.ts` | Create | WebSocket client — connect, subscribe, unsubscribe |
| `redwood/web/src/lib/useSearch.ts` | Modify | Replace polling with subscription, process events |
| `redwood/web/src/lib/phoenix.ts` | Modify | Export `phoenixWsUrl` alongside `phoenixUrl` |
| `redwood/web/src/components/Chat/SearchProgress.tsx` | Create | Staged progress indicator component |
| `redwood/web/src/components/Chat/MessageBox.tsx` | Modify | Render SearchProgress during `answering` state |
| `redwood/web/package.json` | Modify | Add `phoenix` + `@absinthe/socket` deps |

---

### Task 1: Install WebSocket dependencies

**Files:**
- Modify: `redwood/web/package.json`

- [ ] **Step 1: Install packages**

```bash
cd /Users/s3nik/Desktop/Perplexica/redwood
yarn workspace web add phoenix @absinthe/socket
```

- [ ] **Step 2: Verify installation**

```bash
ls redwood/web/node_modules/phoenix/package.json && ls redwood/web/node_modules/@absinthe/socket/package.json
```

Expected: Both files exist.

- [ ] **Step 3: Commit**

```bash
git add redwood/web/package.json redwood/yarn.lock
git commit -m "feat: add phoenix + @absinthe/socket for WebSocket subscriptions"
```

---

### Task 2: Create WebSocket client

**Files:**
- Modify: `redwood/web/src/lib/phoenix.ts`
- Create: `redwood/web/src/lib/phoenix-ws.ts`

- [ ] **Step 1: Add WebSocket URL export to phoenix.ts**

Add after the existing `phoenixUrl` export in `redwood/web/src/lib/phoenix.ts`:

```typescript
/** WebSocket URL for Absinthe subscriptions */
export const phoenixWsUrl = phoenixUrl.replace(/^http/, 'ws') + '/socket'
```

- [ ] **Step 2: Create phoenix-ws.ts**

Write the complete file to `redwood/web/src/lib/phoenix-ws.ts`:

```typescript
/**
 * WebSocket client for Absinthe GraphQL subscriptions.
 *
 * Uses the Phoenix JS client + @absinthe/socket to connect to the
 * Phoenix backend and subscribe to search_updated events.
 */

import { Socket as PhoenixSocket } from 'phoenix'
import * as AbsintheSocket from '@absinthe/socket'
import { phoenixWsUrl } from './phoenix'

let socket: ReturnType<typeof PhoenixSocket.prototype.constructor> | null = null
let absintheSocket: ReturnType<typeof AbsintheSocket.create> | null = null

/** Lazily initialize the socket connection. */
function getAbsintheSocket() {
  if (!absintheSocket) {
    socket = new PhoenixSocket(phoenixWsUrl, {
      reconnectAfterMs: (tries: number) => Math.min(tries * 500, 5000),
    })
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
}

interface SubscriptionCallbacks {
  onEvent: (event: SearchEvent) => void
  onError: (error: Error) => void
  onComplete: () => void
}

/**
 * Subscribe to search_updated events for a given session.
 * Returns an unsubscribe function.
 */
export function subscribeToSearch(
  sessionId: string,
  callbacks: SubscriptionCallbacks
): () => void {
  const as = getAbsintheSocket()

  const operation = `
    subscription SearchUpdated($sessionId: ID!) {
      searchUpdated(sessionId: $sessionId) {
        type
        block
        blockId
        patch
        data
      }
    }
  `

  const notifier = AbsintheSocket.send(as, {
    operation,
    variables: { sessionId },
  })

  const observed = AbsintheSocket.observe(as, notifier, {
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

  // Return unsubscribe function
  return () => {
    AbsintheSocket.cancel(as, notifier)
  }
}

/** Disconnect the socket entirely. */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
    absintheSocket = null
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/s3nik/Desktop/Perplexica/redwood
npx tsc --noEmit --project web/tsconfig.json 2>&1 | grep "phoenix-ws"
```

Expected: No errors from phoenix-ws.ts (may need to add type declarations if packages lack types).

- [ ] **Step 4: Commit**

```bash
git add redwood/web/src/lib/phoenix.ts redwood/web/src/lib/phoenix-ws.ts
git commit -m "feat: add Absinthe WebSocket client for real-time subscriptions"
```

---

### Task 3: Create SearchProgress component

**Files:**
- Create: `redwood/web/src/components/Chat/SearchProgress.tsx`

- [ ] **Step 1: Create the component**

Write to `redwood/web/src/components/Chat/SearchProgress.tsx`:

```tsx
/**
 * SearchProgress — staged progress indicator for real-time search.
 *
 * Shows the current phase of the search pipeline:
 *   1. Classifying query...
 *   2. Searching the web (N sources)...
 *   3. Analyzing sources...
 *   4. Writing answer...
 *
 * Receives search events and derives the display state.
 */

import { motion, AnimatePresence } from 'framer-motion'
import { variants, transition } from 'src/lib/motion'

export type SearchPhase =
  | 'classifying'
  | 'searching'
  | 'analyzing'
  | 'writing'
  | 'complete'
  | 'error'

interface Props {
  phase: SearchPhase
  sourceCount: number
}

const phaseLabels: Record<SearchPhase, string> = {
  classifying: 'Classifying query...',
  searching: 'Searching the web',
  analyzing: 'Analyzing sources...',
  writing: 'Writing answer...',
  complete: 'Complete',
  error: 'Error',
}

const phaseOrder: SearchPhase[] = ['classifying', 'searching', 'analyzing', 'writing']

const SearchProgress = ({ phase, sourceCount }: Props) => {
  if (phase === 'complete' || phase === 'error') return null

  const currentIdx = phaseOrder.indexOf(phase)
  const label = phase === 'searching' && sourceCount > 0
    ? `Searching the web (${sourceCount} sources found)...`
    : phaseLabels[phase]

  return (
    <div className="mb-6" role="status" aria-live="polite">
      {/* Progress steps */}
      <div className="flex items-center gap-2 mb-3">
        {phaseOrder.map((p, idx) => (
          <div key={p} className="flex items-center gap-2">
            {idx > 0 && (
              <div className={`w-6 h-px ${idx <= currentIdx ? 'bg-[var(--border-accent)]' : 'bg-[var(--border-default)]'}`} />
            )}
            <div
              className={`w-2 h-2 rounded-full transition-colors duration-[180ms] ${
                idx < currentIdx
                  ? 'bg-[var(--text-accent)]'
                  : idx === currentIdx
                    ? 'bg-[var(--text-accent)] animate-pulse'
                    : 'bg-[var(--border-default)]'
              }`}
            />
          </div>
        ))}
      </div>

      {/* Current phase label */}
      <AnimatePresence mode="wait">
        <motion.p
          key={phase}
          {...variants.fadeIn}
          transition={transition.fast}
          className="text-small text-[var(--text-muted)]"
        >
          {label}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}

export default SearchProgress
```

- [ ] **Step 2: Commit**

```bash
git add redwood/web/src/components/Chat/SearchProgress.tsx
git commit -m "feat: add SearchProgress component for staged search indicators"
```

---

### Task 4: Rewrite useSearch with WebSocket subscriptions

**Files:**
- Modify: `redwood/web/src/lib/useSearch.ts`

- [ ] **Step 1: Rewrite useSearch.ts**

Replace the entire contents of `redwood/web/src/lib/useSearch.ts`:

```typescript
import { useState, useCallback, useRef } from 'react'
import { phoenixGql } from './phoenix'
import { subscribeToSearch, type SearchEvent } from './phoenix-ws'
import type { SearchPhase } from 'src/components/Chat/SearchProgress'

export interface Source {
  content: string
  metadata: {
    url: string
    title: string
  }
}

export interface Message {
  id: string
  messageId: string
  query: string
  status: 'answering' | 'completed' | 'error'
  sources: Source[]
  answer: string
  createdAt?: string
  /** Real-time search progress phase */
  phase?: SearchPhase
  /** Number of sources found so far */
  sourceCount?: number
}

interface UseSearchReturn {
  messages: Message[]
  loading: boolean
  sendMessage: (query: string) => Promise<void>
  mode: string
  setMode: (mode: string) => void
  chatId: string
  clearChat: () => void
}

export function useSearch(): UseSearchReturn {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('speed')
  const chatIdRef = useRef(crypto.randomUUID())
  const unsubRef = useRef<(() => void) | null>(null)

  const clearChat = useCallback(() => {
    unsubRef.current?.()
    unsubRef.current = null
    chatIdRef.current = crypto.randomUUID()
    setMessages([])
    setLoading(false)
  }, [])

  /** Update a specific message by messageId. */
  const updateMsg = useCallback(
    (msgId: string, updater: (msg: Message) => Message) => {
      setMessages(prev => prev.map(m => (m.messageId === msgId ? updater(m) : m)))
    },
    []
  )

  const sendMessage = useCallback(
    async (query: string) => {
      if (loading) return

      const msgId = crypto.randomUUID()
      const chatId = chatIdRef.current

      // Add optimistic message with initial phase
      const newMsg: Message = {
        id: msgId,
        messageId: msgId,
        query,
        status: 'answering',
        sources: [],
        answer: '',
        phase: 'classifying',
        sourceCount: 0,
      }

      setMessages(prev => [...prev, newMsg])
      setLoading(true)

      try {
        // Start search via Phoenix
        const res = await phoenixGql(`mutation {
          startSearch(
            query: ${JSON.stringify(query)},
            chatId: ${JSON.stringify(chatId)},
            messageId: ${JSON.stringify(msgId)},
            optimizationMode: ${JSON.stringify(mode)}
          ) { sessionId status }
        }`)

        const sessionId = res.data.startSearch.sessionId

        // Subscribe to real-time events
        const unsubscribe = subscribeToSearch(sessionId, {
          onEvent: (event: SearchEvent) => {
            switch (event.type) {
              case 'block': {
                const block = event.block
                if (!block) break

                if (block.type === 'research') {
                  updateMsg(msgId, m => ({ ...m, phase: 'searching' }))
                } else if (block.type === 'source') {
                  const sources: Source[] = block.data || []
                  updateMsg(msgId, m => ({
                    ...m,
                    sources,
                    sourceCount: sources.length,
                    phase: 'analyzing',
                  }))
                } else if (block.type === 'text') {
                  updateMsg(msgId, m => ({
                    ...m,
                    answer: block.data || '',
                    phase: 'writing',
                  }))
                }
                break
              }

              case 'update_block': {
                // Research substep update — increment source count if searching
                updateMsg(msgId, m => {
                  const newCount = (m.sourceCount || 0)
                  return { ...m, phase: 'searching', sourceCount: newCount }
                })
                break
              }

              case 'research_complete': {
                updateMsg(msgId, m => ({ ...m, phase: 'writing' }))
                break
              }

              case 'message_end': {
                updateMsg(msgId, m => ({
                  ...m,
                  status: 'completed',
                  phase: 'complete',
                }))
                setLoading(false)
                unsubRef.current?.()
                unsubRef.current = null
                break
              }

              case 'error': {
                updateMsg(msgId, m => ({
                  ...m,
                  status: 'error',
                  phase: 'error',
                  answer: event.data || 'Search encountered an error.',
                }))
                setLoading(false)
                unsubRef.current?.()
                unsubRef.current = null
                break
              }
            }
          },

          onError: (error: Error) => {
            console.error('[search subscription error]', error)
            // Fall back to polling on WebSocket failure
            fallbackPoll(chatId, msgId)
          },

          onComplete: () => {
            // Subscription ended — check if message was completed
            // If not, fall back to polling
          },
        })

        unsubRef.current = unsubscribe
      } catch (err: any) {
        updateMsg(msgId, m => ({
          ...m,
          status: 'error',
          phase: 'error',
          answer: err.message || 'An error occurred.',
        }))
        setLoading(false)
      }
    },
    [loading, mode, updateMsg]
  )

  /** Polling fallback if WebSocket subscription fails. */
  const fallbackPoll = useCallback(
    async (chatId: string, msgId: string) => {
      for (let i = 0; i < 40; i++) {
        await new Promise(r => setTimeout(r, 2000))

        try {
          const res = await phoenixGql(`{
            messages(chatId: ${JSON.stringify(chatId)}) {
              messageId status responseBlocks
            }
          }`)

          const msg = res.data.messages.find((m: any) => m.messageId === msgId)
          if (!msg) continue

          if (msg.status === 'completed' && msg.responseBlocks) {
            const blocks = msg.responseBlocks
            const sourceBlock = blocks.find((b: any) => b.type === 'source')
            const textBlock = blocks.find((b: any) => b.type === 'text')

            updateMsg(msgId, m => ({
              ...m,
              status: 'completed',
              phase: 'complete',
              sources: sourceBlock?.data || [],
              answer: textBlock?.data || '',
            }))
            setLoading(false)
            return
          }

          if (msg.status === 'error') {
            updateMsg(msgId, m => ({
              ...m,
              status: 'error',
              phase: 'error',
              answer: 'Search encountered an error.',
            }))
            setLoading(false)
            return
          }
        } catch {
          // Continue polling
        }
      }

      // Timeout
      updateMsg(msgId, m => ({
        ...m,
        status: 'error',
        phase: 'error',
        answer: 'Search timed out.',
      }))
      setLoading(false)
    },
    [updateMsg]
  )

  return {
    messages,
    loading,
    sendMessage,
    mode,
    setMode,
    chatId: chatIdRef.current,
    clearChat,
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/s3nik/Desktop/Perplexica/redwood
npx tsc --noEmit --project web/tsconfig.json 2>&1 | grep "useSearch"
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add redwood/web/src/lib/useSearch.ts
git commit -m "feat: replace polling with WebSocket subscriptions in useSearch"
```

---

### Task 5: Wire SearchProgress into MessageBox

**Files:**
- Modify: `redwood/web/src/components/Chat/MessageBox.tsx`

- [ ] **Step 1: Add SearchProgress import and rendering**

In `redwood/web/src/components/Chat/MessageBox.tsx`, add the import at the top:

```typescript
import SearchProgress from 'src/components/Chat/SearchProgress'
```

Then replace the existing loading indicator block:

```tsx
      {/* Loading indicator */}
      {isSearching && isLast && (
        <div className="flex items-center gap-3 mb-6" role="status" aria-live="polite">
          <div className="w-4 h-4 border-2 border-[var(--border-muted)] border-t-[var(--border-accent)] rounded-full animate-spin" aria-hidden="true" />
          <span className="text-small text-[var(--text-muted)] animate-pulse">
            Searching the web and generating answer...
          </span>
        </div>
      )}
```

With the new SearchProgress component:

```tsx
      {/* Search progress — real-time staged indicators */}
      {isSearching && isLast && (
        <SearchProgress
          phase={message.phase || 'classifying'}
          sourceCount={message.sourceCount || 0}
        />
      )}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/s3nik/Desktop/Perplexica/redwood
npx tsc --noEmit --project web/tsconfig.json 2>&1 | grep "MessageBox"
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add redwood/web/src/components/Chat/MessageBox.tsx
git commit -m "feat: wire SearchProgress into MessageBox for real-time indicators"
```

---

### Task 6: Visual verification via Chrome DevTools MCP

- [ ] **Step 1: Start dev server and navigate**

```bash
cd /Users/s3nik/Desktop/Perplexica/redwood && yarn rw dev
```

Open Chrome DevTools MCP, navigate to `http://localhost:8910`.

- [ ] **Step 2: Take screenshot of home page**

Verify the home page still renders correctly with the new design system.

- [ ] **Step 3: Test a search query**

Type a query and submit. Observe:
- SearchProgress component appears with dot indicators
- Phases transition: classifying → searching → analyzing → writing → complete
- Sources appear as they arrive (not all at once)
- Answer streams in real-time

If the Phoenix backend isn't running, the fallback polling should kick in automatically after the WebSocket connection fails.

- [ ] **Step 4: Run Lighthouse audit**

Verify scores haven't regressed from the Gate 4 results (100/100/100 target).

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: real-time search progress via Absinthe WebSocket subscriptions

Replaces 2-second HTTP polling with WebSocket subscriptions for instant
search progress. Shows staged indicators: classifying, searching (with
source count), analyzing, writing. Falls back to polling if WebSocket fails."
```
