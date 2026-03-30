import { ReactNode, useState } from 'react'
import { Link, routes } from '@redwoodjs/router'
import { useTheme } from 'src/lib/theme'

interface Props {
  children: ReactNode
}

const AppLayout = ({ children }: Props) => {
  const { theme, toggle } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-200 ease-in-out
          lg:relative lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          bg-light-100 dark:bg-dark-secondary border-r border-light-200 dark:border-dark-200
          flex flex-col
        `}
      >
        {/* Logo */}
        <div className="p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
            P
          </div>
          <span className="font-bold text-lg tracking-tight">Perplexica</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1">
          <NavItem href="/" icon="🔍" label="Search" />
          <NavItem href="/discover" icon="🧭" label="Discover" />
          <NavItem href="/library" icon="📚" label="Library" />
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-light-200 dark:border-dark-200 space-y-1">
          <button
            onClick={toggle}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-stone-600 dark:text-stone-400 hover:bg-light-200 dark:hover:bg-dark-100 transition-colors"
          >
            <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-3 p-3 border-b border-light-200 dark:border-dark-200 bg-light-100 dark:bg-dark-secondary">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-light-200 dark:hover:bg-dark-100"
          >
            ☰
          </button>
          <span className="font-bold">Perplexica</span>
        </div>

        {children}
      </main>
    </div>
  )
}

function NavItem({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-light-200 dark:hover:bg-dark-100 transition-colors"
    >
      <span className="text-base">{icon}</span>
      <span>{label}</span>
    </a>
  )
}

export default AppLayout
