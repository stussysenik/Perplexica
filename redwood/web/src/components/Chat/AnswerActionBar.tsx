/**
 * AnswerActionBar -- a row of utility actions rendered below each completed answer.
 *
 * Actions: Copy, Share, Bookmark, Export PDF, Text-to-Speech.
 *
 * Design goals:
 *   - Compact, lightweight toolbar that doesn't compete with the answer.
 *   - Touch-friendly (44px min-height) with responsive labels (icons-only on mobile).
 *   - Inline SVGs -- no icon library dependency.
 *   - Graceful degradation: TTS button is hidden when unsupported; clipboard
 *     falls back to a textarea hack for older browsers.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { phoenixGql } from 'src/lib/phoenix'
import { stripMarkdown, slugify } from 'src/lib/renderMarkdown'
import type { Source } from 'src/lib/useSearch'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  answer: string // raw markdown
  query: string
  messageId: string
  chatId: string
  sources: Source[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Copy text to clipboard, falling back to a hidden textarea for legacy browsers. */
async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  // Fallback: create a temporary textarea, select its contents, and exec copy.
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.left = '-9999px'
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  document.body.removeChild(ta)
}

// ---------------------------------------------------------------------------
// Sub-components (individual action buttons)
// ---------------------------------------------------------------------------

