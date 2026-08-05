# Free Deployment Guide

This repository is ready for a low-cost/free deployment path:

- Frontend: Vercel
- Backend: Render (Docker)
- Database: Neon PostgreSQL free tier

## 1. Database

Create a free PostgreSQL database in Neon and copy the connection string.

Use it as:

- `ConnectionStrings__DefaultConnection` in the backend environment

## 2. Backend

The backend already:

- reads the connection string from configuration
- binds to `PORT` when present
- allows the frontend origin through `FRONTEND_ORIGIN`
- includes a Dockerfile at `CreditoSimulador.App/Dockerfile`

Suggested environment variables:

- `ConnectionStrings__DefaultConnection`
- `FRONTEND_ORIGIN`
- `PORT=8080`

Suggested host:

- Render web service using the Dockerfile

## 3. Frontend

The frontend already uses `VITE_API_BASE_URL`.

Suggested environment variables:

- `VITE_API_BASE_URL=https://your-backend-domain/api`

Suggested host:

- Vercel

The file `frontend/vercel.json` keeps React Router routes working on refresh.

## 4. Order of deployment

1. Create the Neon database.
2. Deploy the backend and copy the public backend URL.
3. Configure `VITE_API_BASE_URL` in the frontend.
4. Deploy the frontend.
5. Set `FRONTEND_ORIGIN` in the backend to the deployed frontend URL.

## 5. Notes

- The app applies EF migrations on startup.
- Hangfire jobs run from the backend, so they stay active only while the backend service is running.
- If the free backend host sleeps, recurring jobs may pause until the service wakes up again.
