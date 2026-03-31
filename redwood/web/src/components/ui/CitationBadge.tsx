interface CitationBadgeProps {
  /** Citation number (1-based). */
  index: number
  /** Click handler — scrolls to source. */
  onClick?: () => void
  className?: string
}

/**
 * CitationBadge — inline [1] style reference marker.
 *
 * 1px accent border, accent text, small inline element.
 * Connects answer text to source cards via click → scroll.
 */
const CitationBadge = ({ index, onClick, className = '' }: CitationBadgeProps) => {
  return (
    <sup
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={`
        inline-flex items-center justify-center
        min-w-[18px] h-[18px] px-1
        text-[10px] font-medium leading-none
        text-[var(--text-accent)] border border-[var(--border-accent)]
        rounded-[3px]
        ${onClick ? 'cursor-pointer hover:bg-[var(--surface-whisper)] transition-colors duration-[180ms]' : ''}
        ${className}
      `}
    >
      {index}
    </sup>
  )
}

export default CitationBadge
