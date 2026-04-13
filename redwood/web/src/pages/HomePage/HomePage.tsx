import { useRef, useEffect, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from '@redwoodjs/router'
import { useSearch } from 'src/lib/useSearch'
import type { SearchMode } from 'src/components/Chat/SearchProgress'
import { variants, transition } from 'src/lib/motion'
import MessageBox from 'src/components/Chat/MessageBox'
import MessageInput from 'src/components/Chat/MessageInput'
import VerifiedBadge from 'src/components/ui/VerifiedBadge'

const ChessBoard = lazy(() => import('src/components/Chess/Chess'))

const HomePage = () => {
  const { messages, loading, sendMessage, mode, setMode, clearChat, chatId } = useSearch()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { search } = useLocation()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle query param on mount
  useEffect(() => {
    const params = new URLSearchParams(search)
    const query = params.get('q')
    if (query && messages.length === 0 && !loading) {
      sendMessage(query)
    }
  }, [search, sendMessage, messages.length, loading])

  // Clicking the FYOA brand in the AppLayout fires this event — we listen
  // here so the chat resets even when the user is already on "/".
  useEffect(() => {
    const onReset = () => clearChat()
    window.addEventListener('fyoa:reset-chat', onReset)
    return () => window.removeEventListener('fyoa:reset-chat', onReset)
  }, [clearChat])

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
              <EmptyState
                onSend={sendMessage}
                loading={loading}
                mode={mode}
                onModeChange={setMode}
              />
            </motion.div>
          ) : (
            <>
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
                    mode={mode}
                  />
                ))}
                <div ref={messagesEndRef} />
              </motion.div>
              
              {/* Input for active chat at bottom */}
              <div className="sticky bottom-0 bg-[var(--surface-primary)] border-t border-[var(--border-default)]">
                <MessageInput
                  onSend={sendMessage}
                  loading={loading}
                  mode={mode}
                  onModeChange={setMode}
                />
              </div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function EmptyState({ onSend, loading, mode, onModeChange }: { onSend: (q: string) => void, loading: boolean, mode: SearchMode, onModeChange: (m: SearchMode) => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-full px-4 py-12 md:py-24">
      <div className="w-full max-w-2xl flex flex-col items-center">
        {/* Shiny Wordmark Reveal */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-10"
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tighter text-[var(--text-primary)] mb-6">
            find your own answer
          </h1>
          <VerifiedBadge />
        </motion.div>

        {/* Hero Search Box — Centered like a search engine */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full"
        >
          <MessageInput
            onSend={onSend}
            loading={loading}
            mode={mode}
            onModeChange={onModeChange}
            transparent={true}
          />
        </motion.div>

        {/* The Chess Task */}
        {/* Feature Tag: Chess Animation is hidden */}
        {false && (
          <div className="mt-12 w-full">
            <Suspense fallback={<div className="h-64 flex items-center justify-center text-[var(--text-muted)] italic">Loading pieces...</div>}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                <ChessBoard />
              </motion.div>
            </Suspense>
          </div>
        )}
      </div>
    </div>
  )
}

export default HomePage
