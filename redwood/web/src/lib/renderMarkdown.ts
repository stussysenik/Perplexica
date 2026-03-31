/**
 * Shared markdown rendering utilities for Perplexica.
 *
 * All markdown→HTML conversion lives here so every page uses the same
 * pipeline.  The renderer is intentionally regex-based (no external
 * library) to keep the bundle small and predictable.
 *
 * Security: All HTML output is sanitized via DOMPurify before being
 * used with dangerouslySetInnerHTML.
 */

import DOMPurify from 'dompurify'

// Configure DOMPurify to allow design system attributes
const PURIFY_CONFIG = {
  ADD_ATTR: ['class', 'id', 'data-topic', 'style', 'target', 'rel'],
  ADD_TAGS: ['sup'],
  ALLOW_DATA_ATTR: true,
}

// ---------------------------------------------------------------------------
// slugify — convert heading text to a URL-safe anchor id
// ---------------------------------------------------------------------------

/**
 * Converts a heading string into a URL-safe slug.
 *
 * Rules:
 *   1. Lowercase the text
 *   2. Replace spaces with hyphens
 *   3. Strip everything that isn't alphanumeric or a hyphen
 *   4. Collapse consecutive hyphens
 *   5. Trim leading/trailing hyphens
 *
 * @example slugify("How it Works!") // "how-it-works"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
}

// ---------------------------------------------------------------------------
// extractHeadings — parse raw markdown for a table-of-contents data structure
// ---------------------------------------------------------------------------

export interface Heading {
  /** Slugified id suitable for an anchor link */
  id: string
  /** Original heading text (plain, no markdown syntax) */
  text: string
  /** Heading level: 1, 2, or 3 */
  level: number
}

/**
 * Scans raw markdown (before HTML conversion) and returns every heading
 * that uses ATX syntax (`#`, `##`, `###`).
 *
 * Only levels 1–3 are extracted; deeper headings are ignored.
 */
export function extractHeadings(text: string): Heading[] {
  if (!text) return []

  const headings: Heading[] = []
  const regex = /^(#{1,3}) (.+)$/gm
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    const level = match[1].length as 1 | 2 | 3
    const raw = match[2].trim()
    headings.push({
      id: `section-${slugify(raw)}`,
      text: raw,
      level,
    })
  }

  return headings
}

// ---------------------------------------------------------------------------
// stripMarkdown — plain-text extraction (for TTS, PDF export, etc.)
// ---------------------------------------------------------------------------

/**
 * Removes all markdown formatting and returns plain text.
 *
 * Handles: code blocks, inline code, headings, bold, italic, links,
 * images, citation badges, blockquotes, list markers, and horizontal
 * rules.
 */
export function stripMarkdown(text: string): string {
  if (!text) return ''

  return (
    text
      // Code blocks → just the code content
      .replace(/```\w*\n([\s\S]*?)```/g, '$1')
      // Inline code → content only
      .replace(/`([^`]+)`/g, '$1')
      // Images → alt text
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
      // Links → link text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Headings → just the text
      .replace(/^#{1,6}\s+(.+)$/gm, '$1')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '$1')
      // Italic
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '$1')
      // Citation references [1] etc
      .replace(/\[(\d+)\]/g, '[$1]')
      // Blockquotes
      .replace(/^>\s?/gm, '')
      // Unordered list markers
      .replace(/^[-*+]\s+/gm, '')
      // Ordered list markers
      .replace(/^\d+\.\s+/gm, '')
      // Horizontal rules
      .replace(/^[-*_]{3,}$/gm, '')
      // Collapse multiple blank lines
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  )
}

// ---------------------------------------------------------------------------
// renderMarkdown — the main regex-based markdown→HTML converter
// ---------------------------------------------------------------------------

/**
 * Converts a markdown string to HTML using regex replacements.
 *
 * Enhancements over a minimal renderer:
 *   - Headings receive `id` attributes (prefixed with `section-`) for
 *     table-of-contents anchors.
 *   - `<strong>` tags include `class="topic-link"` and a `data-topic`
 *     attribute so the UI can make bold terms interactive.
 *   - Citation badges `[1]` are rendered as styled `<sup>` elements.
 */
export function renderMarkdown(text: string): string {
  if (!text) return ''

  const raw = (
    text
      // Code blocks
      .replace(
        /```(\w*)\n([\s\S]*?)```/g,
        '<pre><code class="language-$1">$2</code></pre>'
      )
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Headers — with slugified id attributes for TOC anchors
      .replace(/^### (.+)$/gm, (_match, heading) => {
        const id = `section-${slugify(heading)}`
        return `<h3 id="${id}">${heading}</h3>`
      })
      .replace(/^## (.+)$/gm, (_match, heading) => {
        const id = `section-${slugify(heading)}`
        return `<h2 id="${id}">${heading}</h2>`
      })
      .replace(/^# (.+)$/gm, (_match, heading) => {
        const id = `section-${slugify(heading)}`
        return `<h1 id="${id}">${heading}</h1>`
      })
      // Bold — wrapped as topic links
      .replace(
        /\*\*(.+?)\*\*/g,
        '<strong class="topic-link" data-topic="$1" style="color: #2563EB; cursor: pointer;">$1</strong>'
      )
      // Italic
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
      // Links
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener">$1</a>'
      )
      // Citation references [1], [2] etc — style as superscript badges
      .replace(
        /\[(\d+)\]/g,
        '<sup class="inline-flex items-center justify-center w-4 h-4 text-[9px] font-bold rounded bg-highlight/10 dark:bg-highlight/20 text-highlight dark:text-highlight-light ml-0.5 cursor-default">$1</sup>'
      )
      // Tables
      .replace(/^\|(.+)\|$/gm, (match) => {
        const cells = match.split('|').filter((c) => c.trim())
        if (cells.every((c) => /^[\s-:]+$/.test(c))) return ''
        const isHeader = cells.some((c) => /^-+$/.test(c.trim()))
        if (isHeader) return ''
        const tag = 'td'
        return (
          '<tr>' +
          cells.map((c) => `<${tag}>${c.trim()}</${tag}>`).join('') +
          '</tr>'
        )
      })
      .replace(
        /(<tr>[\s\S]*?<\/tr>\n?)+/g,
        '<table><tbody>$&</tbody></table>'
      )
      // Unordered lists
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>[\s\S]*?<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
      // Ordered lists
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
      // Blockquotes
      .replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>')
      // Paragraphs (lines not already wrapped)
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<[hupoltb])((?!<\/).+)$/gm, '<p>$1</p>')
      // Clean up
      .replace(/<p><\/p>/g, '')
  )

  return DOMPurify.sanitize(raw, PURIFY_CONFIG) as string
}
