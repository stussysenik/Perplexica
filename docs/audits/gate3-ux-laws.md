# Gate 3: UX Laws and Cognitive Psychology Audit

**Date**: 2026-03-31
**Auditor**: Claude Opus 4.6 (automated)
**Scope**: Redesigned Perplexica web app -- RedwoodJS frontend
**Codebase path**: `/Users/s3nik/Desktop/Perplexica/redwood/web/src/`

---

## Files Reviewed

| File | Purpose |
|------|---------|
| `layouts/AppLayout/AppLayout.tsx` | Shell layout, sidebar nav, mobile bottom nav |
| `pages/HomePage/HomePage.tsx` | Search home, empty state with suggestions |
| `pages/DiscoverPage/DiscoverPage.tsx` | Topic-based article discovery |
| `pages/LibraryPage/LibraryPage.tsx` | Chat history and bookmarks |
| `pages/SharedPage/SharedPage.tsx` | Read-only shared answer view |
| `components/Chat/MessageBox.tsx` | Answer rendering with sources, TOC, action bar |
| `components/Chat/MessageInput.tsx` | Search input with mode selector |
| `components/Chat/AnswerActionBar.tsx` | Copy, Share, Bookmark, PDF, TTS actions |
| `components/Chat/TableOfContents.tsx` | Section navigation with IntersectionObserver |
| `components/Sources/Sources.tsx` | Source cards with progressive disclosure |
| `components/ui/TextAction.tsx` | Atomic text-link button primitive |
| `components/ui/SpineCard.tsx` | Outline container with color spine |
| `components/ui/OutlineButton.tsx` | 1px bordered button |
| `components/ui/CitationBadge.tsx` | Inline [n] reference marker |
| `components/ui/SectionDivider.tsx` | 1px horizontal rule |
| `components/ui/BreadcrumbTrail.tsx` | Slash-separated navigation trail |
| `lib/renderMarkdown.ts` | Regex-based markdown-to-HTML with TOC anchors |
| `lib/motion.ts` | Framer Motion timing, easing, reduced-motion |
| `lib/useSearch.ts` | Search state management, polling |
| `lib/theme.tsx` | Light/dark theme context with system preference |
| `index.css` | Design tokens (CSS custom properties), typography, scrollbar, focus styles |
| `config/tailwind.config.js` | Design system tokens, grid areas, typography scale |

---

## AUDIT 1: Laws of UX (30 Laws)

**Summary: 22 PASS / 6 PARTIAL / 2 FAIL**

### 1. Aesthetic-Usability Effect
**PASS** -- The outline-first design system (1px borders, 3px color spines, whisper hover fills, Montserrat typography) creates a clean, Wikipedia-calm aesthetic. The consistent use of `--border-accent` blue and `--border-highlight` green across every component creates a cohesive visual language. Users will perceive this as more usable because it looks polished. Light-first approach with proper dark mode tokens in `index.css:24-52`.

### 2. Choice Overload
**PASS** -- Navigation is limited to 3 items (Search, Discover, Library). Search modes are constrained to 3 options (Speed, Balanced, Quality). Empty state suggestions show exactly 4 items. Discover topics are 5. Tab switchers use 2 options (Chats/Bookmarks). The app consistently keeps choices small and manageable.

### 3. Chunking
**PASS** -- Content is chunked throughout: answer responses are structured as query title, then sources grid, then prose answer, then action bar -- each separated by `mb-6` spacing. Sources are chunked into a grid with 4 visible by default. TableOfContents chunks long answers into navigable sections. Library items are chunked as individual SpineCards with consistent spacing (`space-y-2`).

### 4. Cognitive Bias
**PARTIAL** -- The "Speed/Balanced/Quality" mode selector in `MessageInput.tsx:12-16` presents options without explaining what each mode actually does (no tooltips, no descriptions). Users may anchor on "Quality" assuming other modes are inferior, or choose "Speed" not knowing the tradeoff. Discover topics (`DiscoverPage.tsx:7-13`) provide clear labels but no description of what each covers. No confirmation bias mitigation exists -- search results are presented as authoritative without showing alternative perspectives.

