import { ReactNode, ButtonHTMLAttributes } from 'react'

interface OutlineButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button content. */
  children: ReactNode
  /** Icon before label. */
  icon?: ReactNode
  /** Visual variant. */
  variant?: 'default' | 'accent' | 'highlight'
  /** Size. */
  size?: 'sm' | 'md'
  className?: string
}

const variantBorder = {
  default: 'border-[var(--border-default)] hover:border-[var(--border-accent)] text-[var(--text-secondary)]',
  accent: 'border-[var(--border-accent)] text-[var(--text-accent)]',
  highlight: 'border-[var(--border-highlight)] text-[var(--text-highlight)]',
}

const sizeClasses = {
  sm: 'px-3 py-1.5 text-small',
  md: 'px-4 py-2 text-body',
}

/**
 * OutlineButton — 1px bordered button with whisper fill on hover.
 *
 * Used for primary actions (Send) and secondary actions (Show more).
 * Never filled by default — only hover/active states get the whisper tint.
 */
const OutlineButton = ({
  children,
  icon,
  variant = 'default',
  size = 'md',
  className = '',
  disabled,
  ...props
}: OutlineButtonProps) => {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`
        inline-flex items-center justify-center gap-2
        border rounded-spine
        hover:bg-[var(--surface-whisper)]
        transition-colors duration-[180ms]
        disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent
        ${variantBorder[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      {...props}
    >
      {icon && <span className="flex-shrink-0 [&>svg]:w-4 [&>svg]:h-4">{icon}</span>}
      {children}
    </button>
  )
}

export default OutlineButton
