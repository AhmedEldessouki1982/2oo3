# Milestone Roadmap

Estimates are planning ranges for cross-functional sequencing. They should be recalibrated after Milestone 1 stakeholder sign-off.

| Milestone | Target Duration | Primary Outcome | Dependencies |
| --- | --- | --- | --- |
| 1. Program Mobilization & Architecture Alignment | 1 week | Architecture, contribution model, CI stub, and runnable scaffolds. | PRD alignment |
| 2. Environment, Tooling & Data Layer Readiness | 1 week | Dockerized PostgreSQL, Prisma schema/migrations, seeded data, DB health. | Milestone 1 |
| 3. Authentication & Access Control Experience | 1-2 weeks | JWT auth, secure onboarding UX, protected routes, E2E coverage. | Milestone 2 |
| 4. Core Conversation Orchestration | 2 weeks | Conversation CRUD, parallel provider abstraction, streaming placeholder UI. | Milestone 3 |
| 5. Structured Comparison Engine | 1-2 weeks | Persisted comparison artifacts and analysis mode UI. | Milestone 4 |
| 6. Conversation Persistence & Context Compression | 1-2 weeks | Search/resume UX and compression pipeline preserving critical facts. | Milestones 4-5 |
| 7. Attachment Pipeline & Context Enrichment | 2 weeks | Uploads, extraction workers, previews, and uniform context injection. | Milestones 2, 4, 6 |
| 8. Provider Configuration & Resilience | 1-2 weeks | Encrypted provider keys, toggles, quota/failure handling, audit logs. | Milestones 3-4 |
| 9. Quality, Performance & Launch Readiness | 1-2 weeks | SLOs, monitoring, performance tests, security review, pilot playbook. | Milestones 1-8 |

## Planning Assumptions

- One product lead, one commissioning SME, one frontend engineer, one backend engineer, and one QA/automation owner are available part-time or better.
- Provider APIs are available through user-supplied keys and do not require enterprise procurement for MVP validation.
- The MVP remains scoped to investigation support and avoids direct DCS/SCADA integration.
- Attachment processing can start with local/S3-compatible object storage before hardening retention and antivirus controls.

## Milestone 1 Exit Review

Sign-off should confirm:

- PRD priorities and non-goals remain accurate.
- Architecture supports identical shared context and provider failure isolation.
- Contributors can clone, install, lint, typecheck, test, build, and boot the frontend/backend scaffolds.
- Risks, review ownership, and delivery epics are visible to the team.
