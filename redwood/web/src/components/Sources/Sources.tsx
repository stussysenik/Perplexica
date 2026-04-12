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
      className="group relative border border-[var(--border-default)] rounded-spine p-3
        hover:border-[var(--border-accent)] hover:bg-[var(--surface-whisper)] 
        transition-all duration-[240ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
    >
      {/* Visual Spine — replaced the side-stripe border with an absolute positioned element for better control */}
      <div className="absolute left-0 top-3 bottom-3 w-[2px] bg-[var(--border-accent)] opacity-0 group-hover:opacity-100 transition-opacity duration-240" />

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
                className="w-3.5 h-3.5 rounded-sm outline outline-1 outline-[var(--border-default)] grayscale group-hover:grayscale-0 transition-all duration-300"
                loading="lazy"
              />
            )}
            <span className="text-caption text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors normal-case tracking-normal">
              {isFile ? 'Uploaded file' : hostname}
            </span>
          </div>
          {/* Citation index */}
          <span className="ml-auto text-[10px] font-semibold text-[var(--text-accent)] bg-[var(--surface-whisper)] border border-[var(--border-accent)] rounded-[4px] w-5 h-5 flex items-center justify-center">
            {index}
          </span>
        </div>
        <p className="text-small font-semibold leading-tight line-clamp-2 text-[var(--text-primary)]">
          {title}
        </p>
      </a>

      {/* Collapsible extracted text */}
      {source.content && (
        <div className="mt-2.5 pt-2.5 border-t border-[var(--border-default)]">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-accent)] hover:underline underline-offset-2"
          >
            {expanded ? 'Hide full extract' : 'View full extract'}
          </button>
          {expanded && (
            <div className="mt-2 pl-3 text-[11px] leading-relaxed text-[var(--text-secondary)] border-l border-[var(--border-default)] max-h-32 overflow-y-auto scrollbar-thin">
              {source.content}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Sources
