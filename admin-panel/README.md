# Ride Share Admin Panel

Separate Vite app for the **singleton platform admin** (no public registration).

## Credentials (seeded on backend start)

- **Email:** `admin@gmail.com`
- **Password:** `admin123`

Override via backend `.env`:

```env
ADMIN_EMAIL=admin@gmail.com
ADMIN_PASSWORD=admin123
ADMIN_JWT_SECRET=your_admin_secret
```

## Run

1. Start backend: `cd backend && npm run dev`
2. Install & run admin UI:

```bash
cd admin-panel
npm install
npm run dev
```

Open **http://localhost:5174**

## Stack

- React 18 + Vite
- Tailwind CSS + Material UI
- Redux Toolkit
- Recharts
- Socket.io (admin realtime room)

## API base

Proxied to `http://localhost:5000/api/v1` — all routes under `/admin/*` require admin JWT.
