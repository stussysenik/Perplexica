import type { ReactNode } from 'react'
import { GithubLogo, Sun, Moon } from '@phosphor-icons/react'
import { useSession } from 'src/lib/session'
import { phoenixUrl } from 'src/lib/phoenix'
import { useTheme } from 'src/lib/theme'

interface Props {
  children: ReactNode
}

function AuthThemeToggle() {
  const { theme, toggle } = useTheme()
  const nextLabel = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={nextLabel}
      title={nextLabel}
      className="fixed top-4 right-4 inline-flex items-center justify-center w-9 h-9 rounded-spine border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-whisper)] transition-colors duration-[180ms]"
    >
      {theme === 'dark' ? <Sun size={16} weight="regular" /> : <Moon size={16} weight="regular" />}
    </button>
  )
}

/**
 * Gate that renders either the app or the sign-in splash based on session
 * status. The splash is a full-page centered card with a GitHub anchor that
 * triggers the OAuth redirect flow on Phoenix.
 */
export default function SignInGate({ children }: Props) {
  const { status } = useSession()

  if (status === 'loading') {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--surface-primary)]">
        <AuthThemeToggle />
        <div
          className="w-5 h-5 border-2 border-[var(--border-muted)] border-t-[var(--border-accent)] rounded-full animate-spin"
          aria-label="Loading session"
        />
      </div>
    )
  }

  if (status === 'signed_out') {
    const signInHref = `${phoenixUrl}/auth/github`
    const authError = new URLSearchParams(window.location.search).get('auth_error')

    return (
      <div className="min-h-dvh flex items-center justify-center px-4 bg-[var(--surface-primary)]">
        <AuthThemeToggle />
        <div className="w-full max-w-md border border-[var(--border-default)] rounded-spine p-8 flex flex-col items-center gap-6">
          <h1 className="text-h2 font-semibold tracking-tight text-[var(--text-primary)]">
            FYOA
          </h1>
          <p className="text-body text-center text-[var(--text-secondary)] leading-relaxed">
            Find Your Own Answer is a private search console.
            <br />
            Sign in with GitHub to continue.
          </p>
          <a
            href={signInHref}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-spine border border-[var(--border-accent)] text-[var(--text-accent)] no-underline font-semibold tracking-wide hover:bg-[var(--surface-whisper)] transition-colors duration-[180ms]"
          >
            <GithubLogo size={18} weight="regular" />
            Sign in with GitHub
          </a>
          {authError === '1' && (
            <p className="text-small text-[var(--text-danger)]" role="alert">
              Sign-in failed. Please try again.
            </p>
          )}
          {authError === 'forbidden' && (
            <p className="text-small text-[var(--text-danger)]" role="alert">
              That GitHub account is not authorized for this instance.
            </p>
          )}
        </div>
      </div>
    )
  }

  return <>{children}</>
}
