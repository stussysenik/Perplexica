/**
 * Motion primitives for Perplexica's neuroscience design system.
 *
 * Timing rules (Emil Kowalski):
 * - All UI animations < 300ms
 * - ease-out for entering elements
 * - ease-in-out for elements already on screen
 * - No animation on high-frequency keyboard actions
 * - prefers-reduced-motion always respected
 *
 * Easing curves:
 * - EASE_OUT: fast start, gentle stop — default for anything appearing
 * - EASE_IN_OUT: symmetric — for elements morphing in place
 * - EASE_DRAWER: iOS sheet pattern — for drawers/panels
 */

// --- Timing constants (ms) ---

export const DURATION = {
  instant: 0.1,   // 100ms — micro-feedback (button press)
  fast: 0.18,     // 180ms — state toggles, hover effects
  normal: 0.25,   // 250ms — page transitions, content reveals
  slow: 0.4,      // 400ms — complex sequences only
} as const

// --- Easing curves (cubic-bezier arrays for Framer Motion) ---

export const EASE = {
  out: [0.16, 1, 0.3, 1] as const,           // entering elements
  inOut: [0.65, 0, 0.35, 1] as const,        // morphing in place
  drawer: [0.32, 0.72, 0, 1] as const,       // drawer/sheet (use at 500ms)
} as const

// CSS cubic-bezier strings for Tailwind/CSS transitions
export const EASE_CSS = {
  out: 'cubic-bezier(0.16, 1, 0.3, 1)',
  inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
  drawer: 'cubic-bezier(0.32, 0.72, 0, 1)',
} as const

// --- Framer Motion variants ---

export const variants = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: DURATION.fast, ease: EASE.out },
  },

  slideUp: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -4 },
    transition: { duration: DURATION.normal, ease: EASE.out },
  },

  slideFromLeft: {
    initial: { opacity: 0, x: -16 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -8 },
    transition: { duration: DURATION.normal, ease: EASE.out },
  },

  slideFromRight: {
    initial: { opacity: 0, x: 16 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 8 },
    transition: { duration: DURATION.normal, ease: EASE.out },
  },

  // Stagger container — wrap children in motion.div with this
  stagger: {
    animate: {
      transition: {
        staggerChildren: 0.05, // 50ms between children (Krehel)
      },
    },
  },

  // Scale in — for badges, icons
  scaleIn: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: DURATION.fast, ease: EASE.out },
  },
} as const

// --- Transition presets (for use in Framer Motion's transition prop) ---

export const transition = {
  fast: { duration: DURATION.fast, ease: EASE.out },
  normal: { duration: DURATION.normal, ease: EASE.out },
  inPlace: { duration: DURATION.normal, ease: EASE.inOut },
  exitFast: { duration: DURATION.instant, ease: EASE.out },
} as const

// --- Reduced motion helper ---

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Returns motion props that disable animation when user prefers reduced motion.
 * Use: <motion.div {...safeMotion(variants.slideUp)}>
 */
export function safeMotion(variant: Record<string, any>) {
  if (prefersReducedMotion()) {
    return {
      initial: variant.animate || {},
      animate: variant.animate || {},
    }
  }
  return variant
}
