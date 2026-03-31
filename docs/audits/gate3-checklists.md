# Gate 3 Design Checklist Audit

**Project**: Perplexica (RedwoodJS + Phoenix)
**Scope**: `/redwood/web/src/` -- all pages, components, layouts, lib, CSS, Tailwind config
**Date**: 2026-03-31
**Auditor**: Claude Opus 4.6 (automated)

---

## AUDIT 1: Checklist.design

### SEARCH PAGE (4/7 PASS)

| # | Item | Verdict | Evidence |
|---|------|---------|----------|
| 1 | Search box position/styling | **PASS** | `MessageInput.tsx` renders a bottom-anchored input with `max-w-3xl mx-auto`, 1px outline border, accent focus ring. `EmptyState` centers the search box visually via flex column. |
| 2 | Visualization of results (title/desc/thumbnail) | **PASS** | `MessageBox.tsx` shows query as `text-h1` heading, sources as `SourceCard` (title + hostname + favicon), answer as rendered markdown with full prose styling. `DiscoverPage` additionally shows thumbnails in `aspect-video` containers. |
| 3 | Result count | **PASS** | `Sources.tsx:23-25` displays `({sources.length})` in caption style next to the "Sources" label. `LibraryPage:161` shows `${chats.length} chats` in a badge. |
| 4 | Loading indicator | **PASS** | `MessageBox.tsx:77-84` shows a spinning border circle + "Searching the web and generating answer..." text during `answering` status. Consistent spinner pattern across all pages. |
| 5 | Suggested search items | **PASS** | `HomePage.tsx:65-96` `EmptyState` component renders 4 hardcoded suggestion chips ("What is quantum computing?", etc.) as `TextAction` elements with border + hover styling. |
| 6 | Categories/filters | **FAIL** | No category or filter mechanism exists on the search results page. The `DiscoverPage` has topic tabs, but the main search (`HomePage`) has no way to filter results by type, date, or source. The mode selector (Speed/Balanced/Quality) is an optimization toggle, not a content filter. |
| 7 | Keyword highlighting | **FAIL** | `renderMarkdown.ts` does not highlight user query terms in search results. Bold text is styled as interactive "topic-link" elements (`color: #2563EB`), but this is semantic bold from the AI response, not keyword matching against the user's query. |

**Search Page Score: 5/7**

---

### NAVIGATION (6/7 PASS)

