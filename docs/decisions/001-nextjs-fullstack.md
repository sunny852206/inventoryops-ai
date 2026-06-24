# Use Next.js as the initial full-stack application framework

## Status

Accepted

## Context

InventoryOps AI needs an initial implementation that can demonstrate the full workflow from messy operational input to reviewed events, projected state, deterministic recommendations, AI explanations, and audit logs.

The project benefits from keeping the early implementation compact and consistent. A full-stack TypeScript framework allows shared types, validation schemas, and domain logic to stay close together while the workflow is still being shaped.

## Decision

Use Next.js as the initial full-stack application framework.

This choice is primarily for initial delivery speed, deployment simplicity, and full-stack TypeScript consistency. It supports building the application UI, server-side handlers, and integration points in one project structure while keeping the core domain logic separable from framework-specific code.

## Consequences

- The initial implementation can move quickly without maintaining separate frontend and backend applications.
- TypeScript can be used consistently across UI, validation, workflow orchestration, and domain logic.
- The project can still separate deterministic business logic from framework-specific code.
- Next.js conventions may influence project structure, routing, deployment, and data-loading patterns.
- If the system grows beyond the initial implementation, some backend workflow logic may need to move into separate services or workers.

## Alternatives Considered

- Separate frontend and backend applications: provides clearer service boundaries, but adds setup and coordination overhead for the initial release.
- API-only backend first: useful for backend-first systems, but less efficient for demonstrating a complete review workflow and public demo.
- Script-based prototype: fastest for isolated logic, but not sufficient for demonstrating human review, audit logs, and an interactive workflow.