/** Shared wrapper for every action button — TextAction style (no fill, no border). */
function ActionButton({
  onClick,
  label,
  disabled,
  active,
  children,
}: {
  onClick: () => void
  label: string
  disabled?: boolean
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`inline-flex items-center gap-1.5 min-h-[44px]
        transition-colors duration-[180ms] text-small font-medium
        disabled:opacity-30 disabled:cursor-not-allowed select-none cursor-pointer
        ${active
          ? 'text-[var(--text-highlight)]'
          : 'text-[var(--text-muted)] hover:text-[var(--text-accent)]'
        }`}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// 1. Copy
// ---------------------------------------------------------------------------

function CopyButton({ answer, sources }: { answer: string; sources: Source[] }) {
  const [copied, setCopied] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleCopy = useCallback(async (mode: 'formatted' | 'plain' | 'with-sources') => {
    try {
      let text = answer
      if (mode === 'plain') {
        text = stripMarkdown(answer)
      } else if (mode === 'with-sources') {
        text = answer
        if (sources.length > 0) {
          text += '\n\n---\nSources:\n'
          sources.forEach((s, i) => {
            const title = s.metadata?.title || ''
            const url = s.metadata?.url || ''
            text += `[${i + 1}] ${title}${title ? ' — ' : ''}${url}\n`
          })
        }
      }
      await copyToClipboard(text)
      setCopied(mode)
      setTimeout(() => setCopied(null), 2000)
      setOpen(false)
    } catch {
      // Silently fail
    }
  }, [answer, sources])

  return (
    <div className="relative" ref={ref}>
      <ActionButton onClick={() => setOpen(!open)} label={copied ? 'Copied!' : 'Copy'}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      </ActionButton>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 min-w-[12rem] bg-white dark:bg-[#1a1a1a] border border-[var(--border-default)] rounded-spine shadow-lg py-1">
          <button
            onClick={() => handleCopy('formatted')}
            className="w-full text-left px-3 py-2 text-small hover:bg-[var(--surface-whisper)] text-[var(--text-primary)] transition-colors duration-[180ms]"
          >
            Copy with formatting
          </button>
          <button
            onClick={() => handleCopy('plain')}
            className="w-full text-left px-3 py-2 text-small hover:bg-[var(--surface-whisper)] text-[var(--text-primary)] transition-colors duration-[180ms]"
          >
            Copy as plain text
          </button>
          <button
            onClick={() => handleCopy('with-sources')}
            className="w-full text-left px-3 py-2 text-small hover:bg-[var(--surface-whisper)] text-[var(--text-primary)] transition-colors duration-[180ms]"
          >
            Copy with sources
          </button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// 2. Share
// ---------------------------------------------------------------------------

function ShareButton({
  messageId,
  query,
}: {
  messageId: string
  query: string
}) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>(
    'idle'
  )

  const handleShare = useCallback(async () => {
    setStatus('loading')
    try {
      const res = await phoenixGql(`mutation {
        createShareLink(messageId: ${JSON.stringify(messageId)}) { slug url }
      }`)
      const url = res.data.createShareLink.url
      const fullUrl = `${window.location.origin}${url}`

      // Prefer the native Web Share API (mobile), fall back to clipboard.
      if (navigator.share) {
        try {
          await navigator.share({ title: query, url: fullUrl })
          setStatus('idle')
          return
        } catch {
          // User cancelled or share failed -- fall through to clipboard.
        }
      }

      await copyToClipboard(fullUrl)
      setStatus('done')
      setTimeout(() => setStatus('idle'), 2000)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 2000)
    }
  }, [messageId, query])

  const label =
    status === 'loading'
      ? 'Sharing...'
      : status === 'done'
        ? 'Link copied!'
        : status === 'error'
          ? 'Error'
          : 'Share'

  return (
    <ActionButton
      onClick={handleShare}
      label={label}
      disabled={status === 'loading'}
    >
      {status === 'loading' ? (
        /* Spinner */
        <svg
          className="animate-spin"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" opacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" opacity="0.75" />
        </svg>
      ) : (
        /* Share / external link icon */
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      )}
    </ActionButton>
  )
}

// ---------------------------------------------------------------------------
// 3. Bookmark
// ---------------------------------------------------------------------------

function BookmarkButton({ messageId }: { messageId: string }) {
  const [bookmarked, setBookmarked] = useState(false)
  const [loaded, setLoaded] = useState(false)

  // Check initial bookmark state on mount.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await phoenixGql(`{
          bookmark(messageId: ${JSON.stringify(messageId)}) { id }
        }`)
        if (!cancelled) {
          setBookmarked(!!res.data.bookmark)
          setLoaded(true)
        }
      } catch {
        // If the query fails (e.g. no bookmark schema yet), just show unbookmarked.
        if (!cancelled) setLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [messageId])

  const handleToggle = useCallback(async () => {
    // Optimistic update
    const prev = bookmarked
    setBookmarked(!prev)
    try {
      await phoenixGql(`mutation {
        toggleBookmark(messageId: ${JSON.stringify(messageId)}) { bookmarked }
      }`)
    } catch {
      // Revert on failure
      setBookmarked(prev)
    }
  }, [messageId, bookmarked])

  if (!loaded) return null

  return (
    <ActionButton
      onClick={handleToggle}
      label={bookmarked ? 'Bookmarked' : 'Bookmark'}
      active={bookmarked}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={bookmarked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    </ActionButton>
  )
}

// ---------------------------------------------------------------------------
// 4. Export PDF
// ---------------------------------------------------------------------------

function ExportPdfButton({
  answer,
  query,
  sources,
}: {
  answer: string
  query: string
  sources: Source[]
}) {
  const [exporting, setExporting] = useState(false)

  const handleExport = useCallback(async () => {
    setExporting(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })

      const margin = 20
      const pageWidth = doc.internal.pageSize.getWidth() - margin * 2
      let y = margin

      // Helper: add text with automatic page breaks.
      const addText = (
        text: string,
        fontSize: number,
        style: 'normal' | 'bold' = 'normal'
      ) => {
        doc.setFontSize(fontSize)
        doc.setFont('helvetica', style)
        const lines = doc.splitTextToSize(text, pageWidth)
        for (const line of lines) {
          if (y > doc.internal.pageSize.getHeight() - margin) {
            doc.addPage()
            y = margin
          }
          doc.text(line, margin, y)
          y += fontSize * 0.5
        }
      }

      // Title
      addText(query, 16, 'bold')
      y += 4

      // Body
      const plainText = stripMarkdown(answer)
      addText(plainText, 11)
      y += 6

      // Sources as numbered references
      if (sources.length > 0) {
        addText('References', 13, 'bold')
        y += 2
        sources.forEach((src, idx) => {
          const title = src.metadata?.title || src.metadata?.url || 'Source'
          const url = src.metadata?.url || ''
          addText(`[${idx + 1}] ${title} — ${url}`, 9)
        })
      }

      const filename = `perplexica-${slugify(query) || 'export'}.pdf`
      doc.save(filename)
    } catch {
      // PDF generation failed -- nothing critical, just skip.
    } finally {
      setExporting(false)
    }
  }, [answer, query, sources])

  return (
    <ActionButton
      onClick={handleExport}
      label={exporting ? 'Exporting...' : 'PDF'}
      disabled={exporting}
    >
      {/* Document / download icon */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="12" y1="18" x2="12" y2="12" />
        <polyline points="9 15 12 18 15 15" />
      </svg>
    </ActionButton>
  )
}

function ExportMarkdownButton({
  answer,
  query,
  sources,
}: {
  answer: string
  query: string
  sources: Source[]
}) {
  const handleExport = useCallback(() => {
    let content = `# ${query}\n\n${answer}`
    if (sources.length > 0) {
      content += '\n\n---\n\n## Sources\n\n'
      sources.forEach((src, idx) => {
        const title = src.metadata?.title || 'Source'
        const url = src.metadata?.url || ''
        content += `${idx + 1}. [${title}](${url})\n`
      })
    }
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `perplexica-${slugify(query) || 'export'}.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [answer, query, sources])

  return (
    <ActionButton onClick={handleExport} label="Markdown">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    </ActionButton>
  )
}

// ---------------------------------------------------------------------------
// 5. Text-to-Speech
// ---------------------------------------------------------------------------

type TtsState = 'idle' | 'playing' | 'paused'

function TtsButton({ answer }: { answer: string }) {
  const [state, setState] = useState<TtsState>('idle')
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Feature detect -- if speechSynthesis is unavailable, render nothing.
  const supported =
    typeof window !== 'undefined' && 'speechSynthesis' in window

  // Clean up speech on unmount.
  useEffect(() => {
    return () => {
      if (supported) {
        window.speechSynthesis.cancel()
      }
    }
  }, [supported])

  const handleClick = useCallback(() => {
    if (!supported) return

    const synth = window.speechSynthesis

    if (state === 'playing') {
      synth.pause()
      setState('paused')
      return
    }

    if (state === 'paused') {
      synth.resume()
      setState('playing')
      return
    }

    // idle -- start fresh
    synth.cancel()
    const plain = stripMarkdown(answer)
    const utt = new SpeechSynthesisUtterance(plain)
    utt.onend = () => setState('idle')
    utt.onerror = () => setState('idle')
    utteranceRef.current = utt
    synth.speak(utt)
    setState('playing')
  }, [answer, state, supported])

  if (!supported) return null

  const label =
    state === 'playing' ? 'Pause' : state === 'paused' ? 'Resume' : 'Listen'

  return (
    <ActionButton onClick={handleClick} label={label}>
      {state === 'playing' ? (
        /* Pause icon */
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
          stroke="none"
        >
          <rect x="6" y="4" width="4" height="16" rx="1" />
          <rect x="14" y="4" width="4" height="16" rx="1" />
        </svg>
      ) : state === 'paused' ? (
        /* Play icon */
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
          stroke="none"
        >
          <polygon points="5,3 19,12 5,21" />
        </svg>
      ) : (
        /* Speaker icon */
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
      )}
    </ActionButton>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const AnswerActionBar = ({
  answer,
  query,
  messageId,
  chatId,
  sources,
}: Props) => {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <CopyButton answer={answer} sources={sources} />
      <ShareButton messageId={messageId} query={query} />
      <BookmarkButton messageId={messageId} />
      <ExportMarkdownButton answer={answer} query={query} sources={sources} />
      <ExportPdfButton answer={answer} query={query} sources={sources} />
      <TtsButton answer={answer} />
    </div>
  )
}

export default AnswerActionBar
