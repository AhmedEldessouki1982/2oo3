# Risk Register

| ID | Risk | Impact | Likelihood | Owner | Mitigation | Status |
| --- | --- | --- | --- | --- | --- | --- |
| R-001 | Providers receive non-identical prompt context, invalidating comparisons. | High | Medium | Backend | Centralize shared context builder, fingerprint every context envelope, test fan-out payload equality. | Open |
| R-002 | One provider outage blocks the full user turn. | High | Medium | Backend | Use parallel dispatch with per-provider timeouts, status isolation, and partial comparison generation. | Open |
| R-003 | Provider keys are exposed through logs, frontend payloads, or database compromise. | High | Medium | Backend/Security | Encrypt at rest, redact logs, never return secrets, add credential-event audit logs. | Open |
| R-004 | Context compression drops equipment identifiers, findings, assumptions, or attachment references. | High | Medium | Backend/Product | Define preservation rules, build regression harness, mark compressed timeline segments. | Open |
| R-005 | Attachment extraction produces inaccurate or uneven model context. | High | Medium | Backend/Product | Normalize extracted context once, inject uniformly, track source references and extraction confidence. | Open |
| R-006 | Tri-column streaming UI becomes unusable on mobile. | Medium | Medium | Frontend | Design mobile-first with stacked provider cards and mode switching; test at 375px. | Open |
| R-007 | Scope expands toward plant control or compliance recommendations. | High | Low | Product | Keep non-goals visible; UI copy frames output as investigation support, not control instruction. | Open |
| R-008 | CI does not represent local developer workflows. | Medium | Medium | Engineering | Keep `docs/setup.md`, root scripts, and CI commands aligned. | Open |
| R-009 | SME validation is delayed, causing late UX rework. | Medium | Medium | Product | Schedule commissioning SME review before comparison and compression UX hardening. | Open |
| R-010 | PostgreSQL/Prisma decisions block early frontend progress. | Medium | Low | Engineering | Maintain typed contracts in `shared` and mockable API seams while data layer is implemented. | Open |
