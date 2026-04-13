import { navigate, routes } from '@redwoodjs/router'
import {
  ArrowLeft,
  Monitor,
  Sun,
  Moon,
  GithubLogo,
  SignOut,
} from '@phosphor-icons/react'
import {
  useSettings,
  useUpdateSettings,
  type DefaultMode,
  type ThemePreference,
} from 'src/lib/settings'
import { useSession } from 'src/lib/session'
import ModeConfigCard from 'src/pages/SettingsPage/ModeConfigCard'

const APPEARANCE_OPTIONS: {
  key: ThemePreference
  label: string
  icon: typeof Monitor
  caption: string
}[] = [
  { key: 'system', label: 'System', icon: Monitor, caption: 'Follow OS' },
  { key: 'light', label: 'Light', icon: Sun, caption: 'Always light' },
  { key: 'dark', label: 'Dark', icon: Moon, caption: 'Always dark' },
]

const MODE_OPTIONS: {
  key: DefaultMode
  label: string
  hint: string
}[] = [
  { key: 'speed', label: 'Speed', hint: 'Fast single-pass search, one web round. ~7s budget.' },
  { key: 'balanced', label: 'Balanced', hint: 'Two research rounds with cross-checking. ~16s budget.' },
  { key: 'quality', label: 'Quality', hint: 'Deep multi-round research, reading sources. ~35s budget.' },
]

function goBack() {
  if (typeof window !== 'undefined' && window.history.length > 1) {
    window.history.back()
  } else {
    navigate(routes.home())
  }
}

export default function SettingsPage() {
  const settings = useSettings()
  const { setDefaultMode, setTheme } = useUpdateSettings()
  const session = useSession()

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--surface-primary)]">
      <div className="max-w-2xl mx-auto w-full px-4 md:px-8 py-6 md:py-10">
        <header className="flex items-center gap-3 mb-8">
          <button
            type="button"
            onClick={goBack}
            className="flex items-center justify-center w-10 h-10 rounded-spine text-[var(--text-muted)] hover:text-[var(--text-accent)] hover:bg-[var(--surface-whisper)] transition-colors duration-[180ms]"
            aria-label="Go back"
          >
            <ArrowLeft size={18} weight="light" />
          </button>
          <h1 className="text-h2 font-semibold tracking-tight text-[var(--text-primary)]">
            Settings
          </h1>
        </header>

        {/* Account */}
        <section className="border border-[var(--border-default)] rounded-spine p-5 mb-6">
          <h2 className="text-small font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-4">
            Account
          </h2>
          <div className="flex items-center gap-4">
            {session.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.avatarUrl}
                alt={`${session.username ?? 'User'} avatar`}
                className="w-10 h-10 rounded-full border border-[var(--border-default)]"
              />
            ) : (
              <div className="w-10 h-10 rounded-full border border-[var(--border-default)] flex items-center justify-center text-[var(--text-muted)]">
                <GithubLogo size={18} weight="light" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-body font-semibold text-[var(--text-primary)] truncate">
                {session.username ?? 'Not signed in'}
              </div>
              <div className="text-small text-[var(--text-muted)]">Signed in via GitHub</div>
            </div>
            <button
              type="button"
              onClick={() => session.signOut()}
              className="inline-flex items-center gap-1.5 text-small text-[var(--text-secondary)] hover:text-[var(--text-danger)] transition-colors duration-[180ms]"
            >
              <SignOut size={14} weight="light" />
              Sign out
            </button>
          </div>
        </section>

        {/* Appearance */}
        <section className="border border-[var(--border-default)] rounded-spine p-5 mb-6">
          <h2 className="text-small font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-4">
            Appearance
          </h2>
          <div
            role="radiogroup"
            aria-label="Theme preference"
            className="grid grid-cols-3 gap-2"
          >
            {APPEARANCE_OPTIONS.map(({ key, label, icon: Icon, caption }) => {
              const active = settings.theme === key
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-pressed={active}
                  onClick={() => setTheme(key)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-spine border transition-colors duration-[180ms] ${
                    active
                      ? 'border-[var(--border-accent)] text-[var(--text-accent)] bg-[var(--surface-whisper)]'
                      : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-accent)]'
                  }`}
                >
                  <Icon size={20} weight={active ? 'regular' : 'light'} />
                  <div className="text-small font-medium">{label}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">{caption}</div>
                </button>
              )
            })}
          </div>
        </section>

        {/* Search defaults */}
        <section className="border border-[var(--border-default)] rounded-spine p-5 mb-6">
          <h2 className="text-small font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-4">
            Search defaults
          </h2>
          <div role="radiogroup" aria-label="Default search mode" className="flex flex-col gap-2">
            {MODE_OPTIONS.map(({ key, label, hint }) => {
              const active = settings.defaultMode === key
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setDefaultMode(key)}
                  className={`flex items-start gap-3 p-3 rounded-spine border text-left transition-colors duration-[180ms] ${
                    active
                      ? 'border-[var(--border-accent)] bg-[var(--surface-whisper)]'
                      : 'border-[var(--border-default)] hover:border-[var(--border-accent)]'
                  }`}
                >
                  <span
                    aria-hidden
                    className={`mt-1 w-3 h-3 rounded-full border ${
                      active
                        ? 'border-[var(--border-accent)] bg-[var(--text-accent)]'
                        : 'border-[var(--border-default)]'
                    }`}
                  />
                  <div className="flex-1">
                    <div
                      className={`text-body font-semibold ${
                        active ? 'text-[var(--text-accent)]' : 'text-[var(--text-primary)]'
                      }`}
                    >
                      {label}
                    </div>
                    <div className="text-small text-[var(--text-muted)]">{hint}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* Mode config — backend-persisted iteration + budget per mode */}
        <ModeConfigCard />
      </div>
    </div>
  )
}
