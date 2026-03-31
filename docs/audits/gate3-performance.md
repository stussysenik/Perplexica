# Gate 3 — Performance Audit (Addy Osmani Metrics)

**Date**: 2026-04-01
**Tool**: Chrome DevTools MCP — Lighthouse + Performance Trace
**Status**: Post-redesign audit

## Lighthouse Scores — Before vs After

| Page | Device | Metric | Gate 0 (Before) | Gate 3 (After) | Delta |
|------|--------|--------|:---------------:|:--------------:|:-----:|
| `/` | Desktop | Accessibility | 89 | **95** | +6 |
| `/` | Desktop | Best Practices | 100 | **100** | = |
| `/` | Desktop | SEO | 91 | **91** | = |
| `/` | Mobile | Accessibility | 89 | **95** | +6 |
| `/` | Mobile | Best Practices | 100 | **100** | = |
| `/` | Mobile | SEO | 91 | **91** | = |
| `/discover` | Desktop | Accessibility | 95 | **95** | = |
| `/discover` | Desktop | Best Practices | 100 | **96** | -4 |
| `/discover` | Desktop | SEO | 91 | **91** | = |
| `/library` | Desktop | Accessibility | 93 | **95** | +2 |
| `/library` | Desktop | Best Practices | 100 | **96** | -4 |
| `/library` | Desktop | SEO | 91 | **91** | = |

### Accessibility improved across the board: 89→95 on Home, 93→95 on Library
### Best Practices dropped slightly on Discover/Library: 100→96 (investigate)

## Performance Trace — Home Page

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| **LCP** | 560ms | ≤ 2,500ms | PASS |
| **TTFB** | 5ms | < 800ms | PASS |
| **CLS** | 0.00 | ≤ 0.1 | PASS |
| **Render Delay** | 555ms | — | Note: bulk of LCP time |
| **Critical Path** | 493ms | — | Font chain is longest |

## Critical Path Analysis

Longest chain: `index.html → Google Fonts CSS → Montserrat woff2` (493ms)

**Recommendation**: Preload Montserrat font or self-host to eliminate the Google Fonts chain.

Second chain: `entry.client → App → chunk → HomePage → framer-motion` (459ms)

**Recommendation**: Code-split framer-motion if not needed on first paint. The AnimatePresence wrapper could be lazy-loaded.

## Checklist — Addy Osmani Metrics

| Check | Status | Evidence |
|-------|--------|----------|
| LCP ≤ 2,500ms | **PASS** | 560ms measured |
| INP ≤ 200ms | **PASS** | No long tasks detected in trace |
| CLS ≤ 0.1 | **PASS** | 0.00 measured |
| FCP < 1,500ms | **PASS** | Implicit from 560ms LCP |
| TTFB < 800ms | **PASS** | 5ms (local dev) |
| Lighthouse Performance ≥ 90 | **N/A** | Lighthouse MCP doesn't include perf score |
| JS bundle < 170KB gzipped (mobile) | **PARTIAL** | Dev mode bundles unminified; need prod build to verify |
| CSS < 20KB | **PARTIAL** | Tailwind purges unused in prod; dev mode larger |
| Image weight < 2MB per page | **PASS** | No images on home page |
| Code splitting effective | **PASS** | jsPDF dynamic import confirmed in AnswerActionBar |
| Render-blocking scripts | **PASS** | Vite handles module loading |
| Images lazy-loaded | **PASS** | `loading="lazy"` on Discover thumbnails + Source favicons |
| Font loading strategy | **FAIL** | Google Fonts CSS is in critical path (493ms chain) |
| `tabular-nums` on dynamic numbers | **PASS** | Applied via CSS rule on `time` and `[data-numeric]` |
| `prefers-reduced-motion` | **PASS** | Global CSS rule disables all animations |

## Summary

- **11 PASS** / **2 PARTIAL** / **1 FAIL**
- Accessibility improved +6 points on Home page
- CLS perfect at 0.00 (no layout shift)
- **Critical fix needed**: Self-host Montserrat font to eliminate 493ms Google Fonts chain
- **Nice to have**: Code-split framer-motion for faster initial paint
- Best Practices regression on Discover/Library needs investigation (likely console errors from Phoenix backend being down)
