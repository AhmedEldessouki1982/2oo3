# 2oo3

2oo3 is a multi-model engineering copilot for power plant commissioning teams. It runs ChatGPT, Claude, and Gemini under identical context, then surfaces agreements, disagreements, unique insights, hidden risks, and next investigations.

## Current Milestone

Milestone 3 adds JWT authentication — register, login, refresh, logout, and a `/auth/me` endpoint. Demo credentials: `lead.commissioning@example.com` / `DemoPass1!`. See `docs/auth.md`.

## Quick Start

```bash
nvm use
npm install
npm run db:up
npm run db:migrate
npm run db:seed
npm run db:generate
npm run dev
```

Frontend: `http://localhost:5173`

Backend API: `http://localhost:3000/api`

Swagger docs: `http://localhost:3000/docs`

Prisma Studio: `npm run db:studio`

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm audit --audit-level=moderate
```

`npm audit --audit-level=moderate` currently reports a Prisma CLI transitive `@hono/node-server` advisory; see `docs/setup.md` for the tracking note.

## Documentation

- `docs/PRD.md` is the source of product scope.
- `docs/architecture.md` describes the target technical architecture.
- `docs/roadmap.md` maps delivery milestones and estimates.
- `docs/risks.md` tracks product, engineering, and security risks.
- `docs/contributing.md` defines standards, branching, ownership, and review SLAs.
- `docs/setup.md` documents local environment bootstrap.
- `docs/backlog.md` breaks milestones into delivery epics.
