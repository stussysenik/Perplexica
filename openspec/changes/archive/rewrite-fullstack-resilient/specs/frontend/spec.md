# Frontend

## Description

RedwoodJS frontend using the Cells pattern, Apollo Client for GraphQL, and Tailwind CSS for styling. Replaces `src/app/`, `src/components/`, and `src/lib/hooks/useChat.tsx`.

See: streaming, auth, data-persistence

## ADDED Requirements

### REQ-FE-001: Chat Page with Cells Pattern

The chat page must use RedwoodJS Cells for data fetching with Loading/Error/Empty/Success states.

#### Scenario: Loading state
**Given** a user navigates to `/c/{chatId}`
**When** the chat data is being fetched
**Then** a loading skeleton is displayed

#### Scenario: Chat with messages
**Given** a chat exists with 5 messages
**When** the ChatCell resolves
**Then** all 5 messages are rendered with their response blocks (text, sources, widgets)

#### Scenario: Empty chat
**Given** a new chat with no messages yet
**When** the ChatCell resolves
**Then** the input field is focused and a welcome prompt is shown

#### Scenario: Error state
**Given** the GraphQL query fails
**When** the ChatCell encounters an error
**Then** an error message with retry button is displayed

### REQ-FE-002: Real-Time Search Streaming

The chat page must display search results as they stream in via GraphQL subscription.

#### Scenario: Research steps display
**Given** a search is in progress
**When** ResearchBlock events arrive
**Then** substeps (searching, reading, reasoning) are displayed in a collapsible ThinkBox

#### Scenario: Streaming text answer
**Given** the answer is being generated
**When** TextBlock update events arrive with RFC-6902 patches
**Then** the answer text grows incrementally with a typing effect

#### Scenario: Source cards with traceability
**Given** a SourceBlock event arrives
**When** sources are rendered
**Then** each source card shows title, URL, and a collapsible "View extracted text" panel

#### Scenario: Widget rendering
**Given** a WidgetBlock event arrives with type "weather"
**When** the widget is rendered
**Then** the weather widget displays temperature, condition, humidity, wind speed with appropriate icon

### REQ-FE-003: Message Input

The message input must support multi-line text with auto-expanding textarea.

#### Scenario: Single-line input
**Given** the user types a short query
**When** the text fits on one line
**Then** the input appears as a pill-shaped single-line field

#### Scenario: Multi-line expansion
**Given** the user types a long query with line breaks
**When** the text exceeds one line
**Then** the textarea expands vertically (up to 6 rows) with rounded corners

#### Scenario: Send on Enter
**Given** the user has typed a message
**When** they press Enter (without Shift)
**Then** the message is sent and the input is cleared

#### Scenario: Newline on Shift+Enter
**Given** the user is typing
**When** they press Shift+Enter
**Then** a newline is inserted

#### Scenario: Focus shortcut
**Given** the input is not focused
**When** the user presses `/`
**Then** the input receives focus

### REQ-FE-004: Discover Page

The discover page must display topic-based news using a Cell.

#### Scenario: Topic selection
**Given** the user is on the discover page
**When** they click the "Finance" topic pill
**Then** news articles about finance are fetched and displayed

#### Scenario: Responsive layout
**Given** the user is on a mobile device
**When** the discover page loads
**Then** articles are displayed in a 2-column grid of small cards

#### Scenario: Desktop layout
**Given** the user is on a desktop
**When** the discover page loads
**Then** articles are displayed in an alternating layout: 1 major card, 3 small cards, 2 side-by-side major cards

### REQ-FE-005: Library Page

The library page must display chat history with metadata.

#### Scenario: Chat list display
**Given** the user has 10 past chats
**When** the library page loads
**Then** all 10 chats are listed with title, creation time (relative), source types, and file count

#### Scenario: Delete chat
**Given** the user clicks the delete button on a chat
**When** the deletion is confirmed
**Then** the chat is removed from the list and the database

#### Scenario: Navigate to chat
**Given** the user clicks on a chat in the library
**When** the navigation occurs
**Then** the user is taken to `/c/{chatId}` with the full chat history

### REQ-FE-006: Settings Page

The settings page must allow configuration of model providers, theme, and preferences.

#### Scenario: Add model provider
**Given** the user opens settings
**When** they add a new NIM provider with API key and base URL
**Then** the provider is validated, saved, and appears in the provider list

#### Scenario: Theme toggle
**Given** the user is in dark mode
**When** they select "Light" theme
**Then** the UI switches to light mode immediately

#### Scenario: System instructions
**Given** the user types custom system instructions
**When** they save
**Then** the instructions are used in all subsequent searches

### REQ-FE-007: PWA Support

The application must be installable as a Progressive Web App.

#### Scenario: PWA installation
**Given** the user visits the app in a compatible browser
**When** the PWA manifest is loaded
**Then** the browser offers to install the app with correct name, icons, and theme color

#### Scenario: iOS home screen
**Given** the user adds the app to their iOS home screen
**Then** the 180x180 Apple touch icon is displayed and the app opens in standalone mode

### REQ-FE-008: Styling and Theming

The frontend must support light and dark themes with consistent styling.

#### Scenario: Dark mode
**Given** the user's theme preference is "dark"
**When** any page renders
**Then** dark background colors (dark-primary, dark-secondary) and light text are used

#### Scenario: Light mode
**Given** the user's theme preference is "light"
**When** any page renders
**Then** light background colors (light-primary, light-secondary) and dark text are used

#### Scenario: Accent color
**Given** any interactive element
**When** it is focused or active
**Then** cyan accent color is applied consistently