| # | Item | Verdict | Evidence |
|---|------|---------|----------|
| 1 | Logo | **PASS** | `AppLayout.tsx:33-36` renders "Perplexica" as `text-h3 font-semibold tracking-tight` wordmark in sidebar (desktop) and mobile header. No graphical logo/icon, but the text mark is consistent and prominent. |
| 2 | Structure (2 levels max) | **PASS** | Navigation is flat: 3 top-level items (Search, Discover, Library). No nested menus or dropdowns. `BreadcrumbTrail.tsx` exists for drill-down contexts but keeps hierarchy under 2 levels. |
| 3 | Consistent location | **PASS** | Sidebar is fixed on desktop (`hidden lg:flex`), bottom tab bar on mobile (`fixed bottom-0`). Both always visible on their respective breakpoints. |
| 4 | Visual contrast | **PASS** | Active nav items get `text-[var(--text-accent)]` (blue #2563EB) + `border-l-[3px] border-l-[var(--border-accent)]` spine. Inactive items use `text-[var(--text-secondary)]` (#555). Clear differentiation. |
| 5 | CTAs | **FAIL** | No prominent call-to-action button in the navigation. The sidebar has no "New Search" or primary action button. The mobile bottom nav is purely navigational links. The `EmptyState` suggestions serve as implicit CTAs but are not in the navigation. |
| 6 | Mobile responsiveness | **PASS** | Desktop: 240px sidebar. Mobile: bottom tab bar with `min-w-[64px] min-h-[44px]` touch targets, safe-area inset padding, top header with theme toggle. |
| 7 | Icons next to links | **PASS** | All nav items use Phosphor icons: `MagnifyingGlass`, `Compass`, `Books`. Icons are 18px on desktop, 22px on mobile. Active items use `weight="regular"`, inactive use `weight="light"`. |

**Navigation Score: 6/7**

---

### INPUT FIELD (4/6 PASS)

| # | Item | Verdict | Evidence |
|---|------|---------|----------|
| 1 | Readable text size | **PASS** | Textarea uses `text-body` (15px/24px from Tailwind config). Placeholder also inherits this size. |
| 2 | Label | **FAIL** | `MessageInput.tsx` has no visible label for the textarea. No `<label>` element, no `aria-label` on the textarea itself. The send button has `aria-label="Send message"` but the input field itself is unlabeled. |
| 3 | Placeholder text | **PASS** | `placeholder="Ask anything..."` at `MessageInput.tsx:87`. Concise and action-oriented. |
| 4 | Data format hints | **PASS** | `MessageInput.tsx:109-111` shows "Press `/` to focus - Shift+Enter for new line" as a caption below the input. Keyboard shortcut is styled with `<kbd>` element. |
| 5 | Icon | **PASS** | Send button contains `ArrowUp` Phosphor icon (16px bold) when idle, and a spinner animation when loading. The icon clearly communicates the submit action. |
| 6 | Hint text | **FAIL** | No validation hint or character limit indicator. No error state for the input itself (only for search results). Empty submit is prevented programmatically (`disabled={loading \|\| !message.trim()}`) but there is no visible feedback explaining why the button is disabled. |

**Input Field Score: 4/6**

---

### LOADING (4/5 PASS)

| # | Item | Verdict | Evidence |
|---|------|---------|----------|
| 1 | Visual indicator | **PASS** | Consistent CSS spinner pattern across all loading states: `w-5 h-5 border-2 border-[var(--border-muted)] border-t-[var(--border-accent)] rounded-full animate-spin`. Used in `MessageBox`, `DiscoverPage`, `LibraryPage`, `SharedPage`, and the send button. |
| 2 | Descriptive text | **PASS** | `MessageBox.tsx:80-82`: "Searching the web and generating answer..." with `animate-pulse`. `SharedPage.tsx:98`: "Loading shared answer...". Library pages show spinners without text (acceptable since context is clear from page structure). |
| 3 | Time threshold | **FAIL** | No skeleton screens or progressive disclosure. Loading appears immediately on action (no debounce/threshold to avoid flash for fast responses). The polling loop in `useSearch.ts:77` waits 2000ms between checks for up to 40 iterations (80 seconds max) with no progress indicator, timeout warning, or cancel option. |
| 4 | Accessibility | **PASS** | `@media (prefers-reduced-motion: reduce)` in `index.css:99-106` sets `animation-duration: 0.01ms`. Spinners will effectively stop spinning. Motion library has `prefersReducedMotion()` helper and `safeMotion()` function. |
| 5 | Entertaining visuals | **PASS** | The pulsing text ("Searching the web...") alongside the spinner provides a subtle multi-element loading experience. Staggered entry animations (`variants.stagger` at 50ms intervals) create a polished content reveal when results arrive. Not gamified, but appropriate for a research tool. |

**Loading Score: 4/5**

---

### BUTTON (5/7 PASS)

| # | Item | Verdict | Evidence |
|---|------|---------|----------|
| 1 | Base style | **PASS** | `OutlineButton.tsx` defines a consistent base: `border rounded-spine hover:bg-[var(--surface-whisper)] transition-colors duration-[180ms]`. `TextAction.tsx` provides an alternative text-link style button with no border/fill. Both are well-documented with JSDoc. |
| 2 | Shape | **PASS** | All buttons use `rounded-spine` (4px radius from Tailwind config). Send button is `w-10 h-10` square with rounded corners. Consistent across the app. |
| 3 | Variants | **PASS** | `OutlineButton`: `default`, `accent`, `highlight`. `TextAction`: `default`, `accent`, `highlight`, `danger`. `ActionButton` in `AnswerActionBar` has active state for bookmarked/playing states. |
| 4 | Copy | **PASS** | Button labels are clear and action-oriented: "Send message", "Copy", "Share", "Bookmark", "PDF", "Listen", "Delete", "Show more sources", "View extracted text". State-dependent labels: "Copied!", "Link copied!", "Sharing...", "Exporting...". |
| 5 | States (hover/focus/disabled) | **PASS** | Hover: `hover:bg-[var(--surface-whisper)]` or `hover:text-[var(--text-accent)]`. Focus: global `:focus-visible` with `outline: 2px solid var(--border-accent)`. Disabled: `disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent` (OutlineButton uses `opacity-40`). All transition at `180ms`. |
| 6 | Sizes | **FAIL** | `OutlineButton` has `sm` and `md` sizes. `TextAction` has no size prop -- always uses `text-small`. `ActionButton` in `AnswerActionBar` has only one size. No `lg` or `xl` variant exists for primary CTAs. The size system is incomplete. |
| 7 | Icons | **FAIL** | `OutlineButton` and `TextAction` both accept `icon` prop with `[&>svg]:w-4 [&>svg]:h-4` sizing. However, icon-only buttons (like the send button in `MessageInput`, theme toggle in `AppLayout`) are built ad-hoc rather than using the component system. No standardized icon-only button variant exists. |

**Button Score: 5/7**

---

### TABS (5/6 PASS)

| # | Item | Verdict | Evidence |
|---|------|---------|----------|
| 1 | Concise labels | **PASS** | `DiscoverPage` tabs: "Tech & Science", "Finance", "Art & Culture", "Sports", "Entertainment". `LibraryPage` tabs: "Chats", "Bookmarks". Mode tabs: "Speed", "Balanced", "Quality". All under 20 chars. |
| 2 | Content area | **PASS** | Tab content renders below the tab bar in a clearly separated area. `DiscoverPage` shows a grid of articles, `LibraryPage` shows a list of chats or bookmarks. Content area has consistent padding (`p-6`) and max-width (`max-w-3xl` or `max-w-4xl`). |
| 3 | Active/inactive differentiation | **PASS** | Active tabs: `border-b-2 border-[var(--border-accent)]` underline + accent text color via `TextAction active={true}`. Inactive tabs: muted text, no underline. Clear visual distinction. |
| 4 | Item order | **PASS** | Tabs follow logical grouping: Discover orders topics by popularity/relevance. Library puts "Chats" first (primary use case) before "Bookmarks". Mode selector orders by complexity (Speed < Balanced < Quality). |
| 5 | States | **PASS** | Tabs use `TextAction` which has hover (`hover:text-[var(--text-accent)]`), active (accent color + bold), and transition (`duration-[180ms]`). All tabs have `min-h-[44px]` for touch accessibility. |
| 6 | Dynamic content | **FAIL** | No loading indicator within the tab content area on tab switch in `DiscoverPage` -- the loading spinner is shown but there is no smooth transition between tab content. `LibraryPage` bookmarks tab fetches data on first visit but shows no skeleton/placeholder while loading. Tab switches cause abrupt content replacement with no animation. |

**Tabs Score: 5/6**

---

### CARD (5/6 PASS)

| # | Item | Verdict | Evidence |
|---|------|---------|----------|
| 1 | Style consistency | **PASS** | All cards follow the SpineCard pattern: `border border-[var(--border-default)] border-l-[3px] border-l-[var(--border-accent)] rounded-spine`. Used consistently in `SourceCard`, `DiscoverPage` article cards, `LibraryPage` chat items, and error messages. |
| 2 | Spacing | **PASS** | Cards use consistent internal padding: `p-3` for source cards, `p-4` for chat items and article cards. Grid gaps: `gap-2` for sources, `gap-3` for articles. All on the 8px baseline grid. |
| 3 | Responsiveness | **PASS** | Source cards: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]`. Article cards: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(300px,1fr))]`. Fluid responsive with sensible breakpoints. |
| 4 | Content hierarchy | **PASS** | Source cards: favicon + hostname (caption) > title (small, semibold) > citation index (accent badge). Article cards: image > title (small, semibold) > description (small, muted) > hostname (caption). Clear visual hierarchy with size and weight differentiation. |
| 5 | Radius | **PASS** | Consistent `rounded-spine` (4px) across all cards and containers. No mixed radius values. Thumbnails within cards have no separate rounding (overflow: hidden on container handles clipping). |
| 6 | Links placement | **FAIL** | Source cards place the link on the entire card area (`<a>` wraps the whole card), but also have an expandable "View extracted text" `TextAction` inside. Clicking the expandable toggle inside a full-card anchor creates a nested interactive element issue. The `DiscoverPage` article cards similarly wrap everything in `<a>` but don't have nested interactive elements. |

