import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { phoenixGql } from 'src/lib/phoenix'
import { variants, transition } from 'src/lib/motion'
import TextAction from 'src/components/ui/TextAction'

const PAGE_TITLE = 'Discover — Perplexica'

const topics = [
  { key: 'tech', label: 'Tech & Science' },
  { key: 'finance', label: 'Finance' },
  { key: 'art', label: 'Art & Culture' },
  { key: 'sports', label: 'Sports' },
  { key: 'entertainment', label: 'Entertainment' },
]

interface Article {
  title: string
  content: string
  url: string
  thumbnail: string
}

const DiscoverPage = () => {
  const [topic, setTopic] = useState('tech')
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { document.title = PAGE_TITLE }, [])

  useEffect(() => {
    setLoading(true)
    phoenixGql(`{
      discover(topic: ${JSON.stringify(topic)}) {
        title content url thumbnail
      }
    }`).then(res => {
      setArticles(res.data.discover || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [topic])

  return (
    <div className="flex-1 overflow-y-auto p-6 pb-20 lg:pb-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-h1 tracking-tight text-[var(--text-primary)] mb-6">Discover</h1>

        {/* Topic selector — TextAction row with accent underline */}
        <div className="flex gap-6 mb-6 border-b border-[var(--border-default)] overflow-x-auto">
          {topics.map(t => (
            <TextAction
              key={t.key}
              onClick={() => setTopic(t.key)}
              label={t.label}
              active={topic === t.key}
              className={`pb-2.5 whitespace-nowrap min-h-[44px] ${
                topic === t.key
                  ? 'border-b-2 border-[var(--border-accent)]'
                  : ''
              }`}
            />
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 border-2 border-[var(--border-muted)] border-t-[var(--border-accent)] rounded-full animate-spin" />
          </div>
        )}

        {/* Articles grid */}
        {!loading && articles.length > 0 && (
          <motion.div
            variants={variants.stagger}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3"
          >
            {articles.map((article, idx) => (
              <motion.div key={idx} variants={variants.slideUp} transition={transition.normal}>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block border border-[var(--border-default)] border-l-[3px] border-l-[var(--border-accent)] rounded-spine
                    hover:bg-[var(--surface-whisper)] transition-colors duration-[180ms] overflow-hidden group"
                >
                  {article.thumbnail && (
                    <div className="aspect-video overflow-hidden border-b border-[var(--border-default)]">
                      <img
                        src={article.thumbnail}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-[250ms]"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="text-small font-semibold leading-tight line-clamp-2 text-[var(--text-primary)] mb-1 group-hover:text-[var(--text-accent)] transition-colors duration-[180ms]">
                      {article.title}
                    </h3>
                    <p className="text-small text-[var(--text-muted)] line-clamp-2">
                      {article.content}
                    </p>
                    {article.url && (
                      <span className="text-caption text-[var(--text-muted)] mt-2 block normal-case tracking-normal">
                        {new URL(article.url).hostname.replace('www.', '')}
                      </span>
                    )}
                  </div>
                </a>
              </motion.div>
            ))}
          </motion.div>
        )}

        {!loading && articles.length === 0 && (
          <p className="text-center text-[var(--text-muted)] text-small py-12">No articles found for this topic.</p>
        )}
      </div>
    </div>
  )
}

export default DiscoverPage
