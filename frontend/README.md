# BoardMate Frontend

React + TypeScript + Tailwind CSS v4 (Vite).

## Run

1. Start the backend (`cd backend && npm run dev`, port 5000).
2. `cd frontend && npm install && npm run dev` and open http://localhost:5173.

In dev, Vite proxies `/api` to `http://localhost:5000`. For production set `VITE_API_URL` (e.g. `https://api.example.com/api/v1`).

## Structure

- `src/api.ts` – fetch client, response types, formatters
- `src/auth.tsx` – auth context (JWT in localStorage)
- `src/components.tsx` – layout, navbar, cards, `useApi` hook, icons
- `src/pages/` – Home, Listings, PropertyDetail, Auth (login/register), Dashboard (student / owner / admin), Notifications