### 5. Cognitive Load
**PASS** -- The design actively minimizes cognitive load. TextAction components are the single action primitive (no visual weight). The outline system avoids fills and shadows, reducing visual noise. Empty states are simple (title + subtitle + suggestions). The action bar labels hide on mobile (`hidden sm:inline` in `AnswerActionBar.tsx:84`), showing icons only to reduce parsing. Prose styling uses `text-wrap: pretty` and `balance` for optimal reading.

### 6. Doherty Threshold
**PARTIAL** -- Optimistic message insertion in `useSearch.ts:56-60` provides immediate feedback when sending a query. However, the polling mechanism (`useSearch.ts:77-119`) uses a 2-second interval for up to 40 iterations (80 seconds max wait). During this time, the only feedback is a spinner and "Searching the web and generating answer..." text (`MessageBox.tsx:78-83`). No progress stages are shown (e.g., "Found 12 sources...", "Analyzing...", "Writing answer..."). The 2-second poll gap risks feeling unresponsive per the 400ms Doherty threshold.

### 7. Fitts's Law
**PASS** -- Mobile bottom nav targets are `min-w-[64px] min-h-[44px]` (`AppLayout.tsx:110`), exceeding the 44px touch target minimum. The send button is `w-10 h-10` (40px) which is slightly below 44px but has surrounding padding. Action bar buttons have `min-h-[44px]` (`AnswerActionBar.tsx:75`). Suggestion chips have `px-4 py-2.5` padding for adequate target size. The `/` keyboard shortcut for search focus is a power-user acceleration.

### 8. Flow
**PASS** -- The search flow is uninterrupted: type query, press Enter (or click send), results render in place with smooth scroll. Follow-up searches stay on the same page. Bold topic-links in answers (`renderMarkdown.ts:159-162`) enable inline topic exploration without context switching. Citation badges scroll to sources inline. TOC enables section jumping. The conversational thread model preserves flow across multiple queries.

### 9. Goal-Gradient Effect
**PARTIAL** -- During search, the spinner + "Searching..." text shows activity but no progress gradient. Users cannot see how close they are to receiving an answer. There's no progress bar, no step indicator (e.g., "Searching... Analyzing... Writing..."), and no source count incrementing. The polling model in `useSearch.ts` has no intermediate state updates -- it goes from "answering" directly to "completed" or "error". The staggered animation of source cards (`variants.stagger` with `staggerChildren: 0.05`) provides a micro goal-gradient when results appear.

### 10. Hick's Law
**PASS** -- Decision time is minimized at every touchpoint. Empty state: 4 suggestions (not 20). Nav: 3 items. Mode selector: 3 choices. Tab switcher: 2 tabs. Action bar: 5 distinct, clearly-labeled actions. Discover: 5 topic filters. Sources default to showing 4 with "View X more" progressive disclosure. Each decision point has a minimal, fast-parseable option set.

### 11. Jakob's Law
**PASS** -- The layout follows conventions users know from Perplexity.ai and Google: search bar centered on home, results below, sidebar navigation on desktop, bottom tab bar on mobile. Sources appear above the answer (like Perplexity). The Library page follows a standard list-detail pattern. The share/bookmark/copy actions follow conventions from Google Docs and Notion. Theme toggle uses familiar sun/moon icons.

### 12. Law of Common Region
**PASS** -- SpineCards (`SpineCard.tsx`) use 1px borders to create distinct bounded regions for each source, chat item, and article card. The MessageBox wraps query + sources + answer + action bar within a single `max-w-3xl mx-auto pb-8` container. The input area is bounded by `border-t` at the top and `border border-[var(--border-default)]` around the textarea. The sidebar and main content are separated by `border-r`. Each region is visually distinct.

### 13. Law of Proximity
**PASS** -- Related elements are spatially grouped: source cards are in a tight grid (`gap-2`), action bar buttons have `gap-4`, the query title is close to its sources (`mb-6`), the action bar is directly below the answer (`mt-4`). Nav items use `space-y-0.5` for tight grouping. The caption text below input (`mt-2`) stays close to its context. Unrelated sections are separated by borders and larger margins.

