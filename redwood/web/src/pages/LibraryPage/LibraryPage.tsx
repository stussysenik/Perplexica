import { useState, useEffect } from 'react'
import { phoenixGql } from 'src/lib/phoenix'
import type { Source } from 'src/lib/useSearch'
import MessageBox from 'src/components/Chat/MessageBox'
import Sources from 'src/components/Sources/Sources'

interface Chat {
  id: string
  title: string
  createdAt: string
}

interface StoredMessage {
  messageId: string
  query: string
  status: string
  responseBlocks: any[]
}

const LibraryPage = () => {
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [messages, setMessages] = useState<StoredMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)

  const fetchChats = () => {
    setLoading(true)
    phoenixGql(`{ chats { id title createdAt } }`)
      .then(res => {
        setChats(res.data.chats || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchChats() }, [])

  const openChat = async (chatId: string) => {
    setSelectedChat(chatId)
    setLoadingMessages(true)
    try {
      const res = await phoenixGql(`{
        messages(chatId: ${JSON.stringify(chatId)}) {
          messageId query status responseBlocks
        }
      }`)
      setMessages(res.data.messages || [])
    } catch { setMessages([]) }
    setLoadingMessages(false)
  }

  const deleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await phoenixGql(`mutation { deleteChat(id: ${JSON.stringify(id)}) { success } }`)
    if (selectedChat === id) { setSelectedChat(null); setMessages([]) }
    fetchChats()
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  // Chat detail view
  if (selectedChat) {
    const chat = chats.find(c => c.id === selectedChat)
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => { setSelectedChat(null); setMessages([]) }}
            className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 mb-6 transition-colors"
          >
            <span>←</span> Back to Library
          </button>

          {loadingMessages ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-stone-200 dark:border-stone-700 border-t-cyan-500 rounded-full animate-spin" />
            </div>
          ) : (
            messages.map(msg => {
              const blocks = msg.responseBlocks || []
              const sourceBlock = blocks.find((b: any) => b.type === 'source')
              const textBlock = blocks.find((b: any) => b.type === 'text')
              const sources: Source[] = sourceBlock?.data || []

              return (
                <div key={msg.messageId} className="mb-10">
                  <h2 className="text-2xl font-semibold tracking-tight mb-4">{msg.query}</h2>

                  {sources.length > 0 && (
                    <div className="mb-4">
                      <Sources sources={sources} />
                    </div>
                  )}

                  {textBlock?.data && (
                    <div
                      className="prose prose-stone dark:prose-invert max-w-none prose-headings:tracking-tight prose-p:text-[15px] prose-p:leading-relaxed prose-a:text-cyan-600 dark:prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline prose-code:text-sm prose-code:bg-light-200 dark:prose-code:bg-dark-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(textBlock.data) }}
                    />
                  )}

                  {msg.status === 'error' && (
                    <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
                      This search encountered an error.
                    </div>
                  )}
                </div>
              )
            })
          )}

          {!loadingMessages && messages.length === 0 && (
            <p className="text-stone-400 text-center py-12">No messages in this chat.</p>
          )}
        </div>
      </div>
    )
  }

  // Chat list view
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Library</h1>
          <span className="text-xs text-stone-400 bg-light-200 dark:bg-dark-100 px-2 py-1 rounded-full">
            {chats.length} chats
          </span>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-stone-200 dark:border-stone-700 border-t-cyan-500 rounded-full animate-spin" />
          </div>
        )}

        {!loading && chats.length === 0 && (
          <div className="text-center py-20">
            <p className="text-stone-400 mb-2">No chats yet.</p>
            <a href="/" className="text-cyan-600 dark:text-cyan-400 text-sm hover:underline">
              Start a new search
            </a>
          </div>
        )}

        <div className="space-y-2">
          {chats.map(chat => (
            <div
              key={chat.id}
              onClick={() => openChat(chat.id)}
              className="flex items-center gap-3 p-4 rounded-xl border border-light-200 dark:border-dark-200 bg-light-100 dark:bg-dark-100 hover:bg-light-200/50 dark:hover:bg-dark-200/30 transition-colors group cursor-pointer"
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate">{chat.title}</h3>
                <span className="text-xs text-stone-400">{timeAgo(chat.createdAt)}</span>
              </div>
              <button
                onClick={(e) => deleteChat(chat.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-stone-400 hover:text-red-500 transition-all text-xs"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function renderMarkdown(text: string): string {
  if (!text) return ''
  return text
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\[(\d+)\]/g, '<sup class="inline-flex items-center justify-center w-4 h-4 text-[9px] font-bold rounded bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 ml-0.5">$1</sup>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    .replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hupoltb])((?!<\/).+)$/gm, '<p>$1</p>')
    .replace(/<p><\/p>/g, '')
}

export default LibraryPage
