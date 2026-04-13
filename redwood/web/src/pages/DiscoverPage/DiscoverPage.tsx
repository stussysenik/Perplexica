import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { navigate, routes } from '@redwoodjs/router'
import { Flask, ChartLineUp, Compass } from '@phosphor-icons/react'
import { EASE, DURATION } from 'src/lib/motion'

/**
 * Feature flag: the legacy Perplexica-era discover news feed (with
 * aspect-video skeleton blinks and Brave News thumbnails) is archived
 * behind this flag. We keep the topic rubric cards as the whole page.
 * Flip to `true` to re-enable the feed for experimentation.
 */
const ENABLE_DISCOVER_FEED = false

// Tab title is managed globally in App.tsx (`titleTemplate="Find Your Own
// Answer"`) so the browser tab reads the same thing on every route.

const rubrics = [
  {
    key: 'research',
    label: 'Research',
    icon: <Flask size={18} weight="light" />,
    suggestions: [
      'How does quantum entanglement work?',
      'Impact of climate change on biodiversity',
      'History of the Byzantine Empire',
      'How do mRNA vaccines train the immune system?',
      'What caused the 2008 financial crisis?',
      'Origins of the Silk Road and its legacy',
      'How does CRISPR gene editing work?',
      'The science behind dark matter and dark energy',
    ],
  },
  {
    key: 'analysis',
    label: 'Analysis',
    icon: <ChartLineUp size={18} weight="light" />,
    suggestions: [
      'Compare Rust vs Elixir for networked services',
      'Trend analysis of the EV market 2024',
      'Analyze the long-term impact of remote work',
      'Is nuclear energy a realistic climate solution?',
      'Compare monolith vs microservices at scale',
      'Why did Japan’s Lost Decade happen?',
      'Does universal basic income actually work?',
      'Pros and cons of index funds vs active funds',
    ],
  },
  {
    key: 'discovery',
    label: 'Discovery',
    icon: <Compass size={18} weight="light" />,
    suggestions: [
      'Latest breakthroughs in fusion energy',
      'Best hidden gems in Southeast Asia',
      'Newest open-source LLM releases',
      'Underrated cities for remote work in 2025',
      'Most exciting startups in biotech right now',
      'New tools shipping in the Rust ecosystem',
      'Best long-form podcasts about systems thinking',
      'Indie games with unique art direction',
    ],
  },
]

const DiscoverPage = () => {
  const [activeKey, setActiveKey] = useState('research')

  const activeRubric = rubrics.find(r => r.key === activeKey) || rubrics[0]

  const onSuggestionClick = (query: string) => {
    navigate(routes.home({ q: query }))
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 lg:pb-6 bg-[var(--surface-primary)]">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tighter text-[var(--text-primary)] mb-8">
          Discover
        </h1>

        {/* Topic tabs — layoutId makes the underline slide between active tabs */}
        <div
          role="tablist"
          className="flex gap-6 mb-8 border-b border-[var(--border-default)] overflow-x-auto no-scrollbar"
        >
          {rubrics.map(r => (
            <button
              key={r.key}
              type="button"
              role="tab"
              aria-selected={activeKey === r.key}
              onClick={() => setActiveKey(r.key)}
              className={`relative pb-2.5 whitespace-nowrap min-h-[44px] text-small font-medium
                transition-colors duration-[180ms]
                ${activeKey === r.key
                  ? 'text-[var(--text-accent)] font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
            >
              {r.label}
              {activeKey === r.key && (
                <motion.span
                  layoutId="topic-line"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--border-accent)]"
                  transition={{ duration: DURATION.fast, ease: EASE.out }}
                />
              )}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-8">
          {/* Rubric card — 100ms blink on switch, suggestions stagger in at 40ms each */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeKey}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: DURATION.instant, ease: EASE.out }}
              className="border border-[var(--border-default)] p-6 rounded-spine bg-[var(--surface-whisper)]"
            >
              <div className="flex items-center gap-2 mb-6 text-[var(--text-accent)]">
                {activeRubric.icon}
                <h2 className="text-small font-semibold uppercase tracking-wider">
                  {activeRubric.label}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeRubric.suggestions.map((s, i) => (
                  <motion.button
                    key={s}
                    type="button"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.07, delay: 0.05 + i * 0.04, ease: EASE.out }}
                    onClick={() => onSuggestionClick(s)}
                    className="text-left p-3 rounded-spine border border-transparent
                      hover:border-[var(--border-default)] hover:bg-[var(--surface-primary)]
                      transition-all group"
                  >
                    <p className="text-body text-[var(--text-primary)] opacity-80 group-hover:opacity-100 transition-opacity leading-snug">
                      {s}
                    </p>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>

          {/*
           * The legacy Perplexica news feed (Brave News thumbnails +
           * skeleton blinks) is archived behind ENABLE_DISCOVER_FEED.
           * Topic rubrics above are the entire Discover surface now.
           */}
          {ENABLE_DISCOVER_FEED && (
            <div className="text-caption text-[var(--text-muted)]">
              Discover feed archived — set <code>ENABLE_DISCOVER_FEED</code> to true in <code>DiscoverPage.tsx</code> to re-enable.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DiscoverPage
