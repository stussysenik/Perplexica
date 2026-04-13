import { useState, useEffect, useCallback, useMemo } from 'react'
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { navigate } from '@redwoodjs/router'
import { phoenixGql } from 'src/lib/phoenix'
import { variants, transition } from 'src/lib/motion'
import { useSettings } from 'src/lib/settings'
import type { Source, Message } from 'src/lib/useSearch'
import MessageBox from 'src/components/Chat/MessageBox'
import MessageInput from 'src/components/Chat/MessageInput'
import TextAction from 'src/components/ui/TextAction'
import {
  ArrowLeft,
  BookmarkSimple,
  Archive,
  Trash,
  ArrowCounterClockwise,
  X,
} from '@phosphor-icons/react'

/**
 * LibraryPage — four tabs over a chat's lifecycle:
 *
 *   Chats      → active, non-archived, non-trashed
 *   Bookmarks  → bookmarked_at non-nil (survives archive)
 *   Archive    → archived_at non-nil, trashed_at nil
 *   Trash      → trashed_at non-nil (30-day purge countdown)
 *
 * All lists share a single `ChatRow` component with a per-tab action bar
 * so the visual rhythm stays consistent across tabs. Row actions are:
 *
 *   Chats      → Bookmark,   Archive, Trash
 *   Bookmarks  → Unbookmark, Archive, Trash   + click opens the chat
 *   Archive    → Restore,             Trash   + click opens the chat
 *   Trash      → Restore,             Purge   + click opens the chat
 *                (Purge confirms; "purges in Nd" badge instead of timeago)
 *
 * The compose box for follow-ups lives in the detail view and calls
 * `startSearch` against the SAME chatId so the backend appends to the
 * existing thread and the polling effect streams state back. No
 * navigation — the user never leaves Library while conversing.
 */

interface Chat {
  id: string
  title: string
  createdAt: string
  bookmarkedAt: string | null
  archivedAt: string | null
  trashedAt: string | null
  purgesAt: string | null
}

interface StoredMessage {
  messageId: string
  query: string
  status: string
  responseBlocks: any[]
}

type Tab = 'chats' | 'bookmarks' | 'archive' | 'trash'

const TAB_LABELS: Record<Tab, string> = {
  chats: 'Chats',
  bookmarks: 'Bookmarks',
  archive: 'Archive',
  trash: 'Trash',
}

/** What the count-badge pill says per tab. Singular + plural handled here. */
const countLabel = (tab: Tab, n: number): string => {
  const word =
    tab === 'chats' ? (n === 1 ? 'chat' : 'chats')
    : tab === 'bookmarks' ? (n === 1 ? 'bookmarked' : 'bookmarked')
    : tab === 'archive' ? (n === 1 ? 'archived' : 'archived')
    : (n === 1 ? 'trashed' : 'trashed')
  return `${n} ${word}`
}

/** Per-tab empty-state copy. */
const EMPTY_COPY: Record<Tab, { title: string; body: string }> = {
  chats: {
    title: 'No chats yet',
    body: 'Start a search to build a conversation.',
  },
  bookmarks: {
    title: 'No bookmarks yet',
    body: 'Bookmark a chat to keep it close. Bookmarked chats survive archive and stay findable.',
  },
  archive: {
    title: 'Archive is empty',
    body: 'Archive a chat to hide it from your main list without losing it. Restore it any time.',
  },
  trash: {
    title: 'Trash is empty',
    body: 'Trashed chats linger here for 30 days before they are purged for good.',
  },
}

