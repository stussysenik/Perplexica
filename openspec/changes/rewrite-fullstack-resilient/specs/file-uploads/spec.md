# File Uploads

## Description

File upload processing with text extraction, chunk embedding, and vector similarity search. Replaces `src/lib/uploads/manager.ts` and `src/lib/uploads/store.ts` with Phoenix processing and pgvector storage.

See: search-pipeline, model-providers, data-persistence

## ADDED Requirements

### REQ-UPLOAD-001: File Upload Processing

The system must accept file uploads, extract text content, and generate embeddings.

#### Scenario: PDF upload
**Given** a user uploads a PDF file
**When** the file is processed
**Then** text is extracted from all pages, split into 512-character chunks with 128-character overlap, and each chunk is embedded via NIM EmbedQA

#### Scenario: DOCX upload
**Given** a user uploads a Word document
**When** the file is processed
**Then** text is extracted, chunked, and embedded identically to PDF handling

#### Scenario: Plain text upload
**Given** a user uploads a .txt file
**When** the file is processed
**Then** the raw text is read, chunked, and embedded

#### Scenario: Unsupported file type
**Given** a user uploads a .xlsx file
**When** the upload is received
**Then** an error is returned indicating the file type is not supported

### REQ-UPLOAD-002: Chunk Storage with pgvector

Extracted chunks and their embeddings must be stored in PostgreSQL using pgvector for vector similarity search.

#### Scenario: Chunk storage
**Given** a PDF with 20 chunks
**When** processing completes
**Then** 20 rows are inserted into `upload_chunks` with content, embedding (1024-dim vector), upload_id, and chunk_index

#### Scenario: Vector similarity search
**Given** stored chunks for a file
**When** a query embedding is compared against chunk embeddings
**Then** results are ordered by cosine similarity (nearest neighbors)

### REQ-UPLOAD-003: Upload Search Action

The search pipeline must support searching over uploaded files during research.

#### Scenario: Search over uploaded files
**Given** a chat has 2 uploaded files
**When** the uploads_search action executes with 3 query strings
**Then** each query is embedded and compared against chunks from those files, returning top-10 results via reciprocal rank fusion

#### Scenario: Reciprocal rank fusion
**Given** 3 queries each returning ranked results
**When** results are combined
**Then** scores are computed as `sum(score / (rank + 60))` across queries, and the top-K unique chunks are returned

#### Scenario: File context injection
**Given** uploaded files are present in the chat
**When** the search begins
**Then** the first 3 chunks of each file are provided as initial context to the LLM

### REQ-UPLOAD-004: File Metadata Persistence

Upload metadata must be stored in PostgreSQL.

#### Scenario: File record creation
**Given** a file is uploaded
**When** processing completes
**Then** a record in the `uploads` table stores: id, name, mime_type, size_bytes, storage_key, created_at

#### Scenario: File deletion
**Given** a user deletes a chat with uploaded files
**When** the chat is deleted
**Then** associated upload records and chunk embeddings are also deleted (cascade)
