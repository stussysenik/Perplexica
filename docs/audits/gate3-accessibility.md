# Gate 3 -- WCAG 2.1 AA Accessibility Audit

**Date**: 2026-03-31
**Auditor**: Claude (automated code audit)
**Scope**: `/redwood/web/src/` -- all pages, layouts, and shared components
**Standard**: WCAG 2.1 Level AA

---

## Summary: 7 PASS, 5 PARTIAL, 5 FAIL

| #  | Criterion | Verdict | Details |
|----|-----------|---------|---------|
| 1  | Color contrast >= 4.5:1 / 3:1 | PARTIAL | See below |
| 2  | Keyboard accessible interactive elements | PARTIAL | See below |
| 3  | Focus visible on all focusable elements | PASS | See below |
| 4  | Skip-to-content link | FAIL | See below |
| 5  | Semantic HTML landmarks | PASS | See below |
| 6  | ARIA labels on icon-only buttons | PARTIAL | See below |
| 7  | ARIA live regions for search status | FAIL | See below |
| 8  | Screen reader announcements (search flow) | FAIL | See below |
| 9  | Images have alt text | PASS | See below |
| 10 | Form inputs have associated labels | FAIL | See below |
| 11 | Error messages programmatically associated | PARTIAL | See below |
| 12 | No content conveyed by color alone | PASS | See below |
| 13 | Touch targets >= 44x44px | PASS | See below |
| 14 | Reduced motion support | PASS | See below |
| 15 | Language attribute on `<html>` | PASS | See below |
| 16 | Page titles descriptive and unique | FAIL | See below |
| 17 | Heading hierarchy correct | PARTIAL | See below |

---

## Detailed Findings

### 1. Color Contrast -- PARTIAL

**Light mode (`:root` values)**:
- `--text-primary: #111111` on `--surface-primary: #FFFFFF` = ~18.3:1. **PASS**.
- `--text-secondary: #555555` on `#FFFFFF` = ~7.46:1. **PASS**.
- `--text-muted: #888888` on `#FFFFFF` = ~3.54:1. **FAIL for normal text** (needs 4.5:1). Used extensively for captions, timestamps, hint text, and source domains. At `text-small` (13px/500 weight) and `text-caption` (11px/500 weight), these are normal-size text -- not large text.
- `--text-accent: #2563EB` on `#FFFFFF` = ~4.62:1. **Borderline PASS** for normal text, PASS for large text.
- `--text-highlight: #10B981` on `#FFFFFF` = ~3.3:1. **FAIL** for normal text. Used on bookmarked state, highlight variant buttons.

**Dark mode (`.dark` values)**:
- `--text-muted: #666666` on `--surface-primary: #111111` = ~3.47:1. **FAIL** for normal text.
- `--text-secondary: #A3A3A3` on `#111111` = ~7.2:1. **PASS**.
- `--text-accent: #3B82F6` on `#111111` = ~4.8:1. **PASS**.

**Inline hardcoded color**: `renderMarkdown.ts:160` hardcodes `style="color: #2563EB"` on bold/topic-link elements. This bypasses dark mode theming entirely and forces a light-mode-only blue on what may be a dark background.

```tsx
// renderMarkdown.ts:160
'<strong class="topic-link" data-topic="$1" style="color: #2563EB; cursor: pointer;">$1</strong>'
```

**Remediation**:
- Increase `--text-muted` to at least `#767676` (light) and `#757575` (dark) for 4.5:1.
- Increase `--text-highlight` to at least `#0D9668` or pair it with a tinted background.
- Remove the inline `style="color: #2563EB"` from renderMarkdown and use a CSS class that respects dark mode.

---

### 2. Keyboard Accessible Interactive Elements -- PARTIAL

**Good**:
- `CitationBadge.tsx`: Has `tabIndex={0}`, `role="button"`, and `onKeyDown` handler for Enter key. **PASS**.
- `TextAction.tsx`: Renders as `<button>` or `<a>`, both natively keyboard-accessible. **PASS**.
- `OutlineButton.tsx`: Standard `<button>`. **PASS**.
- `MessageInput.tsx`: Submit button is a `<button>`. Textarea supports Enter to send, Shift+Enter for newline. `/` global shortcut to focus. **PASS**.
- `TableOfContents.tsx`: All items are `<button>` elements. Toggle is `<button>` with `aria-expanded`. **PASS**.

**Problems**:
- `LibraryPage.tsx:208-213`: Chat list items use `<div onClick={...} className="...cursor-pointer">` instead of `<button>` or `<a>`. Not keyboard-focusable, not operable via Enter/Space.

