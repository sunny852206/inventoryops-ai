# Keep LLM usage bounded and auditable

## Status

Accepted

## Context

InventoryOps AI uses AI assistance in an operational workflow where state changes and recommendations must be explainable and reviewable. LLMs are useful for interpreting messy natural-language input and generating readable explanations, but they are not reliable enough to own business decisions or mutate operational state directly.

The project needs a clear boundary between language-model output and the system of record. This boundary applies beyond the initial release: future AI capabilities should preserve validation, review, auditability, and deterministic control over state transitions.

## Decision

Keep LLM usage bounded and auditable.

The LLM may:

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

All state-changing facts must pass validation and human review before they are stored as confirmed events. Recommendation ranking and scoring must be handled by deterministic, testable business logic.

Additional AI capabilities may be added later, but they should operate as candidate-generating, summarization, explanation, or read-only workflows. They should not own state transitions, recommendation ranking, or irreversible actions.

## Consequences

- The system can treat AI output as a draft instead of a source of truth.
- Inventory state remains replayable from confirmed events.
- Recommendation scores can be tested and explained from explicit factors.
- Human review adds friction, but it reduces the risk of unverified AI output changing operational state.
- AI request logging becomes important for debugging, evaluation, and auditability.
- Prompt changes can be evaluated without changing the deterministic business rules.

## Alternatives Considered

- Allow the LLM to directly mutate state: simpler to prototype, but creates unacceptable auditability and correctness risks.
- Allow the LLM to rank recommendations: flexible, but makes decisions harder to test, reproduce, and explain.
- Use no LLM at all: maximizes determinism, but loses value in extracting structure from messy operational text and explaining results in natural language.
- Require human entry of all structured data: reliable, but less effective at demonstrating AI-assisted operational workflows.
