# Findsity — Campus Lost & Found Platform

**Lost it? Find it. Found it? Return it.** Findsity is a full-stack campus lost-and-found web app that takes a listing from *reported* to *returned* with automatic matching, secure ownership verification, and a transparent handover flow.

## Features

- **Report items** — lost or found, with category, brand/model/color, location, photos (multipart upload, up to 6), optional reward, and (for found items) private identifying features visible only to finder + admins.
- **Smart matching** — background token/Jaccard similarity matching between lost & found items (threshold 55). Possible matches appear on the lost item detail page; match notifications are pushed to both users.
- **Claims & verification** — claimants answer seeded verification questions plus free-form proof fields; each claim gets an auto-computed **risk label** (high risk → admin review required). Finders can approve, reject, or request more info; claims auto-escalate when a finder rejects and the claimant disputes.
- **Handover flow** — finder arranges pickup (location/date/time/notes), both sides confirm; item status moves `return_pending → returned`.
- **Admin console** — stats dashboard, charts (lost vs found, returns over time, categories, claim funnel), user suspension, item removal, claim review, report resolution, audit log.
- **Messaging & notifications** — per-item conversations with unread counts, in-app notifications for every event.
- **Auth & profile** — register/login (JWT), forgot/reset password (dev reset link in dev mode), avatar upload, bio.
- **Security** — bcrypt password hashing, rate limiting, helmet, CORS, zod validation, masked student IDs in public listings, ownership checks everywhere, soft deletes.

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite, Tailwind CSS v4, React Router v6, lucide-react, react-hot-toast
- **Backend:** Express + TypeScript (ESM), PGlite (embedded PostgreSQL) — set `DATABASE_URL` to use a real Postgres, multer, jsonwebtoken, zod
- **Monorepo:** npm workspaces-free layout with `backend/` and `frontend/` folders and root scripts

## Quick Start

```bash
npm install                 # root + backend + frontend
npm run db:seed             # schema + seed (admin + demo students)
npm run dev                 # backend :4000 + frontend :5173 (concurrently)
```

Then open http://localhost:5173.

### Demo accounts (password: `Password123`)

| Role    | Email                |
| ------- | -------------------- |
| Admin   | admin@findsity.edu   |
| Student | demo@findsity.edu    |
| Student | aarav@campus.edu     |
| Student | priya@campus.edu     |
| Student | kabir@campus.edu     |

### Commands

| Script              | What it does                                    |
| ------------------- | ----------------------------------------------- |
| `npm run dev`       | Runs backend + frontend dev servers             |
| `npm run db:seed`   | Applies schema and seeds demo data              |
| `npm run build:backend` | Type-checks the backend                      |
| `npm run build:frontend` | Type-checks + production-builds the frontend |
| `npm run start`     | Runs the built backend                          |

## Configuration

Copy `.env.example` to `backend/.env` (or set env vars):

- `PORT` — backend port (default `4000`)
- `DATABASE_URL` — Postgres connection string (optional; embedded PGlite used otherwise, data in `backend/data/`)
- `JWT_SECRET` — sign JWT tokens (dev fallback provided)
- `CLOUDINARY_URL` / `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` — optional; without them, uploads are stored locally under `backend/uploads/`
- `FRONTEND_URL` — CORS origin (default `http://localhost:5173`)

## API Overview (under `/api`)

- `POST /auth/register|login`, `GET /auth/me`, `PUT /auth/profile`, `POST /auth/forgot-password`, `POST /auth/reset-password`
- `GET|POST /items`, `GET /items/:id`, `PUT|DELETE /items/:id`, `GET /items/:id/matches`, `POST /items/:id/claims`
- `GET /claims/mine|finder`, `GET /claims/:id`, `POST /claims/:id/approve|reject|request-info|escalate`, `POST /claims/:id/handover`, `POST /claims/:id/handover/finder-confirm|claimant-confirm`
- `GET|POST /conversations`, `GET /conversations/:id[/messages]`, `POST /conversations/:id/messages`, `GET /conversations/unread-count`
- `GET /notifications`, `POST /reports`
- `GET /admin/stats|charts|users|items|claims|reports|actions`, `PATCH /admin/users/:id/status`, `DELETE /admin/items/:id`, `POST /admin/claims/:id/review`, `POST /admin/reports/:id/resolve`

An end-to-end journey test lives at `frontend/e2e-journey.ps1` (runs the whole flow against the dev stack via the Vite proxy).