# Chess Piece Demo — Archived

An 84-line static chess board, rendered with Unicode glyphs and Tailwind
classes, originally living at `redwood/web/src/components/Chess/Chess.tsx`.
It was an aesthetic exploration intended as a visual delight on the home
page splash, hidden behind a `{false && (...)}` gate while the idea was
still being shaped.

## Why it is here

The file was **never committed to git**. It only existed on the operator's
local working copy. The single successful Railway deploy at `03:09:48`
happened because that deploy was triggered via `railway up --detach`, which
uploads the local working directory — untracked files and all. Every
subsequent deploy came from the GitHub integration, which only sees tracked
files, so Vite/Rollup failed at the build step with:

```
Could not resolve "../../components/Chess/Chess" from
"src/pages/HomePage/HomePage.tsx"
```

Vite resolves `lazy(() => import('...'))` specifiers **statically at build
time**, regardless of whether the render site is reachable. The `{false &&`
gate saved nothing — the import still had to resolve. Every Railway deploy
after `03:09:48` was blocked on this one missing file.

## What we did

- Moved the file here, preserving the source verbatim, so the exploration
  isn't lost.
- Removed the `lazy(() => import('src/components/Chess/Chess'))` import and
  the `{false && (...<ChessBoard />...)}` block from
  `redwood/web/src/pages/HomePage/HomePage.tsx`.
- Deleted the now-empty `redwood/web/src/components/Chess/` directory.

## The lesson

Any dynamic `import()` specifier is resolved at build time. A dead render
site does not protect a broken import. If you want to gate a component on a
flag, guard the **import**, not just the **usage** — or, better, don't
check in imports against files that aren't committed yet.

## Cross-references

- OpenSpec change: `openspec/changes/unblock-prod-preview/`
- Sibling archive: `tasks/archive/phoenix-legacy-smoke-test-ui/`
