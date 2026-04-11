import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearch } from 'src/lib/useSearch'
import { variants, transition } from 'src/lib/motion'
import MessageBox from 'src/components/Chat/MessageBox'
import MessageInput from 'src/components/Chat/MessageInput'
import TextAction from 'src/components/ui/TextAction'

const HomePage = () => {
  const { messages, loading, sendMessage, mode, setMode, clearChat, chatId } = useSearch()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {messages.length === 0 ? (
            <motion.div
              key="empty"
              {...variants.fadeIn}
              transition={transition.normal}
            >
              <EmptyState onSend={sendMessage} />
            </motion.div>
          ) : (
            <motion.div
              key="messages"
              {...variants.fadeIn}
              transition={transition.normal}
              className="py-6 px-4"
            >
              {messages.map((msg, idx) => (
                <MessageBox
                  key={msg.messageId}
                  message={msg}
                  isLast={idx === messages.length - 1}
                  loading={loading}
                  chatId={chatId}
                  onSearch={sendMessage}
                />
              ))}
              <div ref={messagesEndRef} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input */}
      <MessageInput
        onSend={sendMessage}
        loading={loading}
        mode={mode}
        onModeChange={setMode}
      />
    </div>
  )
}

function EmptyState({ onSend }: { onSend: (q: string) => void }) {
  const suggestions = [
    'What is quantum computing?',
    'Best restaurants in Tokyo',
    'How does Elixir handle concurrency?',
    'Latest AI research breakthroughs',
  ]

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[100dvh] px-4 pb-20 lg:pb-0 lg:min-h-0">
      {/* Wordmark — no logo badge, just typography */}
      <h1 className="text-display tracking-tight text-[var(--text-primary)] mb-2">
        Perplexica
      </h1>
      <p className="text-small text-[var(--text-muted)] mb-10">
        Research-grade search with source traceability
      </p>

      {/* Suggestion chips as TextActions */}
      <div className="flex flex-wrap justify-center gap-3 max-w-lg">
        {suggestions.map(s => (
          <TextAction
            key={s}
            onClick={() => onSend(s)}
            className="border border-[var(--border-default)] rounded-spine px-4 py-2.5 text-small hover:border-[var(--border-accent)] hover:bg-[var(--surface-whisper)]"
          >
            {s}
          </TextAction>
        ))}
      </div>
    </div>
  )
}

export default HomePage