### 14. Law of Pragnanz (Simplicity)
**PASS** -- The entire design system is built on simplicity: 1px borders instead of shadows, no gradient fills, no complex card styles. SpineCard is a rectangle with a colored left border. TextAction is plain text with hover color change. The color palette is just 4 semantic roles (primary, secondary, muted, accent) plus one highlight. Border radii are uniformly `4px` (`rounded-spine`). Typography uses a single font (Montserrat) with a clear 6-step scale.

### 15. Law of Similarity
**PASS** -- All interactive text elements use the same TextAction primitive (tabs, nav items, action toggles). All container cards use the same outline + color-spine pattern. All loading states use the same spinner pattern (`w-5 h-5 border-2 ... animate-spin`). All empty states follow the same layout (centered text + action link). Citation badges have uniform styling. The design system enforces similarity through a small set of primitives.

### 16. Law of Uniform Connectedness
**PASS** -- The color spine system creates visual connection: blue (`--border-accent`) spines connect all primary content cards (sources, chat items, articles). Green (`--border-highlight`) spines distinguish bookmarks from regular chats (`LibraryPage.tsx:260`). Active nav items share the same accent underline/border treatment across sidebar and tabs. The TOC's active indicator uses the same accent border as the nav's active state, creating system-wide connection.

### 17. Mental Model
**PASS** -- The app maps to familiar mental models: "Search" as a conversational Q&A (like ChatGPT/Perplexity), "Discover" as a news feed (like Google Discover), "Library" as a saved-items archive (like browser bookmarks). Sources appear as citation cards (academic model). The share flow generates a link (like Google Docs sharing). Bookmarks use the universal bookmark icon and toggle pattern. The breadcrumb-back pattern in Library follows standard navigation mental models.

### 18. Miller's Law (7 +/- 2)
**PASS** -- Sources default to 4 visible items (within 5-9 range for a grid scan). Suggestion chips are 4. Nav items are 3. Action bar buttons are 5. Discovery topics are 5. The TOC collapses headings to level 1-3 only, limiting section count. The app consistently stays within or below Miller's magic number for any given view.

### 19. Occam's Razor
**PASS** -- The UI avoids unnecessary complexity. No settings page (just a theme toggle). No complex filtering in Library (just Chats/Bookmarks tabs). No multi-step share flow (one click generates link). No complex mode configuration (just 3 radio-style options). The markdown renderer is regex-based instead of pulling in a full parsing library. The design system has 6 UI primitives total (TextAction, SpineCard, OutlineButton, CitationBadge, SectionDivider, BreadcrumbTrail).

### 20. Paradox of Active User
**FAIL** -- The app provides no onboarding, tutorial, or feature discovery mechanism. New users see the empty state with suggestions but no indication that modes exist, that bold terms are clickable topic-links, that citations scroll to sources, that `/` focuses the search bar, or that Shift+Enter creates a new line. The caption hint (`MessageInput.tsx:109-111`) about `/` and Shift+Enter is helpful but insufficient. The TOC toggle label "Show contents" is discoverable, but the citation-to-source scroll and topic-link click behaviors are completely hidden. Power features exist but active users will never discover them organically.

### 21. Pareto Principle (80/20)
**PASS** -- The core search flow (the 20% that delivers 80% of value) dominates the UI: it gets the full-width main area, the home route, and the most sophisticated component (`MessageBox` with sources, TOC, action bar). Secondary features (Discover, Library) are accessible but don't compete for attention. The action bar puts Copy first (highest-use action), then Share, Bookmark, PDF, Listen -- roughly ordered by frequency of use.

### 22. Parkinson's Law
**PASS** -- The search input is a simple textarea with no complex configuration. The mode selector defaults to "speed" (`useSearch.ts:35`), guiding users toward fast results without requiring a decision. No unnecessary steps exist between "type a query" and "get an answer". The delete action on chat items is a single click with no confirmation modal (possibly too aggressive, but it does minimize time-on-task).

### 23. Peak-End Rule
**PARTIAL** -- The "peak" experience (receiving a well-formatted answer with sources and TOC) is strong. The "end" experience, however, is weak: after reading an answer, the action bar is functional but plain. No satisfaction signal exists (no "Was this helpful?" feedback). The Discover page ends with article cards but no call-to-action or engagement loop. The Library's empty states ("No chats yet" / "No bookmarks yet") end on a neutral note without delight. The shared page ends with a simple Perplexica attribution footer -- adequate but not memorable.

