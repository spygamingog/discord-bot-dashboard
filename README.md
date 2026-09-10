# Discord Bot Administrative Web Dashboard

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC.svg)](https://tailwindcss.com/)
[![NextAuth.js](https://img.shields.io/badge/Auth-NextAuth.js%20(Discord)-purple.svg)](https://next-auth.js.org/)
[![Supabase](https://img.shields.io/badge/Database-Supabase-emerald.svg)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Deployment-Vercel-black.svg)](https://vercel.com/)

A modern, high-aesthetic web control panel built with **Next.js 14 App Router**, **Tailwind CSS**, and **Discord OAuth2**, providing server administrators with knowledge base controls, live telemetry, and AI bot configuration.

---

## Key Features

- **Discord OAuth2 Login:** Direct authentication with Discord OAuth2; automatically inspects user guilds and filters permissions for `ADMINISTRATOR` or `MANAGE_GUILD` rights.
- **RAG Knowledge Base Browser:** Real-time visibility into indexed chunks, embedding status, and manual re-ingest triggers for GitHub and Modrinth releases.
- **Bot Telemetry Dashboard:** Live visualization of query volumes, average response latencies, and Groq vs. Gemini failover rates.
- **Guild Configuration:** Toggle features, adjust minimum similarity thresholds, and configure announcement channels.
- **Dark-Mode Native Aesthetic:** Handcrafted UI built with Tailwind CSS, subtle micro-animations, glassmorphism card surfaces, and accessible typography.

---

## Technical Specifications

| Parameter | Specification |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Authentication | NextAuth.js v4 with Discord Provider |
| Data Layer | Supabase JavaScript Client (`@supabase/supabase-js`) |
| Deployment | Vercel (Edge & Serverless) |

---

## Installation & Local Development

### 1. Prerequisites
- Node.js 20 or later
- Discord Application Client ID & Client Secret with redirect URI set to:
  `http://localhost:3000/api/auth/callback/discord`

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `NEXTAUTH_URL` | Canonical URL (`http://localhost:3000` for local dev) |
| `NEXTAUTH_SECRET` | Strong 32-character secret key for signing session JWTs |
| `DISCORD_CLIENT_ID` | Discord Application Client ID |
| `DISCORD_CLIENT_SECRET` | Discord Application Client Secret |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anonymous Public API key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Secret Key (used in server actions) |

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for Production
```bash
npm run build
npm run start
```

---

## Deployment to Vercel

1. Push this sub-project or monorepo to GitHub.
2. Import the project into the [Vercel Dashboard](https://vercel.com).
3. If deploying from a monorepo, set the Root Directory setting to `dashboard`.
4. Add all environment variables from `.env.local` to Vercel Project Settings.
5. In the Discord Developer Portal, add your production callback URL:
   `https://<your-vercel-domain>/api/auth/callback/discord`

---

## License

MIT License.
