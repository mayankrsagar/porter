# Porter Vite + React (converted)

This is a minimal Vite + React conversion of the provided Porter Clone frontend.

## Quick start

1. Install dependencies:
   npm install

2. Start dev server:
   npm run dev

3. The app expects the backend API at http://localhost:3000/api by default.
   To change it, create a `.env` file with `VITE_API_BASE_URL=https://your-api`.

## What I converted

- Single-page React app with routes: Dashboard, Fleet, Booking, Tracking.
- Core API calls moved to `src/services/api.js`.
- Tailwind CSS configured (postcss + tailwind).

This scaffold keeps the original backend routes compatible. Some UI behavior from the original `public/main.js` (like animations and live simulation) were simplified and can be reintroduced as components/hooks if you'd like.
