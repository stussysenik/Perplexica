import { useRef, useEffect } from 'react'
import { useSearch } from 'src/lib/useSearch'
import MessageBox from 'src/components/Chat/MessageBox'
import MessageInput from 'src/components/Chat/MessageInput'

const HomePage = () => {
  const { messages, loading, sendMessage, mode, setMode, clearChat } = useSearch()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <EmptyState onSend={sendMessage} />
        ) : (
          <div className="py-6 px-4">
            {messages.map((msg, idx) => (
              <MessageBox
                key={msg.messageId}
                message={msg}
                isLast={idx === messages.length - 1}
                loading={loading}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
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
    <div className="flex flex-col items-center justify-center h-full px-4 pb-20">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center text-white text-2xl font-bold mb-6 shadow-lg shadow-cyan-500/20">
        P
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100 mb-2">
        What do you want to know?
      </h1>
      <p className="text-stone-500 dark:text-stone-400 text-sm mb-8">
        AI-powered search with source traceability
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
        {suggestions.map(s => (
          <button
            key={s}
            onClick={() => onSend(s)}
            className="text-left px-4 py-3 rounded-xl border border-light-200 dark:border-dark-200 text-sm text-stone-600 dark:text-stone-400 hover:bg-light-200/60 dark:hover:bg-dark-100 hover:border-light-300 dark:hover:border-dark-300 transition-all"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

export default HomePage
