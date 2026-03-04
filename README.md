# HumanRent Monorepo

Production-style marketplace connecting AI agents to humans for real-world tasks.

## Stack

- **Frontend / Backend**: Next.js 14 App Router (TypeScript, Tailwind, shadcn-style UI)
- **Database**: Postgres + Prisma
- **Auth**: NextAuth (Google + Email magic link)
- **Payments**: Stripe subscription (`$9.99/mo Agent API Access`) + customer portal
- **Realtime messaging**: Pusher-ready (with polling fallback)
- **Storage**: S3-compatible presigned upload endpoint
- **MCP**: Node TypeScript package (`@humanrent/rentahuman-mcp`)

## Monorepo layout

```text
apps/
  web/                   # Next.js web + REST API + Prisma
packages/
  shared/                # Shared Zod schemas and types
  mcp-server/            # MCP server package
```

## Quick start (recommended)

```bash
pnpm install
pnpm setup:local
pnpm dev:web
```

`pnpm setup:local` will:

- create `apps/web/.env.local` if missing
- start Postgres via `docker-compose.yml` (when Docker is available)
- run Prisma generate + migrate + seed

## Run locally (step by step)

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy env template:

   ```bash
   cp apps/web/.env.example apps/web/.env.local
   ```

3. Start Postgres locally (example with Docker):

   ```bash
   docker run --name humanrent-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=humanrent -p 5432:5432 -d postgres:16
   ```

4. Set `DATABASE_URL` in `apps/web/.env.local`:

   ```text
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/humanrent?schema=public
   ```

5. Generate Prisma client and apply migration:

   ```bash
   pnpm --filter @humanrent/web prisma generate
   pnpm --filter @humanrent/web prisma migrate dev --name init
   ```

6. Seed database:

   ```bash
   pnpm --filter @humanrent/web db:seed
   ```

7. Start app:

   ```bash
   pnpm --filter @humanrent/web dev
   ```

8. (Optional) run MCP server:

   ```bash
   RENTAHUMAN_API_KEY=rah_your_key pnpm --filter @humanrent/rentahuman-mcp dev
   ```

## Verification commands

```bash
pnpm --filter @humanrent/web typecheck
pnpm --filter @humanrent/web lint
pnpm --filter @humanrent/web test
pnpm build
```

## Stripe test mode notes

- Create a recurring price in Stripe Dashboard and set `STRIPE_PRICE_ID`.
- Run webhook forwarding locally:

  ```bash
  stripe listen --forward-to localhost:3000/api/stripe/webhook
  ```

- Add the resulting webhook secret to `STRIPE_WEBHOOK_SECRET`.

## API docs

- REST docs page: `http://localhost:3000/api`
- OpenAPI JSON: `http://localhost:3000/api/openapi.json`

## Troubleshooting

- **500 with “Environment variable not found: DATABASE_URL”**
  - Run: `pnpm setup:local`
  - Or manually set `DATABASE_URL` in `apps/web/.env.local` to a running Postgres instance.
- **Docker is not installed**
  - Install Docker Desktop (or provide your own Postgres) and re-run `pnpm setup:local`.
