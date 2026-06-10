# Contribution Guide

## Source Of Truth

- Product scope comes from `docs/PRD.md`.
- Delivery sequencing comes from `docs/tasks.md` and `docs/backlog.md`.
- Architecture decisions should update `docs/architecture.md` or add a focused ADR before implementation diverges.

## Local Quality Gate

Run this before opening a pull request:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Coding Standards

- TypeScript strict mode stays enabled in every package.
- Prefer small, direct functions until reuse is proven.
- Keep provider context construction centralized so all models receive identical context.
- Never log provider keys, uploaded document contents beyond explicit debug fixtures, JWTs, or encryption secrets.
- Validate API input with DTOs and `class-validator` before passing data into services.
- Keep frontend components mobile-first and preserve accessible labels, focus states, and loading states.
- Add tests with new business logic, provider orchestration rules, compression behavior, or security-sensitive code.

## Branching Strategy

- `main` or `master` is the protected trunk.
- Feature branches use `feature/<short-scope>`.
- Fix branches use `fix/<short-scope>`.
- Documentation-only branches use `docs/<short-scope>`.
- Keep branches focused on one milestone task or one coherent slice.

## Review SLAs

- Security-sensitive changes: two reviewers, target first review within one business day.
- Provider orchestration, auth, persistence, and compression changes: at least one backend reviewer and one product/SME reviewer when behavior changes.
- Frontend UX changes affecting commissioning workflows: at least one frontend reviewer and one product/SME reviewer.
- Documentation-only changes: one reviewer, target same business day.

## Code Ownership

Initial ownership is recorded in `.github/CODEOWNERS` with placeholder teams. Replace placeholder teams with real GitHub handles once maintainers are assigned.

## Pull Request Checklist

- Link the milestone task or backlog epic.
- Summarize behavior changes and any PRD assumptions made.
- Confirm lint, typecheck, tests, and build results.
- Include screenshots or recordings for visible frontend changes.
- Call out migrations, environment variables, secrets, or operational follow-up.
- Document any known tradeoffs or deferred work.
