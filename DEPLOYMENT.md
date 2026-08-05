# Free Deployment Guide

This repository is ready for a low-cost/free deployment path:

- Frontend: Vercel
- Backend: Render (Docker)
- Database: Neon PostgreSQL free tier

Current target URLs:

- Frontend: https://hub-loan.vercel.app
- Backend: https://hubloan.onrender.com

## 1. Database

Create a free PostgreSQL database in Neon and copy the connection string.

Use it as:

- `ConnectionStrings__DefaultConnection` in the backend environment, or
- `DATABASE_URL` in the backend environment

Use the Neon connection string provided by you in the Render environment variable. Do not commit it to the repository.

## 2. Backend

The backend already:

- reads the connection string from configuration
- binds to `PORT` when present
- allows the frontend origin through `FRONTEND_ORIGIN`
- includes a Dockerfile at the repository root (`Dockerfile`)

Suggested environment variables:

- `ConnectionStrings__DefaultConnection`
- `DATABASE_URL` if you prefer the Neon URI format
- `FRONTEND_ORIGIN=https://hub-loan.vercel.app`
- `PORT=8080`

Suggested host:

- Render web service using the root `Dockerfile` with repository root as the build context

## 3. Frontend

The frontend already uses `VITE_API_BASE_URL`.

Suggested environment variables:

- `VITE_API_BASE_URL=https://hubloan.onrender.com/api`

Suggested host:

- Vercel

The file `frontend/vercel.json` keeps React Router routes working on refresh.

## 4. Order of deployment

1. Create the Neon database.
2. Deploy the backend using the root `Dockerfile` and copy the public backend URL.
3. Configure `VITE_API_BASE_URL` in the frontend.
4. Deploy the frontend.
5. Set `FRONTEND_ORIGIN` in the backend to `https://hub-loan.vercel.app`.

## 6. Values to paste

- Backend connection string: use the Neon URI you sent in the Render env vars as `ConnectionStrings__DefaultConnection` or `DATABASE_URL`.
- `FRONTEND_ORIGIN`: `https://hub-loan.vercel.app`
- `VITE_API_BASE_URL`: `https://hubloan.onrender.com/api`
- `PORT`: `8080`

## 5. Notes

- The app applies EF migrations on startup.
- Hangfire jobs run from the backend, so they stay active only while the backend service is running.
- If the free backend host sleeps, recurring jobs may pause until the service wakes up again.