**Card Score: 5/6**

---

### RESPONSIVENESS (4/5 PASS)

| # | Item | Verdict | Evidence |
|---|------|---------|----------|
| 1 | Fluid layout | **PASS** | `AppLayout.tsx:29` uses `grid-cols-1 lg:grid-cols-[240px_1fr]`. Content areas use `max-w-3xl mx-auto` or `max-w-4xl mx-auto` for readable line lengths. Source/article grids use `auto-fill` with `minmax()` for fluid column counts. |
| 2 | Breakpoints | **PASS** | Two primary breakpoints: `sm:` (640px) for grid columns, `lg:` (1024px) for sidebar/bottom-nav swap. Tailwind config defines `desktop: '240px 1fr 200px'` and `tablet: '1fr'` grid templates. |
| 3 | Typography scaling | **FAIL** | Font sizes are fixed pixel values (display: 32px, h1: 24px, body: 15px, small: 13px). No responsive typography -- the `text-display` at 32px renders the same on mobile as desktop. No `clamp()`, `min()`, or responsive size classes are used. |
| 4 | Selection area sizes | **PASS** | Mobile nav items: `min-w-[64px] min-h-[44px]`. Tab items: `min-h-[44px]`. Action bar buttons: `min-h-[44px]`. Send button: `w-10 h-10` (40px). All meet WCAG 2.5.8 target size of 44px for touch or come within acceptable range. |
| 5 | Hierarchy adaptation | **PASS** | Desktop: sidebar nav + main content. Mobile: top header + bottom tab bar + full-width content. Action bar labels: `hidden sm:inline` (icon-only on mobile, icon+text on desktop). Source card grid drops from multi-column to single-column. Discover articles drop from multi-column to single. |

