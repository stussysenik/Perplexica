import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { RocketLaunch } from '@phosphor-icons/react'
import TextAction from 'src/components/ui/TextAction'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import type { SearchMode } from 'src/components/Chat/SearchProgress'

interface Props {
  onSend: (message: string) => void
  loading: boolean
  mode: SearchMode
  onModeChange: (mode: SearchMode) => void
  transparent?: boolean
}

const modes: { key: SearchMode; label: string; hint: string }[] = [
  { key: 'speed', label: 'Speed', hint: 'Fast single-pass search, one web round. ~7s budget.' },
  { key: 'balanced', label: 'Balanced', hint: 'Two research rounds with cross-checking. ~16s budget.' },
  { key: 'quality', label: 'Quality', hint: 'Deep multi-round research, reading sources. ~35s budget.' },
]

const SystemTime = () => {
  const [time, setTime] = useState<Date | null>(null)

  useEffect(() => {
    setTime(new Date())
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  if (!time) {
    return (
      <div className="inline-flex items-center gap-2 px-2 py-0.5 border border-[var(--border-highlight)] rounded-spine bg-[var(--surface-whisper)] opacity-0 transition-opacity duration-500">
        <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-highlight)] animate-pulse" />
        <span className="text-[10px] text-[var(--text-highlight)] font-semibold tracking-widest uppercase">
          --:--:--
        </span>
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-2 px-2 py-0.5 border border-[var(--border-highlight)] rounded-spine bg-[var(--surface-whisper)] opacity-100 transition-opacity duration-500">
      <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-highlight)] animate-pulse" />
      <span className="text-[10px] text-[var(--text-highlight)] font-semibold tracking-widest uppercase tabular-nums">
        {time.toLocaleTimeString([], { hour12: false })}
      </span>
    </div>
  )
}

