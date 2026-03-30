# Search Pipeline

## Description

The agentic search pipeline that takes a user query and produces a structured, cited answer. Replaces `src/lib/agents/search/index.ts`, `src/lib/agents/search/classifier.ts`, `src/lib/agents/search/researcher/index.ts`, and the action registry.

Implemented as Elixir modules called by the SearchSession GenServer.

See: streaming, model-providers, search-sources

## ADDED Requirements

### REQ-SEARCH-001: Query Classification

The system must classify each user query using an LLM structured output call to determine search strategy, widget triggers, and a context-independent reformulation.

#### Scenario: Standard web search query
**Given** a user query "What is the latest news about SpaceX?"
**When** the classifier processes the query
**Then** it returns `skipSearch: false`, `personalSearch: false`, `standaloneFollowUp: "What is the latest news about SpaceX?"`, and no widget flags

#### Scenario: Follow-up query with chat history
**Given** a chat history about Python and a follow-up "What about its performance?"
**When** the classifier processes the query with history
**Then** `standaloneFollowUp` is reformulated as "What is the performance of Python programming language?"

#### Scenario: Widget-triggering query
**Given** a user query "What's the weather in Tokyo?"
**When** the classifier processes the query
**Then** it returns `showWeatherWidget: true` and `skipSearch: false`

#### Scenario: Simple conversational query
**Given** a user query "Hi, how are you?"
**When** the classifier processes the query
**Then** it returns `skipSearch: true`

### REQ-SEARCH-002: Agentic Research Loop

The system must run an iterative research loop where the LLM decides which actions to take (search, scrape, done) and the system executes them in parallel.

#### Scenario: Speed mode with 2 iterations
**Given** optimization mode is "speed"
**When** the researcher starts
**Then** it runs at most 2 iterations before generating the final answer

#### Scenario: Quality mode with extended research
**Given** optimization mode is "quality"
**When** the researcher starts
**Then** it runs up to 25 iterations, using the plan/reasoning action for deeper analysis

#### Scenario: Early termination on done action
**Given** the researcher is on iteration 1 of 6
**When** the LLM returns a "done" action
**Then** the research loop terminates and proceeds to answer generation

#### Scenario: Parallel action execution
**Given** the LLM returns 3 tool calls (web_search, academic_search, scrape_url)
**When** the actions are executed
**Then** all 3 run concurrently and results are aggregated

### REQ-SEARCH-003: Action Registry

The system must maintain a registry of available search actions that can be dynamically enabled/disabled based on configuration.

#### Scenario: Registering a new action
**Given** a new action module implementing the action behavior
**When** it is registered with the registry
**Then** it appears in available actions when its `enabled?/1` callback returns true

#### Scenario: Actions filtered by config
**Given** the user has not enabled academic search sources
**When** available actions are queried
**Then** `academic_search` is not included in the list

### REQ-SEARCH-004: Answer Generation with Streaming

The system must generate a final answer by streaming LLM output, incorporating search results and widget context as grounding.

#### Scenario: Streaming answer with citations
**Given** research has collected 15 source chunks
**When** the answer is generated
**Then** text streams incrementally as TextBlock updates, with source references matching SourceBlock data

#### Scenario: Answer without search (skipSearch)
**Given** classification returned `skipSearch: true`
**When** the answer is generated
**Then** the LLM responds directly without search context, and no SourceBlock is emitted

### REQ-SEARCH-005: Research Substep Tracking

The system must emit detailed substep information during research for UI display (thinking/reasoning transparency).

#### Scenario: Substep emission during research
**Given** the researcher executes a web_search action
**When** the action completes
**Then** a ResearchBlock substep of type "searching" is emitted with the search queries, followed by "search_results" with the results

### REQ-SEARCH-006: Database Persistence

Each search result must be persisted to PostgreSQL with the message's response blocks and status.

#### Scenario: Successful search completion
**Given** a search session completes successfully
**When** the final answer is generated
**Then** the message record is updated with status "completed" and all response blocks stored as JSONB

#### Scenario: Search failure
**Given** a search session encounters an unrecoverable error
**When** the error is caught
**Then** the message record is updated with status "error" and partial blocks are preserved