**Responsiveness Score: 4/5**

---

### DARK MODE (3/4 PASS)

| # | Item | Verdict | Evidence |
|---|------|---------|----------|
| 1 | Aligned color switching | **PASS** | Full CSS custom property system in `index.css:24-52` with `:root` (light) and `.dark` (dark) variants. All 14 tokens switch: borders (#E5E5E5 -> #333333), text (#111111 -> #F5F5F5), surfaces (#FFFFFF -> #111111). Tailwind config mirrors these as static tokens. |
| 2 | Brand integrity | **PASS** | Accent blue shifts from #2563EB (light) to #3B82F6 (dark) -- slightly lighter for dark backgrounds. Highlight green shifts #10B981 -> #34D399. The identity colors are preserved while adjusting for contrast. |
| 3 | Elevation/hierarchy | **FAIL** | Dark mode surfaces: primary #111111, secondary #1A1A1A. Only 2 elevation levels defined. No shadow system at all -- the entire design is flat outline-based. While this is an intentional design choice (outline-first system), it means dark mode has no way to communicate z-axis layering beyond the 2 surface tones. The whisper hover tint (`rgba(59, 130, 246, 0.05)`) is the only differentiation, which is very subtle on dark backgrounds. |
| 4 | Toggle location | **PASS** | Desktop: sidebar bottom area with `Sun`/`Moon` icon + "Light Mode"/"Dark Mode" label. Mobile: top-right header with icon-only button + `aria-label`. Both accessible and discoverable. Theme persists via `localStorage('perplexica-theme')` and respects `prefers-color-scheme` on first visit. |

**Dark Mode Score: 3/4**

---

### UX COPY (4/5 PASS)

| # | Item | Verdict | Evidence |
|---|------|---------|----------|
| 1 | Clear/concise | **PASS** | "Ask anything..." (placeholder), "Searching the web and generating answer..." (loading), "No chats yet." (empty state), "Link not found" (error), "Start a new search" (action). All under 50 chars, immediately understandable. |
| 2 | Purposeful | **PASS** | Every piece of text serves a function. Loading text explains what's happening ("Searching the web..."). Empty states provide next steps ("Start a new search", "Use the bookmark button..."). Error messages are factual ("This search encountered an error."). |
| 3 | Consistent tone | **PASS** | Professional, understated, research-tool appropriate. No exclamation marks in instructional text. No casual slang. Consistent use of sentence case. The tagline "Research-grade search with source traceability" sets the tone. |
| 4 | Conventions | **PASS** | Standard web conventions: "Copy" / "Copied!", "Share" / "Link copied!", "Bookmark" / "Bookmarked", "Delete". Time formatting uses relative ("5m ago", "2h ago", "3d ago"). Keyboard shortcuts documented with `<kbd>` elements. |
| 5 | No dark patterns | **FAIL** | The delete action on chat items (`LibraryPage:218-222`) has no confirmation dialog. A single click on "Delete" immediately triggers the mutation `deleteChat`. This is destructive and irreversible. The `TextAction variant="danger"` provides visual warning, but the lack of confirmation is a dark/careless pattern. |

**UX Copy Score: 4/5**

---

## AUDIT 1 SUMMARY

| Section | Pass | Fail | Total | Score |
|---------|------|------|-------|-------|
| Search Page | 5 | 2 | 7 | 71% |
| Navigation | 6 | 1 | 7 | 86% |
| Input Field | 4 | 2 | 6 | 67% |
| Loading | 4 | 1 | 5 | 80% |
| Button | 5 | 2 | 7 | 71% |
| Tabs | 5 | 1 | 6 | 83% |
| Card | 5 | 1 | 6 | 83% |
| Responsiveness | 4 | 1 | 5 | 80% |
| Dark Mode | 3 | 1 | 4 | 75% |
| UX Copy | 4 | 1 | 5 | 80% |
| **TOTAL** | **45** | **13** | **58** | **78%** |

---

## AUDIT 2: UX-Checklist.com (9 Categories)

### 1. Research -- FAIL

| Sub-item | Status | Evidence |
|----------|--------|----------|
| Competitive analysis | Not evidenced | No competitive analysis artifacts found in codebase. The design decisions (outline system, spine cards, Wikipedia-calm aesthetic) suggest intentional design direction but no documentation of competitive research. |
| Data analysis | Not evidenced | No analytics integration (no Google Analytics, Mixpanel, PostHog, or similar). No event tracking. No data collection mechanisms for user behavior. |
| User feedback | Not evidenced | No feedback mechanism in the UI (no "Was this helpful?" on answers, no feedback form, no bug report flow). The app has no way to collect qualitative user input. |

**Verdict: FAIL** -- Zero research infrastructure. This is a pre-release gap, but a gap nonetheless.

---

### 2. Plan -- PARTIAL

| Sub-item | Status | Evidence |
|----------|--------|----------|
| User stories | Partially evidenced | The feature set implies clear user stories (search, discover, save, share), and the `useSearch.ts` hook models the search flow explicitly. However, no formal user stories are documented in the codebase. |
| User flows | Evidenced | Routes define clear flows: Home (search) -> results in-page, Discover -> topic browsing, Library -> chat history + detail view, SharedPage -> read-only shared answer. `BreadcrumbTrail.tsx` supports navigation hierarchy in drill-down flows. |
| Red routes | Partially evidenced | The primary flow (search -> results -> sources) is well-built with optimistic updates, polling, error handling, and action bar. But there's no offline/failure-mode handling for the critical search path beyond a generic error message. |

**Verdict: PARTIAL** -- Core flows are solid but under-documented and missing edge-case protection.

---

### 3. Explore -- PARTIAL

| Sub-item | Status | Evidence |
|----------|--------|----------|
| Brainstorm | Evidenced | The design system is clearly the result of deliberate exploration: outline-first approach, SpineCard abstraction, TextAction as atomic primitive, citation-to-source scroll interaction, Table of Contents with IntersectionObserver. These are non-obvious design decisions. |
| Wireframe | Not evidenced | No wireframes or mockups in the repository. |
| Prototype | Not evidenced | No prototype artifacts. The codebase is the prototype itself (code-first approach). |

**Verdict: PARTIAL** -- Creative exploration happened but was done in code, not in separate design artifacts.

---

### 4. Communicate -- PASS

| Sub-item | Status | Evidence |
|----------|--------|----------|
| Information Architecture | Evidenced | Clean 3-page IA: Search (creation), Discover (exploration), Library (history). Shared pages are standalone. Routes are flat. Sidebar mirrors this structure 1:1. |
| Language | Evidenced | Professional, consistent tone. No jargon in user-facing text. Technical terms limited to mode names ("Speed", "Balanced", "Quality") which are self-explanatory. |
| Accessibility | Evidenced | `aria-label` on mobile nav, theme toggle, send button. `aria-current="page"` on active nav items. `aria-expanded` on TOC toggle. `aria-label="Main navigation"` / `aria-label="Mobile navigation"` on nav elements. `:focus-visible` global styles. `prefers-reduced-motion` respected. `CitationBadge` has `role="button"` + `tabIndex` + `onKeyDown` for keyboard access. |
| Ethical design | Evidenced | No dark patterns (except the delete-without-confirm noted above). No tracking. No manipulative UI. Sources are prominently displayed for transparency. |
| Inclusive design | Partially evidenced | Touch targets meet 44px minimum. Color is not the sole differentiator (accent border + text weight). However, no language/locale support. No RTL support. No reduced-data-mode consideration. |

**Verdict: PASS** -- Strong accessibility foundation and honest information architecture.

---

### 5. Create -- PASS

| Sub-item | Status | Evidence |
|----------|--------|----------|
| UI elements | Evidenced | Complete component system: `SpineCard`, `TextAction`, `OutlineButton`, `CitationBadge`, `SectionDivider`, `BreadcrumbTrail`. All follow the outline-first design language. Well-documented with JSDoc. Exported from `ui/index.ts`. |
| Gestures | Evidenced | Click-to-search on topic links (delegated event handler in `MessageBox.tsx:24-57`). Click citation badge to scroll to source with highlight animation. Expandable source text. Web Share API integration for mobile share gesture. Keyboard: `/` to focus search, Shift+Enter for newlines, Enter to send. |
| Responsiveness | Evidenced | Two-breakpoint system (sm/lg). Sidebar/bottom-nav swap. Grid column adaptation. Label hiding on mobile. Safe-area inset padding for notched phones. `min-h-[44px]` touch targets. |

**Verdict: PASS** -- Polished component system with thoughtful interaction design.

---

### 6. Give Feedback -- PARTIAL

| Sub-item | Status | Evidence |
|----------|--------|----------|
| Waiting times | Evidenced | Spinner + descriptive text during search. Spinners on all data fetches. Optimistic message rendering (message appears immediately in "answering" state). |
| Errors | Partially evidenced | Error states exist for search (`status: 'error'`), shared links (`not_found`), and API failures. Error styling: red spine border card. However, errors are generic ("This search encountered an error.") with no retry button, no error codes, and no actionable guidance. The main catch blocks in `useSearch.ts` fall back to `err.message` which may expose raw server errors. |
| Completed actions | Partially evidenced | "Copied!" feedback on copy (2-second timeout). "Link copied!" on share. "Bookmarked" state toggle. But: no success toast/notification for search completion, no "Saved!" feedback for chat persistence (chats save silently), no visual confirmation when a chat is deleted. |

**Verdict: PARTIAL** -- Good loading feedback, weak error recovery, incomplete success confirmations.

---

### 7. Finalise -- PASS

| Sub-item | Status | Evidence |
|----------|--------|----------|
| Layout | Evidenced | 8px baseline grid (`spacing: '1u' through '6u'`). Consistent max-widths. Grid template areas defined for desktop/tablet/mobile/search/library. `text-wrap: balance` on headings, `text-wrap: pretty` on body text. |
| Images/icons | Evidenced | Phosphor icons used consistently throughout navigation. Favicons loaded via Google's favicon service for sources. Lazy loading on images (`loading="lazy"`). Thumbnails have `object-cover` and contained aspect ratios. |
| Font hierarchy | Evidenced | 7-level type scale: display (32px) > h1 (24px) > h2 (20px) > h3 (16px) > body (15px) > small (13px) > caption (11px). Single font family (Montserrat). Weight ramp: 300/400/500/600/700. Tabular numbers for timestamps. |
| Color hierarchy | Evidenced | 3-tier system: accent (blue #2563EB), highlight (green #10B981), neutral (gray scale). CSS custom properties for all semantic tokens. Surfaces: primary (#FFFFFF) > secondary (#FAFAFA) > whisper (3% blue tint). |

**Verdict: PASS** -- Meticulous design system with clear typographic and color hierarchies.

---

### 8. Delight -- PARTIAL

| Sub-item | Status | Evidence |
|----------|--------|----------|
| Micro copy | Evidenced | "Research-grade search with source traceability" (tagline). "Ask anything..." (placeholder). "Searching the web and generating answer..." (loading). Relative timestamps ("5m ago"). Keyboard hint with styled `<kbd>`. |
| Micro interactions | Evidenced | Staggered card entry (`staggerChildren: 0.05`). Smooth scroll to source with 1.5-second ring highlight (`ring-2 ring-[var(--border-accent)]`). Auto-resizing textarea. Theme toggle icon swap. Bookmark fill toggle. TOC active tracking via IntersectionObserver. |
| Transitions | Partially evidenced | All transitions use `duration-[180ms]` for state changes. Framer Motion used for page transitions (`AnimatePresence mode="wait"`), content reveals (`variants.slideUp`), and staggered lists. However, tab content switches have no transition, and the sidebar has no open/close animation on responsive breakpoint changes. |

**Verdict: PARTIAL** -- Good micro-interactions but missing some polishing transitions.

---

### 9. Analyse -- FAIL

| Sub-item | Status | Evidence |
|----------|--------|----------|
| KPI setup | Not evidenced | No analytics, no performance metrics collection, no Core Web Vitals monitoring. |
| A/B test plan | Not evidenced | No feature flags, no experimentation framework, no variant testing infrastructure. |
| Testing | Not evidenced | No test files found in the web src directory. No unit tests, integration tests, or E2E test setup visible. The `useSearch.ts` hook has complex polling logic that is untested. |

**Verdict: FAIL** -- No measurement or testing infrastructure exists.

---

## AUDIT 2 SUMMARY

| Category | Verdict | Key Gap |
|----------|---------|---------|
| 1. Research | **FAIL** | No analytics, no feedback collection, no competitive analysis artifacts |
| 2. Plan | **PARTIAL** | Core flows exist but under-documented, missing edge-case handling |
| 3. Explore | **PARTIAL** | Design exploration done in code, no separate design artifacts |
| 4. Communicate | **PASS** | Strong IA, good accessibility foundation, honest design |
| 5. Create | **PASS** | Complete component system, good gesture support, responsive |
| 6. Give Feedback | **PARTIAL** | Good loading states, weak error recovery, incomplete confirmations |
| 7. Finalise | **PASS** | Meticulous design system, clear hierarchies |
| 8. Delight | **PARTIAL** | Good micro-interactions, some transition gaps |
| 9. Analyse | **FAIL** | Zero analytics, no tests, no experimentation |

| Verdict | Count |
|---------|-------|
| PASS | 3 |
| PARTIAL | 4 |
| FAIL | 2 |

---

## Top Priority Fixes

1. **Delete confirmation** (`LibraryPage.tsx:76-81`) -- Add a confirmation step before `deleteChat` mutation. This is the most user-hostile gap.
2. **Input field label** (`MessageInput.tsx:81-88`) -- Add `aria-label="Search query"` to the textarea for screen readers.
3. **Search filters/categories** (`HomePage.tsx`) -- Add at minimum a source-type filter (Web, Academic, News) to the search interface.
4. **Error recovery** (all pages) -- Replace generic error text with actionable messages and a "Try again" button.
5. **Responsive typography** (`tailwind.config.js:61-68`) -- Use `clamp()` for display and h1 sizes so they scale on mobile.
6. **Analytics foundation** -- Add minimal event tracking (search count, error rate, feature usage) to establish measurement baseline.
7. **Tab transition animation** (`DiscoverPage.tsx`, `LibraryPage.tsx`) -- Wrap tab content in `AnimatePresence` with `fadeIn` variant for smooth content switching.
8. **Keyword highlighting** (`renderMarkdown.ts`) -- Accept query terms and wrap matches in `<mark>` tags in the rendered markdown output.

---

*Generated 2026-03-31 by automated design audit.*