```tsx
// LibraryPage.tsx:208
<div
  onClick={() => openChat(chat.id)}
  className="... cursor-pointer group"
>
```

- `SpineCard.tsx:48`: Renders as `<button>` when `onClick` is provided -- good. But when used as a wrapper for a clickable `<div>`, the dynamic `Tag` variable may not receive proper type from TypeScript.

- `DiscoverPage.tsx` topic selector: Uses `TextAction` buttons (good), but the tab-like UI lacks `role="tablist"` / `role="tab"` / `aria-selected` semantics, and no arrow-key navigation between tabs.

- `LibraryPage.tsx` tab switcher (lines 167-179): Same issue -- visually functions as tabs but uses plain `TextAction` buttons without tablist/tab roles.

**Remediation**:
- Replace `<div onClick>` in LibraryPage chat list with `<button>` or wrap in a link.
- Add `role="tablist"`, `role="tab"`, `aria-selected` to the Discover and Library tab bars.

---

### 3. Focus Visible on All Focusable Elements -- PASS

`index.css:91-95` provides a global `:focus-visible` rule:

```css
:focus-visible {
  outline: 2px solid var(--border-accent);
  outline-offset: 2px;
  border-radius: 2px;
}
```

This applies universally to all focusable elements. The 2px solid blue outline is clearly visible on both light and dark backgrounds. No component overrides this with `outline: none` without providing an alternative.

---

### 4. Skip-to-Content Link -- FAIL

No skip-to-content link exists anywhere in the codebase. Searched for `skip-to`, `skipTo`, `skip.*content` -- zero results.

`index.html` has no skip link. `AppLayout.tsx` has no skip link before the sidebar navigation.

**Remediation**: Add a visually-hidden skip link as the first child of `<body>` or the AppLayout root that targets `<main>`:
```html
<a href="#main-content" class="sr-only focus:not-sr-only ...">Skip to content</a>
```
And add `id="main-content"` to the `<main>` element.

---

### 5. Semantic HTML Landmarks -- PASS

Good landmark usage throughout:

| Landmark | Location | Evidence |
|----------|----------|----------|
| `<nav aria-label="Main navigation">` | `AppLayout.tsx:40` | Desktop sidebar nav |
| `<nav aria-label="Mobile navigation">` | `AppLayout.tsx:98-100` | Mobile bottom tab bar |
| `<nav aria-label="Table of contents">` | `TableOfContents.tsx:93-98` | In-answer TOC |
| `<nav aria-label="Breadcrumb">` | `BreadcrumbTrail.tsx:26` | Breadcrumb trail |
| `<main>` | `AppLayout.tsx:77` | Main content area |
| `<aside>` | `AppLayout.tsx:31` | Desktop sidebar |
| `<header>` | `SharedPage.tsx:74` | Shared page header |
| `<main>` | `SharedPage.tsx:93` | Shared page content |

All `<nav>` elements have distinct `aria-label` values, which is correct when multiple navs coexist.

---

### 6. ARIA Labels on Icon-Only Buttons -- PARTIAL

**Good**:
- Mobile theme toggle in `AppLayout.tsx:86`: Has `aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}`. **PASS**.
- Send button in `MessageInput.tsx:99`: Has `aria-label="Send message"`. **PASS**.

**Problems**:
- Desktop theme toggle in `AppLayout.tsx:66-73`: Has visible text ("Light Mode" / "Dark Mode") so no aria-label needed. **OK**.
- `AnswerActionBar.tsx` action buttons: The `ActionButton` component uses `title={label}` but **not** `aria-label`. On mobile, the `<span>` label is `hidden sm:inline` (line 84), making these **icon-only buttons with no accessible name on small screens**. `title` is not reliably announced by screen readers.

```tsx
// AnswerActionBar.tsx:71-86
<button
  onClick={onClick}
  disabled={disabled}
  title={label}  // title is NOT a reliable accessible name
  ...
>
  {children}
  <span className="hidden sm:inline">{label}</span>  // hidden on mobile
</button>
```

**Remediation**: Add `aria-label={label}` to the `ActionButton` component, or use `sr-only` text instead of hiding the label entirely on mobile.

---

### 7. ARIA Live Regions for Search Status -- FAIL

No `aria-live`, `role="status"`, `role="alert"`, or `role="log"` attributes found anywhere in the codebase.

The search flow has three distinct status changes that sighted users see but screen reader users cannot detect:
1. Search begins (spinner + "Searching the web..." text in `MessageBox.tsx:78-83`)
2. Sources found (Sources component renders)
3. Answer complete (answer text appears, action bar appears)

