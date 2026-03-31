/**
 * SharedPage -- read-only view of a shared answer.
 * Route: /s/{slug}
 * Standalone page (not wrapped in AppLayout).
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams } from '@redwoodjs/router'
import { phoenixGql } from 'src/lib/phoenix'
import { renderMarkdown } from 'src/lib/renderMarkdown'
import type { Source } from 'src/lib/useSearch'
import Sources from 'src/components/Sources/Sources'
import TextAction from 'src/components/ui/TextAction'
import { Copy, Link } from '@phosphor-icons/react'

interface SharedMessage {
  messageId: string
  status: string
  responseBlocks: any[]
}

type PageState = 'loading' | 'found' | 'not_found' | 'error'

const SharedPage = () => {
  const { slug } = useParams()
  const [state, setState] = useState<PageState>('loading')
  const [message, setMessage] = useState<SharedMessage | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!slug) { setState('not_found'); return }

    phoenixGql(`{
      sharedMessage(slug: ${JSON.stringify(slug)}) {
        messageId status responseBlocks
      }
    }`)
      .then(res => {
        const msg = res.data.sharedMessage
        if (msg) { setMessage(msg); setState('found') }
        else setState('not_found')
      })
      .catch(() => setState('not_found'))
  }, [slug])

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = window.location.href
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [])

  const blocks = message?.responseBlocks || []
  const sourceBlock = blocks.find((b: any) => b.type === 'source')
  const textBlock = blocks.find((b: any) => b.type === 'text')
  const sources: Source[] = sourceBlock?.data || []
  const answer: string = textBlock?.data || ''

  return (
    <div className="min-h-dvh bg-[var(--surface-primary)] text-[var(--text-primary)]">
      {/* Header — minimal, outline style */}
      <header className="border-b border-[var(--border-default)]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <span className="text-caption text-[var(--text-muted)] normal-case tracking-normal">
              Shared via <span className="font-semibold text-[var(--text-primary)]">Perplexica</span>
            </span>
          </a>

          {state === 'found' && (
            <TextAction
              onClick={handleCopyLink}
              icon={<Copy size={14} weight="light" />}
              label={copied ? 'Copied!' : 'Copy link'}
            />
          )}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Loading */}
        {state === 'loading' && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-5 h-5 border-2 border-[var(--border-muted)] border-t-[var(--border-accent)] rounded-full animate-spin mb-4" />
            <p className="text-small text-[var(--text-muted)]">Loading shared answer...</p>
          </div>
        )}

        {/* Not Found */}
        {state === 'not_found' && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Link size={32} weight="light" className="text-[var(--text-muted)] mb-4" />
            <h2 className="text-h3 text-[var(--text-primary)] mb-1">Link not found</h2>
            <p className="text-small text-[var(--text-muted)] max-w-sm">
              This shared link has expired or doesn't exist.
            </p>
            <TextAction href="/" label="Go to Perplexica" variant="accent" className="mt-6" />
          </div>
        )}

        {/* Found */}
        {state === 'found' && (
          <>
            {sources.length > 0 && (
              <div className="mb-6">
                <Sources sources={sources} />
              </div>
            )}

            {answer && (
              <div
                className="prose prose-gray dark:prose-invert max-w-none
                  prose-headings:tracking-tight prose-headings:font-semibold
                  prose-h2:text-h3 prose-h2:mt-6 prose-h2:mb-2
                  prose-p:text-body prose-p:leading-relaxed prose-p:[text-wrap:pretty]
                  prose-a:text-[var(--text-accent)] prose-a:no-underline hover:prose-a:underline
                  prose-code:text-small prose-code:bg-[var(--surface-secondary)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-[2px] prose-code:border prose-code:border-[var(--border-default)]
                  prose-pre:bg-[var(--surface-secondary)] prose-pre:border prose-pre:border-[var(--border-default)] prose-pre:rounded-spine
                  prose-blockquote:border-[var(--border-accent)] prose-blockquote:text-[var(--text-secondary)]
                "
                dangerouslySetInnerHTML={{ __html: renderMarkdown(answer) }}
              />
            )}

            {message?.status === 'error' && (
              <div className="p-4 border border-red-200 dark:border-red-800 border-l-[3px] border-l-red-500 rounded-spine text-small text-red-700 dark:text-red-300">
                This search encountered an error.
              </div>
            )}

            {/* Footer */}
            <div className="mt-12 pt-6 border-t border-[var(--border-default)] text-center">
              <p className="text-caption text-[var(--text-muted)] normal-case tracking-normal">
                Powered by{' '}
                <a href="/" className="text-[var(--text-accent)] hover:underline font-medium">
                  Perplexica
                </a>
                {' '}— research-grade search with source traceability
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default SharedPage
