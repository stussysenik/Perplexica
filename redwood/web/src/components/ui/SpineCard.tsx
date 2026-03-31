import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { variants, transition } from 'src/lib/motion'

interface SpineCardProps {
  children: ReactNode
  /** Color of the left spine accent. Defaults to accent (blue). */
  spine?: 'accent' | 'highlight' | 'muted' | 'none'
  /** Enable hover whisper fill (3% opacity tint). Defaults to true. */
  hoverable?: boolean
  /** Click handler — makes the card a button. */
  onClick?: () => void
  /** HTML id for scroll-to targeting (e.g., source cards). */
  id?: string
  className?: string
}

const spineColors = {
  accent: 'border-l-[3px] border-l-[var(--border-accent)]',
  highlight: 'border-l-[3px] border-l-[var(--border-highlight)]',
  muted: 'border-l-[3px] border-l-[var(--border-muted)]',
  none: '',
}

/**
 * SpineCard — the foundational container in Perplexica's outline design system.
 *
 * 1px border defines the boundary. 3px left color spine provides accent.
 * No fill by default — hover state adds a 3% whisper tint.
 */
const SpineCard = ({
  children,
  spine = 'accent',
  hoverable = true,
  onClick,
  id,
  className = '',
}: SpineCardProps) => {
  const Tag = onClick ? 'button' : 'div'

  return (
    <motion.div
      variants={variants.slideUp}
      initial="initial"
      animate="animate"
      transition={transition.normal}
    >
      <Tag
        id={id}
        onClick={onClick}
        className={`
          border border-[var(--border-default)] rounded-spine
          ${spineColors[spine]}
          ${hoverable ? 'hover:bg-[var(--surface-whisper)] transition-colors duration-[180ms]' : ''}
          ${onClick ? 'cursor-pointer text-left w-full' : ''}
          ${className}
        `}
      >
        {children}
      </Tag>
    </motion.div>
  )
}

export default SpineCard
