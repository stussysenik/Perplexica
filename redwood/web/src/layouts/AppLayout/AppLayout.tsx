import { ReactNode } from 'react'
import { useLocation } from '@redwoodjs/router'
import { useTheme } from 'src/lib/theme'
import {
  MagnifyingGlass,
  Compass,
  Books,
  GearSix,
  Sun,
  Moon,
} from '@phosphor-icons/react'
import TextAction from 'src/components/ui/TextAction'

interface Props {
  children: ReactNode
}

const navItems = [
  { href: '/', label: 'Search', icon: MagnifyingGlass },
  { href: '/discover', label: 'Discover', icon: Compass },
  { href: '/library', label: 'Library', icon: Books },
]

const AppLayout = ({ children }: Props) => {
  const { theme, toggle } = useTheme()
  const { pathname } = useLocation()

  return (
    <div className="grid h-dvh overflow-hidden grid-cols-1 grid-rows-[1fr_auto] lg:grid-cols-[240px_1fr] lg:grid-rows-1">
      {/* Skip to content — accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-[var(--surface-primary)] focus:border focus:border-[var(--border-accent)] focus:rounded-spine focus:text-[var(--text-accent)] focus:text-small"
      >
        Skip to content
      </a>
      {/* Sidebar — desktop only */}
      <aside className="hidden lg:flex flex-col border-r border-[var(--border-default)]">
        {/* Logo */}
        <div className="p-4 flex items-center gap-3">
          <span className="text-h3 font-semibold tracking-tight text-[var(--text-primary)]">
            Perplexica
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5" aria-label="Main navigation">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <a
                key={href}
                href={href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-spine text-small font-medium
                  transition-colors duration-[180ms]
                  ${active
                    ? 'border-l-[3px] border-l-[var(--border-accent)] text-[var(--text-accent)] ml-[-3px]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-accent)]'
                  }
                `}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={18} weight={active ? 'regular' : 'light'} />
                <span>{label}</span>
              </a>
            )
          })}
        </nav>

        {/* Bottom actions */}
        <div className="p-3 border-t border-[var(--border-default)] space-y-0.5">
          <button
            onClick={toggle}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-spine text-small text-[var(--text-muted)] hover:text-[var(--text-accent)] transition-colors duration-[180ms]"
          >
            {theme === 'dark' ? <Sun size={18} weight="light" /> : <Moon size={18} weight="light" />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main id="main-content" className="flex flex-col min-w-0 min-h-0">
        {/* Mobile header — with safe area inset for notched devices */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] border-b border-[var(--border-default)]">
          <span className="text-h3 font-semibold tracking-tight text-[var(--text-primary)]">
            Perplexica
          </span>
          <button
            onClick={toggle}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-accent)] transition-colors duration-[180ms]"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={18} weight="light" /> : <Moon size={18} weight="light" />}
          </button>
        </div>

        <div className="flex-1 flex flex-col min-h-0 pb-16 lg:pb-0">
          {children}
        </div>
      </main>

      {/* Bottom Navigation — mobile only */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-[var(--border-default)] bg-[var(--surface-primary)] pb-[env(safe-area-inset-bottom)]"
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-around h-16">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <a
                key={href}
                href={href}
                className={`
                  flex flex-col items-center justify-center gap-1 min-w-[64px] min-h-[44px] py-1
                  transition-colors duration-[180ms]
                  ${active
                    ? 'text-[var(--text-accent)]'
                    : 'text-[var(--text-muted)]'
                  }
                `}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={22} weight={active ? 'regular' : 'light'} />
                <span className={`text-[10px] font-medium ${active ? 'text-[var(--text-accent)]' : ''}`}>
                  {label}
                </span>
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[var(--border-accent)] rounded-full" />
                )}
              </a>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export default AppLayout
