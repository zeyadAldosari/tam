Simple task app built with a NestJS API (Prisma + PostgreSQL) and a Vue 3 + Vuetify frontend. The API lives under `/api`, and the backend can serve the built frontend files.

## Requirements
- Node.js 20+ and npm if you run it without Docker
- Docker and Docker Compose (optional, easiest way)
- Copy `.env.example` to `.env` and fill `DATABASE_*`, `DATABASE_URL`, and `JWT_SECRET` (place it in the repo root and/or `backend/.env` for local runs)

## Run with Docker (quick start)
1) `cp .env.example .env` and set the database values (keep them in sync inside `DATABASE_URL`).
2) `docker compose up --build`
3) App is at http://localhost:3000 (API under `/api`); Postgres is on port 5432.

## Run locally without Docker
1) Start a PostgreSQL instance and create the database from your `.env` values.
2) Install dependencies:
```
cd backend && npm install
cd ../frontend && npm install
```
3) Copy `.env.example` to `.env`, update the values, and ensure the backend can read them.
4) From `backend`: `npx prisma migrate dev` to create tables.
5) Start the backend: `npm run start:dev` (listens on PORT or 3000, API under `/api`).
6) Start the frontend: in `frontend` run `npm run dev` (http://localhost:5173). Set `VITE_API_URL` to your API (`http://localhost:3000/api`) if needed.
7) To serve the built UI from the backend: in `frontend` run `npm run build`, then copy `frontend/dist` into `backend/frontend` (e.g., `cp -r dist ../backend/frontend`).

## Helpful commands
- Backend build: `npm run build`
- Backend tests: `npm run test`
- Frontend build: `npm run build`
- Stop containers: `docker compose down` (add `-v` to drop the database volume)
