# p2p-simulator

Standalone backend for an AI-powered Procure-to-Pay (P2P) platform. See `CLAUDE.md` for the
full architecture, workflow, and coding rules.

## Stack

Node.js, TypeScript, Express, PostgreSQL (Prisma), Redis (BullMQ), Zod, Gemini API, Cloudinary.

## Setup

```bash
pnpm install
cp .env.example .env   # fill in DATABASE_URL, CLOUDINARY_*, GEMINI_API_KEY, etc.
docker compose up -d redis
pnpm run dev            # API server on http://localhost:4000
pnpm run dev:worker      # worker process (separate terminal)
```

## Scripts

| Script | Purpose |
| --- | --- |
| `pnpm run dev` | API server with hot reload (`tsx watch`) |
| `pnpm run dev:worker` | Worker process with hot reload |
| `pnpm run dev:all` | Both, in parallel |
| `pnpm run build` | Compile to `dist/` |
| `pnpm start` / `pnpm run start:worker` | Run compiled output |
| `pnpm run typecheck` | `tsc --noEmit` |
| `pnpm run lint` / `pnpm run lint:fix` | Biome |
| `pnpm test` / `pnpm run test:watch` | Vitest |
| `pnpm run prisma:generate` / `:migrate` / `:seed` / `:studio` | Prisma CLI shortcuts |

## Health checks

- `GET /health` — liveness, always 200, no dependency calls.
- `GET /ready` — readiness, checks Postgres + Redis, returns 503 if either is unreachable.

## Auth (MVP)

There is no real authentication yet. `src/middleware/auth.ts` attaches a fixed
`DEV_ORGANIZATION_ID` / `DEV_USER_ID` (from `.env`) to every `/api/v1` request as `req.auth`, so
tenant-scoped queries can be written now and Clerk can be dropped in later without touching
controllers or services.
