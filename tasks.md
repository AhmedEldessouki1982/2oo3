# Project Milestones

## Milestone 1 – Program Mobilization & Architecture Alignment
- Objectives: validate PRD assumptions, align stakeholders on scope, and lock the target architecture and delivery plan.
- Key Deliverables: architecture blueprint spanning FE/BE/data, milestone roadmap with estimates, risk register, contribution guidelines, CI/CD pipeline stub, project setup docs.
- Exit Criteria: engineering and product sign off on plan; contributors can clone repo, run lint/tests, and boot FE/BE scaffolds locally.
- Tasks:
  - Facilitate product + engineering kickoff to confirm PRD priorities, success metrics, and constraints.
  - Draft and review system architecture diagrams covering frontend, backend, provider orchestration, and data flow.
  - Define coding standards, branching strategy, code owners, and review SLAs; publish contribution guide.
  - Scaffold monorepo structure (frontend, backend, shared packages) with baseline tooling and scripts.
  - Stand up CI pipeline skeleton (lint, typecheck, unit test jobs) running against sample commits.
  - Document local environment bootstrap (Node version, package managers, required CLIs) and add `.env.example` with placeholder secrets.
  - Build initial delivery backlog by breaking milestones into epics and sizing for cross-functional planning.

## Milestone 2 – Environment, Tooling & Data Layer Readiness
- Objectives: harden local/dev environments and connect NestJS services to a Prisma-managed PostgreSQL running in Docker.
- Key Deliverables: Docker Compose for Postgres, Prisma schema + migrations + seed scripts, `.env.example` with secrets policy, health-check endpoint wired to DB, automated migrate/reset scripts, observability hooks for DB connectivity.
- Exit Criteria: backend boots against Dockerized Postgres, migrations run cleanly in CI, and developers can inspect seeded data end-to-end.
- Tasks:
  - Create Docker Compose stack for Postgres with persistent volumes, health checks, and environment overrides.
  - Define foundational Prisma schema (users, conversations, provider credentials, attachments) and generate initial migration.
  - Implement Prisma migration/run scripts for local, CI, and preview environments; include reset convenience script.
  - Seed development database with representative commissioning content for manual QA.
  - Wire NestJS data module to Prisma client with connection pooling and lifecycle management.
  - Expose `/healthz` endpoint exercising DB connectivity and surface metrics/logging for query failures.
  - Update developer documentation covering database tooling, seeding, and troubleshooting flow.

## Milestone 3 – Authentication & Access Control Experience
- Objectives: deliver secure JWT-based auth with polished, responsive onboarding UX across desktop and mobile.
- Key Deliverables: user registration/login/logout flows, password policy + hashing, JWT issuance/refresh/rotation, protected NestJS guards/interceptors, responsive React auth pages with form validation, error handling, and loading states, UX copy tailored to commissioning users.
- Exit Criteria: a new user can self-register, log in/out, refresh tokens seamlessly, and access gated views on desktop, tablet, and mobile breakpoints.
- Tasks:
  - Finalize auth requirements (password policy, session lifetime, refresh cadence) and threat model.
  - Implement Prisma user model with unique email constraint, password hashing, and auditing fields.
  - Build NestJS auth module with registration and login endpoints, JWT issuance, refresh rotation, and logout handling.
  - Add Nest guards/interceptors enforcing authenticated access and propagating user context to downstream services.
  - Create responsive React pages for sign-up, login, forgot password (placeholder), and post-auth shell with mobile-first layouts.
  - Integrate client-side form validation, inline error feedback, and loading states consistent with shadcn/ui patterns.
  - Write E2E flows (Playwright/Cypress) covering registration, login, token refresh, and protected route access.
  - Document auth flows, token storage guidelines, and support runbooks for account access issues.

## Milestone 4 – Core Conversation Orchestration
- Objectives: enable end-to-end multi-model chat skeleton with shared context, streaming, and graceful degradation.
- Key Deliverables: conversation CRUD API, message/entity schema, provider abstraction with parallel dispatch, streaming transport (server-sent events or websockets), responsive tri-column chat UI, provider failure surfaces.
- Exit Criteria: authenticated user creates a conversation, sends prompts, and receives live streamed placeholder responses for each enabled provider without blocking failures.
- Tasks:
  - Design conversation and message data contracts aligning backend entities with frontend types.
  - Implement NestJS conversation controller/service for create/read/update/delete and message submission.
  - Build provider orchestration layer with parallel dispatch, timeout management, and failure resilience (retry/backoff stubs).
  - Establish streaming transport (SSE/WebSocket) delivering incremental provider responses to the frontend.
  - Create responsive chat workspace with tri-column layout, status indicators, and scrolling behavior for desktop/mobile.
  - Handle provider error states in UI with retry affordances and logging hooks.
  - Add integration tests verifying conversation lifecycle and provider fan-out/fan-in orchestration under success/failure scenarios.
  - Update developer docs covering conversation APIs and streaming expectations.

