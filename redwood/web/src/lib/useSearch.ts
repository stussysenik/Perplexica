import { useState, useCallback, useRef } from 'react'
import { phoenixGql } from './phoenix'
import { subscribeToSearch, type SearchEvent } from './phoenix-ws'
import { useSettings } from 'src/lib/settings'
import type { SearchPhase, SearchMode } from 'src/components/Chat/SearchProgress'

export interface Source {
  content: string
  metadata: {
    url: string
    title: string
  }
}

export interface SearchSubStep {
  type: 'searching' | 'searchResults' | 'reading' | 'reasoning'
  data: any
}

export interface Message {
  id: string
  messageId: string
  query: string
  status: 'answering' | 'completed' | 'error'
  sources: Source[]
  answer: string
  createdAt?: string
  phase?: SearchPhase
  sourceCount?: number
  subSteps?: SearchSubStep[]
  /** Wall-clock ms when sendMessage was called, used for ETA. */
  startedAt?: number
}

interface UseSearchReturn {
  messages: Message[]
  loading: boolean
  sendMessage: (query: string) => Promise<void>
  mode: SearchMode
  setMode: (mode: SearchMode) => void
  chatId: string
  clearChat: () => void
}

/** Infer the current pipeline phase from the latest research sub-step. */
function phaseFromSubSteps(subSteps: SearchSubStep[], m: Message): Message {
  const lastStep = subSteps[subSteps.length - 1]
  let phase: SearchPhase = m.phase || 'searching'

  if (lastStep) {
    if (lastStep.type === 'searching' || lastStep.type === 'searchResults') phase = 'searching'
    else if (lastStep.type === 'reading') phase = 'analyzing'
    else if (lastStep.type === 'reasoning') phase = 'analyzing'
  }

  return { ...m, subSteps, phase }
}

export function useSearch(): UseSearchReturn {
  const { defaultMode } = useSettings()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<SearchMode>(defaultMode)
  const chatIdRef = useRef(crypto.randomUUID())
  const unsubRef = useRef<(() => void) | null>(null)
  // Tracks which messageIds already have a polling fallback running,
  // so repeated subscription errors don't spawn a cascade of pollers.
  const pollingActiveRef = useRef<Set<string>>(new Set())

  const clearChat = useCallback(() => {
    unsubRef.current?.()
    unsubRef.current = null
    pollingActiveRef.current.clear()
    chatIdRef.current = crypto.randomUUID()
    setMessages([])
    setLoading(false)
  }, [])

  const updateMsg = useCallback(
    (msgId: string, updater: (msg: Message) => Message) => {
      setMessages(prev => prev.map(m => (m.messageId === msgId ? updater(m) : m)))
    },
    []
  )

  /** Polling fallback if WebSocket subscription fails. */
  const fallbackPoll = useCallback(
    async (chatId: string, msgId: string) => {
      // Dedupe: a single message should only ever have ONE polling loop.
      if (pollingActiveRef.current.has(msgId)) return
      pollingActiveRef.current.add(msgId)

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
            pollingActiveRef.current.delete(msgId)
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
            pollingActiveRef.current.delete(msgId)
            return
          }
        } catch {
          // Continue polling
        }
      }

      updateMsg(msgId, m => ({
        ...m,
        status: 'error',
        phase: 'error',
        answer: 'Search timed out.',
      }))
      setLoading(false)
      pollingActiveRef.current.delete(msgId)
    },
    [updateMsg]
  )

  const sendMessage = useCallback(
    async (query: string) => {
      if (loading) return

      const msgId = crypto.randomUUID()
      const chatId = chatIdRef.current

      const newMsg: Message = {
        id: msgId,
        messageId: msgId,
        query,
        status: 'answering',
        sources: [],
        answer: '',
        phase: 'classifying',
        sourceCount: 0,
        subSteps: [],
        startedAt: Date.now(),
      }

      setMessages(prev => [...prev, newMsg])
      setLoading(true)

      try {
        // Build conversation history from previous messages for context.
        // Using GraphQL variables (not string interpolation) is the only safe
        // way to pass input objects — interpolating JSON gives quoted keys
        // which are not valid GraphQL object syntax.
        const history = messages
          .filter(m => m.status === 'completed')
          .flatMap(m => [
            { role: 'user', content: m.query },
            ...(m.answer ? [{ role: 'assistant', content: m.answer }] : []),
          ])

        const res = await phoenixGql(
          `mutation StartSearch(
            $query: String!,
            $chatId: String!,
            $messageId: String!,
            $optimizationMode: String,
            $history: [HistoryEntry!]
          ) {
            startSearch(
              query: $query,
              chatId: $chatId,
              messageId: $messageId,
              optimizationMode: $optimizationMode,
              history: $history
            ) { sessionId status }
          }`,
          { query, chatId, messageId: msgId, optimizationMode: mode, history }
        )

        const sessionId = res.data.startSearch.sessionId

        const unsubscribe = subscribeToSearch(sessionId, {
          onEvent: (event: SearchEvent) => {
            switch (event.type) {
              case 'block': {
                const block = event.block
                if (!block) break

                if (block.type === 'research') {
                  const subSteps: SearchSubStep[] = block.subSteps || []
                  updateMsg(msgId, m => phaseFromSubSteps(subSteps, m))
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
                // Apply the RFC6902 patch locally so research sub-steps stream
                // into the UI one at a time (searching → reading → reasoning).
                const patch = event.patch || []
                updateMsg(msgId, m => {
                  const next: SearchSubStep[] = [...(m.subSteps || [])]
                  for (const op of patch as any[]) {
                    if (op?.op === 'replace' && op.path === '/subSteps') {
                      return phaseFromSubSteps(op.value || [], m)
                    }
                  }
                  return phaseFromSubSteps(next, m)
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
            console.warn('[search subscription error, falling back to polling]', error.message)
            fallbackPoll(chatId, msgId)
          },

          onComplete: () => {
            // Subscription ended — if message isn't completed, fall back to polling
            setMessages(prev => {
              const msg = prev.find(m => m.messageId === msgId)
              if (msg && msg.status === 'answering') {
                fallbackPoll(chatId, msgId)
              }
              return prev
            })
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
    [loading, mode, messages, updateMsg, fallbackPoll]
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
