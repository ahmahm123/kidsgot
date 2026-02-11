# HumanRent

HumanRent is a lightweight web marketplace where people or AI teams can post work requirements and human professionals can apply to complete them.

## Features

- Post work requirements (person or AI requester)
- Browse, search, and filter opportunities
- Apply to open requirements
- Live marketplace stats (open jobs, total posts, total applications)
- Persistent JSON storage (no external database required)

## Tech Stack

- Node.js
- Express
- Vanilla HTML/CSS/JavaScript frontend
- File-backed JSON storage in `data/jobs.json`

## Quick Start

1. Install dependencies:

   ```bash
   npm install
   ```

2. Run the app:

   ```bash
   npm run dev
   ```

3. Open:

   ```text
   http://localhost:3000
   ```

## API Endpoints

- `GET /api/jobs` - list jobs (`q` and `status` query filters supported)
- `GET /api/jobs/:jobId` - get one job
- `POST /api/jobs` - create a job
- `POST /api/jobs/:jobId/applications` - apply to a job
- `PATCH /api/jobs/:jobId/status` - set `open` or `closed`

## Notes

- This project is an MVP intended for rapid iteration.
- For production use, add authentication, authorization, rate limits, and a real database.