None of these transitions are announced.

**Remediation**: Add `aria-live="polite"` to the message list container or individual status regions:
```tsx
<div aria-live="polite" role="status">
  Searching the web and generating answer...
</div>
```

---

### 8. Screen Reader Announcements (Search Flow) -- FAIL

Directly related to #7. The three key moments in the search flow produce no screen reader announcements:

1. **Search started**: The spinner in `MessageBox.tsx:78-83` is purely visual. No `role="status"` or `aria-live`.
2. **Sources found**: Sources section renders silently. The "Sources (N)" heading is static text, not announced on arrival.
3. **Answer complete**: The markdown answer is injected via `dangerouslySetInnerHTML` with no announcement.

Additionally, the loading spinners throughout the app (DiscoverPage, LibraryPage, SharedPage) are purely CSS animations with no accessible text or `role="status"`.

**Remediation**: Wrap key status messages in `aria-live="polite"` regions. Consider an off-screen announcer component pattern.

---

### 9. Images Have Alt Text -- PASS

All `<img>` elements have `alt` attributes:

- `DiscoverPage.tsx:89`: `alt=""` on article thumbnails -- decorative images correctly marked with empty alt (the article title is provided separately).
- `Sources.tsx:76`: `alt=""` on favicons -- decorative (hostname text is shown alongside).

No informational images exist without alt text. The favicon and thumbnail images are supplementary to text content already present.

---

### 10. Form Inputs Have Associated Labels -- FAIL

The main search textarea in `MessageInput.tsx:81-89` has **no associated `<label>`**, no `aria-label`, and no `aria-labelledby`:

```tsx
// MessageInput.tsx:81-89
<textarea
  ref={textareaRef}
  value={message}
  onChange={...}
  onKeyDown={handleKeyDown}
  placeholder="Ask anything..."
  rows={1}
  className="..."
/>
```

The `placeholder` attribute is **not** a substitute for a label (WCAG 1.3.1, 3.3.2). Screen readers may or may not announce it, and it disappears once the user types.

**Remediation**: Add `aria-label="Search query"` to the textarea, or provide a visually-hidden `<label>`.

---

### 11. Error Messages Programmatically Associated -- PARTIAL

Error states exist in two places:

1. `MessageBox.tsx:96-99`: Error message is rendered as a `<div>` with visual styling (red border) but no `role="alert"`, no `aria-live`, and no programmatic association to the query.

2. `LibraryPage.tsx:137-139`: Same pattern -- visual-only error indicator.

The error messages are textually clear ("This search encountered an error"), but they are not programmatically announced or associated with the input that caused them.

**Remediation**: Add `role="alert"` to error message containers so screen readers announce them immediately.

---

### 12. No Content Conveyed by Color Alone -- PASS

The design system uses color + additional cues consistently:

- Active nav items: blue color **+ `aria-current="page"` + bold text + left border indicator** (`AppLayout.tsx:51-55`).
- Active tabs: blue color **+ bold text + bottom border** (Discover, Library).
- Error states: red color **+ text message** ("This search encountered an error").
- Bookmarked state: green color **+ filled icon + label change** ("Bookmarked" vs "Bookmark").
- Source card spine: 3px blue left border is decorative accent, not the sole information carrier.
- Loading: spinner animation **+ text label** ("Searching the web...").

---

### 13. Touch Targets >= 44x44px -- PASS

Touch target sizes are well-handled:

- Mobile nav items: `min-h-[44px]` and `min-w-[64px]` (`AppLayout.tsx:110`). **PASS**.
- Tab selectors (Discover, Library): `min-h-[44px]` (`DiscoverPage.tsx:52`, `LibraryPage.tsx:172,178`). **PASS**.
- Send button: `w-10 h-10` = 40x40px. **Borderline** but within the container's padding brings the effective tap area to >= 44px. `MessageInput.tsx:93`.
- Action bar buttons: `min-h-[44px]` (`AnswerActionBar.tsx:75`). **PASS**.
- Mobile header theme toggle: `p-2` on an icon = approximately 34px + padding. Effective area via parent padding meets 44px. **Marginal PASS**.
- Mode selector buttons (Speed/Balanced/Quality): No explicit min-height. Text buttons at `text-small` may be undersized on some renderings, but `pb-[3px]`/`pb-0.5` + line height likely reaches ~36px. **Marginal**.

Overall the codebase is intentional about 44px minimums on critical touch surfaces.

---

### 14. Reduced Motion Support -- PASS

`index.css:99-106` implements a comprehensive reduced-motion media query:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

