# OpenSpec Agent Instructions

## Working with Specs

### Directory Structure
```
openspec/
  project.md          — Project overview and current state
  AGENTS.md           — This file (agent instructions)
  specs/              — Capability specifications (future)
  changes/
    README.md         — Change board: source of truth for task status (read this first)
    <change-id>/      — OPEN changes only (active or deliberately deferred)
      proposal.md     — Change summary, motivation, scope (carries a STATUS: banner)
      design.md       — Architecture, trade-offs, diagrams
      tasks.md        — Ordered implementation work items
      specs/
        <capability>/
          spec.md     — Requirements with scenarios
    archive/          — CLOSED changes (shipped & live, or retired/obsolete)
      <change-id>/    — same layout; STATUS: banner explains why it closed
```

### Lifecycle

A change lives at `changes/<id>/` while open. When it ships (or is retired as
obsolete), `git mv` it to `changes/archive/<id>/`, add a `STATUS:` banner to its
`proposal.md`, and update `changes/README.md`. Folder location is the lifecycle signal;
`tasks.md` checkbox counts are not authoritative for older changes.

### Spec Format

Each `spec.md` uses this structure:

```markdown
# <Capability Name>

## Description
Brief overview of what this capability does.

## ADDED Requirements
### REQ-<ID>: <Title>
<Description>

#### Scenario: <Name>
**Given** <precondition>
**When** <action>
**Then** <expected outcome>
```

Use `## ADDED`, `## MODIFIED`, or `## REMOVED` sections as appropriate.

### Creating Change Proposals

1. Choose a verb-led `change-id` (e.g., `rewrite-fullstack-resilient`)
2. Create `proposal.md` with motivation, scope, and approach
3. Create `design.md` for architectural decisions and trade-offs
4. Create `tasks.md` with ordered, verifiable work items
5. Create spec deltas under `specs/<capability>/spec.md`

### Conventions

- Each requirement has a unique ID: `REQ-<CAPABILITY>-<NUMBER>` (e.g., `REQ-STREAM-001`)
- Every requirement must have at least one scenario
- Cross-reference related capabilities with `See: <capability>`
- Tasks must have acceptance criteria
- Keep specs focused — one capability per folder
