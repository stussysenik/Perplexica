import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { ArrowUp } from '@phosphor-icons/react'
import TextAction from 'src/components/ui/TextAction'

interface Props {
  onSend: (message: string) => void
  loading: boolean
  mode: string
  onModeChange: (mode: string) => void
}

const modes = [
  { key: 'speed', label: 'Speed' },
  { key: 'balanced', label: 'Balanced' },
  { key: 'quality', label: 'Quality' },
]

const MessageInput = ({ onSend, loading, mode, onModeChange }: Props) => {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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
    <div className="border-t border-[var(--border-default)] p-4">
      <div className="max-w-3xl mx-auto">
        {/* Mode selector — TextAction style */}
        <div className="flex gap-3 mb-3">
          {modes.map(m => (
            <TextAction
              key={m.key}
              onClick={() => onModeChange(m.key)}
              label={m.label}
              active={mode === m.key}
              className={`text-small ${mode === m.key ? 'border-b-2 border-[var(--border-accent)] pb-0.5' : 'pb-[3px]'}`}
            />
          ))}
        </div>

        {/* Input container — 1px border, no fill, no shadow */}
        <div
          className="flex items-end gap-2 border border-[var(--border-default)] rounded-spine
            focus-within:border-[var(--border-accent)]
            transition-colors duration-[180ms]
            p-2 pl-4"
        >
          <label htmlFor="search-input" className="sr-only">Search query</label>
          <textarea
            id="search-input"
            ref={textareaRef}
            value={message}
            onChange={(e) => { setMessage(e.target.value); autoResize() }}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            rows={1}
            aria-label="Search query"
            className="flex-1 bg-transparent text-body text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none outline-none min-h-[36px] max-h-[160px] py-1.5"
          />
          <button
            onClick={handleSubmit}
            disabled={loading || !message.trim()}
            className="flex-shrink-0 w-10 h-10 rounded-spine border border-[var(--border-accent)]
              text-[var(--text-accent)]
              hover:bg-[var(--surface-whisper)]
              disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent
              flex items-center justify-center
              transition-colors duration-[180ms]"
            aria-label="Send message"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-[var(--border-muted)] border-t-[var(--border-accent)] rounded-full animate-spin" />
            ) : (
              <ArrowUp size={16} weight="bold" />
            )}
          </button>
        </div>

        <p className="text-caption text-[var(--text-muted)] text-center mt-2 normal-case tracking-normal">
          Press <kbd className="px-1 py-0.5 border border-[var(--border-default)] rounded-[2px] text-[9px] font-mono">/</kbd> to focus · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}

export default MessageInput
