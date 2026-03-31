/**
 * SearchProgress — staged progress indicator for real-time search.
 *
 * Shows the current phase of the search pipeline:
 *   1. Classifying query...
 *   2. Searching the web (N sources)...
 *   3. Analyzing sources...
 *   4. Writing answer...
 */

import { motion, AnimatePresence } from 'framer-motion'
import { variants, transition } from 'src/lib/motion'

export type SearchPhase =
  | 'classifying'
  | 'searching'
  | 'analyzing'
  | 'writing'
  | 'complete'
  | 'error'

interface Props {
  phase: SearchPhase
  sourceCount: number
}

const phaseLabels: Record<SearchPhase, string> = {
  classifying: 'Classifying query...',
  searching: 'Searching the web',
  analyzing: 'Analyzing sources...',
  writing: 'Writing answer...',
  complete: 'Complete',
  error: 'Error',
}

const phaseOrder: SearchPhase[] = ['classifying', 'searching', 'analyzing', 'writing']

const SearchProgress = ({ phase, sourceCount }: Props) => {
  if (phase === 'complete' || phase === 'error') return null

  const currentIdx = phaseOrder.indexOf(phase)
  const label = phase === 'searching' && sourceCount > 0
    ? `Searching the web (${sourceCount} sources found)...`
    : phaseLabels[phase]

  return (
    <div className="mb-6" role="status" aria-live="polite">
      {/* Progress dots */}
      <div className="flex items-center gap-2 mb-3">
        {phaseOrder.map((p, idx) => (
          <div key={p} className="flex items-center gap-2">
            {idx > 0 && (
              <div className={`w-6 h-px transition-colors duration-[180ms] ${idx <= currentIdx ? 'bg-[var(--border-accent)]' : 'bg-[var(--border-default)]'}`} />
            )}
            <div
              className={`w-2 h-2 rounded-full transition-colors duration-[180ms] ${
                idx < currentIdx
                  ? 'bg-[var(--text-accent)]'
                  : idx === currentIdx
                    ? 'bg-[var(--text-accent)] animate-pulse'
                    : 'bg-[var(--border-default)]'
              }`}
            />
          </div>
        ))}
      </div>

      {/* Current phase label */}
      <AnimatePresence mode="wait">
        <motion.p
          key={phase}
          {...variants.fadeIn}
          transition={transition.fast}
          className="text-small text-[var(--text-muted)]"
        >
          {label}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}

export default SearchProgress
