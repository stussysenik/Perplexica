import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import type { Message } from 'src/lib/useSearch'
import { renderMarkdown } from 'src/lib/renderMarkdown'
import { variants, transition } from 'src/lib/motion'
import Sources from 'src/components/Sources/Sources'
import AnswerActionBar from 'src/components/Chat/AnswerActionBar'
import TableOfContents from 'src/components/Chat/TableOfContents'
import SearchProgress from 'src/components/Chat/SearchProgress'

interface Props {
  message: Message
  isLast: boolean
  loading: boolean
  chatId: string
  onSearch?: (query: string) => void
}

const MessageBox = ({ message, isLast, loading, chatId, onSearch }: Props) => {
  const isSearching = message.status === 'answering'
  const isError = message.status === 'error'
  const answerRef = useRef<HTMLDivElement>(null)

  // Delegated click handler for topic-links and citation badges
  useEffect(() => {
    const container = answerRef.current
    if (!container) return

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement

      const topicEl = target.classList.contains('topic-link')
        ? target
        : target.closest<HTMLElement>('.topic-link')

      if (topicEl) {
        const topic = topicEl.dataset.topic
        if (topic && onSearch) {
          e.preventDefault()
          onSearch(topic)
          return
        }
      }

      const supEl = target.closest<HTMLElement>('sup')
      if (supEl) {
        const citationIndex = supEl.textContent?.trim()
        if (citationIndex && /^\d+$/.test(citationIndex)) {
          e.preventDefault()
          const sourceEl = document.getElementById(`source-${citationIndex}`)
          sourceEl?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          sourceEl?.classList.add('ring-2', 'ring-[var(--border-accent)]', 'ring-offset-2')
          setTimeout(() => {
            sourceEl?.classList.remove('ring-2', 'ring-[var(--border-accent)]', 'ring-offset-2')
          }, 1500)
        }
      }
    }

    container.addEventListener('click', handleClick)
    return () => container.removeEventListener('click', handleClick)
  }, [onSearch])

  return (
    <motion.div
      className="max-w-3xl mx-auto pb-8"
      variants={variants.slideUp}
      initial="initial"
      animate="animate"
      transition={transition.normal}
    >
      {/* Query title */}
      <h2 className="text-h1 tracking-tight text-[var(--text-primary)] mb-6" style={{ textWrap: 'balance' }}>
        {message.query}
      </h2>

      {/* Search progress — real-time staged indicators */}
      {isSearching && isLast && (
        <SearchProgress
          phase={message.phase || 'classifying'}
          sourceCount={message.sourceCount || 0}
        />
      )}

      {/* Sources */}
      {message.sources.length > 0 && (
        <div className="mb-6">
          <Sources sources={message.sources} />
        </div>
      )}

      {/* Answer */}
      {message.answer && (
        <div className="space-y-4">
          {isError ? (
            <div className="p-4 border border-red-500/30 bg-red-500/5 rounded-spine text-small text-red-700 dark:text-red-400">
              {message.answer}
            </div>
          ) : (
            <>
              {message.status === 'completed' && (
                <TableOfContents
                  markdown={message.answer}
                  containerRef={answerRef}
                />
              )}

              <div
                ref={answerRef}
                className="prose prose-gray dark:prose-invert max-w-none
                  prose-headings:tracking-tight prose-headings:font-semibold
                  prose-h2:text-h3 prose-h2:mt-6 prose-h2:mb-2
                  prose-h3:text-body prose-h3:font-semibold
                  prose-p:text-body prose-p:leading-relaxed prose-p:[text-wrap:pretty]
                  prose-li:text-body
                  prose-a:text-[var(--text-accent)] prose-a:no-underline hover:prose-a:underline
                  prose-strong:font-semibold
                  prose-code:text-small prose-code:bg-[var(--surface-secondary)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-[2px] prose-code:border prose-code:border-[var(--border-default)]
                  prose-pre:bg-[var(--surface-secondary)] prose-pre:border prose-pre:border-[var(--border-default)] prose-pre:rounded-spine
                  prose-blockquote:border-[var(--border-accent)] prose-blockquote:text-[var(--text-secondary)]
                  prose-table:text-small
                  prose-th:bg-[var(--surface-secondary)]
                  prose-td:border-[var(--border-default)]
                  prose-th:border-[var(--border-default)]
                "
                dangerouslySetInnerHTML={{ __html: renderMarkdown(message.answer) }}
              />
            </>
          )}
        </div>
      )}

      {/* Action bar */}
      {message.status === 'completed' && message.answer && (
        <div className="mt-4 pt-4 border-t border-[var(--border-default)]">
          <AnswerActionBar
            answer={message.answer}
            query={message.query}
            messageId={message.messageId}
            chatId={chatId}
            sources={message.sources}
          />
        </div>
      )}
    </motion.div>
  )
}

export default MessageBox
