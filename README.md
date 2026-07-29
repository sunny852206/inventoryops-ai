# InventoryOps AI

> **AI suggests. User confirms. Code computes.**

**Live Demo:** https://inventoryops-ai.vercel.app/
**Tech Stack:** Next.js · TypeScript · OpenAI · Zod · Vitest · GitHub Actions

InventoryOps AI is a full-stack demo that turns messy pantry notes into structured, reviewable inventory decisions.

Users can write natural inventory updates like what they bought, used, threw away, or corrected. The app uses AI to extract candidate events, validates the result, sends it through review, and then uses confirmed events to project inventory and generate recommendations.

The project is intentionally built around a bounded AI workflow: AI helps with messy input and communication, while application logic controls validation, state changes, and scoring.

## At a Glance

InventoryOps AI is not just a prompt box around an AI response.

It demonstrates a workflow where:

- messy text becomes structured candidate events
- AI output is validated before entering the app flow
- users review changes before inventory is updated
- confirmed events become the source of truth
- inventory state is projected with deterministic TypeScript logic
- recommendations are scored by rules, not by the model
- AI turns existing recommendations into a short action plan

## What Makes It Different

Many AI demos stop after generating text. InventoryOps AI focuses on what happens around the model: validation, review, state management, deterministic logic, and user-facing output.

| Workflow Area   | AI Handles                                  | Application Handles                                             |
| --------------- | ------------------------------------------- | --------------------------------------------------------------- |
| Messy input     | Extracts candidate events from natural text | Validates structure and allowed fields                          |
| Review          | Suggests possible inventory changes         | Requires user confirmation before state changes                 |
| State           | Does not directly update inventory          | Uses confirmed events as the source of truth                    |
| Recommendations | Summarizes next steps                       | Projects inventory and scores recommendations deterministically |

This separation keeps the app useful for real-world messy input while making the important parts easier to inspect, test, and reason about.

## Demo Workflow

```text
messy inventory note
→ AI extracts candidate events
→ schema validation
→ human review and edit
→ confirmed event history
→ deterministic inventory projection
→ deterministic recommendation scoring
→ AI-assisted action plan
```

## Example

A user can enter a loose inventory note like:

```text
Costco run today: bought 18 eggs and 2 bottles of milk. Used 4 eggs for breakfast, threw away 2 bananas, and I only have 1 milk left now.
```

InventoryOps AI extracts structured candidate events:

```text
PURCHASED eggs 18
PURCHASED milk 2 bottles
CONSUMED eggs 4
DISCARDED bananas 2
CORRECTED milk 1 bottle
```

Those candidates are not applied automatically. The user can review and edit them before they affect inventory state.

After confirmation, the app projects the current inventory, groups recommendations by action type, and generates a short action plan such as:

```text
- Use your current eggs before buying more.
- Add milk to your next shopping list.
```

## AI-Assisted, Not AI-Controlled

InventoryOps AI uses AI in focused parts of the workflow:

- extracting structured candidate events from messy inventory notes
- generating a practical action plan from existing recommendations

AI does not directly change inventory, bypass review, or own the recommendation logic.

The application owns:

- runtime schema validation
- user review
- confirmed event history
- inventory projection
- recommendation scoring

This keeps AI helpful without making it the source of truth.

## Key Features

- Natural-language inventory input
- AI-assisted extraction for purchases, consumption, discards, and corrections
- Runtime schema validation with Zod
- Human review queue before inventory changes are confirmed
- Confirmed event history with edit, delete, and clear actions
- Deterministic inventory projection from confirmed events
- Rule-based recommendation scoring
- Grouped recommendation UI for quick scanning
- AI-assisted action plan based on existing recommendations
- Manual extraction eval cases for checking model behavior
- GitHub Actions CI for tests, linting, and production build checks

## Engineering Highlights

InventoryOps AI highlights practical engineering patterns for AI-enabled products:

- **Bounded AI usage** — model output is limited to specific workflow steps
- **Server-side OpenAI integration** — API keys stay on the server
- **Schema validation** — AI output is checked before entering the app workflow
- **Human-in-the-loop review** — suggested changes require confirmation
- **Deterministic domain logic** — inventory projection and recommendation scoring are controlled by application code
- **Separation of concerns** — extraction, review, state projection, scoring, and action planning are separate layers
- **CI-backed quality checks** — tests, linting, and production builds run through GitHub Actions
- **Build-safe configuration** — CI can build the app without requiring local OpenAI credentials

## Tech Stack

- **Next.js** — full-stack application framework
- **React** — interactive UI
- **TypeScript** — typed application and domain logic
- **Zod** — runtime schema validation
- **OpenAI API** — bounded extraction and action-plan generation
- **Vitest** — domain and workflow tests
- **GitHub Actions** — CI for test, lint, and build checks
- **localStorage** — lightweight browser persistence for confirmed events

## Project Structure

```text
app/
  api/
    extract/       # AI extraction route
    explain/       # AI action-plan route

components/
  OperationalInputPanel.tsx

lib/
  ai/              # OpenAI integration helpers
  domain/          # deterministic types, projection, and scoring

tests/
  domain/          # projection, scoring, and workflow tests

evals/
  extraction-cases.json

docs/
  architecture.md
  decisions/
```

## Running Locally

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Add your OpenAI API key:

```text
OPENAI_API_KEY=your_openai_api_key_here
```

Start the development server:

```bash
npm run dev
```

Open the app:

```text
http://localhost:3000
```

## Checks

Run tests:

```bash
npm test
```

Run lint:

```bash
npm run lint
```

Build the app:

```bash
npm run build
```

The GitHub Actions workflow runs tests, linting, and build checks automatically for pushes and pull requests targeting `main`.

## Eval Cases

Manual extraction eval cases live in:

```text
evals/extraction-cases.json
```

These cases help check extraction behavior when prompts, schemas, or model settings change.

## Design Principle

InventoryOps AI is built around a practical AI workflow pattern:

```text
Use AI to handle ambiguity.
Use application logic to control state.
```

The goal is to make AI useful inside an application without handing the model control over state, scoring, or business logic.