### 24. Postel's Law (Be liberal in what you accept)
**PASS** -- The search input accepts any text string without validation. The theme system gracefully falls back from localStorage to system preference to "light" default (`theme.tsx:14-16`). The markdown renderer handles missing/malformed markdown gracefully (regex-based, no parse errors). The clipboard fallback in `AnswerActionBar.tsx:42-49` handles legacy browsers without navigator.clipboard. TTS gracefully hides when speechSynthesis is unavailable (`TtsButton` returns null). Source cards handle missing URLs, titles, and thumbnails.

### 25. Selective Attention
**PASS** -- The design directs attention effectively. The query title is the largest text element (`text-h1`). The color spine (3px blue border) draws the eye to source cards. Active nav items use accent color against muted siblings. The send button uses accent border color when active, 30% opacity when disabled. Citation badges use accent color to stand out from prose. The loading spinner uses accent color for the spinning segment. Error states use red borders to break the pattern and demand attention.

### 26. Serial Position Effect
**PASS** -- In the action bar, Copy (most used) is first and Listen (least common) is last, matching the primacy-recency pattern where first and last items are most remembered. In navigation, Search is first (primary action) and Library is last (return-to-saved). Suggestion chips place broadly appealing queries first ("What is quantum computing?") and niche ones later. Sources are numbered 1-N, and the most relevant sources appear first.

### 27. Tesler's Law (Conservation of Complexity)
**PASS** -- Irreducible complexity is absorbed by the system, not the user. The markdown renderer handles all formatting internally. The polling mechanism is hidden behind `useSearch()`. Theme detection and persistence are automatic. The citation-to-source scroll behavior is handled by a delegated click handler in `MessageBox.tsx:24-56`. The PDF export generates a complete document with title, body, and references automatically. The TOC is auto-generated from headings via IntersectionObserver.

### 28. Von Restorff Effect (Isolation Effect)
**PASS** -- Error states use red borders (`border-l-red-500`) that visually isolate them from the blue/green/gray palette. Active nav items stand out via accent color against muted siblings. The accent color spine on source cards isolates them from plain text. Citation badges (`<sup>` with accent styling) pop out of prose. Bookmarked items have `text-[var(--text-highlight)]` (green) to distinguish them from other actions (blue). The chat count badge (`LibraryPage.tsx:161-163`) uses a bordered pill that isolates it.

### 29. Working Memory
**PASS** -- The TOC keeps section context visible during long answers, reducing the need to hold structure in working memory. Sources are displayed above the answer so users can reference them while reading. Citation badges provide in-place references (no need to scroll to remember source numbers). The mode selector persists visually so users don't need to remember their current mode. The chat title stays visible at the top of each message.

### 30. Zeigarnik Effect
**FAIL** -- There is no mechanism to leverage the Zeigarnik effect (incomplete tasks are remembered better). The app has no draft saving for partially typed queries. No "continue where you left off" prompt. No reading progress indicator for long answers. No "X more results available" tease. No notification that a long-running search has completed if the user navigates away. The polling in `useSearch.ts` will silently complete or fail without any persistent state -- refreshing the page loses all in-progress searches.

---

## AUDIT 2: Growth.design Psychology Principles (30 Principles)

**Summary: 18 PASS / 9 PARTIAL / 3 FAIL**

### 1. Visual Hierarchy
**PASS** -- Clear typographic hierarchy: display (32px) for home wordmark, h1 (24px) for query titles, h3 (16px) for section headings, body (15px) for answer text, small (13px) for UI labels, caption (11px) for metadata. Font weights differentiate: 600 for headings, 500 for captions, 400 for body. Color hierarchy: primary for content, secondary for supporting, muted for metadata, accent for interactive.

### 2. Selective Attention
**PASS** -- Same finding as Audit 1 #25. Color spines, accent colors on interactive elements, spinner accent segments, and red error states all guide selective attention effectively. Whitespace between sections prevents visual clutter.

### 3. Hick's Law
**PASS** -- Same finding as Audit 1 #10. Minimal options at every decision point. Progressive disclosure of sources (4 then "View more"). Collapsed TOC on mobile.

