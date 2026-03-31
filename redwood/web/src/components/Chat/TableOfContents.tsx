/**
 * Table of Contents — color spine active indicator, outline style.
 *
 * Uses IntersectionObserver on heading DOM elements for real-time tracking.
 * Mobile: collapsed by default. Desktop: always visible.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { extractHeadings } from 'src/lib/renderMarkdown'
import { CaretRight } from '@phosphor-icons/react'

interface Props {
  markdown: string
  containerRef: React.RefObject<HTMLDivElement>
}

const TableOfContents = ({ markdown, containerRef }: Props) => {
  const headings = useMemo(() => extractHeadings(markdown), [markdown])
  const [activeId, setActiveId] = useState<string>('')
  const [collapsed, setCollapsed] = useState(true)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (headings.length < 3) return

    const timer = setTimeout(() => {
      const container = containerRef.current
      if (!container) return

      const elements = headings
        .map((h) => container.querySelector<HTMLElement>(`#${CSS.escape(h.id)}`))
        .filter(Boolean) as HTMLElement[]

      if (elements.length === 0) return

      const visibleIds = new Set<string>()

      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              visibleIds.add(entry.target.id)
            } else {
              visibleIds.delete(entry.target.id)
            }
          })

          for (const h of headings) {
            if (visibleIds.has(h.id)) {
              setActiveId(h.id)
              return
            }
          }
        },
        { rootMargin: '0px 0px -70% 0px', threshold: 0 }
      )

      elements.forEach((el) => observerRef.current!.observe(el))
    }, 100)

    return () => {
      clearTimeout(timer)
      observerRef.current?.disconnect()
    }
  }, [headings, containerRef])

  if (headings.length < 3) return null

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveId(id)
  }, [])

  const indent = (level: number) => (level <= 2 ? '' : 'pl-4')

  return (
    <div className="mb-5">
      {/* Mobile toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-1.5 text-caption text-[var(--text-muted)] lg:hidden mb-1"
        aria-expanded={!collapsed}
      >
        <CaretRight
          size={12}
          weight="bold"
          className={`transition-transform duration-[180ms] ${collapsed ? '' : 'rotate-90'}`}
        />
        {collapsed ? 'Show contents' : 'Hide contents'}
      </button>

      {/* TOC nav — 1px left border, color spine on active */}
      <nav
        className={`
          border-l border-[var(--border-default)] pl-4 py-2
          ${collapsed ? 'hidden lg:block' : 'block'}
        `}
        aria-label="Table of contents"
      >
        <p className="text-caption text-[var(--text-muted)] mb-2 hidden lg:block">
          Contents
        </p>

        <ol className="space-y-0.5">
          {headings.map((h) => (
            <li key={h.id} className={indent(h.level)}>
              <button
                onClick={() => scrollTo(h.id)}
                className={`
                  text-left text-small leading-snug py-0.5 w-full
                  transition-colors duration-[180ms]
                  ${activeId === h.id
                    ? 'text-[var(--text-accent)] font-semibold -ml-[calc(1rem+1px)] pl-[calc(1rem-2px)] border-l-[3px] border-l-[var(--border-accent)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }
                `}
              >
                {h.text}
              </button>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  )
}

export default TableOfContents
