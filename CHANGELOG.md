# Changelog - Discord Bot Administrative Web Dashboard

All notable changes to the `dashboard` component will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] - 2026-09-09

### Added
- **Next.js 14 App Router Setup**: Initialized directory layout with React 18, Tailwind CSS, and NextAuth.js.
- **Dependency Manifest**: `package.json` specifying Next.js, NextAuth, Lucide React icons, Tailwind CSS, and Supabase client.
- **Environment Schema**: Created `.env.example` defining NextAuth secrets, Discord OAuth2 credentials, and Supabase database endpoints.
- **Documentation**: Self-contained `README.md` detailing Vercel deployment, OAuth2 callback configuration, and telemetry features.
- **Starter UI Surface**: `src/app/page.tsx` with dark-mode styling and status badge.
