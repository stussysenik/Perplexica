import { useState, useCallback, useRef } from 'react'
import { phoenixGql } from './phoenix'

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

  const clearChat = useCallback(() => {
    chatIdRef.current = crypto.randomUUID()
    setMessages([])
    setLoading(false)
  }, [])

  const sendMessage = useCallback(async (query: string) => {
    if (loading) return

    const msgId = crypto.randomUUID()
    const chatId = chatIdRef.current

    // Add optimistic message
    const newMsg: Message = {
      id: msgId,
      messageId: msgId,
      query,
      status: 'answering',
      sources: [],
      answer: '',
    }

    setMessages(prev => [...prev, newMsg])
    setLoading(true)

    try {
      // Start search via Phoenix
      const mutation = `mutation {
        startSearch(
          query: ${JSON.stringify(query)},
          chatId: ${JSON.stringify(chatId)},
          messageId: ${JSON.stringify(msgId)},
          optimizationMode: ${JSON.stringify(mode)}
        ) { sessionId status }
      }`

      await phoenixGql(mutation)

      // Poll for results
      for (let i = 0; i < 40; i++) {
        await new Promise(r => setTimeout(r, 2000))

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

          setMessages(prev =>
            prev.map(m =>
              m.messageId === msgId
                ? {
                    ...m,
                    status: 'completed',
                    sources: sourceBlock?.data || [],
                    answer: textBlock?.data || '',
                  }
                : m
            )
          )
          break
        }

        if (msg.status === 'error') {
          setMessages(prev =>
            prev.map(m =>
              m.messageId === msgId
                ? { ...m, status: 'error', answer: 'Search encountered an error.' }
                : m
            )
          )
          break
        }
      }
    } catch (err: any) {
      setMessages(prev =>
        prev.map(m =>
          m.messageId === msgId
            ? { ...m, status: 'error', answer: err.message || 'An error occurred.' }
            : m
        )
      )
    }

    setLoading(false)
  }, [loading, mode])

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
