import { useEffect, useRef, useState } from 'react'
import { ArrowCounterClockwise, Check, Warning } from '@phosphor-icons/react'
import {
  useModeConfigs,
  useUpdateModeConfig,
  useResetModeConfig,
  type ModeConfig,
  type ModeKey,
} from 'src/lib/modeConfig'

const MODE_COPY: Record<ModeKey, { name: string; description: string }> = {
  speed: {
    name: 'Speed',
    description: 'Fast single-pass search, one web round.',
  },
  balanced: {
    name: 'Balanced',
    description: 'Two research rounds with cross-checking.',
  },
  quality: {
    name: 'Quality',
    description: 'Deep multi-round research, reading sources.',
  },
}

const MODE_ORDER: ModeKey[] = ['speed', 'balanced', 'quality']

export default function ModeConfigCard() {
  const { configs, loading, error, refetch } = useModeConfigs()

  return (
    <section className="border border-[var(--border-default)] rounded-spine p-5 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-small font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Search Modes
          </h2>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">
            Tune iteration cap and soft time budget per mode. Changes apply to
            the next search.
          </p>
        </div>
      </div>

      {loading && configs.length === 0 ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-16 rounded-spine border border-[var(--border-default)] animate-pulse bg-[var(--surface-whisper)]"
            />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center justify-between gap-3 p-3 rounded-spine border border-[var(--border-danger)]">
          <div className="flex items-center gap-2 text-small text-[var(--text-danger)]">
            <Warning size={14} weight="light" />
            Failed to load mode config.
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-small text-[var(--text-accent)] hover:underline"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {MODE_ORDER.map((modeKey) => {
            const config =
              configs.find((c) => c.mode === modeKey) ?? fallbackFor(modeKey)
            return <ModeConfigRow key={modeKey} config={config} />
          })}
        </div>
      )}
    </section>
  )
}

function fallbackFor(mode: ModeKey): ModeConfig {
  const defaults: Record<ModeKey, { maxIterations: number; budgetMs: number }> = {
    speed: { maxIterations: 2, budgetMs: 7_000 },
    balanced: { maxIterations: 6, budgetMs: 16_000 },
    quality: { maxIterations: 25, budgetMs: 35_000 },
  }
  return { mode, ...defaults[mode] }
}

interface RowProps {
  config: ModeConfig
}

function ModeConfigRow({ config }: RowProps) {
  const [iterations, setIterations] = useState(config.maxIterations)
  const [budgetSeconds, setBudgetSeconds] = useState(config.budgetMs / 1000)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [fieldError, setFieldError] = useState<string | null>(null)

  const [updateMutation] = useUpdateModeConfig()
  const [resetMutation] = useResetModeConfig()

  // Rehydrate local state when the server-side value changes (e.g. after
  // another tab or a successful mutation refetch).
  useEffect(() => {
    setIterations(config.maxIterations)
    setBudgetSeconds(config.budgetMs / 1000)
  }, [config.maxIterations, config.budgetMs])

  // Debounced save — 500 ms after the last keystroke on either input.
  const latestRef = useRef({ iterations, budgetSeconds })
  latestRef.current = { iterations, budgetSeconds }

  useEffect(() => {
    const unchanged =
      iterations === config.maxIterations &&
      Math.round(budgetSeconds * 1000) === config.budgetMs
    if (unchanged) return

    setStatus('saving')
    setFieldError(null)

    const timer = window.setTimeout(async () => {
      try {
        await updateMutation({
          variables: {
            mode: config.mode,
            maxIterations: latestRef.current.iterations,
            budgetMs: Math.round(latestRef.current.budgetSeconds * 1000),
          },
        })
        setStatus('saved')
        window.setTimeout(() => setStatus('idle'), 1500)
      } catch (err: unknown) {
        setStatus('error')
        const message = err instanceof Error ? err.message : 'Save failed'
        setFieldError(message)
      }
    }, 500)

    return () => window.clearTimeout(timer)
  }, [iterations, budgetSeconds, config.maxIterations, config.budgetMs, config.mode, updateMutation])

  const copy = MODE_COPY[config.mode]

  const handleReset = async () => {
    try {
      await resetMutation({ variables: { mode: config.mode } })
      setStatus('saved')
      window.setTimeout(() => setStatus('idle'), 1500)
    } catch (err: unknown) {
      setStatus('error')
      setFieldError(err instanceof Error ? err.message : 'Reset failed')
    }
  }

  return (
    <div className="p-3 rounded-spine border border-[var(--border-default)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-body font-semibold text-[var(--text-primary)]">
            {copy.name}
          </div>
          <div className="text-small text-[var(--text-muted)]">
            {copy.description}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status === 'saving' && (
            <span className="text-[10px] text-[var(--text-muted)]">Saving…</span>
          )}
          {status === 'saved' && (
            <span className="inline-flex items-center gap-1 text-[10px] text-[var(--text-accent)]">
              <Check size={12} weight="bold" />
              Saved
            </span>
          )}
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center justify-center w-8 h-8 rounded-spine text-[var(--text-muted)] hover:text-[var(--text-accent)] hover:bg-[var(--surface-whisper)] transition-colors duration-[180ms]"
            aria-label={`Reset ${copy.name} to defaults`}
          >
            <ArrowCounterClockwise size={14} weight="light" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            Iterations
          </span>
          <input
            type="number"
            min={1}
            max={50}
            step={1}
            value={iterations}
            onChange={(e) => setIterations(Number(e.target.value))}
            className="px-3 py-2 rounded-spine border border-[var(--border-default)] bg-transparent text-body text-[var(--text-primary)] focus:border-[var(--border-accent)] outline-none transition-colors duration-[180ms]"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            Budget (seconds)
          </span>
          <input
            type="number"
            min={1}
            max={120}
            step={0.5}
            value={Number(budgetSeconds.toFixed(1))}
            onChange={(e) => setBudgetSeconds(Number(e.target.value))}
            className="px-3 py-2 rounded-spine border border-[var(--border-default)] bg-transparent text-body text-[var(--text-primary)] focus:border-[var(--border-accent)] outline-none transition-colors duration-[180ms]"
          />
        </label>
      </div>

      {fieldError && (
        <div className="mt-2 text-small text-[var(--text-danger)]" role="alert">
          {fieldError}
        </div>
      )}
    </div>
  )
}
