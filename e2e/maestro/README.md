# Maestro Web flows

Maestro flows that drive the **web** app in Chrome (each file sets `url:`, which
puts Maestro in web mode). These are lightweight cross-checks; the rigorous,
multi-browser suite is **Playwright** under `e2e/*.spec.ts`.

## Prerequisites

The app must be running locally (Phoenix :4000 + Redwood :8910):

```bash
AUTH_BYPASS=true ./dev      # from repo root
```

## Flows

| Flow | What it covers | Speed |
|------|----------------|-------|
| `smoke.yaml` | App shell loads; brand (`FYOA`) + nav + hero render | fast |
| `navigation.yaml` | Search → Discover → Library → Settings → home, asserting each page heading | fast |
| `search.yaml` | Full live search journey through NIM until a cited answer renders | **slow** (hits live APIs) |

## Run

```bash
maestro test e2e/maestro/smoke.yaml
maestro test e2e/maestro/navigation.yaml
maestro test e2e/maestro/search.yaml     # slow; needs NIM to be responsive

# or the whole directory (skips README.md automatically)
maestro test e2e/maestro
```

## Notes

- Assert on **real DOM text** (brand/nav labels, page headings), not placeholder
  attributes — those drift.
- `search.yaml` depends on live NIM latency. The hosted NIM endpoint rate-limits
  under heavy use; if research stalls, that's upstream capacity, not the flow.
