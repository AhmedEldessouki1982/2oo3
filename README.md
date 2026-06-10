# 2oo3

2oo3 is a multi-model engineering copilot for power plant commissioning teams. It runs ChatGPT, Claude, and Gemini under identical context, then surfaces agreements, disagreements, unique insights, hidden risks, and next investigations.

## Current Milestone

Milestone 1 establishes the architecture plan, contribution workflow, CI skeleton, and runnable frontend/backend/shared monorepo scaffold.

## Quick Start

```bash
nvm use
npm install
npm run dev
```

Frontend: `http://localhost:5173`

Backend API: `http://localhost:3000/api`

Swagger docs: `http://localhost:3000/docs`

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Documentation

- `docs/PRD.md` is the source of product scope.
- `docs/architecture.md` describes the target technical architecture.
- `docs/roadmap.md` maps delivery milestones and estimates.
- `docs/risks.md` tracks product, engineering, and security risks.
- `docs/contributing.md` defines standards, branching, ownership, and review SLAs.
- `docs/setup.md` documents local environment bootstrap.
- `docs/backlog.md` breaks milestones into delivery epics.
