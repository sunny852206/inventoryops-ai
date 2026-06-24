# Architecture

InventoryOps AI is a scoped demo implementation of an auditable AI workflow engine for operational decisions. The initial domain is household pantry and inventory operations, but the architecture is intended to model a broader pattern for bounded AI assistance in operational systems.

This document describes the initial application architecture and the boundaries that should continue to guide future iterations.

## Application Flow

```text
User text input
-> LLM structured extraction
-> schema validation
-> human review and edit
-> confirmed event log
-> deterministic state projection
-> deterministic recommendation scoring
-> LLM explanation
-> feedback and AI request logging
```

## Core Components

- Input capture: accepts messy operational text, such as notes about pantry purchases, usage, spoilage, or restocking needs.
- Extraction service: sends bounded prompts to an LLM and requests structured candidate events.
- Validation layer: validates candidate events against explicit schemas before review.
- Review workflow: presents candidate events for human review, correction, approval, or rejection.
- Event log: stores only confirmed events as the source of truth for inventory-changing facts.
- Projection logic: derives current inventory state deterministically from confirmed events.
- Scoring engine: ranks recommendations with deterministic factors and explicit weights.
- Explanation service: uses an LLM to explain deterministic scores without changing the ranking.
- AI request logging: records request metadata, prompt template identifiers, model settings, validation outcomes, review decisions, latency, and error details. Raw prompts or responses should be stored only when appropriate for the demo and should avoid secrets or sensitive personal data.

## Bounded LLM Usage

The system treats model output as candidate input, not as the source of truth. The LLM is used for tasks where language flexibility is useful:

- Extract structured candidate data from messy operational text.
- Generate natural-language explanations from deterministic score factors.

The LLM must not:

- Directly write to the database.
- Mutate inventory state.
- Rank recommendations.
- Own business decisions.
- Execute irreversible actions.
- Bypass schema validation.
- Bypass human review.

Future AI capabilities should follow the same boundary. Model output can propose, summarize, classify, or explain, but confirmed state and ranking logic should remain controlled by validated application code.

## Human Review Before State Mutation

LLM output is treated as a draft. A candidate event must pass schema validation and be reviewed by a human before it can become a confirmed event.

The review step allows correction, approval, or rejection. Only approved events are persisted as confirmed operational facts. This keeps AI output separate from the system of record.

## Event Log and Projection

The event log is the planned source of truth for state-changing facts. Examples may include inventory added, inventory consumed, item discarded, or item corrected.

Current inventory state is projected deterministically from confirmed events. This makes the state explainable, replayable, and easier to test than direct mutation from AI output.

## Deterministic Scoring

Recommendations are planned to be scored by deterministic business logic. Score factors may include quantity on hand, estimated usage rate, expiration risk, replacement priority, and confidence in available data.

The LLM may explain why a recommendation appears, but it must not decide the rank or score.

## AI Request Logging

AI interactions should be logged for auditability and debugging. Logs should include enough metadata to understand what happened without exposing secrets.

Planned log data includes:

- Request purpose.
- Prompt or prompt template identifier.
- Model name and relevant settings.
- Structured response or sanitized response excerpt when needed for debugging.
- Validation success or failure.
- Human review outcome.
- Error details when applicable.

## Current Status

This architecture is the target for the initial implementation. Application code, database schema, API routes, UI, tests, evals, and deployment setup are in progress.