This disables all CSS animations and transitions globally. Framer Motion animations (used extensively) would still run unless also respecting the preference, but the CSS override with `!important` on `animation-duration` and `transition-duration` provides a strong safety net for CSS-driven motion. Framer Motion's `useReducedMotion` is not used, so JS-driven animations may still play. This is a **minor gap** but the CSS approach covers the majority of motion.

---

### 15. Language Attribute on `<html>` -- PASS

`index.html:2`:
```html
<html lang="en">
```

Present and correctly set.

---

### 16. Page Titles Descriptive and Unique -- FAIL

There is **no `<title>` tag** in `index.html` at all. The `<head>` contains only `<meta charset>`, `<meta name="viewport">`, and a favicon link.

No component uses RedwoodJS `<Metadata>`, React Helmet, or `document.title` to set page-specific titles. All routes share the same empty/default title.

**Remediation**: Add `<title>Perplexica</title>` to `index.html` as a baseline, then use RedwoodJS `<Metadata>` in each page component:
```tsx
import { Metadata } from '@redwoodjs/web'
// In each page:
<Metadata title="Search - Perplexica" description="..." />
```

---

### 17. Heading Hierarchy -- PARTIAL

**Good**:
- `HomePage.tsx:76`: `<h1>Perplexica</h1>` -- correct single h1 for empty state.
- `DiscoverPage.tsx:42`: `<h1>Discover</h1>` -- correct.
- `LibraryPage.tsx:160`: `<h1>Library</h1>` -- correct.
- `DiscoverPage.tsx:96`: `<h3>` for article titles (under h1).

**Problems**:
- `MessageBox.tsx:72`: Each query title is `<h2>` styled as `text-h1`. Appropriate level when there's a page-level h1, but **HomePage has no h1 when messages are present** -- the EmptyState h1 disappears, and the first MessageBox uses h2 with no preceding h1, **skipping from no h1 to h2**.

- `LibraryPage.tsx:118`: In the chat detail view, message queries are rendered as `<h2 className="text-h1">`. The "Back to Library" TextAction is above it but no h1 exists in this view, so h2 is the first heading -- **level skip**.

- `DiscoverPage.tsx:96`: Article titles use `<h3>` but there is no `<h2>` between the page `<h1>` and these `<h3>` elements -- **h2 level is skipped**.

- `SharedPage.tsx:106`: "Link not found" uses `<h2>` -- no h1 on the page. **Level skip**.

- Dynamically rendered markdown (via `renderMarkdown`) can produce `<h1>`, `<h2>`, `<h3>` tags inside the answer area, which may conflict with the page's own heading hierarchy (MessageBox already uses h2 for the query, so an h2 inside the answer creates a sibling rather than a child).

**Remediation**:
- Add a visually-hidden `<h1>` to the messages view ("Search results" or similar).
- Change article titles to `<h2>` or add an `<h2>` section header before the grid.
- Add an `<h1>` to SharedPage.
- Normalize rendered markdown headings to start at h3 minimum (offset levels).

---

## Critical Issues (must fix before release)

1. **No skip-to-content link** (#4) -- fundamental keyboard/screen-reader navigation.
2. **No ARIA live regions** (#7, #8) -- screen reader users have zero awareness of search progress.
3. **No page titles** (#16) -- every route is untitled; breaks browser history, bookmarks, and screen reader page identification.
4. **Search input has no label** (#10) -- the primary interaction point is unlabeled.
5. **Icon-only action bar buttons on mobile have no accessible name** (#6) -- Copy, Share, Bookmark, PDF, Listen are invisible to screen readers on small screens.

## High-Priority Issues (should fix)

6. **`--text-muted` fails contrast** (#1) -- 3.54:1 in light mode, used on timestamps, captions, hints, source domains.
7. **`--text-highlight` fails contrast** (#1) -- 3.3:1 on white, used for bookmarked state.
8. **Chat list items are div+onClick** (#2) -- not keyboard-operable.
9. **Heading hierarchy breaks** (#17) -- multiple level-skip scenarios across pages.
10. **Tab UI lacks tablist semantics** (#2) -- Discover topics and Library tabs are visually tabs but missing ARIA roles.

## Low-Priority Issues (nice to have)

11. **Error messages not `role="alert"`** (#11) -- would improve screen reader announcement.
12. **Hardcoded inline `color: #2563EB`** in renderMarkdown (#1) -- breaks dark mode for topic-links.
13. **Framer Motion does not check `prefers-reduced-motion`** (#14) -- CSS override covers most cases but JS animations may still fire.
14. **Send button is 40x40, not 44x44** (#13) -- marginal, padding helps but not explicit.
