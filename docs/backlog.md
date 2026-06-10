# Delivery Backlog

## Epic 1: Mobilization And Architecture

- Confirm stakeholder priorities, success metrics, non-goals, and constraints from `docs/PRD.md`.
- Publish architecture blueprint covering frontend, backend, provider orchestration, data flow, and deployment assumptions.
- Scaffold npm-workspace monorepo for `frontend`, `backend`, and `shared` packages.
- Add baseline lint, typecheck, test, build, and dev scripts.
- Add CI skeleton running lint, typecheck, unit tests, and build.
- Publish local setup, contribution, ownership, and risk-register docs.

## Epic 2: Environment And Data Layer

- Add Docker Compose PostgreSQL with persistent volume and health checks.
- Create Prisma schema for users, conversations, provider credentials, messages, comparisons, and attachments.
- Add migrations, seed scripts, reset scripts, and CI migration validation.
- Wire NestJS Prisma module and DB-backed `/healthz`.

## Epic 3: Authentication And Access Control

- Implement registration, login, logout, JWT refresh, and token rotation.
- Add password hashing, password policy, and audit fields.
- Build responsive onboarding screens and protected app shell.
- Add auth E2E flows and token storage documentation.

## Epic 4: Conversation Orchestration

- Implement conversation CRUD and message submission APIs.
- Add provider abstraction, parallel dispatch, timeout handling, and failure isolation.
- Establish streaming transport and provider status events.
- Build responsive tri-column chat workspace.

## Epic 5: Structured Comparison

- Define comparison artifacts and classification heuristics.
- Generate agreements, disagreements, unique insights, hidden risks, and next investigations.
- Persist comparison results and expose retrieval APIs.
- Build analysis mode toggles and section-specific UI states.

## Epic 6: Persistence And Compression

- Add conversation list, search, rename, delete, resume, and pagination.
- Define compression thresholds and preservation rules.
- Implement compression worker with audit log, idempotency, and rollback safeguards.
- Add regression harness for compression fidelity.

## Epic 7: Attachments And Context Enrichment

- Choose object storage and implement secure upload endpoints.
- Parse PDF, DOCX, XLSX, CSV, and images into distilled context.
- Add worker retries, chunking, summarization, and status tracking.
- Inject distilled attachment content uniformly into every provider turn.

## Epic 8: Provider Configuration And Resilience

- Build encrypted credential CRUD and enable/disable toggles.
- Add provider health, quota checks, audit logs, and redacted observability.
- Continue conversations when one provider fails or quota expires.
- Document provider key management SOPs.

## Epic 9: Launch Readiness

- Define SLOs for streaming latency, provider fan-out, compression, and availability.
- Add load/soak tests, coverage gates, and regression suite expansion.
- Integrate error monitoring, correlation IDs, analytics, and alerting.
- Publish onboarding, support, pilot, and feedback-loop playbooks.
