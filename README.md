## CAT ERP

Custom ERP for CAT Consulting, with a separated **frontend** (React + Vite + TypeScript) and **backend** (Node.js + Express + TypeScript).

### Structure

- `frontend/` – SPA for invoices, contracts, and other ERP modules.
- `backend/` – REST API for invoices, contracts, and future ERP domains.

### Getting started (high level)

- Install Node.js (LTS).
- Frontend:
  - In `frontend/` run `npm install` then `npm run dev`.
- Backend (API + database layer):
  - In `backend/` run `npm install`.
  - Create a `.env` file from `.env.example`. If you do not have PostgreSQL yet, you can keep the default URL; the server will still start but DB calls will fail until Postgres is available.
  - When PostgreSQL is installed and running, run `npx prisma migrate dev` to create tables, then `npm run dev` to start the API.

### PostgreSQL (can be done later)

- A ready-to-use `docker-compose.yml` is provided in `backend/` to spin up PostgreSQL quickly.
- Prisma is configured in `backend/prisma/schema.prisma` with models for users, collaborators, partners, clients, projects, financial records (quotes/invoices), contracts, and missions.

### Documents

- The invoice layout is based on `QUO-1769116044739` (NovaPrime Management).
- Contract texts for prestation, collaboration, and partnership are embedded exactly as provided and can be exported as PDFs from the frontend.