const MessageInput = ({ onSend, loading, mode, onModeChange, transparent }: Props) => {
  const [message, setMessage] = useState('')
  const [showLegend, setShowLegend] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const sendBtnRef = useRef<HTMLButtonElement>(null)
  const rocketRef = useRef<HTMLSpanElement>(null)
  const legendRef = useRef<HTMLDivElement>(null)

  // Tap-outside to dismiss (mobile path — desktop uses hover).
  useEffect(() => {
    if (!showLegend) return
    const onDocDown = (e: MouseEvent | TouchEvent) => {
      if (legendRef.current && !legendRef.current.contains(e.target as Node)) {
        setShowLegend(false)
      }
    }
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('touchstart', onDocDown, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('touchstart', onDocDown)
    }
  }, [showLegend])

  // Haptic pulse — short burst on send, double-tap pattern on disabled
  const haptic = (pattern: number | number[]) => {
    if ('vibrate' in navigator) navigator.vibrate(pattern)
  }

  // GSAP wiring: hover spring + press crush + release pop
  useGSAP(() => {
    const btn = sendBtnRef.current
    if (!btn) return

    const onEnter = () => {
      if (btn.disabled) return
      gsap.to(btn, { scale: 1.13, duration: 0.18, ease: 'back.out(2.5)', overwrite: true })
    }
    const onLeave = () => {
      gsap.to(btn, { scale: 1, duration: 0.22, ease: 'power3.out', overwrite: true })
    }
    const onDown = () => {
      if (btn.disabled) return
      gsap.to(btn, { scale: 0.82, duration: 0.08, ease: 'power4.in', overwrite: true })
    }
    const onUp = () => {
      if (btn.disabled) return
      // Pop: overshoot then settle
      gsap.to(btn, {
        scale: 1.1,
        duration: 0.12,
        ease: 'power2.out',
        overwrite: true,
        onComplete: () =>
          gsap.to(btn, { scale: 1, duration: 0.35, ease: 'elastic.out(1, 0.4)' }),
      })
    }

    btn.addEventListener('mouseenter', onEnter)
    btn.addEventListener('mouseleave', onLeave)
    btn.addEventListener('mousedown', onDown)
    btn.addEventListener('mouseup', onUp)
    // Touch support
    btn.addEventListener('touchstart', onDown, { passive: true })
    btn.addEventListener('touchend', onUp)

    return () => {
      btn.removeEventListener('mouseenter', onEnter)
      btn.removeEventListener('mouseleave', onLeave)
      btn.removeEventListener('mousedown', onDown)
      btn.removeEventListener('mouseup', onUp)
      btn.removeEventListener('touchstart', onDown)
      btn.removeEventListener('touchend', onUp)
    }
  }, { scope: sendBtnRef })

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
    haptic([10, 30, 10]) // HMI double-tap confirm pattern
    // Rocket launch: icon exits upward before loading state swaps it out
    if (rocketRef.current) {
      gsap.to(rocketRef.current, {
        y: -40,
        opacity: 0,
        duration: 0.18,
        ease: 'power2.in',
        overwrite: true,
      })
    }
    onSend(trimmed)
    setMessage('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  // When loading completes, rocket descends back into position from above
  useEffect(() => {
    if (!loading && rocketRef.current) {
      gsap.fromTo(
        rocketRef.current,
        { y: -24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.32, ease: 'power2.out' }
      )
    }
  }, [loading])

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
    <div className={`${transparent ? '' : 'border-t border-[var(--border-default)] p-4'}`}>
      <div className="max-w-3xl mx-auto">
        {/* Input container — 1px border, no fill, no shadow */}
        <div
          className="relative flex items-end gap-3 border border-[var(--border-default)] rounded-spine
            focus-within:border-[var(--border-accent)]
            focus-within:bg-[var(--surface-whisper)]
            transition-all duration-[200ms]
            p-2.5 pl-4 bg-transparent mb-3"
        >
          <label htmlFor="search-input" className="sr-only">Search query</label>
          <textarea
            id="search-input"
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value)
              autoResize()
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            rows={1}
            aria-label="Search query"
            className="flex-1 bg-transparent text-body text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none outline-none min-h-[40px] max-h-[160px] py-2 leading-relaxed"
          />
          <button
            ref={sendBtnRef}
            onClick={handleSubmit}
            disabled={loading || !message.trim()}
            className="flex-shrink-0 w-10 h-10 rounded-spine border border-[var(--border-default)]
              text-[var(--text-primary)]
              hover:border-[var(--border-accent)] hover:text-[var(--text-accent)]
              disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:border-[var(--border-default)]
              flex items-center justify-center
              will-change-transform"
            style={{ transformOrigin: 'center' }}
            aria-label="Send message"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-[var(--border-muted)] border-t-[var(--border-accent)] rounded-full animate-spin" />
            ) : (
              <span ref={rocketRef} className="flex items-center justify-center overflow-hidden">
                <RocketLaunch size={18} weight="bold" />
              </span>
            )}
          </button>
        </div>

        {/* Footer: Mode selector and Shortcuts */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-1">
          <div className="flex items-center gap-4">
            {modes.map(m => (
              <button
                key={m.key}
                type="button"
                onClick={() => onModeChange(m.key)}
                className={`text-[11px] font-semibold uppercase tracking-wider transition-all ${
                  mode === m.key
                    ? 'text-[var(--text-accent)] border-b-2 border-[var(--border-accent)] pb-0.5'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] pb-[3px]'
                }`}
              >
                {m.label}
              </button>
            ))}
            {/* Mode legend: hover on desktop, tap on mobile — explains each mode. */}
            <div
              ref={legendRef}
              className="relative ml-1"
              onMouseEnter={() => setShowLegend(true)}
              onMouseLeave={() => setShowLegend(false)}
            >
              <button
                type="button"
                onClick={() => setShowLegend(s => !s)}
                aria-label="Explain search modes"
                aria-expanded={showLegend}
                aria-haspopup="dialog"
                className={`text-[10px] font-semibold text-[var(--text-muted)] transition-opacity cursor-help select-none ${
                  showLegend ? 'opacity-100' : 'opacity-50 hover:opacity-100'
                }`}
              >
                (?)
              </button>
              <div
                role="tooltip"
                aria-hidden={!showLegend}
                className={`absolute left-0 bottom-full mb-2 w-72 z-30
                  border border-[var(--border-default)] rounded-spine
                  bg-[var(--surface-primary)]
                  p-3
                  transition-all duration-150 ease-out
                  ${showLegend
                    ? 'opacity-100 translate-y-0 pointer-events-auto'
                    : 'opacity-0 translate-y-1 pointer-events-none'}`}
              >
                <div className="text-[9px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">
                  Search modes
                </div>
                <ul className="flex flex-col gap-2">
                  {modes.map(m => (
                    <li key={m.key} className="flex flex-col gap-0.5">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-accent)]">
                        {m.label}
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                        {m.hint}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Feature Tag: System Time hidden */}
            {false && <SystemTime />}
            
            <p className="hidden md:block text-[10px] text-[var(--text-muted)] normal-case tracking-wide opacity-50">
              Press <kbd className="px-1.5 py-0.5 border border-[var(--border-default)] rounded-[3px] text-[9px] font-mono bg-[var(--surface-secondary)] text-[var(--text-primary)]">/</kbd> to focus · Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MessageInput
