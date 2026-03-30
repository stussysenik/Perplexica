# Search Sources

## Description

External search integration with Brave Search API, replacing the Node.js `searxng-proxy.mjs` with a Phoenix GenServer using Hammer for rate limiting. Supports web search, news search, academic search, and social/discussion search.

See: search-pipeline

## ADDED Requirements

### REQ-SOURCE-001: Brave Search Web Client

The system must query the Brave Search API for web results with proper rate limiting.

#### Scenario: Web search query
**Given** a valid `BRAVE_SEARCH_API_KEY`
**When** `search_web("SpaceX launch", count: 10)` is called
**Then** up to 10 web results are returned, each with url, title, content, and optional thumbnail

#### Scenario: Rate limiting enforcement
**Given** the Brave Search free tier limit of 1 request per 1.1 seconds
**When** 3 search requests arrive within 1 second
**Then** the first executes immediately, the second waits ~1.1s, the third waits ~2.2s

#### Scenario: Rate limit using Hammer
**Given** Hammer is configured with a sliding window of 1 request per 1100ms
**When** a request exceeds the rate limit
**Then** the request is queued and retried after the window opens

### REQ-SOURCE-002: Brave Search News Client

The system must query the Brave News Search API for news results.

#### Scenario: News search query
**Given** a valid Brave API key
**When** `search_news("technology news site:techcrunch.com", count: 20)` is called
**Then** up to 20 news results are returned with url, title, content, thumbnail

#### Scenario: Discover page news fetching
**Given** a topic "tech" with predefined queries and sites
**When** the discover endpoint is called
**Then** cartesian product of sites x queries is searched, results deduplicated and shuffled

### REQ-SOURCE-003: Academic Search

The system must support academic search via Brave Search with academic-focused queries.

#### Scenario: Academic search action
**Given** the classifier flags `academicSearch: true`
**When** the academic_search action executes
**Then** search results are filtered/boosted for academic domains (.edu, arxiv.org, scholar references)

### REQ-SOURCE-004: Discussion/Social Search

The system must support discussion forum search.

#### Scenario: Discussion search action
**Given** the classifier flags `discussionSearch: true`
**When** the discussion_search action executes
**Then** search results are filtered/boosted for discussion platforms (reddit.com, stackoverflow.com, etc.)

### REQ-SOURCE-005: URL Scraping

The system must scrape and extract text content from URLs found in search results.

#### Scenario: Successful URL scrape
**Given** a URL from search results
**When** `scrape_url(url)` is called
**Then** the HTML is fetched, parsed to extract main text content, and returned as a Chunk

#### Scenario: Scrape timeout
**Given** a URL that takes longer than 10 seconds to respond
**When** the scrape request times out
**Then** an empty result is returned and the URL is skipped

#### Scenario: Rate limiting on scraping
**Given** multiple URLs to scrape in one research iteration
**When** scrape requests are dispatched
**Then** they execute concurrently with reasonable concurrency limits (max 5 parallel)

### REQ-SOURCE-006: Result Deduplication

Search results must be deduplicated across multiple search queries and sources.

#### Scenario: Duplicate URL removal
**Given** the same URL appears in both web_search and academic_search results
**When** results are aggregated
**Then** only one entry per unique URL is kept (case-insensitive, trimmed)
