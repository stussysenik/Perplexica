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
  /**
   * Wall-clock ms when each substep first arrived, keyed by
   * `${type}:${hash(data)}`. Used to render per-step elapsed ("Reading
   * reuters.com · 2.4s") so the user sees what the pipeline is actually
   * waiting on in real time, not just a rotating ticker.
   */
  subStepArrivals?: Record<string, number>
  /** Name of the current Phoenix pipeline stage ("classifier" / "researcher" / "answer"). */
  currentStep?: string | null
  /** ms the current stage has been running, per the latest event. */
  currentStepElapsedMs?: number | null
  /** For error phase: name of the stage that failed. */
  failingStep?: string | null
  /** For error phase: ms elapsed in the failing stage when it threw. */
  failingElapsedMs?: number | null
  /** For error phase: the raw error message from the pipeline. */
  errorMessage?: string
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

const SearchProgress = ({
  phase,
  sourceCount,
  subSteps = [],
  startedAt,
  mode = 'speed',
  subStepArrivals,
  currentStep,
  currentStepElapsedMs,
  failingStep,
  failingElapsedMs,
  errorMessage,
}: Props) => {
  void sourceCount
  // Wall-clock tick — drives both ETA and the creative ticker rotation.
  // Keep ticking on error so the failure-state elapsed counter stays
  // accurate relative to `Date.now()` (no-op if nothing is reading it).
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (phase === 'complete') return
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

  // Substep peek: the concrete current action, if the pipeline has
  // emitted one. Returns an object `{label, elapsedSec}` so the view
  // can render "Reading reuters.com · 2.4s" — the elapsed bit is the
  // difference between "now" and when this substep first arrived in
  // `subStepArrivals`. That's what makes the progress feel real-time
  // instead of looking like a cycling ticker.
  const peek = useMemo(() => {
    const last = subSteps[subSteps.length - 1]
    if (!last) return null

    const keyBody = (() => {
      try {
        return typeof last.data === 'string'
          ? last.data
          : JSON.stringify(last.data ?? '').slice(0, 120)
      } catch {
        return ''
      }
    })()
    const key = `${last.type}:${keyBody}`
    const arrivedAt = subStepArrivals?.[key]
    const elapsedSec = arrivedAt
      ? Math.max(0, Math.round((now - arrivedAt) / 100) / 10)
      : null

    let label: string | null = null
    if (last.type === 'searching') {
      const q = (last.data as string[] | undefined)?.[0]
      label = q ? `Searching "${q}"` : null
    } else if (last.type === 'searchResults') {
      const n = Array.isArray(last.data) ? last.data.length : 0
      label = n > 0 ? `Pulled ${n} source${n === 1 ? '' : 's'}` : null
    } else if (last.type === 'reading') {
      const urls = (last.data as string[] | undefined) || []
      try {
        const host = urls[0] ? new URL(urls[0]).hostname.replace('www.', '') : null
        label = host ? `Reading ${host}` : null
      } catch {
        label = 'Reading source'
      }
    } else if (last.type === 'reasoning') {
      label = typeof last.data === 'string' ? last.data : 'Reasoning through the findings'
    }

    return label ? { label, elapsedSec } : null
  }, [subSteps, subStepArrivals, now])

  // ETA: signed remaining seconds against the mode budget. Positive means
  // "time left"; zero or negative means we're past the budget and the UI
  // renders an `over` badge instead of hiding the right half entirely.
  const eta = useMemo(() => {
    if (!startedAt) return null
    const budget = modeBudgetMs[mode]
    const elapsed = now - startedAt
    return Math.round((budget - elapsed) / 1000)
  }, [startedAt, now, mode])

  if (phase === 'complete') return null

  // ── Failure card ──────────────────────────────────────────
  // Shown when the Phoenix pipeline emits {:error, ...}. Carries the
  // exact stage that failed ("classifier" / "researcher" / "answer")
  // and how long that stage had been running when the crash happened,
  // plus the raw error message underneath. This is the "exactly when
  // it failed and in what step" the user asked for.
  if (phase === 'error') {
    const elapsedStr =
      typeof failingElapsedMs === 'number'
        ? `${(failingElapsedMs / 1000).toFixed(1)}s`
        : null

    const stepLabel = failingStep
      ? failingStep.charAt(0).toUpperCase() + failingStep.slice(1)
      : 'the pipeline'

    return (
      <div
        className="mb-6 border border-[var(--border-danger)] rounded-spine p-4 flex flex-col gap-2"
        role="alert"
        aria-live="assertive"
      >
        <div className="flex items-center gap-2">
          <span className="text-small font-semibold text-[var(--text-danger)] tracking-tight">
            ✕ Failed in {stepLabel}
            {elapsedStr ? ` after ${elapsedStr}` : ''}
          </span>
        </div>
        {errorMessage && (
          <p className="text-caption text-[var(--text-secondary)] leading-relaxed font-mono break-words">
            {errorMessage}
          </p>
        )}
      </div>
    )
  }

  // ── Active pipeline render ────────────────────────────────
  //
  // Prefer concrete substep peek over creative ticker when both exist —
  // the real pipeline signal is more useful once it's arrived. Always
  // have a headline so the layout row never collapses to empty.
  const peekLabel = peek?.label
  const peekElapsed = peek?.elapsedSec
  const headline = peekLabel || ticker || 'Warming up the pipeline…'
  const elapsedSec = startedAt ? Math.max(0, Math.round((now - startedAt) / 1000)) : null

  // "Waiting on X for Y.Ys" — the real-time stage hint. Only shown when
  // we don't have a concrete substep peek (the peek is even better, so
  // defer to it). Uses the Phoenix-reported `currentStepElapsedMs` if
  // available, otherwise falls back to client-side wall-clock.
  const stageHint = (() => {
    if (peekLabel) return null
    if (!currentStep) return null
    const ms =
      typeof currentStepElapsedMs === 'number' && currentStepElapsedMs > 0
        ? currentStepElapsedMs
        : null
    const tenths = ms !== null ? Math.max(0, Math.round(ms / 100) / 10) : null
    const pretty = currentStep.charAt(0).toUpperCase() + currentStep.slice(1)
    return tenths !== null ? `Waiting on ${pretty} · ${tenths}s` : `Waiting on ${pretty}`
  })()

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
            {typeof peekElapsed === 'number' && peekElapsed > 0 && (
              <span className="ml-2 text-[var(--text-muted)] tabular-nums">· {peekElapsed}s</span>
            )}
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

      {/* Real-time stage hint — shown only when there's no concrete peek,
          so the user still sees "Waiting on Classifier · 2.1s" during the
          initial classify phase before any substeps have been emitted. */}
      {stageHint && (
        <p className="mt-1 text-caption text-[var(--text-muted)] tabular-nums">
          {stageHint}
        </p>
      )}
    </div>
  )
}

export default SearchProgress