### 4. Cognitive Load
**PASS** -- Same finding as Audit 1 #5. The outline design system is inherently low-cognitive-load: no shadows, no gradients, no complex visual patterns to process. Icon-only buttons on mobile reduce parsing. The `text-wrap: pretty/balance` CSS rules optimize line-breaking to reduce reading effort.

### 5. Progressive Disclosure
**PASS** -- Sources show 4 by default with "View X more sources" toggle (`Sources.tsx:41-47`). Source cards have collapsible "View extracted text" sections (`Sources.tsx:97-112`). TOC is collapsed on mobile with "Show contents" toggle (`TableOfContents.tsx:79-89`). Action bar labels are hidden on mobile (progressive from icon to icon+label). Library detail view loads on click, not upfront. BookmarkButton loads initial state asynchronously.

### 6. Von Restorff Effect
**PASS** -- Same finding as Audit 1 #28. Error states in red, active states in accent blue, bookmarked states in highlight green all create visual isolation from the dominant gray palette.

### 7. Contrast
**PARTIAL** -- Light mode: primary text `#111111` on `#FFFFFF` background provides excellent contrast (21:1). Muted text `#888888` on `#FFFFFF` is 3.5:1 -- this fails WCAG AA for normal text (requires 4.5:1). Caption text at 11px using `--text-muted` is doubly problematic (small size + low contrast). Dark mode: muted text `#666666` on `#111111` is 3.9:1 -- also fails AA for normal text. The accent blue `#2563EB` on white is 4.6:1 (passes AA), but `#3B82F6` on `#111111` dark background is 4.3:1 (fails AA by a thin margin).

