# Local Setup

## Prerequisites

- Node.js `20.19.0` or newer.
- npm `10.0.0` or newer.
- Git.
- Docker is not required until Milestone 2.

Use the repository Node version when `nvm` is available:

```bash
nvm use
```

## Bootstrap

```bash
npm install
cp .env.example .env
npm run dev
```

The dev command starts:

- Backend: `http://localhost:3000/api`
- Swagger: `http://localhost:3000/docs`
- Frontend: `http://localhost:5173`

You can also run:

```bash
./dev.sh
```

## Workspace Commands

Run all workspaces:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Run one workspace:

```bash
npm run dev -w frontend
npm run start:dev -w backend
npm run build -w shared
```

## Environment Files

- Root `.env.example` lists the MVP environment contract and future placeholders.
- `frontend/.env.example` contains browser-exposed variables prefixed with `VITE_`.
- `backend/.env.example` contains backend-only variables.

Do not commit real `.env` files or secrets.

## Current Scaffold Boundaries

- The backend exposes a scaffold `/api` root endpoint and `/api/healthz` readiness endpoint.
- Database connectivity, Prisma migrations, and seed data begin in Milestone 2.
- Auth, provider keys, streaming orchestration, comparison generation, compression, and attachment extraction are represented in architecture/backlog docs and implemented in later milestones.

## Troubleshooting

- If installs fail, verify `node --version` is at least `20.19.0`.
- If ports are busy, change `PORT`, `FRONTEND_PORT`, and `VITE_API_URL` in local env files.
- If CI fails locally, run the exact root commands from the quality gate before debugging package-specific scripts.
