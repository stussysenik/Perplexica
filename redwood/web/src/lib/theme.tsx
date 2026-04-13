import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { useSettings, useUpdateSettings, type ThemePreference } from 'src/lib/settings'

type ResolvedTheme = 'light' | 'dark'

interface ThemeContextValue {
  theme: ResolvedTheme
  preference: ThemePreference
  toggle: () => void
  setPreference: (preference: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * Theme provider — derives the resolved theme from `useSettings().theme`
 * (`system` | `light` | `dark`). Writes `document.documentElement.classList`
 * on every change and subscribes to the OS-level `prefers-color-scheme`
 * media query when preference is `system`.
 *
 * Persistence lives in `SettingsProvider`, not here.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme: preference } = useSettings()
  const { setTheme: setPreference } = useUpdateSettings()

  // Compute the resolved theme each render. Cheap — one media-query read on
  // the `system` branch, nothing otherwise.
  const resolved: ResolvedTheme =
    preference === 'system' ? getSystemTheme() : preference

  // Apply the resolved theme to <html> and keep it in sync with the OS
  // when tracking `system`. Re-subscribes whenever preference changes.
  useEffect(() => {
    if (typeof document === 'undefined') return
    const apply = (next: ResolvedTheme) => {
      document.documentElement.classList.toggle('dark', next === 'dark')
      document.documentElement.setAttribute('data-theme', next)
    }
    apply(resolved)

    if (preference !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = (e: MediaQueryListEvent) => apply(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', listener)
    return () => mq.removeEventListener('change', listener)
  }, [preference, resolved])

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: resolved,
      preference,
      toggle: () => {
        // Toggle flips between light and dark; pins to the opposite of
        // whatever the user is currently seeing.
        setPreference(resolved === 'dark' ? 'light' : 'dark')
      },
      setPreference,
    }),
    [resolved, preference, setPreference]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
