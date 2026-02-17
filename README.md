# Category-Weighted Short Video Feed (Windows + Mobile + API)

This repository contains:

1. **ASP.NET Core Web API** (`src/VideoFeed.Api`)  
   - JWT auth, EF Core + PostgreSQL schema, Redis-backed candidate caching, admin CRUD, moderation and feed endpoints.
2. **.NET MAUI app skeleton** (`src/VideoFeed.Mobile`)  
   - MVVM + DI with pages: Onboarding, Preferences, Feed, History, Settings.
3. **Unit tests** (`tests/VideoFeed.Tests`)  
   - Weighted feed selection logic tests (underserved boost + shortage fallback).

---

## Legal / Platform Compliance

- **No scraping** is implemented or expected.
- **YouTube** integration is designed around official YouTube Data API + official player/embed.
- **Instagram/Facebook** integration is designed around official Meta Graph API and only for permitted content (connected account/approved pages/sources).
- If required permissions are not configured, providers stay disabled and emit explicit warnings.

---

## Architecture

- Frontend: **.NET MAUI** (Android + iOS + Windows target frameworks), MVVM, DI
- Backend: **ASP.NET Core Web API**
- Storage: **PostgreSQL** (EF Core models + migration)
- Cache: **Redis** (candidate lists by platform/category/sub-area)

### Projects

```text
src/
  VideoFeed.Api/
    Program.cs
    DomainModels.cs
    Services.cs
    Controllers.cs
    Contracts.cs
    Migrations/202602170001_InitialCreate.cs
  VideoFeed.Mobile/
    VideoFeed.Mobile.csproj
    MauiProgram.cs
    App.cs
    AppShell.cs
    Models.cs
    Services.cs
    ViewModels.cs
    Pages.cs
tests/
  VideoFeed.Tests/
    FeedAlgorithmTests.cs
docker-compose.yml
```

---

## Quick Start

> Requires .NET 8+ SDK and MAUI workloads on your machine.

### 1) Start infra

```bash
docker compose up -d
```

This starts:
- PostgreSQL: `localhost:5432` (`video_feed` / `video_feed` / `video_feed`)
- Redis: `localhost:6379`

### 2) Backend API

```bash
cd src/VideoFeed.Api
dotnet restore
dotnet run
```

On startup:
- EF migration is applied
- Seed data is inserted if DB is empty (categories, sources, videos, users, preferences)

Seed users:
- Admin: `admin@local.dev` / `Admin123!`
- Demo: `demo@local.dev` / `Demo12345!`

### 3) MAUI app

```bash
cd src/VideoFeed.Mobile
dotnet restore
dotnet build
```

Run target examples:
- Windows: `dotnet build -f net8.0-windows10.0.19041.0`
- Android: `dotnet build -f net8.0-android`
- iOS: `dotnet build -f net8.0-ios`

> If API is unavailable or unauthorized, the mobile app client falls back to mock data so UI still works.

---

## Category Model (Top Categories + Sub-Areas)

The data model and UI include these exact top categories:

1. Learning & Brain Boosting
2. Creativity & Expression
3. Life Skills & Positive Growth
4. Comedy
5. Public Speaking
6. Sports
7. Business

Detailed sub-areas are included for the first 3 categories:

### A) Learning & Brain Boosting
- Math Fun - Easy tricks, puzzles, number games
- Science Experiments - Safe, simple home experiments
- Space & Planets - Stars, astronauts, solar system
- History Stories - Kid-friendly past events
- Geography & Countries - Maps, cultures, landmarks
- Reading & Storytime - Short stories, moral tales
- Spelling & Vocabulary - Word games
- Coding for Kids - Simple logic & beginner coding
- Robotics & STEM - Basic engineering fun
- Fun Facts - Amazing kid-safe facts

