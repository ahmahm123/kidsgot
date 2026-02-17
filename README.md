# Rent-a-Human for Agents MVP

## Stack
- Backend: NestJS + Prisma + PostgreSQL + Redis + BullMQ
- Frontend: Next.js + Tailwind
- Payments: mock escrow lifecycle

## Run locally (dev)
```bash
cd backend && npm install && cp .env.example .env && npm run prisma:generate && npm run prisma:migrate && npm run prisma:seed && npm run start:dev
cd frontend && npm install && npm run dev
```

## Run with Docker Compose
```bash
docker compose up --build
```
- Backend: http://localhost:3000
- Swagger: http://localhost:3000/docs
- Frontend: http://localhost:3001

## Database
- Prisma schema: `backend/prisma/schema.prisma`
- Migration: `backend/prisma/migrations/20260101000000_init/migration.sql`
- Seed: `backend/prisma/seed.ts`

## Example API calls
```bash
curl -X POST http://localhost:3000/auth/register -H 'Content-Type: application/json' -d '{"email":"worker@demo.com","password":"worker123"}'

curl -X POST http://localhost:3000/auth/login -H 'Content-Type: application/json' -d '{"email":"anna@demo.com","password":"worker123"}'

curl -X GET 'http://localhost:3000/agent/humans/search?skills=photography&city=Berlin' -H 'X-API-Key: <AGENT_API_KEY>'

curl -X POST http://localhost:3000/agent/tasks -H 'X-API-Key: <AGENT_API_KEY>' -H 'Content-Type: application/json' -d '{"title":"Store check","description":"Take shelf photos","requiredSkills":["photography"],"city":"Berlin","country":"DE","deadline":"2026-12-20T10:00:00.000Z","budget":40,"acceptanceCriteria":"3 clear photos"}'
```

## Notes
- Email verification token and mock email notifications are printed to backend console.
- API keys are hashed at rest; raw key only returned once.
- Uploads are stored in `backend/uploads` and served under `/uploads/*`.
- Task lifecycle enforced by state machine service.
