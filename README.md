# CAT ERP - Internal Management System

A custom Enterprise Resource Planning (ERP) application developed for **CAT Consulting Office**. This system is designed to streamline day-to-day operations, including project tracking, financial flow management, client relationships, and automated PDF document generation (Quotes, Invoices, Contracts).

## 🚀 Tech Stack

- **Frontend:** React, Vite, TypeScript, Recharts (for Analytics), Framer Motion (Animations)
- **Backend:** Node.js, Express, TypeScript, Zod (Environment & API validation)
- **Database:** PostgreSQL with **Prisma ORM**
- **Authentication:** JWT (JSON Web Tokens), `otplib` (for 2FA/TOTP)
- **PDF Generation:** pdfmake

---

## 📦 Core Modules

- **Dashboard / Analytics:** Global KPI tracking, Monthly Revenue, Cashflow analysis.
- **Projects & Clients:** Full CRUD for client entities and connected projects.
- **Finances:** Live tracking of Invoices, Quotes, and Expenses. Visual operational margin calculation.
- **PDF Generator:** Dynamically generate industry-standard PDF invoices, quotes, and pre-written legal contracts (Prestation, Collaboration, Partnership).
- **Contacts & Collaborators:** Directory for external contacts and internal network tracking.
- **Missions & Calendar:** Scheduling tracking.

---

## 🔒 Security & Access

- **Role-Based Access Control (RBAC):** Users are assigned roles (e.g., `ADMIN`, `COLLABORATOR`). Administrators can grant explicit module-level permissions to standard collaborators.
- **Two-Factor Authentication (2FA):** 
  - Integrated Time-Based One-Time Password (TOTP) standard.
  - Highly secure and compatible with any industry-standard authenticator (Google Authenticator, Authy, Microsoft Authenticator, Apple Passwords).
  - Enforced globally for all SuperAdmin accounts to prevent unauthorized backend access.

---

## 🛠️ Getting Started

### Prerequisites
- [Node.js (LTS)](https://nodejs.org/)
- PostgreSQL (A `docker-compose.yml` is provided in the `backend/` directory for quick spin-ups).

### 1. Database Setup
If using Docker, start the database quickly:
```bash
cd backend
docker-compose up -d
```

### 2. Backend Setup
```bash
cd backend
npm install
```
- Copy `.env.example` to `.env` and fill out your PostgreSQL `DATABASE_URL` and `JWT_SECRET`.
- Run migrations and seed data:
```bash
npx prisma migrate dev
npm run seed
```
- Start the API server:
```bash
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The application will be accessible at `http://localhost:5173`.

---

## 🛡️ DevOps & Database Utilities

The backend contains built-in automated scripts to handle disaster recovery.

### Backup Database
Instantly dumps the active PostgreSQL database into a safe `.sql` file inside the `backups/` directory. It automatically logs file sizes and strictly retains the 10 most recent backups to prevent disk overflow.
```bash
cd backend
npm run db:backup
```

### Restore Database
Restore your system from a previous backup state.
- **List available backups:** Run `npm run db:restore` without arguments to see an interactive list of all valid restore points.
- **Execute restore:** Run `npm run db:restore backup-YYYY-MM-DD.sql`
*(Warning: This is a destructive action that overwrites the active database).*

---

*Custom developed by CAT Consulting Office IT.*
