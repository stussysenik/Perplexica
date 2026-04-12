import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearch } from 'src/lib/useSearch'
import { variants, transition } from 'src/lib/motion'
import MessageBox from 'src/components/Chat/MessageBox'
import MessageInput from 'src/components/Chat/MessageInput'
import TextAction from 'src/components/ui/TextAction'
import { MagnifyingGlass, Flask, ChartLineUp, BookOpen, Compass } from '@phosphor-icons/react'

const HomePage = () => {
  const { messages, loading, sendMessage, mode, setMode, clearChat, chatId } = useSearch()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-col h-full bg-[var(--surface-primary)]">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {messages.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="h-full"
            >
              <EmptyState onSend={sendMessage} />
            </motion.div>
          ) : (
            <motion.div
              key="messages"
              {...variants.fadeIn}
              transition={transition.normal}
              className="py-6 px-4 max-w-3xl mx-auto w-full"
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
  const categories = [
    {
      title: 'Research',
      icon: <Flask size={18} weight="light" />,
      suggestions: [
        'How does quantum entanglement work?',
        'Impact of climate change on biodiversity',
        'History of the Byzantine Empire'
      ]
    },
    {
      title: 'Analysis',
      icon: <ChartLineUp size={18} weight="light" />,
      suggestions: [
        'Compare Rust vs Elixir for networking',
        'Trend analysis of EV market 2024',
        'Analyze the impact of remote work'
      ]
    },
    {
      title: 'Discovery',
      icon: <Compass size={18} weight="light" />,
      suggestions: [
        'Latest breakthroughs in fusion energy',
        'Best hidden gems in Southeast Asia',
        'Newest open-source LLM releases'
      ]
    }
  ]

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-4 py-12">
      <div className="w-full max-w-4xl flex flex-col items-center">
        {/* Shiny Wordmark Reveal */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 border border-[var(--border-accent)] rounded-spine bg-[var(--surface-whisper)]">
             <div className="w-1.5 h-1.5 rounded-full bg-[var(--border-accent)] animate-pulse" />
             <span className="text-caption text-[var(--text-accent)] font-semibold tracking-widest uppercase">
               System Ready
             </span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tighter text-[var(--text-primary)] mb-4">
            Perplexica
          </h1>
          <p className="text-body md:text-lg text-[var(--text-muted)] max-w-md mx-auto">
            Agentic research engine for precise, cited, and verifiable answers.
          </p>
        </motion.div>

        {/* Guided Category Selection — Principle of Least Resistance */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          {categories.map((cat, catIdx) => (
            <motion.div
              key={cat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + (catIdx * 0.1), duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="group border border-[var(--border-default)] p-5 rounded-spine hover:border-[var(--border-accent)] hover:bg-[var(--surface-whisper)] transition-all duration-300 flex flex-col h-full"
            >
              <div className="flex items-center gap-2 mb-4 text-[var(--text-primary)] group-hover:text-[var(--text-accent)] transition-colors">
                {cat.icon}
                <h2 className="text-small font-semibold uppercase tracking-wider">{cat.title}</h2>
              </div>
              
              <div className="flex flex-col gap-2">
                {cat.suggestions.map(s => (
                  <button
                    key={s}
                    onClick={() => onSend(s)}
                    className="text-left text-small text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline decoration-[var(--border-accent)] decoration-2 underline-offset-4 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Guidance / Quick Start hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="mt-12 flex items-center gap-2 text-caption text-[var(--text-muted)]"
        >
          <MagnifyingGlass size={14} />
          <span>One click to start research · Select a suggestion or type your own query</span>
        </motion.div>
      </div>
    </div>
  )
}

export default HomePage
