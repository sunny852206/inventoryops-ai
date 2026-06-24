# InventoryOps AI

InventoryOps AI is a scoped demo implementation of an auditable AI workflow engine for operational decisions.

The initial domain is household pantry and inventory operations. This domain is intentionally concrete: inputs are easy to create, state changes are understandable, and recommendations can be checked by a human reviewer. The reusable engineering pattern is broader than pantry inventory and is designed for operational workflows where AI assistance must remain bounded, reviewable, and auditable.

The initial release focuses on AI-assisted extraction and explanation. State changes, projections, and recommendation scoring remain deterministic and auditable.

This repository is not a production service. It is an implementation-oriented public demo with architecture documentation, decision records, and application work in progress.

## Workflow Pattern

The planned workflow is:

```text
messy operational input
-> LLM structured extraction
-> schema validation
-> human review and edit
-> confirmed event log
-> deterministic state projection
-> deterministic recommendation scoring
-> LLM explanation
-> feedback
-> AI request logs and observability
-> evals and tests
-> deployed demo
```

## Initial Release Scope

- Capture messy pantry or inventory-related text input.
- Use an LLM to extract structured candidate events.
- Validate extracted data against explicit schemas.
- Require human review before any state-changing event is confirmed.
- Store confirmed events in an append-only event log.
- Project current inventory state deterministically from confirmed events.
- Generate deterministic recommendation scores from explicit factors.
- Use an LLM only to explain deterministic results in natural language.
- Log AI request metadata, validation outcomes, review decisions, latency, and error states for auditability.
- Add focused evals and tests for extraction, validation, projection, scoring, and explanation behavior.

## Technical Direction

- Next.js for the initial full-stack application framework.
- TypeScript for shared application and domain logic.
- PostgreSQL for persisted operational data.
- Prisma for database access and migrations.
- Zod or a similar schema validation library for structured validation.
- OpenAI API for bounded extraction and explanation tasks.
- A deployment target suitable for a small public demo.

## Iteration Path

Future AI capabilities can be added as candidate-generating, summarization, explanation, or read-only workflows. Confirmed state changes and recommendation ranking should remain controlled by validated application logic.

## Engineering Principles

- The LLM is bounded.
- Business logic is deterministic, testable, observable, explainable, and auditable.
- The LLM may extract structured data from messy text.
- The LLM may generate natural-language explanations from deterministic score factors.
- The LLM must not directly write to the database.
- The LLM must not rank recommendations or own business decisions.
- The LLM must not execute irreversible actions.
- The LLM must not bypass validation or human review.
- Inventory state changes must come from confirmed events, not raw AI output.

## Current Status

The repository currently contains project documentation, architecture notes, and initial decision records. Application code, database schema, tests, evals, and deployment configuration are in progress.
