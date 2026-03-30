import { useState, useRef, useEffect, KeyboardEvent } from 'react'

interface Props {
  onSend: (message: string) => void
  loading: boolean
  mode: string
  onModeChange: (mode: string) => void
}

const modes = [
  { key: 'speed', label: 'Speed', icon: '⚡' },
  { key: 'balanced', label: 'Balanced', icon: '⚖️' },
  { key: 'quality', label: 'Quality', icon: '🎯' },
]

const MessageInput = ({ onSend, loading, mode, onModeChange }: Props) => {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isMultiLine = message.includes('\n') || message.length > 80

  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault()
        textareaRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const handleSubmit = () => {
    const trimmed = message.trim()
    if (!trimmed || loading) return
    onSend(trimmed)
    setMessage('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const autoResize = () => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 160) + 'px'
    }
  }

  return (
    <div className="border-t border-light-200 dark:border-dark-200 bg-light-100 dark:bg-dark-secondary p-4">
      <div className="max-w-3xl mx-auto">
        {/* Mode selector */}
        <div className="flex gap-1.5 mb-3">
          {modes.map(m => (
            <button
              key={m.key}
              onClick={() => onModeChange(m.key)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${mode === m.key
                  ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-700'
                  : 'bg-light-200/60 dark:bg-dark-100 text-stone-500 dark:text-stone-400 border border-transparent hover:border-light-300 dark:hover:border-dark-200'
                }
              `}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <div
          className={`
            flex items-end gap-2 bg-light-secondary dark:bg-dark-100
            border border-light-200 dark:border-dark-200
            focus-within:border-cyan-400 dark:focus-within:border-cyan-600
            transition-colors
            ${isMultiLine ? 'rounded-2xl' : 'rounded-full'}
            p-2 pl-4
          `}
        >
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => { setMessage(e.target.value); autoResize() }}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            rows={1}
            className="flex-1 bg-transparent text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 resize-none outline-none min-h-[36px] max-h-[160px] py-1.5"
          />
          <button
            onClick={handleSubmit}
            disabled={loading || !message.trim()}
            className="flex-shrink-0 w-9 h-9 rounded-full bg-cyan-500 hover:bg-cyan-600 disabled:bg-stone-300 dark:disabled:bg-stone-700 text-white flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
            </svg>
          </button>
        </div>

        <p className="text-[10px] text-stone-400 dark:text-stone-600 text-center mt-2">
          Press <kbd className="px-1 py-0.5 rounded bg-light-200 dark:bg-dark-100 text-[9px] font-mono">/</kbd> to focus · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}

export default MessageInput
