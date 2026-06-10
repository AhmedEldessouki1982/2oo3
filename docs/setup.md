# Local Setup

## Prerequisites

- Node.js `20.19.0` or newer.
- npm `10.0.0` or newer.
- Git.
- Docker Desktop or Docker Engine with Compose v2 for local PostgreSQL.

Use the repository Node version when `nvm` is available:

```bash
nvm use
```

## Bootstrap

```bash
npm install
cp .env.example .env
npm run db:up
npm run db:migrate
npm run db:seed
npm run db:generate
npm run dev
```

The dev command starts:

- Backend: `http://localhost:3000/api`
- Swagger: `http://localhost:3000/docs`
- Frontend: `http://localhost:5173`
- Postgres: `localhost:5432` using the dev-only credentials in `.env.example`

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

## Database Commands

Start or stop the local PostgreSQL container:

```bash
npm run db:up
npm run db:down
```

Run Prisma locally after Postgres is healthy:

```bash
npm run db:migrate
npm run db:seed
npm run db:generate
```

Reset the local database and reapply seed data when you need a clean fixture set:

```bash
npm run db:reset
```

Inspect seeded data with Prisma Studio:

```bash
npm run db:studio
```

The seed creates a demo commissioning lead, provider credential placeholders for OpenAI/Anthropic/Google, a GT first fire and HRSG steam blow conversation, provider responses, comparison results, and an attachment record.

For CI and preview environments, use the deploy-safe migration command instead of creating a new local migration:

```bash
npm run db:migrate:deploy
```

## Environment Files

- Root `.env.example` lists the MVP environment contract and future placeholders.
- `frontend/.env.example` contains browser-exposed variables prefixed with `VITE_`.
- `backend/.env.example` contains backend-only variables.
- `DATABASE_URL` must point to the same Postgres instance used by Prisma and the NestJS health check.

Do not commit real `.env` files or secrets. The checked-in Postgres password and JWT/provider secret values are local placeholders only.

## Health Check

The backend readiness endpoint remains at `http://localhost:3000/api/healthz`. It runs `SELECT 1` through Prisma, returns API/database durations on success, and returns HTTP `503` with redacted database error details if connectivity fails.

## Known Audit Advisory

`npm audit --audit-level=moderate` currently reports `@hono/node-server <1.19.13` through Prisma CLI `7.8.0` -> `@prisma/dev`. The suggested `npm audit fix --force` downgrades Prisma to `6.19.3`, which is a breaking change for this Prisma 7 setup. Recheck when Prisma publishes a patched CLI release.

## Current Scaffold Boundaries

- The backend exposes a scaffold `/api` root endpoint and database-backed `/api/healthz` readiness endpoint.
- Prisma manages PostgreSQL migrations and development seed data.
- Auth, provider keys, streaming orchestration, comparison generation, compression, and attachment extraction are represented in architecture/backlog docs and implemented in later milestones.

## Troubleshooting

- If installs fail, verify `node --version` is at least `20.19.0`.
- If ports are busy, change `PORT`, `FRONTEND_PORT`, and `VITE_API_URL` in local env files.
- If Postgres port `5432` is busy, set `POSTGRES_PORT` in `.env` and update `DATABASE_URL` to match.
- If `npm run db:migrate` cannot connect, run `docker compose ps` and confirm the `postgres` service is healthy before retrying.
- If seeded data looks stale, run `npm run db:reset` and then inspect with `npm run db:studio`.
- If CI fails locally, run the exact root commands from the quality gate before debugging package-specific scripts.