### 8. Signifiers
**PARTIAL** -- Some signifiers are strong: the send button has a clear arrow icon, nav items have icons + labels, suggestion chips have visible borders and hover states. However, topic-links in rendered markdown rely only on blue color and cursor change (`renderMarkdown.ts:161` applies `color: #2563EB; cursor: pointer` to `<strong>` tags) -- no underline, no icon, no other visual signifier that these are clickable. Citation `<sup>` badges are styled but have no hover state defined in the markdown renderer (only in the CitationBadge component, which isn't used in the rendered output).

### 9. Fitts's Law
**PASS** -- Same finding as Audit 1 #7. Touch targets meet or exceed 44px minimums. The search input spans the full content width for easy targeting. Suggestion chips have generous padding.

### 10. Anchoring Bias
**PARTIAL** -- The mode selector defaults to "speed" which anchors users toward fast results. The 4 suggestion queries anchor users toward specific question types but may limit creative exploration. Source cards show the numbered index prominently, anchoring users to a sequential reading order. However, no pricing, statistics, or comparative framing exists to leverage or mitigate anchoring bias deliberately.

### 11. Nudge Theory
**PARTIAL** -- Suggestion chips on the empty state nudge users toward action. The `/` keyboard shortcut hint nudges power-user behavior. The "Start a new search" link in the empty Library nudges toward the primary action. However, no contextual nudges exist during or after search (e.g., "Try refining your search", "Save this for later", "Share this with your team"). No nudge toward Discover or Library from the search page.

### 12. Aesthetic-Usability Effect
**PASS** -- Same finding as Audit 1 #1. The outline design system is visually cohesive, clean, and intentionally designed, increasing perceived usability.

### 13. Framing Effect
**PARTIAL** -- The mode labels "Speed/Balanced/Quality" frame the tradeoff neutrally. Source counts are presented as plain numbers ("Sources (12)") without positive framing (e.g., "12 verified sources"). The "Research-grade search with source traceability" tagline positively frames the product. Error messages are neutral ("This search encountered an error") rather than recovery-framed ("We hit a snag -- try rephrasing your question"). Chat count in Library is presented as a neutral count, not as an achievement.

### 14. Law of Proximity
**PASS** -- Same finding as Audit 1 #13. Spacing is consistent and meaningful across all components.

### 15. Aha Moment
**FAIL** -- No explicit "aha moment" engineering exists. The first search result could be that moment, but no design treatment differentiates a first-time search from subsequent ones. No welcome message, no first-result celebration, no "here's what makes Perplexica different" callout. The suggestion chips help users reach a first search quickly, but the aha moment (seeing sources traced to an answer with citation badges) isn't highlighted or explained. A first-time user may not even notice the citation-to-source scroll behavior.

### 16. Mental Model
**PASS** -- Same finding as Audit 1 #17. Familiar patterns from Perplexity, Google, and ChatGPT.

### 17. Familiarity Bias
**PASS** -- The app leverages familiarity: sidebar + main content layout (like Notion, Slack), bottom tab bar on mobile (like iOS), search-centered home (like Google), card grids for discovery (like Google News), list-detail for library (like email clients). The theme toggle uses the universal sun/moon metaphor. Share uses the standard share icon.

### 18. Social Proof
**FAIL** -- No social proof mechanisms exist. No view counts on shared answers. No "X people searched this" indicators. No community-sourced popular queries. No user reviews or ratings on answer quality. The Discover page could show engagement metrics on articles but doesn't. This is appropriate for a privacy-focused search tool but represents a missed growth lever.

### 19. Loss Aversion
**PARTIAL** -- The delete button on chat items (`LibraryPage.tsx:218-222`) has no confirmation dialog, meaning accidental deletion is permanent with no way to recover. The bookmark system enables saving to prevent loss. However, in-progress searches are not persisted -- navigating away loses the current query and partial results. No "unsaved draft" warning exists for partially typed queries.

### 20. Goal-Gradient Effect
**PARTIAL** -- Same finding as Audit 1 #9. Staggered animations provide micro goal-gradients when results appear, but no progress indicator exists during the search itself. The polling model offers no intermediate progress visibility.

### 21. Labor Illusion
**FAIL** -- The search loading state (`MessageBox.tsx:78-83`) shows a generic spinner with "Searching the web and generating answer..." text. No labor illusion exists: the user doesn't see the work being done (sources being found, documents being analyzed, answer being composed). Perplexity.ai, by contrast, shows streaming search steps. The 2-second polling gap means results appear all at once rather than progressively, further eliminating any sense of visible labor.

### 22. Peak-End Rule
**PARTIAL** -- Same finding as Audit 1 #23. Strong peak (well-formatted answer), weak end (no closure signal, no satisfaction feedback, no engagement prompt).

### 23. Serial Position Effect
**PASS** -- Same finding as Audit 1 #26. First and last positions are used strategically in action bars, navigation, and suggestion lists.

### 24. Zeigarnik Effect
**PARTIAL** -- The streaming-style "answering" status with spinner creates a mild Zeigarnik effect (user wants to see the completed answer). However, no persistent incomplete tasks exist: no draft queries, no "continue reading" markers, no "you have unfinished searches" reminders. If the user closes the tab during a search, the incomplete state is lost entirely.

### 25. Miller's Law
**PASS** -- Same finding as Audit 1 #18. All groupings stay within 7+/-2 limits.

### 26. Default Bias
**PASS** -- Defaults are well-chosen: "speed" mode (fastest results), light theme with system-preference override, 4 sources shown (enough to be useful, not overwhelming), TOC collapsed on mobile (saves space). The theme defaults to system preference if no stored value exists, respecting the user's OS-level choice.

### 27. Feedback Loop
**PARTIAL** -- Immediate feedback exists for: copy ("Copied!"), share ("Link copied!"), bookmark (icon fill toggle), theme (instant class toggle), send (optimistic message + spinner). However, longer feedback loops are missing: no success confirmation after PDF export, no feedback when a search completes if the tab is in the background, no "answer quality" feedback mechanism, no error recovery suggestions.

### 28. Fresh Start Effect
**PARTIAL** -- The empty state with wordmark and suggestions creates a clean fresh-start feeling. The `clearChat` function (`useSearch.ts:38-41`) exists in the hook but is never exposed in the UI -- there's no "New Search" button visible to users. The Discover page refreshes on topic change, but the Library offers no fresh-start mechanism (no "clear all" or "archive old chats").

### 29. Mere Exposure Effect
**PASS** -- The consistent use of the same design primitives (TextAction, SpineCard, outline borders, accent color) across every page creates familiarity through repetition. The color spine appears on source cards, chat items, article cards, and error states -- users will develop comfort with this pattern through repeated exposure. The same spinner, the same border radius, the same transition duration (180ms) everywhere.

### 30. Decision Fatigue
**PASS** -- The app minimizes decisions: smart defaults (speed mode, light theme), progressive disclosure (show more only when needed), minimal navigation (3 items), no configuration settings page. The search input is the only required interaction. All other decisions (mode, theme, bookmark) are optional and reversible. The action bar appears only after an answer is complete, not during the search, preventing premature decision-making.

---

## Summary Scorecards

### Audit 1: Laws of UX

| Rating | Count | Items |
|--------|-------|-------|
| **PASS** | 22 | Aesthetic-Usability, Choice Overload, Chunking, Cognitive Load, Fitts's Law, Flow, Hick's Law, Jakob's Law, Common Region, Proximity, Pragnanz, Similarity, Uniform Connectedness, Mental Model, Miller's Law, Occam's Razor, Pareto, Parkinson's, Postel's Law, Selective Attention, Serial Position, Tesler's Law, Von Restorff, Working Memory |
| **PARTIAL** | 6 | Cognitive Bias, Doherty Threshold, Goal-Gradient, Peak-End Rule |
| **FAIL** | 2 | Paradox of Active User, Zeigarnik Effect |

**Score: 22/30 PASS, 6/30 PARTIAL, 2/30 FAIL**

### Audit 2: Growth.design Psychology

| Rating | Count | Items |
|--------|-------|-------|
| **PASS** | 18 | Visual Hierarchy, Selective Attention, Hick's Law, Cognitive Load, Progressive Disclosure, Von Restorff, Fitts's Law, Aesthetic-Usability, Proximity, Mental Model, Familiarity Bias, Serial Position, Miller's Law, Default Bias, Mere Exposure, Decision Fatigue |
| **PARTIAL** | 9 | Contrast, Signifiers, Anchoring Bias, Nudge Theory, Framing Effect, Loss Aversion, Goal-Gradient, Peak-End Rule, Zeigarnik, Feedback Loop, Fresh Start |
| **FAIL** | 3 | Aha Moment, Social Proof, Labor Illusion |

**Score: 18/30 PASS, 9/30 PARTIAL, 3/30 FAIL**

---

## Top Priority Fixes

### Critical (FAIL items)

1. **Labor Illusion (Growth.design)** -- Implement streaming or staged progress during search. Show intermediate states: "Found 8 sources...", "Analyzing documents...", "Composing answer...". Consider server-sent events instead of polling.

2. **Paradox of Active User (Laws of UX)** -- Add feature discovery for hidden capabilities: tooltip or first-use callout for topic-links (bold blue terms are clickable), citation badge scroll behavior, and keyboard shortcuts. A subtle onboarding overlay or contextual hint system would help.

3. **Zeigarnik Effect (Laws of UX)** -- Persist in-progress searches to survive page navigation and refresh. Add a "Continue where you left off" prompt. Consider draft auto-save for the search input.

4. **Aha Moment (Growth.design)** -- Design a distinct first-search experience: highlight the source-traceability feature, briefly explain citation badges, celebrate the first successful search result.

5. **Social Proof (Growth.design)** -- While appropriate to omit for a privacy-focused tool, consider optional public query counters, popular searches, or community-curated collections on the Discover page.

### High Priority (PARTIAL items with measurable impact)

6. **Contrast (Growth.design)** -- `--text-muted: #888888` on white fails WCAG AA (3.5:1). Change to `#767676` (4.5:1 minimum) or `#6B7280` for safe compliance. Dark mode `--text-muted: #666666` on `#111111` also needs adjustment to `#8B8B8B` or higher.

7. **Signifiers (Growth.design)** -- Add underline-on-hover to topic-links in rendered markdown. Add hover state to inline citation `<sup>` elements. Consider a subtle icon or underline-dot pattern to signal clickability.

8. **Doherty Threshold (Laws of UX)** -- Reduce polling interval from 2 seconds to 500ms-1 second during active search. Better: switch to WebSocket/SSE for real-time updates. Add intermediate progress states to the search response.

9. **Fresh Start (Growth.design)** -- Expose the existing `clearChat` function as a visible "New Search" button in the UI, especially after receiving an answer.

10. **Loss Aversion (Growth.design)** -- Add a confirmation dialog for chat deletion. Implement soft-delete with undo capability.
