import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { navigate } from '@redwoodjs/router'
import { phoenixGql } from 'src/lib/phoenix'
import { variants, transition } from 'src/lib/motion'
import type { Source, Message } from 'src/lib/useSearch'
import MessageBox from 'src/components/Chat/MessageBox'
import TextAction from 'src/components/ui/TextAction'
import { ArrowLeft } from '@phosphor-icons/react'

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

interface Bookmark {
  id: string
  messageId: string
  insertedAt: string
}

type Tab = 'chats' | 'bookmarks'

const LibraryPage = () => {
  const [tab, setTab] = useState<Tab>('chats')
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [messages, setMessages] = useState<StoredMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [loadingBookmarks, setLoadingBookmarks] = useState(false)

  useEffect(() => { document.title = 'Library — FYOA' }, [])

  const fetchChats = () => {
    setLoading(true)
    phoenixGql(`{ chats { id title createdAt } }`)
      .then(res => { setChats(res.data.chats || []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  const fetchBookmarks = () => {
    setLoadingBookmarks(true)
    phoenixGql(`{ bookmarks { id messageId insertedAt } }`)
      .then(res => { setBookmarks(res.data.bookmarks || []); setLoadingBookmarks(false) })
      .catch(() => setLoadingBookmarks(false))
  }

  useEffect(() => { fetchChats() }, [])

  useEffect(() => {
    if (tab === 'bookmarks') fetchBookmarks()
  }, [tab])

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
    if (!confirm('Delete this chat?')) return
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

  // Live refresh for in-flight messages. If any message in the currently
  // open chat is still `answering`, poll `messages(chatId)` every 2s until
  // the last one flips to completed/error. This is what lets you navigate
  // away from the chat mid-search and come back to a live progress view —
  // the backend pipeline keeps running, we just re-read its checkpoint.
  const hasInFlight = messages.some(m => m.status === 'answering')

  useEffect(() => {
    if (!selectedChat || !hasInFlight) return
    let cancelled = false

    const tick = async () => {
      if (cancelled) return
      try {
        const res = await phoenixGql(`{
          messages(chatId: ${JSON.stringify(selectedChat)}) {
            messageId query status responseBlocks
          }
        }`)
        if (cancelled) return
        setMessages(res.data.messages || [])
      } catch {
        // swallow transient errors; next tick will retry
      }
    }

    tick() // fire immediately so reopening a mid-flight chat shows state on the first frame, not 2s later
    const id = setInterval(tick, 2000)
    return () => { cancelled = true; clearInterval(id) }
  }, [selectedChat, hasInFlight])

  // Chat detail view — reuse MessageBox so the action bar (copy, share,
  // bookmark, export, listen) and footnote-click-to-scroll behaviour come
  // for free and stay 1:1 with the live chat view.
  if (selectedChat) {
    const toMessage = (m: StoredMessage): Message => {
      const blocks = m.responseBlocks || []
      const sourceBlock = blocks.find((b: any) => b.type === 'source')
      const textBlock = blocks.find((b: any) => b.type === 'text')
      const status = (m.status as Message['status']) || 'completed'
      return {
        id: m.messageId,
        messageId: m.messageId,
        query: m.query,
        status,
        sources: (sourceBlock?.data as Source[]) || [],
        answer: (textBlock?.data as string) || '',
        phase:
          status === 'completed' ? 'complete'
          : status === 'error' ? 'error'
          : 'classifying',
        sourceCount: (sourceBlock?.data as Source[])?.length || 0,
      }
    }

    const handleSearch = (query: string) => {
      // Clicking a topic-link inside a rendered answer should start a fresh
      // search — send the user to the home route with the query preloaded.
      navigate(`/?q=${encodeURIComponent(query)}`)
    }

    return (
      <div className="flex-1 overflow-y-auto p-6 pb-20 lg:pb-6">
        <div className="max-w-3xl mx-auto">
          <TextAction
            onClick={() => { setSelectedChat(null); setMessages([]) }}
            icon={<ArrowLeft size={16} weight="light" />}
            label="Back to Library"
            className="mb-6"
          />

          {loadingMessages ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-5 h-5 border-2 border-[var(--border-muted)] border-t-[var(--border-accent)] rounded-full animate-spin" />
            </div>
          ) : (
            messages.map(m => {
              const msg = toMessage(m)
              const inFlight = msg.status === 'answering'
              return (
                <MessageBox
                  key={m.messageId}
                  message={msg}
                  isLast={inFlight}
                  loading={inFlight}
                  chatId={selectedChat}
                  onSearch={handleSearch}
                />
              )
            })
          )}

          {!loadingMessages && messages.length === 0 && (
            <p className="text-[var(--text-muted)] text-small text-center py-12">No messages in this chat.</p>
          )}
        </div>
      </div>
    )
  }

  // Main list view
  return (
    <div className="flex-1 overflow-y-auto p-6 pb-20 lg:pb-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-h1 tracking-tight text-[var(--text-primary)]">Library</h1>
          <span className="text-caption text-[var(--text-muted)] border border-[var(--border-default)] px-2 py-1 rounded-spine normal-case tracking-normal">
            {tab === 'chats' ? `${chats.length} chats` : `${bookmarks.length} saved`}
          </span>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-6 mb-6 border-b border-[var(--border-default)]">
          <TextAction
            onClick={() => setTab('chats')}
            label="Chats"
            active={tab === 'chats'}
            className={`pb-2.5 min-h-[44px] ${tab === 'chats' ? 'border-b-2 border-[var(--border-accent)]' : ''}`}
          />
          <TextAction
            onClick={() => setTab('bookmarks')}
            label="Bookmarks"
            active={tab === 'bookmarks'}
            className={`pb-2.5 min-h-[44px] ${tab === 'bookmarks' ? 'border-b-2 border-[var(--border-accent)]' : ''}`}
          />
        </div>

        {/* Chats Tab */}
        {tab === 'chats' && (
          <>
            {loading && (
              <div className="flex items-center justify-center py-20">
                <div className="w-5 h-5 border-2 border-[var(--border-muted)] border-t-[var(--border-accent)] rounded-full animate-spin" />
              </div>
            )}

            {!loading && chats.length === 0 && (
              <div className="text-center py-20">
                <p className="text-[var(--text-muted)] text-small mb-2">No chats yet.</p>
                <TextAction href="/" label="Start a new search" variant="accent" />
              </div>
            )}

            {!loading && chats.length > 0 && (
              <motion.div
                variants={variants.stagger}
                initial="initial"
                animate="animate"
                className="border-t border-[var(--border-default)]"
              >
                {chats.map(chat => (
                  <motion.div key={chat.id} variants={variants.slideUp} transition={transition.normal}>
                    <div
                      onClick={() => openChat(chat.id)}
                      className="flex items-center gap-4 py-4 pl-5 pr-4
                        border-b border-[var(--border-default)]
                        border-l-[4px] border-l-[var(--border-accent)]
                        hover:bg-[var(--surface-whisper)]
                        transition-colors duration-[180ms] cursor-pointer group"
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="text-small font-semibold text-[var(--text-primary)] truncate">{chat.title}</h3>
                        <span className="text-caption text-[var(--text-muted)] normal-case tracking-normal tabular-nums">{timeAgo(chat.createdAt)}</span>
                      </div>
                      <TextAction
                        onClick={(e) => deleteChat(chat.id, e as any)}
                        label="Delete"
                        variant="danger"
                        className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </>
        )}

        {/* Bookmarks Tab */}
        {tab === 'bookmarks' && (
          <>
            {loadingBookmarks && (
              <div className="flex items-center justify-center py-20">
                <div className="w-5 h-5 border-2 border-[var(--border-muted)] border-t-[var(--border-accent)] rounded-full animate-spin" />
              </div>
            )}

            {!loadingBookmarks && bookmarks.length === 0 && (
              <div className="text-center py-20">
                <p className="text-[var(--text-secondary)] text-small font-medium mb-1">No bookmarks yet</p>
                <p className="text-[var(--text-muted)] text-small max-w-xs mx-auto">
                  Use the bookmark button on any answer to save it here for quick access later.
                </p>
              </div>
            )}

            {!loadingBookmarks && bookmarks.length > 0 && (
              <motion.div
                variants={variants.stagger}
                initial="initial"
                animate="animate"
                className="space-y-2"
              >
                {bookmarks.map(bm => (
                  <motion.div key={bm.id} variants={variants.slideUp} transition={transition.normal}>
                    <div className="flex items-center gap-3 p-4
                      border border-[var(--border-default)] border-l-[3px] border-l-[var(--border-highlight)]
                      rounded-spine hover:bg-[var(--surface-whisper)]
                      transition-colors duration-[180ms]"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-small font-medium text-[var(--text-primary)] truncate">
                          {bm.messageId}
                        </p>
                        <span className="text-caption text-[var(--text-muted)] normal-case tracking-normal tabular-nums">
                          Saved {timeAgo(bm.insertedAt)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default LibraryPage
