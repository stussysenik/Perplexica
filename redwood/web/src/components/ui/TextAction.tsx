import { ReactNode, ButtonHTMLAttributes } from 'react'

interface TextActionProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Icon element (16px recommended). */
  icon?: ReactNode
  /** Label text. Hidden on mobile when hideLabel is true. */
  label?: string
  /** Hide label on mobile (icon-only). Defaults to false. */
  hideLabel?: boolean
  /** Color variant. */
  variant?: 'default' | 'accent' | 'highlight' | 'danger'
  /** Active/selected state. */
  active?: boolean
  /** Render as anchor link. */
  href?: string
  className?: string
  children?: ReactNode
}

const variantStyles = {
  default: 'text-[var(--text-muted)] hover:text-[var(--text-accent)]',
  accent: 'text-[var(--text-accent)]',
  highlight: 'text-[var(--text-highlight)]',
  danger: 'text-[var(--text-muted)] hover:text-red-500',
}

/**
 * TextAction — text-link style interactive element.
 *
 * No border, no fill, no background. Just icon + text that responds to hover.
 * The atomic action primitive — used for nav items, action bars, filter toggles.
 */
const TextAction = ({
  icon,
  label,
  hideLabel = false,
  variant = 'default',
  active = false,
  href,
  className = '',
  children,
  ...props
}: TextActionProps) => {
  const content = (
    <>
      {icon && <span className="flex-shrink-0 [&>svg]:w-4 [&>svg]:h-4">{icon}</span>}
      {label && (
        <span className={`text-small font-medium ${hideLabel ? 'hidden lg:inline' : ''}`}>
          {label}
        </span>
      )}
      {children}
    </>
  )

  const baseClasses = `
    inline-flex items-center gap-1.5
    transition-colors duration-[180ms]
    ${active ? variantStyles[variant === 'default' ? 'accent' : variant] : variantStyles[variant]}
    ${active ? 'font-semibold' : ''}
    ${className}
  `

  if (href) {
    return (
      <a href={href} className={baseClasses}>
        {content}
      </a>
    )
  }

  return (
    <button type="button" className={baseClasses} {...props}>
      {content}
    </button>
  )
}

export default TextAction
