import { Warning, GithubLogo } from '@phosphor-icons/react'
import { useSession } from 'src/lib/session'
import { phoenixUrl } from 'src/lib/phoenix'

/**
 * Persistent top-strip warning that authentication is bypassed. Renders only
 * when the Phoenix /auth/whoami response carries `auth_bypass: true`. Pairs
 * with the runtime.exs boot warning so the operator has two independent
 * signals that the escape hatch is live.
 */
export default function PreviewModeBanner() {
  const { authBypass } = useSession()

  if (!authBypass) return null

  const signInHref = `${phoenixUrl}/auth/github`

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 flex items-center justify-center gap-3 px-4 py-2 border-b border-[var(--border-accent)] bg-[var(--surface-primary)] text-[var(--text-danger)] text-small font-medium"
    >
      <Warning size={16} weight="regular" aria-hidden />
      <span>
        Preview mode — authentication is disabled.
      </span>
      <a
        href={signInHref}
        className="inline-flex items-center gap-1 text-[var(--text-accent)] no-underline hover:opacity-80 transition-opacity duration-150"
      >
        <GithubLogo size={14} weight="regular" aria-hidden />
        Sign in with GitHub to leave preview
      </a>
    </div>
  )
}
