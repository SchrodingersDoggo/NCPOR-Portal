# NCPOR Polar Science Outreach Portal — SIH Project

## Stack
React (client) + Node/Express (server) + PostgreSQL + **Prisma ORM** + S3/MinIO (files) + Claude API (AI content generation)

## Project structure
```
ncpor-portal/
├── client/          # React app (to be scaffolded with Vite)
├── server/          # Express API — READY TO RUN
│   ├── prisma/
│   │   ├── schema.prisma        # source of truth for the DB schema
│   │   └── search-extension.sql # raw SQL for full-text search (Prisma can't generate this)
│   └── src/
│       ├── config/       # prisma.js (client singleton), applySearchExtension.js
│       ├── middleware/   # auth.middleware.js
│       └── routes/       # auth, content, ai
└── docs/
```

## Getting started (backend)

1. Install Postgres locally (or use Docker: `docker run --name ncpor-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres`)
2. Create the database: `createdb ncpor_portal`
3. ```bash
   cd server
   cp .env.example .env         # fill in DATABASE_URL + JWT_SECRET + ANTHROPIC_API_KEY
   npm install
   npm run prisma:migrate       # creates all tables from schema.prisma
   npm run db:search-setup      # adds full-text search (tsvector + trigger), run once after first migrate
   npm run dev                   # starts server on :5000
   ```
4. Test it: `curl http://localhost:5000/api/health`
5. Browse your DB visually anytime: `npm run prisma:studio`

### Why Prisma + one raw SQL file?
Prisma handles ~95% of the app (CRUD, relations, migrations, type safety) and is much faster to write than raw SQL. Postgres full-text search (`tsvector`/triggers) isn't something Prisma can generate, so that one piece lives in `prisma/search-extension.sql` and is applied once via `npm run db:search-setup`. The `content.routes.js` search endpoint uses `prisma.$queryRaw` just for that one query — everything else uses the normal Prisma client. Same pattern will apply later for PostGIS (map feature).

### When someone changes the schema
Edit `prisma/schema.prisma`, then run `npm run prisma:migrate` again (give it a new migration name when prompted). Everyone on the team pulls the migration files from git and runs the same command to stay in sync — no manually re-running SQL files.

## Getting started (frontend) — next step
```bash
cd client
npm create vite@latest . -- --template react
npm install
npm install axios react-router-dom
```

## What's built so far
- ✅ Full DB schema in Prisma (users, expeditions, content_items, ai_generations, tags, activities, social_posts)
- ✅ Auth (register/login with JWT + role-based access: admin / comms_officer / researcher / public)
- ✅ Content CRUD with draft → in_review → published workflow
- ✅ Full-text search (Postgres tsvector via raw query, everything else via Prisma client)
- ✅ AI generation endpoint (Claude API) — summaries, social captions, alt text, hashtags
- ✅ Human-edit endpoint for AI drafts (with version tracking)

## What's next (assign these to team members)
| Task | Owner | Notes |
|---|---|---|
| File upload (multer → S3/MinIO) | ? | `POST /api/content` currently expects a `file_url` — need actual upload endpoint |
| Expedition routes + PostGIS map data | ? | CRUD for `expeditions` table |
| React: Upload form + metadata UI | ? | Talks to `POST /api/content` |
| React: AI review/edit screen | ? | Talks to `POST /api/ai/generate` + `PATCH /api/ai/:id/edit` |
| React: Public site (browse/search) | ? | Talks to `GET /api/content` |
| Expedition map (Leaflet) | ? | Uses expeditions lat/lng |
| Seed data script | ? | 5-10 fake expeditions/reports for demo |
| Deployment | ? | Render/Railway for API+DB, Vercel for client |

## API quick reference
```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/content?type=report&search=glacier
POST   /api/content                    (auth required)
PATCH  /api/content/:id/status         (comms_officer/admin only)
GET    /api/content/:id
POST   /api/ai/generate                (auth required)
PATCH  /api/ai/:id/edit                (comms_officer/admin only)
PATCH  /api/ai/:id/publish             (comms_officer/admin only)
```
