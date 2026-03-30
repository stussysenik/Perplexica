import { useState } from 'react'
import type { Source } from 'src/lib/useSearch'

interface Props {
  sources: Source[]
}

const Sources = ({ sources }: Props) => {
  const [showAll, setShowAll] = useState(false)
  const displayed = showAll ? sources : sources.slice(0, 4)

  if (sources.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-stone-700 dark:text-stone-300">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        Sources
        <span className="text-xs font-normal text-stone-400">({sources.length})</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {displayed.map((source, idx) => (
          <SourceCard key={idx} source={source} index={idx + 1} />
        ))}
      </div>

      {sources.length > 4 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline font-medium"
        >
          {showAll ? 'Show less' : `View ${sources.length - 4} more sources`}
        </button>
      )}
    </div>
  )
}

function SourceCard({ source, index }: { source: Source; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const url = source.metadata?.url || ''
  const title = source.metadata?.title || url
  const hostname = url ? new URL(url).hostname.replace('www.', '') : ''
  const isFile = url.startsWith('file_id://')

  return (
    <div className="bg-light-100 dark:bg-dark-100 border border-light-200 dark:border-dark-200 rounded-xl p-3 hover:bg-light-200/60 dark:hover:bg-dark-200/40 transition-colors group">
      <a
        href={isFile ? undefined : url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <div className="flex items-start gap-2 mb-1">
          <span className="flex-shrink-0 w-5 h-5 rounded-md bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 text-[10px] font-bold flex items-center justify-center">
            {index}
          </span>
          <p className="text-xs font-semibold leading-tight line-clamp-2 text-stone-800 dark:text-stone-200">
            {title}
          </p>
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          {!isFile && hostname && (
            <img
              src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=16`}
              alt=""
              className="w-3.5 h-3.5 rounded"
              loading="lazy"
            />
          )}
          <span className="text-[10px] text-stone-400 dark:text-stone-500 truncate">
            {isFile ? '📎 Uploaded file' : hostname}
          </span>
        </div>
      </a>

      {/* Collapsible extracted text — Perplexity-style traceability */}
      {source.content && (
        <div className="mt-2 border-t border-light-200 dark:border-dark-200 pt-2">
          <button
            onClick={(e) => { e.preventDefault(); setExpanded(!expanded) }}
            className="text-[10px] font-medium text-blue-500 hover:text-blue-400 transition-colors"
          >
            {expanded ? 'Hide extracted text' : 'View extracted text'}
          </button>
          {expanded && (
            <div className="mt-1.5 p-2 text-[11px] leading-relaxed text-stone-600 dark:text-stone-400 bg-light-200/50 dark:bg-dark-200/50 rounded-lg border-l-2 border-blue-400/50 max-h-32 overflow-y-auto">
              {source.content.slice(0, 300)}
              {source.content.length > 300 && '...'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Sources
