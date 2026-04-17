# QA Test Management (foundation)

Local-first QA workspace: **FastAPI** + **PostgreSQL** + **Next.js**, with Docker Compose for development.

## Foundation scope (implemented)

- **Authentication**: register, login, JWT bearer tokens, `/api/v1/auth/me`
- **RBAC**: per-project roles `admin` and `viewer` (membership table)
- **Projects**: auto codes `PRJ-001`, create/list/detail/update, archive
- **Workspace UI**: project switcher, overview, modules tree, team settings
- **Modules**: nested sub-modules (`parent_id`), tree API + flat list; create/update/delete (admin only)
- **Requirements**: codes `REQ-001` per project, module link, priority/status/tags, soft delete; many-to-many **test cases** via `PUT .../requirements/{id}/test-cases`
- **Test cases**: codes `TC-001` per project, full metadata, **structured steps** (`test_case_steps`), many-to-many **requirements**, duplicate endpoint, soft delete

## Quick start (Docker)

From the repo root:

```bash
docker compose up --build
```

- API: `http://localhost:8000` (docs: `/docs`)
- App: `http://localhost:3000`
- Postgres: `localhost:5432` (user/password/db: `qatm` / `qatm` / `qatm`)

Register a user in the UI, create a project (you become **admin**), then add modules or invite another registered user by email as **viewer**.

Set `SECRET_KEY` in the environment for anything beyond local dev (see `.env.example`).

## Local development without Docker

1. Start PostgreSQL and create database `qatm` (or point `DATABASE_URL` at your instance).
2. Backend:

   ```bash
   cd backend
   pip install -r requirements.txt
   set DATABASE_URL=postgresql+psycopg2://qatm:qatm@localhost:5432/qatm
   alembic upgrade head
   uvicorn app.main:app --reload --port 8000
   # Or: uvicorn main:app --reload --port 8000  (shim in backend/main.py)
   ```

3. Frontend:

   ```bash
   cd frontend
   npm install
   copy ..\\.env.example .env.local
   rem Set NEXT_PUBLIC_API_URL=http://localhost:8000
   npm run dev
   ```

## API outline

| Area | Base path |
|------|-----------|
| Auth | `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/auth/me` |
| Projects | `GET/POST /api/v1/projects`, `GET/PATCH /api/v1/projects/{id}` |
| Members | `GET/POST /api/v1/projects/{id}/members`, `PATCH .../members/{user_id}` |
| Modules | `GET .../modules`, `GET .../modules/tree`, `POST/PATCH/DELETE .../modules/{module_id}` |
| Requirements | `GET/POST .../requirements`, `GET/PATCH/DELETE .../requirements/{id}`, `PUT .../requirements/{id}/test-cases` |
| Test cases | `GET/POST .../test-cases`, `GET/PATCH/DELETE .../test-cases/{id}`, `POST .../test-cases/{id}/duplicate` |

Apply migrations after pulling: `cd backend && alembic upgrade head` (requires Postgres from Docker or local instance).

Send `Authorization: Bearer <token>` on protected routes.

## Layout

- `backend/` — FastAPI app (`app/`), Alembic migrations (`alembic/`)
- `frontend/` — Next.js App Router (`src/app/`)
- `docker-compose.yml` — `db`, `api`, `web`