const LibraryPage = () => {
  const { defaultMode } = useSettings()
  const [tab, setTab] = useState<Tab>('chats')

  // Per-tab data + loading state. Kept as four independent arrays so a
  // toggle of `tab` only triggers the fetch it needs, and optimistic
  // mutations can update exactly the list that changed.
  const [chats, setChats] = useState<Chat[]>([])
  const [bookmarkedChats, setBookmarkedChats] = useState<Chat[]>([])
  const [archivedChats, setArchivedChats] = useState<Chat[]>([])
  const [trashedChats, setTrashedChats] = useState<Chat[]>([])

  const [loading, setLoading] = useState(true)

  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [messages, setMessages] = useState<StoredMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)

  // Tab title is managed globally in App.tsx (`titleTemplate="Find Your Own
  // Answer"`); this page no longer overrides it.

  // ── Fetchers ───────────────────────────────────────────────────

  const fetchTab = useCallback((which: Tab) => {
    const query =
      which === 'chats'
        ? `{ chats { id title createdAt bookmarkedAt archivedAt trashedAt purgesAt } }`
      : which === 'bookmarks'
        ? `{ bookmarkedChats { id title createdAt bookmarkedAt archivedAt trashedAt purgesAt } }`
      : which === 'archive'
        ? `{ archivedChats { id title createdAt bookmarkedAt archivedAt trashedAt purgesAt } }`
      : `{ trashedChats { id title createdAt bookmarkedAt archivedAt trashedAt purgesAt } }`

    const key =
      which === 'chats' ? 'chats'
      : which === 'bookmarks' ? 'bookmarkedChats'
      : which === 'archive' ? 'archivedChats'
      : 'trashedChats'

    const setter =
      which === 'chats' ? setChats
      : which === 'bookmarks' ? setBookmarkedChats
      : which === 'archive' ? setArchivedChats
      : setTrashedChats

    setLoading(true)
    phoenixGql(query)
      .then(res => { setter(res.data[key] || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { fetchTab(tab) }, [tab, fetchTab])

  // ── Lifecycle mutations ───────────────────────────────────────
  //
  // Each mutation optimistically updates the list on screen, then
  // re-fetches the tab so the server's authoritative state wins. If
  // the user is on a different tab, we leave that tab to re-fetch when
  // it's next opened — no cross-tab cache invalidation to worry about.

  const refetchVisible = useCallback(() => fetchTab(tab), [tab, fetchTab])

  const toggleBookmark = useCallback(async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    try {
      await phoenixGql(
        `mutation ToggleChatBookmark($id: ID!) { toggleChatBookmark(id: $id) { id bookmarkedAt } }`,
        { id }
      )
      refetchVisible()
    } catch {
      refetchVisible()
    }
  }, [refetchVisible])

  const archiveChat = useCallback(async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    try {
      await phoenixGql(
        `mutation ArchiveChat($id: ID!) { archiveChat(id: $id) { id archivedAt } }`,
        { id }
      )
      if (selectedChat === id) { setSelectedChat(null); setMessages([]) }
      refetchVisible()
    } catch {
      refetchVisible()
    }
  }, [refetchVisible, selectedChat])

  const restoreChat = useCallback(async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    try {
      await phoenixGql(
        `mutation RestoreChat($id: ID!) { restoreChat(id: $id) { id archivedAt trashedAt } }`,
        { id }
      )
      refetchVisible()
    } catch {
      refetchVisible()
    }
  }, [refetchVisible])

  const trashChat = useCallback(async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    try {
      await phoenixGql(
        `mutation TrashChat($id: ID!) { trashChat(id: $id) { id trashedAt purgesAt } }`,
        { id }
      )
      if (selectedChat === id) { setSelectedChat(null); setMessages([]) }
      refetchVisible()
    } catch {
      refetchVisible()
    }
  }, [refetchVisible, selectedChat])

  const purgeChat = useCallback(async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!confirm('Permanently delete this chat? This cannot be undone.')) return
    try {
      await phoenixGql(
        `mutation PurgeChat($id: ID!) { purgeChat(id: $id) { success } }`,
        { id }
      )
      if (selectedChat === id) { setSelectedChat(null); setMessages([]) }
      refetchVisible()
    } catch {
      refetchVisible()
    }
  }, [refetchVisible, selectedChat])

  // ── Detail view (shared across tabs) ──────────────────────────

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

  /**
   * Send a follow-up message inside the currently-open library chat.
   *
   * Reuses the EXISTING chatId so the backend appends to the same chat
   * row. History is built from completed prior messages so the LLM sees
   * the full conversation context when it generates the follow-up.
   *
   * The optimistic stub makes the compose feel snappy — we insert an
   * `answering` placeholder immediately, which trips `hasInFlight` and
   * kicks off the polling effect that streams real state.
   */
  const sendFollowUp = useCallback(async (query: string) => {
    if (!selectedChat || sending) return
    setSending(true)

    const msgId = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`

    const history = messages
      .filter(m => m.status === 'completed')
      .flatMap(m => {
        const textBlock = (m.responseBlocks || []).find((b: any) => b.type === 'text')
        return [
          { role: 'user', content: m.query },
          ...(textBlock?.data ? [{ role: 'assistant', content: textBlock.data }] : []),
        ]
      })

    const optimistic: StoredMessage = {
      messageId: msgId,
      query,
      status: 'answering',
      responseBlocks: [],
    }
    setMessages(prev => [...prev, optimistic])

    try {
      await phoenixGql(
        `mutation StartSearch(
          $query: String!,
          $chatId: String!,
          $messageId: String!,
          $optimizationMode: String,
          $history: [HistoryEntry!]
        ) {
          startSearch(
            query: $query,
            chatId: $chatId,
            messageId: $messageId,
            optimizationMode: $optimizationMode,
            history: $history
          ) { sessionId status }
        }`,
        {
          query,
          chatId: selectedChat,
          messageId: msgId,
          optimizationMode: defaultMode,
          history,
        }
      )
    } catch (err) {
      setMessages(prev =>
        prev.map(m =>
          m.messageId === msgId
            ? {
                ...m,
                status: 'error',
                responseBlocks: [
                  { type: 'text', data: (err as Error)?.message || 'Failed to start follow-up search.' },
                ],
              }
            : m
        )
      )
    } finally {
      setSending(false)
    }
  }, [selectedChat, sending, messages, defaultMode])

  // ── Helpers ──────────────────────────────────────────────────

  const timeAgo = (dateStr: string | null | undefined): string => {
    if (!dateStr) return ''
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  /** Days until a trashed chat gets hard-deleted (for the Trash badge). */
  const purgeCountdown = (purgesAt: string | null): string => {
    if (!purgesAt) return ''
    const diffMs = new Date(purgesAt).getTime() - Date.now()
    if (diffMs <= 0) return 'purges any moment'
    const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000))
    return days === 1 ? 'purges tomorrow' : `purges in ${days} days`
  }

  // Live refresh for in-flight messages. If any message in the open chat
  // is still `answering`, poll `messages(chatId)` every 2s until the last
  // one flips to completed/error. This lets the user navigate away from
  // the chat mid-search and come back to a live progress view.
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
        // next tick will retry
      }
    }

    tick()
    const id = setInterval(tick, 2000)
    return () => { cancelled = true; clearInterval(id) }
  }, [selectedChat, hasInFlight])

  // ── Detail view render ─────────────────────────────────────

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
      navigate(`/?q=${encodeURIComponent(query)}`)
    }

    return (
      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* Scrollable thread */}
        <div className="flex-1 overflow-y-auto p-6">
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
              messages.map((m, idx) => {
                const msg = toMessage(m)
                const inFlight = msg.status === 'answering'
                const isLast = idx === messages.length - 1
                return (
                  <MessageBox
                    key={m.messageId}
                    message={msg}
                    isLast={isLast || inFlight}
                    loading={inFlight}
                    chatId={selectedChat}
                    onSearch={handleSearch}
                    mode={defaultMode}
                  />
                )
              })
            )}

            {!loadingMessages && messages.length === 0 && (
              <p className="text-[var(--text-muted)] text-small text-center py-12">No messages in this chat.</p>
            )}
          </div>
        </div>

        {/*
          Follow-up compose box — pinned to the bottom of the detail view
          so the user can keep the conversation going without leaving
          Library. `sendFollowUp` targets THIS chatId, so the backend
          appends to the same row and future polls see the new turn
          inside the same thread.
        */}
        {!loadingMessages && messages.length > 0 && (
          <div className="sticky bottom-0 bg-[var(--surface-primary)] border-t border-[var(--border-default)]">
            <div className="max-w-3xl mx-auto">
              <MessageInput
                onSend={sendFollowUp}
                loading={sending || hasInFlight}
                mode={defaultMode}
                onModeChange={() => {}}
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── List view render ───────────────────────────────────────

  const currentList =
    tab === 'chats' ? chats
    : tab === 'bookmarks' ? bookmarkedChats
    : tab === 'archive' ? archivedChats
    : trashedChats

  return (
    <div className="flex-1 overflow-y-auto p-6 pb-20 lg:pb-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-h1 tracking-tight text-[var(--text-primary)]">Library</h1>
          {/*
            One badge, four tab-aware words. Singular/plural handled in
            `countLabel`. The count reflects whatever list is currently
            mounted so it's always accurate after a mutation refetch.
          */}
          <span className="text-caption text-[var(--text-muted)] border border-[var(--border-default)] px-2 py-1 rounded-spine normal-case tracking-normal tabular-nums">
            {countLabel(tab, currentList.length)}
          </span>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-6 mb-6 border-b border-[var(--border-default)] overflow-x-auto">
          {(['chats', 'bookmarks', 'archive', 'trash'] as Tab[]).map(t => (
            <TextAction
              key={t}
              onClick={() => setTab(t)}
              label={TAB_LABELS[t]}
              active={tab === t}
              className={`pb-2.5 min-h-[44px] ${tab === t ? 'border-b-2 border-[var(--border-accent)]' : ''}`}
            />
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 border-2 border-[var(--border-muted)] border-t-[var(--border-accent)] rounded-full animate-spin" />
          </div>
        )}

        {!loading && currentList.length === 0 && (
          <div className="text-center py-20">
            <p className="text-[var(--text-secondary)] text-small font-medium mb-1">{EMPTY_COPY[tab].title}</p>
            <p className="text-[var(--text-muted)] text-small max-w-xs mx-auto">{EMPTY_COPY[tab].body}</p>
            {tab === 'chats' && (
              <TextAction href="/" label="Start a new search" variant="accent" className="mt-4" />
            )}
          </div>
        )}

        {!loading && currentList.length > 0 && (
          <motion.div
            variants={variants.stagger}
            initial="initial"
            animate="animate"
            className="border-t border-[var(--border-default)]"
          >
            {currentList.map(chat => (
              <ChatRow
                key={chat.id}
                chat={chat}
                tab={tab}
                onOpen={openChat}
                onToggleBookmark={toggleBookmark}
                onArchive={archiveChat}
                onRestore={restoreChat}
                onTrash={trashChat}
                onPurge={purgeChat}
                timeAgo={timeAgo}
                purgeCountdown={purgeCountdown}
              />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}

// ── ChatRow ────────────────────────────────────────────────────

interface ChatRowProps {
  chat: Chat
  tab: Tab
  onOpen: (id: string) => void
  onToggleBookmark: (id: string, e?: React.MouseEvent) => void
  onArchive: (id: string, e?: React.MouseEvent) => void
  onRestore: (id: string, e?: React.MouseEvent) => void
  onTrash: (id: string, e?: React.MouseEvent) => void
  onPurge: (id: string, e?: React.MouseEvent) => void
  timeAgo: (s: string | null | undefined) => string
  purgeCountdown: (s: string | null) => string
}

/**
 * One row, four tab-aware action bars. Clicking the row opens the chat
 * detail view regardless of tab — this is the bidirectional linking the
 * user asked for: bookmarks, archives, and trash entries all link back
 * to the full conversation instead of showing a dead UUID label.
 *
 * The blue accent bar sits on the RIGHT edge of the row (user
 * preference — it frames the action column instead of the title column).
 */
function ChatRow({
  chat,
  tab,
  onOpen,
  onToggleBookmark,
  onArchive,
  onRestore,
  onTrash,
  onPurge,
  timeAgo,
  purgeCountdown,
}: ChatRowProps) {
  // Which timestamp drives the secondary line changes per tab so the row
  // always shows the most relevant moment for the current context.
  const subtitle = useMemo(() => {
    if (tab === 'bookmarks' && chat.bookmarkedAt) return `Bookmarked ${timeAgo(chat.bookmarkedAt)}`
    if (tab === 'archive' && chat.archivedAt) return `Archived ${timeAgo(chat.archivedAt)}`
    if (tab === 'trash' && chat.trashedAt) return `Trashed ${timeAgo(chat.trashedAt)}`
    return timeAgo(chat.createdAt)
  }, [tab, chat, timeAgo])

  const bookmarked = !!chat.bookmarkedAt

  return (
    <motion.div variants={variants.slideUp} transition={transition.normal}>
      <div
        onClick={() => onOpen(chat.id)}
        className="flex items-center gap-4 py-4 pl-4 pr-5
          border-b border-[var(--border-default)]
          border-r-[4px] border-r-[var(--border-accent)]
          hover:bg-[var(--surface-whisper)]
          transition-colors duration-[180ms] cursor-pointer group"
      >
        <div className="flex-1 min-w-0">
          <h3 className="text-small font-semibold text-[var(--text-primary)] truncate">{chat.title}</h3>
          <div className="flex items-center gap-2 text-caption text-[var(--text-muted)] normal-case tracking-normal tabular-nums">
            <span>{subtitle}</span>
            {tab === 'trash' && chat.purgesAt && (
              <>
                <span className="opacity-40">·</span>
                <span className="text-[var(--text-highlight)]">{purgeCountdown(chat.purgesAt)}</span>
              </>
            )}
          </div>
        </div>

        {/* Per-tab action bar — icons first, danger last. */}
        <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
          {tab === 'chats' && (
            <>
              <IconButton
                label={bookmarked ? 'Unbookmark' : 'Bookmark'}
                onClick={(e) => onToggleBookmark(chat.id, e)}
                icon={<BookmarkSimple size={16} weight={bookmarked ? 'fill' : 'regular'} />}
                accent={bookmarked}
              />
              <IconButton
                label="Archive"
                onClick={(e) => onArchive(chat.id, e)}
                icon={<Archive size={16} weight="regular" />}
              />
              <IconButton
                label="Move to trash"
                onClick={(e) => onTrash(chat.id, e)}
                icon={<Trash size={16} weight="regular" />}
                danger
              />
            </>
          )}

          {tab === 'bookmarks' && (
            <>
              <IconButton
                label="Unbookmark"
                onClick={(e) => onToggleBookmark(chat.id, e)}
                icon={<BookmarkSimple size={16} weight="fill" />}
                accent
              />
              <IconButton
                label="Archive"
                onClick={(e) => onArchive(chat.id, e)}
                icon={<Archive size={16} weight="regular" />}
              />
              <IconButton
                label="Move to trash"
                onClick={(e) => onTrash(chat.id, e)}
                icon={<Trash size={16} weight="regular" />}
                danger
              />
            </>
          )}

          {tab === 'archive' && (
            <>
              <IconButton
                label="Restore"
                onClick={(e) => onRestore(chat.id, e)}
                icon={<ArrowCounterClockwise size={16} weight="regular" />}
              />
              <IconButton
                label="Move to trash"
                onClick={(e) => onTrash(chat.id, e)}
                icon={<Trash size={16} weight="regular" />}
                danger
              />
            </>
          )}

          {tab === 'trash' && (
            <>
              <IconButton
                label="Restore"
                onClick={(e) => onRestore(chat.id, e)}
                icon={<ArrowCounterClockwise size={16} weight="regular" />}
              />
              <IconButton
                label="Delete permanently"
                onClick={(e) => onPurge(chat.id, e)}
                icon={<X size={16} weight="regular" />}
                danger
              />
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ── IconButton ─────────────────────────────────────────────────

interface IconButtonProps {
  icon: ReactNode
  label: string
  onClick: (e: React.MouseEvent) => void
  accent?: boolean
  danger?: boolean
}

/**
 * Minimal icon-only button used in the chat row action bar. No text, no
 * pill — the row stays low-chrome until hovered. `aria-label` carries the
 * action name for screen readers.
 */
function IconButton({ icon, label, onClick, accent, danger }: IconButtonProps) {
  const colorClass = danger
    ? 'text-[var(--text-muted)] hover:text-[var(--text-danger)]'
    : accent
      ? 'text-[var(--text-accent)] hover:text-[var(--text-accent)]'
      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-spine hover:bg-[var(--surface-whisper)] transition-colors duration-[120ms] ${colorClass}`}
    >
      {icon}
    </button>
  )
}

export default LibraryPage
