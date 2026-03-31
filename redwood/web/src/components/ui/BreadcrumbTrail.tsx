import TextAction from './TextAction'

interface Crumb {
  label: string
  href?: string
  onClick?: () => void
}

interface BreadcrumbTrailProps {
  /** Ordered list of breadcrumb segments. Last item is current page. */
  crumbs: Crumb[]
  className?: string
}

/**
 * BreadcrumbTrail — slash-separated navigation history.
 *
 * Each segment is a TextAction (clickable to jump back).
 * Current page (last crumb) is bold and non-interactive.
 * Mobile: collapsed to just current + back arrow.
 */
const BreadcrumbTrail = ({ crumbs, className = '' }: BreadcrumbTrailProps) => {
  if (crumbs.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className={`flex items-center gap-1.5 text-small ${className}`}>
      {crumbs.map((crumb, idx) => {
        const isLast = idx === crumbs.length - 1

        return (
          <span key={idx} className="flex items-center gap-1.5">
            {idx > 0 && (
              <span className="text-[var(--text-muted)] select-none">/</span>
            )}
            {isLast ? (
              <span
                className="text-[var(--text-primary)] font-semibold truncate max-w-[200px]"
                aria-current="page"
              >
                {crumb.label}
              </span>
            ) : (
              <TextAction
                label={crumb.label}
                href={crumb.href}
                onClick={crumb.onClick}
                className="truncate max-w-[160px]"
              />
            )}
          </span>
        )
      })}
    </nav>
  )
}

export default BreadcrumbTrail
