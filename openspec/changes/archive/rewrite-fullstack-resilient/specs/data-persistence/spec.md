# Data Persistence

## Description

PostgreSQL database schema managed by Ecto (Phoenix, source of truth for migrations) and Prisma (RedwoodJS, for reads). Replaces SQLite/Drizzle (`src/lib/db/`) and file-based config (`src/lib/config/index.ts`).

See: search-pipeline, streaming, file-uploads, auth

## ADDED Requirements

### REQ-DATA-001: PostgreSQL Schema

The database must use PostgreSQL with the following core tables.

#### Scenario: Chats table
**Given** the database is migrated
**When** the `chats` table is queried
**Then** it has columns: id (UUID PK), title (text), sources (JSONB), files (JSONB), created_at (timestamptz)

#### Scenario: Messages table
**Given** the database is migrated
**When** the `messages` table is queried
**Then** it has columns: id (serial PK), message_id (text), chat_id (UUID FK→chats), backend_id (text), query (text), response_blocks (JSONB), status (text, check constraint), created_at (timestamptz)

#### Scenario: Search sessions table
**Given** the database is migrated
**When** the `search_sessions` table is queried
**Then** it has columns: id (UUID PK), chat_id (UUID FK→chats), message_id (text), state (JSONB), iteration (integer), status (text), created_at (timestamptz), updated_at (timestamptz)

#### Scenario: Config table
**Given** the database is migrated
**When** the `config` table is queried
**Then** it has columns: key (text PK), value (JSONB), updated_at (timestamptz)

#### Scenario: Model providers table
**Given** the database is migrated
**When** the `model_providers` table is queried
**Then** it has columns: id (UUID PK), name (text), type (text), config (JSONB), chat_models (JSONB), embedding_models (JSONB), hash (text), created_at (timestamptz)

#### Scenario: Uploads table
**Given** the database is migrated
**When** the `uploads` table is queried
**Then** it has columns: id (UUID PK), name (text), mime_type (text), size_bytes (integer), storage_key (text), created_at (timestamptz)

#### Scenario: Upload chunks table with pgvector
**Given** the pgvector extension is enabled
**When** the `upload_chunks` table is queried
**Then** it has columns: id (serial PK), upload_id (UUID FK→uploads), content (text), embedding (vector(1024)), chunk_index (integer)

### REQ-DATA-002: Dual ORM Coordination

Ecto and Prisma must both work with the same PostgreSQL schema.

#### Scenario: Ecto owns migrations
**Given** a schema change is needed
**When** a developer creates the change
**Then** an Ecto migration is written in `phoenix/priv/repo/migrations/`

#### Scenario: Prisma syncs schema
**Given** Ecto migrations have been applied
**When** `prisma db pull` is run in the Redwood project
**Then** `schema.prisma` is updated to match the current database schema

#### Scenario: Read/write separation
**Given** both ORMs are connected to the same database
**When** Phoenix writes a new message via Ecto
**Then** RedwoodJS can read it immediately via Prisma

### REQ-DATA-003: Configuration Storage

Application configuration must be stored in PostgreSQL instead of a JSON file.

#### Scenario: Get config value
**Given** a config key "preferences.theme" exists
**When** `get_config("preferences.theme")` is called
**Then** the stored value is returned

#### Scenario: Update config value
**Given** an existing config key
**When** `update_config("preferences.theme", "dark")` is called
**Then** the value is updated in the database

#### Scenario: Config initialization from env
**Given** environment variables are set for provider configs
**When** the application starts and config entries don't exist
**Then** default values from environment variables are inserted into the config table

### REQ-DATA-004: Cascade Deletion

Related records must be cleaned up when parent records are deleted.

#### Scenario: Delete chat cascades to messages
**Given** a chat with 5 messages
**When** the chat is deleted
**Then** all 5 messages are also deleted

#### Scenario: Delete upload cascades to chunks
**Given** an upload with 20 chunks
**When** the upload is deleted
**Then** all 20 chunk records (including embeddings) are also deleted

### REQ-DATA-005: Data Migration from Current System

There should be a migration path from the current SQLite + file-based system.

#### Scenario: Chat history migration
**Given** the current SQLite database has chat and message records
**When** the migration script runs
**Then** all chats and messages are copied to PostgreSQL with preserved IDs and timestamps

#### Scenario: Config migration
**Given** the current `data/config.json` file exists
**When** the migration script runs
**Then** all config values are inserted into the PostgreSQL `config` table
