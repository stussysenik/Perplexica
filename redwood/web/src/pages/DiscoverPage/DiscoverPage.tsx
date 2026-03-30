import { useState, useEffect } from 'react'
import { phoenixGql } from 'src/lib/phoenix'

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
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold tracking-tight mb-6">Discover</h1>

        {/* Topic pills */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {topics.map(t => (
            <button
              key={t.key}
              onClick={() => setTopic(t.key)}
              className={`
                px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
                ${topic === t.key
                  ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                  : 'bg-light-secondary dark:bg-dark-100 text-stone-600 dark:text-stone-400 hover:bg-light-200 dark:hover:bg-dark-200'
                }
              `}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-stone-200 dark:border-stone-700 border-t-cyan-500 rounded-full animate-spin" />
          </div>
        )}

        {/* Articles grid */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {articles.map((article, idx) => (
              <a
                key={idx}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-xl border border-light-200 dark:border-dark-200 overflow-hidden hover:shadow-lg transition-all bg-light-100 dark:bg-dark-100"
              >
                {article.thumbnail && (
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={article.thumbnail}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-sm leading-tight line-clamp-2 mb-1 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2">
                    {article.content}
                  </p>
                </div>
              </a>
            ))}
          </div>
        )}

        {!loading && articles.length === 0 && (
          <p className="text-center text-stone-400 py-12">No articles found for this topic.</p>
        )}
      </div>
    </div>
  )
}

export default DiscoverPage
