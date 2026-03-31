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
  phase?: SearchPhase
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

  const updateMsg = useCallback(
    (msgId: string, updater: (msg: Message) => Message) => {
      setMessages(prev => prev.map(m => (m.messageId === msgId ? updater(m) : m)))
    },
    []
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
      }

      setMessages(prev => [...prev, newMsg])
      setLoading(true)

      try {
        const res = await phoenixGql(`mutation {
          startSearch(
            query: ${JSON.stringify(query)},
            chatId: ${JSON.stringify(chatId)},
            messageId: ${JSON.stringify(msgId)},
            optimizationMode: ${JSON.stringify(mode)}
          ) { sessionId status }
        }`)

        const sessionId = res.data.startSearch.sessionId

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
                updateMsg(msgId, m => ({ ...m, phase: 'searching' }))
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
            fallbackPoll(chatId, msgId)
          },

          onComplete: () => {},
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
    [loading, mode, updateMsg, fallbackPoll]
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
