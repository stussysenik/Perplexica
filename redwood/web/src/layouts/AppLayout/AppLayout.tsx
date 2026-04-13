import { ReactNode } from 'react'
import { useLocation, Link } from '@redwoodjs/router'
import { useTheme } from 'src/lib/theme'
import { motion } from 'framer-motion'
import {
  MagnifyingGlass,
  Compass,
  Books,
  Sun,
  Moon,
  GearSix,
} from '@phosphor-icons/react'
import PreviewModeBanner from 'src/components/PreviewModeBanner/PreviewModeBanner'

interface Props {
  children: ReactNode
}

const navItems = [
  { href: '/', label: 'Search', icon: MagnifyingGlass },
  { href: '/discover', label: 'Discover', icon: Compass },
  { href: '/library', label: 'Library', icon: Books },
]

// Spring: Jakub production-polish (no bounce, settles crisply)
const PILL_SPRING = { type: 'spring' as const, duration: 0.38, bounce: 0 }
// Icon pop: Emil fast — entering element ease-out
const ICON_SPRING = { duration: 0.18, ease: [0.16, 1, 0.3, 1] as const }

const AppLayout = ({ children }: Props) => {
  const { theme, toggle } = useTheme()
  const { pathname } = useLocation()

  return (
    <div className="flex flex-col h-dvh">
      <PreviewModeBanner />
      <div className="flex-1 min-h-0 grid overflow-hidden grid-cols-1 grid-rows-[1fr_auto] lg:grid-cols-[240px_1fr] lg:grid-rows-1">
      {/* Skip to content — accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-[var(--surface-primary)] focus:border focus:border-[var(--border-accent)] focus:rounded-spine focus:text-[var(--text-accent)] focus:text-small"
      >
        Skip to content
      </a>

      {/* Sidebar — desktop only */}
      <aside className="hidden lg:flex flex-col border-r border-[var(--border-default)]">
        <div className="p-4 flex items-center gap-3">
          <Link
            to="/"
            onClick={(e) => {
              // Always reset the chat when the brand is clicked, even if we're
              // already on "/". Without this the Link is a no-op on the home
              // route and stale messages stay on screen.
              e.preventDefault()
              window.dispatchEvent(new CustomEvent('fyoa:reset-chat'))
              if (pathname !== '/') {
                window.history.pushState({}, '', '/')
                window.dispatchEvent(new PopStateEvent('popstate'))
              }
            }}
            className="text-h3 font-semibold tracking-tight text-[var(--text-primary)] no-underline hover:opacity-70 transition-opacity duration-150"
            aria-label="FYOA — Find Your Own Answer (start new search)"
          >
            FYOA
          </Link>
        </div>

        <nav className="flex-1 px-3 space-y-0.5" aria-label="Main navigation">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                to={href}
                className="relative flex items-center gap-3 px-3 py-2.5 rounded-spine text-small font-medium group"
                aria-current={active ? 'page' : undefined}
              >
                {/* Sliding background pill — shared layout between active items */}
                {active && (
                  <motion.span
                    layoutId="sidebar-pill"
                    className="absolute inset-0 rounded-spine bg-[var(--surface-whisper)]"
                    transition={PILL_SPRING}
                  />
                )}
                <span
                  className={`relative z-10 flex items-center gap-3 transition-colors duration-[180ms] ${
                    active
                      ? 'text-[var(--text-accent)]'
                      : 'text-[var(--text-secondary)] group-hover:text-[var(--text-accent)]'
                  }`}
                >
                  <Icon size={18} weight={active ? 'regular' : 'light'} />
                  {label}
                </span>
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-[var(--border-default)] space-y-0.5">
          <Link
            to="/settings"
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-spine text-small transition-colors duration-[180ms] ${
              pathname === '/settings'
                ? 'text-[var(--text-accent)] bg-[var(--surface-whisper)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-accent)]'
            }`}
            aria-current={pathname === '/settings' ? 'page' : undefined}
          >
            <GearSix size={18} weight={pathname === '/settings' ? 'regular' : 'light'} />
            <span>Settings</span>
          </Link>
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
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] border-b border-[var(--border-default)]">
          <Link
            to="/"
            onClick={(e) => {
              // Always reset the chat when the brand is clicked, even if we're
              // already on "/". Without this the Link is a no-op on the home
              // route and stale messages stay on screen.
              e.preventDefault()
              window.dispatchEvent(new CustomEvent('fyoa:reset-chat'))
              if (pathname !== '/') {
                window.history.pushState({}, '', '/')
                window.dispatchEvent(new PopStateEvent('popstate'))
              }
            }}
            className="text-h3 font-semibold tracking-tight text-[var(--text-primary)] no-underline hover:opacity-70 transition-opacity duration-150"
            aria-label="FYOA — Find Your Own Answer (start new search)"
          >
            FYOA
          </Link>
          <div className="flex items-center gap-1">
            <Link
              to="/settings"
              aria-label="Settings"
              aria-current={pathname === '/settings' ? 'page' : undefined}
              className={`flex items-center justify-center w-10 h-10 rounded-spine transition-colors duration-[180ms] ${
                pathname === '/settings'
                  ? 'text-[var(--text-accent)] bg-[var(--surface-whisper)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-accent)]'
              }`}
            >
              <GearSix size={18} weight={pathname === '/settings' ? 'regular' : 'light'} />
            </Link>
            <button
              onClick={toggle}
              className="flex items-center justify-center w-10 h-10 rounded-spine text-[var(--text-muted)] hover:text-[var(--text-accent)] transition-colors duration-[180ms]"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun size={18} weight="light" /> : <Moon size={18} weight="light" />}
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 pb-16 lg:pb-0">
          {children}
        </div>
      </main>

      </div>
      {/* Bottom Navigation — mobile only */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-[var(--border-default)] bg-[var(--surface-primary)] pb-[env(safe-area-inset-bottom)]"
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                to={href}
                className="relative flex flex-col items-center justify-center gap-1 min-w-[72px] min-h-[44px] py-2 px-3 rounded-2xl transition-transform duration-100 active:scale-[0.93]"
                style={{ WebkitTapHighlightColor: 'transparent' }}
                aria-current={active ? 'page' : undefined}
              >
                {/* Sliding pill — the ONLY active indicator. No top bar, no lime green. */}
                {active && (
                  <motion.span
                    layoutId="bottom-nav-pill"
                    className="absolute inset-0 rounded-2xl bg-[var(--surface-whisper)]"
                    transition={PILL_SPRING}
                  />
                )}

                {/*
                 * Icon: key trick — when active becomes true, remount with
                 * a pop (scale 0.8→1) so the weight switch feels intentional.
                 * When deactivating, key='inactive' restores without animating.
                 */}
                <motion.span
                  key={active ? `${href}-on` : `${href}-off`}
                  initial={active ? { scale: 0.78, opacity: 0.5 } : false}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={ICON_SPRING}
                  className={`relative z-10 transition-colors duration-[180ms] ${
                    active ? 'text-[var(--text-accent)]' : 'text-[var(--text-muted)]'
                  }`}
                >
                  <Icon size={22} weight={active ? 'regular' : 'light'} />
                </motion.span>

                <span
                  className={`relative z-10 text-[10px] font-medium tracking-wide transition-colors duration-[180ms] ${
                    active ? 'text-[var(--text-accent)]' : 'text-[var(--text-muted)]'
                  }`}
                >
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export default AppLayout