### B) Creativity & Expression
- Drawing & Art - Step-by-step drawing
- DIY Crafts - Paper crafts, creative builds
- Music & Singing - Songs, instruments
- Dance & Movement - Simple choreography
- Acting & Skits - Short role-play fun
- Photography Basics - Kid creativity with cameras
- Creative Writing - Short poem or story prompts
- Origami - Paper folding
- Magic Tricks (Safe) - Easy illusion tricks
- LEGO & Building - Building challenges

### C) Life Skills & Positive Growth
- Kindness & Good Manners - Respect & empathy
- Friendship Lessons - Sharing & teamwork
- Health & Hygiene - Brushing, eating healthy
- Mindfulness & Calm Time - Simple breathing exercises
- Problem Solving - Brain teasers
- Money Basics - Saving & understanding coins
- Safety Tips - Road safety, stranger safety
- Environmental Care - Recycling, saving water
- Sports Skills - Beginner techniques
- Animal & Wildlife - Cute animals + learning facts

---

## Feed Weighting Behavior (Rolling Window N=100)

Input:
- User category weights (must sum to 100; normalized deterministically if needed)
- `N = 100` rolling served window (default)
- `K = 10` repeat-creator avoidance window

Example target counts for N=100:
- Learning & Brain Boosting: 15
- Creativity & Expression: 20
- Life Skills & Positive Growth: 15
- Comedy: 15
- Public Speaking: 15
- Sports: 15
- Business: 5

For each candidate, score includes:

```text
score = base
      + underServedBoost
      - overServedPenalty
      - repeatCreatorPenalty
      - duplicatePenalty
      - blockedPenalty
      - subAreaPenalty
```

Selection updates rolling counters as items are picked.  
If a category has shortage, fill degrades to next best candidates and logs shortage warnings.

---

## Deterministic Categorization + Explainability

Two modes:

1. **Source-based**  
   Admin maps source (channel/page/account) -> topCategory + optional subArea.

2. **Content-based rules engine (deterministic MVP)**  
   Title/description/hashtags keywords map to category/sub-area.

Override:
- Admin can override a video category via `/admin/videos/override-category`.

Each video stores an `explain` payload (JSON), surfaced in feed as:
- mode (`sourceBased`, `contentBased`, `adminOverride`, etc.)
- reason
- matched keywords

---

## Data Model

Tables:
- `users`
- `user_preferences` (weights JSON + includedSubAreas JSON + blocked creators JSON)
- `sources` (platform, sourceId, topCategory, subArea, enabled, whitelisted)
- `videos` (metadata + topCategory + subArea + explain + sourceId)
- `feed_served` (rolling served history by user)
- `events_views`
- `reports`
- `categories`
- `video_category_overrides`

---

## API Endpoints

### Auth
- `POST /auth/register`
- `POST /auth/login`

### User
- `GET /users/preferences`
- `PUT /users/preferences`
- `GET /users/history?limit=50`

### Feed / Events / Moderation
- `GET /feed?limit=20`
- `POST /events/view`
- `POST /moderation/report`

### Admin
- CRUD ` /admin/sources`
- CRUD ` /admin/categories`
- CRUD ` /admin/videos/override-category`

---

## Adding Sources

Use `POST /admin/sources` with:
- `platform`: `youtube | instagram | facebook`
- `sourceId`: channel/page/account identifier
- `topCategory`
- `subArea` (required for educational categories)
- `enabled`
- `whitelisted`
- `accessMode` (`owned`, `approved-source`, etc.)

For Meta sources, only use sources/accounts your app is authorized to access via Graph API permissions.

---

## Provider Adapters

Interface:

```csharp
IVideoProvider.GetCandidatesAsync(ProviderQuery query, CancellationToken ct)
```

Implemented adapters:
- `MockVideoProvider`
- `YouTubeVideoProvider` (official API expected, disabled until configured)
- `MetaVideoProvider` (official Graph API expected, disabled until configured)

When permissions are missing, provider returns explicit disabled reason and no data.

---

## Testing

Unit tests are in `tests/VideoFeed.Tests` and cover:
- Underserved category prioritization.
- Graceful degradation when a category has shortage.

Run:

```bash
cd tests/VideoFeed.Tests
dotnet test
```

