# Ride Share Frontend — Setup

Production-ready React + Vite carpooling client.

## 1. Installation commands

```bash
cd frontend

# Fresh install (all dependencies)
npm install

# Or install stack individually
npm install react react-dom
npm install -D vite @vitejs/plugin-react
npm install -D tailwindcss postcss autoprefixer
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled
npm install react-router-dom axios @reduxjs/toolkit react-redux
npm install framer-motion react-hot-toast react-icons
npm install socket.io-client lucide-react
```

## 2. Environment

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | API prefix (default `/api/v1`, proxied in dev) |
| `VITE_APP_NAME` | App title |
| `VITE_GOOGLE_CLIENT_ID` | Google Sign-In client ID |
| `VITE_SOCKET_URL` | Socket.io URL (empty = same origin) |

## 3. Run

```bash
npm run dev    # http://localhost:3000
npm run build  # production bundle
npm run preview
```

Backend should run on port `5000` (Vite proxies `/api`).

## 4. Project structure

```
src/
├── api/                 # Axios instance, endpoints, services
├── app/
│   ├── providers/       # Redux, MUI, Router, Toast, Socket
│   └── router/          # Routes, ProtectedRoute, PublicRoute
├── components/
│   ├── common/          # LoadingScreen, PageTransition
│   ├── layouts/         # RootLayout, AuthLayout, MainLayout
│   └── ui/              # MUI + Tailwind composites
├── config/              # env.js
├── context/             # Socket (legacy Auth re-export)
├── features/            # Feature modules (auth, …)
├── hooks/               # useAuth
├── pages/               # Route page components
├── store/               # Redux Toolkit
├── theme/               # tokens.js + muiTheme.js
└── utils/
```

## 5. Key patterns

- **Theme**: `src/theme/tokens.js` → Tailwind + MUI
- **API**: `src/api/axios.js` + `auth.service.js`
- **Auth**: Redux `authSlice` + `useAuth()` hook
- **Routes**: Public (`/login`, …) vs protected (`/dashboard`, …)