## Milestone 5 – Structured Comparison Engine
- Objectives: transform provider outputs into actionable comparison insights and multiple analysis modes.
- Key Deliverables: comparison service generating agreements, disagreements, unique insights, hidden risks, next investigations; persistence of comparison artifacts; UI panels for each section with status cues; mode toggles for Raw/Structured/Consensus/Conflict views.
- Exit Criteria: after every turn, users can switch modes and see populated comparison insights sourced from provider responses.
- Tasks:
  - Define comparison data model and heuristics for classifying agreements, disagreements, unique insights, and risks.
  - Implement backend comparison service that ingests provider responses and produces structured analysis artifacts.
  - Persist comparison results with linkage to messages and expose retrieval APIs.
  - Build frontend components rendering comparison sections with severity/status styling and UX micro-interactions.
  - Implement mode toggles switching between raw outputs, structured comparison, consensus view, and conflict analysis.
  - Add automated tests covering classification logic edge cases and API contracts.
  - Conduct UX review with commissioning SMEs to validate clarity and actionable presentation.

## Milestone 6 – Conversation Persistence & Context Compression
- Objectives: protect investigation history while staying within model context limits.
- Key Deliverables: conversation list/search/rename/delete APIs and UI, resumable timeline with compressed vs raw markers, automated compression pipeline preserving identifiers and attachment references, regression harness validating compression fidelity.
- Exit Criteria: users resume investigations with compressed memory that maintains critical technical facts and attachments across long sessions.
- Tasks:
  - Implement backend endpoints for listing, searching, renaming, deleting, and resuming conversations with pagination.
  - Build conversation dashboard UI with responsive cards/list views and search/filter interactions.
  - Design compression strategy (trigger thresholds, summarization rules) preserving identifiers and attachment references.
  - Develop compression worker/service with idempotency, audit logging, and rollback safeguards.
  - Annotate conversation timeline indicating compressed segments and allow expansion for review.
  - Create regression harness comparing pre/post compression to ensure critical facts persist.
  - Instrument telemetry capturing compression frequency, duration, and errors for observability.
  - Update documentation detailing compression policies and operational runbooks.

## Milestone 7 – Attachment Pipeline & Context Enrichment
- Objectives: support uploads, extraction, and uniform context injection across models.
- Key Deliverables: validated upload flow for PDF/DOCX/XLSX/CSV/images, extraction workers with retry/backoff, distilled context injection shared across providers, attachment catalog with reuse and preview, UI for uploads, notes, and web research inputs.
- Exit Criteria: adding documents or notes enriches subsequent turns for all providers, with traceable references in conversation history.
- Tasks:
  - Choose storage strategy (object storage/S3-compatible) and implement secure upload endpoints with size/type validation.
  - Integrate document parsing pipeline (e.g., LangChain/LlamaIndex services) to extract structured context from supported formats.
  - Implement background workers handling extraction, chunking, summarization, and error retries.
  - Inject distilled attachment content, user notes, and web research into shared context for all providers uniformly.
  - Build attachment management UI for upload, status tracking, previews, and reuse within conversations.
  - Enable tagging and referencing attachments within comparison outputs and message timeline.
  - Add automated tests for upload validation, extraction fidelity, and context injection consistency.
  - Update security guidance covering file handling, antivirus scanning, and retention policies.

## Milestone 8 – Provider Configuration & Resilience
- Objectives: empower users to manage provider keys securely and keep conversations resilient to provider volatility.
- Key Deliverables: encrypted API key vault, enable/disable toggles per provider, quota/failure notifications, audit logging, fallback behaviors when providers fail or quotas expire, documentation for secure key management.
- Exit Criteria: users manage their provider keys without exposing secrets; other providers continue operating when one degrades.
- Tasks:
  - Architect encryption-at-rest strategy leveraging KMS/secrets manager for provider credentials.
  - Build CRUD APIs for provider key add/update/remove and status checks with RBAC enforcement.
  - Create frontend settings experience for managing provider keys, toggles, and real-time status indicators.
  - Implement provider health monitoring, quota tracking, and alerting hooks surfaced to users and ops.
  - Add graceful degradation logic skipping failed providers while continuing comparison generation.
  - Record audit logs for credential events and provider failures with redacted payloads.
  - Perform security review/pen-test focused on credential handling and update docs with key management SOPs.

## Milestone 9 – Quality, Performance & Launch Readiness
- Objectives: assure reliability, performance, observability, and operational readiness for pilot rollout.
- Key Deliverables: load/performance tests for parallel dispatch/compression, automated regression suite, error monitoring + alerting, analytics instrumentation for adoption/engagement/value KPIs, security review checklist, onboarding guide, pilot launch playbook.
- Exit Criteria: platform meets performance SLOs, telemetry is live, and the team is prepared to onboard commissioning engineers.
- Tasks:
  - Define service-level objectives for latency, throughput, error budgets, and availability; align with stakeholders.
  - Build load and soak test scenarios covering provider fan-out, compression bursts, and attachment-heavy workflows.
  - Expand automated test suites (unit, integration, E2E) and enforce coverage thresholds in CI gates.
  - Integrate centralized error monitoring, logging correlation, and alerting workflows for on-call readiness.
  - Instrument analytics events for key adoption, engagement, and value metrics; validate dashboards and reporting cadence.
  - Conduct comprehensive security/privacy review, remediate findings, and finalize compliance checklist.
  - Produce onboarding materials, support playbooks, and pilot rollout plan including feedback loops and success criteria.
