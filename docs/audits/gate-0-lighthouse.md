# Gate 0 — Lighthouse Baseline Audit

**Date**: 2026-03-31
**Tool**: Chrome DevTools MCP Lighthouse
**Status**: Pre-redesign baseline

## Scores

| Page | Device | Accessibility | Best Practices | SEO | Failed Audits |
|------|--------|:------------:|:--------------:|:---:|:-------------:|
| `/` (Home) | Desktop | 89 | 100 | 91 | 3 |
| `/` (Home) | Mobile | 89 | 100 | 91 | 3 |
| `/discover` | Desktop | 95 | 100 | 91 | 2 |
| `/library` | Desktop | 93 | 100 | 91 | 3 |

## Targets (Post-Redesign Gate 4)

| Category | Target |
|----------|--------|
| Accessibility | >= 95 |
| Best Practices | >= 95 |
| SEO | >= 90 |
| Performance | >= 90 |

## Known Issues (Pre-Redesign)

- Home page accessibility: 89 (lowest) — likely missing ARIA labels, contrast issues
- SEO consistent at 91 across all pages
- Best Practices perfect at 100
- Performance not measured by Lighthouse audit tool (requires performance trace)

## Notes

- Performance metrics (LCP, INP, CLS) will be captured via Chrome DevTools performance traces
- These baselines represent the current UI before the design system overhaul
- All scores should improve or maintain after Gate 2 (Page Overhaul)
