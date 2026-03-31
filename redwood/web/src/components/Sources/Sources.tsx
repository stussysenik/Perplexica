import { useState } from 'react'
import { motion } from 'framer-motion'
import type { Source } from 'src/lib/useSearch'
import { variants, transition } from 'src/lib/motion'
import TextAction from 'src/components/ui/TextAction'

interface Props {
  sources: Source[]
}

const Sources = ({ sources }: Props) => {
  const [showAll, setShowAll] = useState(false)
  const displayed = showAll ? sources : sources.slice(0, 4)

  if (sources.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-caption text-[var(--text-muted)]">
          Sources
        </span>
        <span className="text-caption text-[var(--text-muted)] font-normal normal-case tracking-normal">
          ({sources.length})
        </span>
      </div>

      <motion.div
        variants={variants.stagger}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-2"
      >
        {displayed.map((source, idx) => (
          <motion.div key={idx} variants={variants.slideUp} transition={transition.normal}>
            <SourceCard source={source} index={idx + 1} />
          </motion.div>
        ))}
      </motion.div>

      {sources.length > 4 && (
        <TextAction
          onClick={() => setShowAll(!showAll)}
          label={showAll ? 'Show less' : `View ${sources.length - 4} more sources`}
          variant="accent"
        />
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
    <div
      id={`source-${index}`}
      className="border border-[var(--border-default)] border-l-[3px] border-l-[var(--border-accent)] rounded-spine p-3
        hover:bg-[var(--surface-whisper)] transition-colors duration-[180ms]"
    >
      <a
        href={isFile ? undefined : url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <div className="flex items-start gap-2 mb-1.5">
          {/* Favicon + domain (Caption style) */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {!isFile && hostname && (
              <img
                src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=16`}
                alt=""
                className="w-3.5 h-3.5 rounded-sm outline outline-1 outline-[var(--border-default)]"
                loading="lazy"
              />
            )}
            <span className="text-caption text-[var(--text-muted)] normal-case tracking-normal">
              {isFile ? 'Uploaded file' : hostname}
            </span>
          </div>
          {/* Citation index */}
          <span className="ml-auto text-[10px] font-medium text-[var(--text-accent)] border border-[var(--border-accent)] rounded-[3px] px-1 leading-[18px]">
            {index}
          </span>
        </div>
        <p className="text-small font-semibold leading-tight line-clamp-2 text-[var(--text-primary)]">
          {title}
        </p>
      </a>

      {/* Collapsible extracted text */}
      {source.content && (
        <div className="mt-2 pt-2 border-t border-[var(--border-default)]">
          <TextAction
            onClick={() => setExpanded(!expanded)}
            label={expanded ? 'Hide extracted text' : 'View extracted text'}
            variant="accent"
            className="text-[10px]"
          />
          {expanded && (
            <div className="mt-1.5 pl-3 text-[11px] leading-relaxed text-[var(--text-secondary)] border-l-[2px] border-l-[var(--border-accent)] max-h-32 overflow-y-auto">
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
