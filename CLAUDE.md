# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SmartTask is a full-stack task and staff management web application for Malay-language users. It has two portals: an Admin/Manager portal and a Staff portal. Key features include order management (Tempahan), staff leave tracking, and AI-powered task assignment via Google Gemini.

## Commands

### Backend (run inside `Backend/`)
```bash
npm install          # Install dependencies
node server.js       # Start Express server on port 5000
```

### Frontend (run inside `Frontend/`)
```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server (default port 5173)
npm run build        # Production build
npm run preview      # Preview production build
```

### Database
Run XAMPP with MySQL on port 3306, then seed the database:
```bash
# Execute these SQL files in order via phpMyAdmin or MySQL CLI:
# 1. Backend/database.sql   — creates orders table
# 2. Backend/setup_tables.sql — creates staff, leaves, users, tasks tables
```

## Environment Setup

The backend reads `C:\SmartTask\.env` (one level above `Backend/`):
```
DATABASE_URL="mysql://root:@localhost:3306/smarttask_db"
GEMINI_API_KEY=your_key_here
```

The `.env.example` file documents all required variables. The frontend hardcodes the backend URL as `http://localhost:5000`.

## Architecture

### Backend (`Backend/server.js`)
Single-file Express 5 app (~716 lines). All routes are defined directly in `server.js`. Database access goes through a MySQL connection pool in `Backend/db.js` (10 connections, XAMPP defaults: root/no password).

Key API namespaces:
- `/api/login` — unified login; returns role (`Manager`/`Staff`) for client-side routing
- `/api/orders`, `/api/staff`, `/api/leaves` — core CRUD resources
- `/api/tasks/board`, `/api/generate-schedule`, `/api/manager/auto-assign` — task assignment (round-robin and Gemini AI)
- `/api/dashboard/stats`, `/api/dashboard/audit-logs` — manager dashboard
- `/api/staff/*` — staff-facing endpoints (own tasks, leave requests, profile)
- `/api/manager/leaves` — manager leave approval

### Frontend (`Frontend/src/`)
React 18 SPA with React Router DOM 7. Routes split into two layouts:

- **Manager portal** — `<Layout>` wrapper (sidebar + topbar), pages under `src/pages/manager/`
- **Staff portal** — `<StaffLayout>` wrapper, pages under `src/pages/staff/`

`App.jsx` contains all route definitions. `<PrivateRoute>` guards check `localStorage['user']` (JSON with `id`, `role`, `username`, `staffId`).

### Authentication & Session
Login posts to `/api/login`, which validates the bcrypt hash and returns the user object. The client stores this in `localStorage['user']`. There is no server-side session — all auth state lives in the browser. Staff passwords are managed with bcrypt; the first time a manager account is created it goes in plain text; staff passwords set through the UI use bcrypt.

### AI Task Assignment
`POST /api/manager/auto-assign` calls the Gemini 2.5-Flash model with a prompt containing unassigned tasks and available staff (excluding those with approved leave). The model returns a JSON assignment plan which the backend then applies to the `tasks` table.

### Database Schema Summary
| Table   | Purpose |
|---------|---------|
| `users`  | Login credentials + role + is_active flag |
| `staff`  | Employee profile (name, job title, contact, `user_id` FK) |
| `orders` | Client orders (item, quantity, price, delivery info, status) |
| `tasks`  | Order-to-staff assignment (`order_id`, `assigned_staff_id`, status) |
| `leaves` | Leave requests (`staff_id`, date range, reason, approval status) |

## Conventions

- **Language:** All UI text, comments, and many variable names are in Bahasa Malaysia (Malay).
- **CSS:** Single global stylesheet `Frontend/src/smarttask.css`. Class naming follows BEM-like conventions (e.g. `kpi-card`, `badge--success`, `section-card`).
- **Icons:** Inline SVG — no external icon library.
- **No test suite** is configured yet.
- The `Backend/api/` folder contains legacy PHP files that are not used by the current Node.js backend.
