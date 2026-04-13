/**
 * SearchProgress — live, staged progress indicator for a running search.
 *
 * Three layers of feedback, from slow to fast:
 *
 *   1. Phase dots          (classify → search → analyze → write)
 *   2. Creative ticker     (rotating product-voice lines per phase)
 *   3. Substep peek        (last concrete signal from the pipeline, if any)
 *
 * Plus a live ETA derived from the mode-specific budget and elapsed wall time.
 * The budget numbers below are grounded in measured speed-mode runs (~6s) and
 * extrapolated for balanced / quality until we collect real telemetry.
 */

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { SearchSubStep } from 'src/lib/useSearch'

export type SearchPhase =
  | 'classifying'
  | 'searching'
  | 'analyzing'
  | 'writing'
  | 'complete'
  | 'error'

export type SearchMode = 'speed' | 'balanced' | 'quality'

interface Props {
  phase: SearchPhase
  sourceCount: number
  subSteps?: SearchSubStep[]
  startedAt?: number
  mode?: SearchMode
}

const phaseOrder: SearchPhase[] = ['classifying', 'searching', 'analyzing', 'writing']

/** Creative, product-voice ticker lines per phase. Rotates every 1.8s. */
const tickerLines: Record<Exclude<SearchPhase, 'complete' | 'error'>, string[]> = {
  classifying: [
    'Parsing your intent…',
    'Shaping the question…',
    'Picking the right lens…',
    'Reading between the lines…',
  ],
  searching: [
    'Casting a wide net…',
    'Scanning the open web…',
    'Consulting the index…',
    'Pulling in fresh sources…',
    'Chasing the primary sources…',
  ],
  analyzing: [
    'Reading carefully…',
    'Cross-referencing claims…',
    'Weighing the evidence…',
    'Spotting contradictions…',
    'Ranking relevance…',
  ],
  writing: [
    'Drafting the answer…',
    'Threading the citations…',
    'Polishing the prose…',
    'Tightening the logic…',
  ],
}

/**
 * Budget in milliseconds per optimization mode. These are targets used to
 * project an ETA — if the real run overruns, the UI shows `over` instead
 * of hiding the "time left" half.
 */
const modeBudgetMs: Record<SearchMode, number> = {
  speed: 7000,
  balanced: 16000,
  quality: 35000,
}

const SearchProgress = ({ phase, sourceCount, subSteps = [], startedAt, mode = 'speed' }: Props) => {
  void sourceCount
  // Wall-clock tick — drives both ETA and the creative ticker rotation.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (phase === 'complete' || phase === 'error') return
    const id = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(id)
  }, [phase])

  const currentIdx = phaseOrder.indexOf(phase)

  // Creative ticker: rotate every 1.8s within the same phase.
  const ticker = useMemo(() => {
    if (phase === 'complete' || phase === 'error') return ''
    const pool = tickerLines[phase] || []
    if (pool.length === 0) return ''
    const step = Math.floor((now / 1800) % pool.length)
    return pool[step]
  }, [phase, now])

  // Substep peek: the concrete current action, if the pipeline has emitted one.
  const peek = useMemo(() => {
    const last = subSteps[subSteps.length - 1]
    if (!last) return null
    if (last.type === 'searching') {
      const q = (last.data as string[] | undefined)?.[0]
      return q ? `Searching "${q}"` : null
    }
    if (last.type === 'searchResults') {
      const n = Array.isArray(last.data) ? last.data.length : 0
      return n > 0 ? `Pulled ${n} source${n === 1 ? '' : 's'}` : null
    }
    if (last.type === 'reading') {
      const urls = (last.data as string[] | undefined) || []
      try {
        const host = urls[0] ? new URL(urls[0]).hostname.replace('www.', '') : null
        return host ? `Reading ${host}` : null
      } catch {
        return 'Reading source'
      }
    }
    if (last.type === 'reasoning') {
      return typeof last.data === 'string' ? last.data : 'Reasoning through the findings'
    }
    return null
  }, [subSteps])

  // ETA: signed remaining seconds against the mode budget. Positive means
  // "time left"; zero or negative means we're past the budget and the UI
  // renders an `over` badge instead of hiding the right half entirely.
  const eta = useMemo(() => {
    if (!startedAt) return null
    const budget = modeBudgetMs[mode]
    const elapsed = now - startedAt
    return Math.round((budget - elapsed) / 1000)
  }, [startedAt, now, mode])

  if (phase === 'complete' || phase === 'error') return null

  // Prefer concrete substep peek over creative ticker when both exist — the
  // real pipeline signal is more useful once it's arrived. Always have a
  // headline so the layout row never collapses to empty.
  const headline = peek || ticker || 'Warming up the pipeline…'
  const elapsedSec = startedAt ? Math.max(0, Math.round((now - startedAt) / 1000)) : null

  return (
    <div className="mb-6 flex flex-col items-start" role="status" aria-live="polite">
      {/* Phase dots + labels */}
      <div className="flex items-center gap-2 mb-3">
        {phaseOrder.map((p, idx) => {
          const isActive = idx === currentIdx
          const isComplete = idx < currentIdx

          return (
            <div key={p} className="flex items-center gap-2">
              {idx > 0 && (
                <div
                  className={`w-6 h-px transition-all duration-500 ${
                    isComplete || isActive ? 'bg-[var(--text-accent)] opacity-40' : 'bg-[var(--border-default)]'
                  }`}
                />
              )}
              <motion.div
                initial={false}
                animate={{
                  scale: isActive ? 1.25 : 1,
                  backgroundColor: isComplete
                    ? 'var(--text-accent)'
                    : isActive
                    ? 'var(--text-highlight)'
                    : 'var(--border-default)',
                }}
                className={`w-2 h-2 rounded-full ${isActive ? 'shadow-[0_0_10px_var(--text-highlight)]' : ''}`}
              />
            </div>
          )
        })}
      </div>

      {/* Single line: creative ticker (or concrete peek) + faded elapsed/ETA */}
      <div className="min-h-[1.25rem] w-full flex items-center gap-3 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={headline}
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -8, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="text-small text-[var(--text-primary)] font-medium tracking-tight truncate flex-1 min-w-0"
          >
            {headline}
          </motion.p>
        </AnimatePresence>

        {elapsedSec !== null && (
          <span className="shrink-0 text-[11px] font-medium tracking-tight text-[var(--text-muted)] tabular-nums whitespace-nowrap">
            <span>{elapsedSec}s</span>
            {eta !== null && (
              <>
                <span className="opacity-40 mx-1.5">·</span>
                {eta > 0 ? (
                  <span>~{eta}s left</span>
                ) : (
                  <span className="text-[var(--text-highlight)]">over</span>
                )}
              </>
            )}
          </span>
        )}
      </div>
    </div>
  )
}

export default SearchProgress
