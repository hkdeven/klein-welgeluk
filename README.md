# Klein Welgeluk — Build Diary App

A collaborative web application for managing house construction projects. Built with Next.js, Supabase, and Tailwind CSS.

## Quick Links

- **📖 Setup Guide:** `SETUP_GUIDE.md`
- **📋 Full Spec:** `Klein_Welgeluk_Developer_Spec.md`

## Features

- 👥 Multi-user collaboration (owners, architects, contractors, guests)
- 📄 Hierarchical page tree for building components
- 📊 Progress tracking with stages and milestones
- 💰 Costing details (hidden from guests)
- 📸 Photo galleries and carousel
- 📎 Document management and uploads
- 📅 Shared calendar with event types
- 💬 Threaded comments with @mentions
- 🔐 Role-based access control
- 🌐 Guest access with passcode

## Tech Stack

- **Frontend:** Next.js 14, React 18, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth, Storage)
- **Hosting:** Vercel
- **Domain:** kleinwelgeluk.co.za

## Development

```bash
# Install dependencies
npm install

# Create .env.local with Supabase keys
cp .env.example .env.local
# Edit .env.local with your actual keys

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                  # Pages & layouts
│   ├── login/           # Authentication
│   ├── page.tsx         # Home dashboard
│   ├── documents/       # Document library
│   ├── calendar/        # Calendar view
│   ├── profile/         # User profile
│   └── api/             # Backend API routes
├── components/          # Reusable components
│   ├── Sidebar.tsx
│   ├── Footer.tsx
│   └── ...
├── lib/                 # Utilities
│   └── supabase.ts      # Supabase client
└── globals.css          # Global styles
```

## First-Time Setup

1. Follow **SETUP_GUIDE.md** to:
   - Create a Supabase project
   - Set up the database schema
   - Add environment variables
   - Deploy to Vercel

2. Initial users are pre-seeded:
   - deven@hikesa.co.za (owner)
   - wtoerien@icloud.com (owner)
   - daniel@liyt-architects.co.za (collaborator)

3. Set a guest passcode via the admin panel

## Authentication

- **Collaborators:** Google OAuth, Microsoft OAuth, or Email/Password
- **Guests:** Passcode-based access (read-only, no comments/edits)

## Data Model

See the spec document for complete schema details:
- `pages` — Hierarchical page tree
- `stages` — Progress pipeline per page
- `specifications` — Key-value metadata
- `documents` — File uploads
- `photos` — Image galleries
- `comments` — Threaded discussions
- `calendar_events` — Project milestones
- `users` — Team members with roles
- `costing` — Financial tracking (owner-only)

## Deployment

Deployed on Vercel with automatic deployments from GitHub. See **SETUP_GUIDE.md** for step-by-step instructions.

## License

Private project for Klein Welgeluk.
