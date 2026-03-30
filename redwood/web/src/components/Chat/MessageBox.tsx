import type { Message } from 'src/lib/useSearch'
import Sources from 'src/components/Sources/Sources'

interface Props {
  message: Message
  isLast: boolean
  loading: boolean
}

const MessageBox = ({ message, isLast, loading }: Props) => {
  const isSearching = message.status === 'answering'
  const isError = message.status === 'error'

  return (
    <div className="max-w-3xl mx-auto pb-8">
      {/* Query title */}
      <h2 className="text-2xl lg:text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 mb-6">
        {message.query}
      </h2>

      {/* Loading indicator */}
      {isSearching && isLast && (
        <div className="flex items-center gap-3 mb-6">
          <div className="relative">
            <div className="w-5 h-5 border-2 border-stone-200 dark:border-stone-700 border-t-cyan-500 rounded-full animate-spin" />
          </div>
          <span className="text-sm text-stone-500 dark:text-stone-400 font-medium animate-pulse">
            Searching the web and generating answer...
          </span>
        </div>
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
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
              {message.answer}
            </div>
          ) : (
            <div
              className="prose prose-stone dark:prose-invert max-w-none
                prose-headings:tracking-tight prose-headings:font-semibold
                prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-2
                prose-h3:text-base
                prose-p:text-[15px] prose-p:leading-relaxed
                prose-li:text-[15px]
                prose-a:text-cyan-600 dark:prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline
                prose-strong:font-semibold
                prose-code:text-sm prose-code:bg-light-200 dark:prose-code:bg-dark-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                prose-pre:bg-light-secondary dark:prose-pre:bg-dark-100 prose-pre:border prose-pre:border-light-200 dark:prose-pre:border-dark-200 prose-pre:rounded-xl
                prose-blockquote:border-cyan-400 prose-blockquote:text-stone-600 dark:prose-blockquote:text-stone-400
                prose-table:text-sm
                prose-th:bg-light-secondary dark:prose-th:bg-dark-100
                prose-td:border-light-200 dark:prose-td:border-dark-200
                prose-th:border-light-200 dark:prose-th:border-dark-200
              "
              dangerouslySetInnerHTML={{ __html: renderMarkdown(message.answer) }}
            />
          )}
        </div>
      )}
    </div>
  )
}

function renderMarkdown(text: string): string {
  if (!text) return ''
  return text
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    // Citation references [1], [2] etc — style as superscript badges
    .replace(/\[(\d+)\]/g, '<sup class="inline-flex items-center justify-center w-4 h-4 text-[9px] font-bold rounded bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 ml-0.5 cursor-default">$1</sup>')
    // Tables
    .replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match.split('|').filter(c => c.trim())
      if (cells.every(c => /^[\s-:]+$/.test(c))) return ''
      const isHeader = cells.some(c => /^-+$/.test(c.trim()))
      if (isHeader) return ''
      const tag = 'td'
      return '<tr>' + cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join('') + '</tr>'
    })
    .replace(/(<tr>[\s\S]*?<\/tr>\n?)+/g, '<table><tbody>$&</tbody></table>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>')
    // Paragraphs (lines not already wrapped)
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hupoltb])((?!<\/).+)$/gm, '<p>$1</p>')
    // Clean up
    .replace(/<p><\/p>/g, '')
}

export default MessageBox
