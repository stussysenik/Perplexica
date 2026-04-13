import { useRef, useState, useCallback } from 'react'
import { Lightbulb, LightbulbFilament } from '@phosphor-icons/react'
import gsap from 'gsap'

/**
 * VerifiedBadge — interactive lightbulb that animates on hover/click.
 * Ring removed; icon is always warm amber to signal "answer verified".
 */

type BadgeState = 'idle' | 'hover' | 'active'

const AMBER = '#F59E0B'

const VerifiedBadge = () => {
  const [state, setState] = useState<BadgeState>('idle')
  const iconRef = useRef<HTMLSpanElement>(null)

  const handleEnter = useCallback(() => {
    setState('hover')
    gsap.to(iconRef.current, {
      scale: 1.18,
      duration: 0.22,
      ease: 'back.out(2.5)',
      overwrite: true,
    })
  }, [])

  const handleLeave = useCallback(() => {
    setState('idle')
    gsap.to(iconRef.current, {
      scale: 1,
      duration: 0.22,
      ease: 'power3.out',
      overwrite: true,
    })
  }, [])

  const handleActivate = useCallback(() => {
    setState('active')
    gsap.to(iconRef.current, {
      scale: 1.35,
      duration: 0.09,
      ease: 'power4.in',
      overwrite: true,
      onComplete: () =>
        gsap.to(iconRef.current, {
          scale: 1.18,
          duration: 0.55,
          ease: 'elastic.out(1.2, 0.4)',
          onComplete: () => setState('hover'),
        }),
    })
  }, [])

  const isVerified = state !== 'idle'

  return (
    <button
      type="button"
      aria-label="AI answer confidence indicator"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
      onClick={handleActivate}
      onTouchStart={handleActivate}
      className="inline-flex items-center gap-2 focus:outline-none cursor-default select-none"
    >
      <span
        ref={iconRef}
        className="relative inline-flex items-center justify-center w-[22px] h-[22px]"
        style={{ willChange: 'transform', color: AMBER }}
      >
        {isVerified ? (
          <LightbulbFilament size={18} weight="fill" />
        ) : (
          <Lightbulb size={18} weight="regular" />
        )}
      </span>

      <span
        className={`text-body transition-colors duration-200 ${
          isVerified ? 'text-[var(--text-accent)]' : 'text-[var(--text-muted)]'
        }`}
      >
        verified answer machine
      </span>
    </button>
  )
}

export default VerifiedBadge
