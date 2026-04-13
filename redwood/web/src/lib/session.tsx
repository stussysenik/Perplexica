import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { phoenixUrl } from 'src/lib/phoenix'

export type SessionStatus = 'loading' | 'signed_in' | 'signed_out'

export interface Session {
  status: SessionStatus
  username?: string
  avatarUrl?: string
  authBypass: boolean
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const SessionContext = createContext<Session | null>(null)

interface WhoamiResponse {
  signed_in: boolean
  username?: string
  avatar_url?: string | null
  auth_bypass?: boolean
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('loading')
  const [username, setUsername] = useState<string | undefined>()
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>()
  const [authBypass, setAuthBypass] = useState<boolean>(false)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${phoenixUrl}/auth/whoami`, {
        credentials: 'include',
      })
      if (!res.ok) {
        setStatus('signed_out')
        setUsername(undefined)
        setAvatarUrl(undefined)
        setAuthBypass(false)
        return
      }
      const data: WhoamiResponse = await res.json()
      if (data.signed_in) {
        setUsername(data.username)
        setAvatarUrl(data.avatar_url ?? undefined)
        setAuthBypass(data.auth_bypass === true)
        setStatus('signed_in')
      } else {
        setUsername(undefined)
        setAvatarUrl(undefined)
        setAuthBypass(false)
        setStatus('signed_out')
      }
    } catch {
      setStatus('signed_out')
      setUsername(undefined)
      setAvatarUrl(undefined)
      setAuthBypass(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      await fetch(`${phoenixUrl}/auth/session`, {
        method: 'DELETE',
        credentials: 'include',
      })
    } finally {
      await refresh()
    }
  }, [refresh])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Listen for revocation events dispatched by the Apollo/REST helpers when
  // a request returns 401/403 mid-session.
  useEffect(() => {
    const onRevoked = () => {
      refresh()
    }
    window.addEventListener('fyoa:session-revoked', onRevoked)
    return () => window.removeEventListener('fyoa:session-revoked', onRevoked)
  }, [refresh])

  const value = useMemo<Session>(
    () => ({ status, username, avatarUrl, authBypass, refresh, signOut }),
    [status, username, avatarUrl, authBypass, refresh, signOut]
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): Session {
  const ctx = useContext(SessionContext)
  if (!ctx) {
    throw new Error('useSession must be used inside <SessionProvider>')
  }
  return ctx
}
