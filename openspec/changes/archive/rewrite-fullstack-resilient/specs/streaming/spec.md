# Streaming

## Description

Real-time delivery of search results from Phoenix backend to RedwoodJS frontend. Replaces the in-memory `SessionManager` (`src/lib/session.ts`) and NDJSON streaming in `src/app/api/chat/route.ts` with GenServer-per-search sessions and Absinthe GraphQL subscriptions.

See: search-pipeline, frontend

## ADDED Requirements

### REQ-STREAM-001: GenServer-per-Search Session

Each active search must run in its own supervised GenServer process, providing crash isolation and state management.

#### Scenario: Session creation
**Given** a user starts a new search
**When** the search mutation is received
**Then** a new GenServer is started under the SearchSupervisor with a unique session ID

#### Scenario: Session crash isolation
**Given** two concurrent search sessions are running
**When** session A crashes due to an LLM timeout
**Then** session B continues unaffected, and session A's supervisor restarts it

#### Scenario: Session TTL cleanup
**Given** a search session has been idle for 30 minutes
**When** the TTL timer fires
**Then** the GenServer terminates and is removed from the supervisor

### REQ-STREAM-002: Block Emission Protocol

The GenServer must emit typed blocks matching the existing protocol: TextBlock, SourceBlock, SuggestionBlock, WidgetBlock, ResearchBlock.

#### Scenario: Emitting a new block
**Given** a search session is active
**When** the researcher produces a SourceBlock with 15 chunks
**Then** a `BlockEvent` is published via Absinthe with `type: "block"` and the full block data

#### Scenario: Updating an existing block with patch
**Given** a TextBlock has been emitted with initial content
**When** new streaming content arrives
**Then** an `UpdateBlockEvent` is published with the block ID and an RFC-6902 JSON patch

#### Scenario: Research complete signal
**Given** the researcher finishes all iterations
**When** answer generation begins
**Then** a `ResearchCompleteEvent` is published

#### Scenario: Message end signal
**Given** the answer has been fully streamed
**When** the search session completes
**Then** a `MessageEndEvent` is published and the GenServer prepares for cleanup

### REQ-STREAM-003: Absinthe GraphQL Subscription

Clients must receive search events via GraphQL subscription over WebSocket.

#### Scenario: Subscribing to a search session
**Given** a client has started a search and received a session ID
**When** the client subscribes to `searchUpdated(sessionId: "abc")`
**Then** the client receives all block events for that session in order

#### Scenario: Late subscriber replay
**Given** a search session has already emitted 5 events
**When** a new subscriber connects (e.g., page refresh / reconnect)
**Then** the subscriber receives all 5 previous events followed by live events

#### Scenario: Client disconnect handling
**Given** a client is subscribed to a search session
**When** the WebSocket connection drops
**Then** the search continues to completion and results are persisted (not cancelled)

### REQ-STREAM-004: State Checkpointing

The GenServer must checkpoint its state to PostgreSQL after each research iteration for crash recovery.

#### Scenario: Checkpoint after iteration
**Given** a search session completes research iteration 3
**When** the iteration results are aggregated
**Then** the session state (iteration count, accumulated results, block history) is written to the `search_sessions` table

#### Scenario: Recovery from crash
**Given** a search session crashed at iteration 3 of 6
**When** the supervisor restarts the GenServer
**Then** the GenServer loads the last checkpoint from PostgreSQL and resumes from iteration 4

### REQ-STREAM-005: Error Propagation

Errors must be propagated to the client as ErrorEvent through the subscription.

#### Scenario: LLM provider error
**Given** both NIM and GLM providers fail
**When** the search session cannot proceed
**Then** an `ErrorEvent` is published with a descriptive message, and the session state is persisted as "error"

#### Scenario: Rate limit error
**Given** the Brave Search rate limiter rejects a request
**When** the web_search action fails
**Then** the action retries after the rate limit window, or the error is included in the research context for the LLM to work around
