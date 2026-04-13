import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

export type DefaultMode = 'speed' | 'balanced' | 'quality'
export type ThemePreference = 'system' | 'light' | 'dark'

export interface Settings {
  defaultMode: DefaultMode
  theme: ThemePreference
  version: 1
}

export const SETTINGS_STORAGE_KEY = 'perplexica.settings.v1'
export const DEFAULT_SETTINGS: Settings = {
  defaultMode: 'balanced',
  theme: 'light',
  version: 1,
}

/**
 * Tolerant parser — bad JSON, missing fields, or unknown versions all
 * collapse to defaults. Keeps the malformed blob untouched in localStorage
 * so a future migration can inspect the original string.
 */
export function parseStoredSettings(raw: string | null): Settings {
  if (raw == null) return DEFAULT_SETTINGS
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return DEFAULT_SETTINGS
  }
  if (typeof parsed !== 'object' || parsed === null) return DEFAULT_SETTINGS
  const blob = parsed as Partial<Settings>
  if (blob.version !== 1) return DEFAULT_SETTINGS

  const defaultMode: DefaultMode =
    blob.defaultMode === 'speed' || blob.defaultMode === 'balanced' || blob.defaultMode === 'quality'
      ? blob.defaultMode
      : DEFAULT_SETTINGS.defaultMode

  const theme: ThemePreference =
    blob.theme === 'system' || blob.theme === 'light' || blob.theme === 'dark'
      ? blob.theme
      : DEFAULT_SETTINGS.theme

  return { defaultMode, theme, version: 1 }
}

interface SettingsContextValue {
  settings: Settings
  setDefaultMode: (mode: DefaultMode) => void
  setTheme: (theme: ThemePreference) => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const hydrated = useRef(false)

  // Hydrate from localStorage on mount.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY)
    setSettings(parseStoredSettings(raw))
    hydrated.current = true
  }, [])

  // Debounced write-back on change (150ms). Skips the initial hydration
  // pass so we don't overwrite a malformed blob before the user even edits.
  useEffect(() => {
    if (!hydrated.current || typeof window === 'undefined') return
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
    }, 150)
    return () => window.clearTimeout(timer)
  }, [settings])

  const setDefaultMode = useCallback((mode: DefaultMode) => {
    setSettings((prev) => ({ ...prev, defaultMode: mode }))
  }, [])

  const setTheme = useCallback((theme: ThemePreference) => {
    setSettings((prev) => ({ ...prev, theme }))
  }, [])

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, setDefaultMode, setTheme }),
    [settings, setDefaultMode, setTheme]
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): Settings {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>')
  return ctx.settings
}

export interface UpdateSettings {
  setDefaultMode: (mode: DefaultMode) => void
  setTheme: (theme: ThemePreference) => void
}

export function useUpdateSettings(): UpdateSettings {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useUpdateSettings must be used inside <SettingsProvider>')
  return { setDefaultMode: ctx.setDefaultMode, setTheme: ctx.setTheme }
}
