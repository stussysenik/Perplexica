interface SectionDividerProps {
  className?: string
}

/**
 * SectionDivider — 1px horizontal line.
 *
 * Minimal separator between content sections.
 * Uses muted border color for low visual weight.
 */
const SectionDivider = ({ className = '' }: SectionDividerProps) => {
  return (
    <hr
      className={`border-t border-[var(--border-default)] ${className}`}
    />
  )
}

export default SectionDivider
