# @humanrent/web

Next.js 14 web application for HumanRent marketplace.

## Commands

```bash
pnpm --filter @humanrent/web dev
pnpm --filter @humanrent/web build
pnpm --filter @humanrent/web lint
pnpm --filter @humanrent/web test
pnpm --filter @humanrent/web prisma generate
pnpm --filter @humanrent/web db:seed
```

## Fast local setup

From repo root:

```bash
pnpm setup:local
pnpm dev:web
```

## Required env

Copy `.env.example` to `.env.local` and configure:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- OAuth and Email provider credentials (optional but recommended)
- Stripe keys (`STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`)

If `DATABASE_URL` is missing, the homepage will still render with setup guidance, but marketplace data actions will require a running Postgres database.

## App features

- Human directory with skill/location/rate/availability filters
- Bounties listing and apply/accept flow
- Agent onboarding, API key management, MCP docs
- Conversations and messaging
- Stripe subscription + customer portal
- REST API + OpenAPI endpoint (`/api/openapi.json`)
