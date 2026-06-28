# Klein Welgeluk — Setup & Deployment Guide

## Quick Start (You are here!)

Your Klein Welgeluk app is ready to deploy. Follow these steps to get it live today.

---

## Step 1: Create a Supabase Project (5 minutes)

1. Go to [supabase.com](https://supabase.com) and sign up/log in
2. Click **"New Project"**
3. Enter:
   - **Project Name:** klein-welgeluk
   - **Database Password:** (generate a strong one)
   - **Region:** Choose closest to South Africa (e.g., eu-west-1 or us-east-1)
4. Click **"Create new project"** and wait ~2 minutes for it to spin up
5. Go to **Settings → API** and copy:
   - `NEXT_PUBLIC_SUPABASE_URL` (the anon URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon public key)
   - `SUPABASE_SERVICE_ROLE_KEY` (service role key)

---

## Step 2: Set Up Supabase Database Schema (10 minutes)

1. In Supabase dashboard, go to **SQL Editor**
2. Click **"New Query"** and copy-paste the schema below into the editor
3. Click **"Run"** to execute

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'collaborator',
  trade TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Pages table (hierarchical)
CREATE TABLE pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  parent_id UUID REFERENCES pages(id) ON DELETE RESTRICT,
  sort_order INT DEFAULT 0,
  brief TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Stages table
CREATE TABLE stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  is_current BOOLEAN DEFAULT false,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Specifications table
CREATE TABLE specifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  value TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tags
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE page_tags (
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (page_id, tag_id)
);

-- Assignments (many-to-many)
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(page_id, user_id)
);

-- Documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  caption TEXT,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Photos
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  storage_path TEXT,
  external_url TEXT,
  caption TEXT,
  category TEXT DEFAULT 'inspiration',
  uploaded_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Carousel photos
CREATE TABLE carousel_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path TEXT NOT NULL,
  caption TEXT,
  sort_order INT DEFAULT 0,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Costing
CREATE TABLE costing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID UNIQUE NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  quote_received TEXT,
  budgeted_amount TEXT,
  actual_invoiced TEXT,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Comments
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Calendar events
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_time TIME,
  end_date DATE,
  event_type TEXT NOT NULL DEFAULT 'meeting',
  description TEXT,
  page_id UUID REFERENCES pages(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Guest passcode
CREATE TABLE guest_passcode (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passcode_hash TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert initial users (update emails to your project users)
INSERT INTO users (email, display_name, short_name, role) VALUES
('deven@hikesa.co.za', 'Deven Blackburn', 'Deven', 'owner'),
('wtoerien@icloud.com', 'Wernardt Toerien', 'Wernardt', 'owner'),
('daniel@liyt-architects.co.za', 'Daniel Robbins', 'Daniel', 'collaborator');

-- Insert page tree
INSERT INTO pages (title, slug, parent_id) VALUES
('Building', 'building', null),
('Services', 'services', null),
('Exterior', 'exterior', null);

-- Insert building sub-pages
WITH building_id AS (SELECT id FROM pages WHERE slug = 'building' LIMIT 1)
INSERT INTO pages (title, slug, parent_id) VALUES
('Bedrooms', 'building/bedrooms', (SELECT id FROM building_id)),
('Bathroom', 'building/bathroom', (SELECT id FROM building_id)),
('Kitchen', 'building/kitchen', (SELECT id FROM building_id)),
('Dining', 'building/dining', (SELECT id FROM building_id)),
('Living', 'building/living', (SELECT id FROM building_id)),
('Study', 'building/study', (SELECT id FROM building_id)),
('Loft', 'building/loft', (SELECT id FROM building_id));

-- Insert default stages for each page
WITH page_ids AS (
  SELECT id FROM pages WHERE parent_id IS NOT NULL
)
INSERT INTO stages (page_id, name, sort_order) 
SELECT id, 'Ideation', 0 FROM page_ids
UNION ALL
SELECT id, 'Architect handoff', 1 FROM page_ids
UNION ALL
SELECT id, 'Engineer review', 2 FROM page_ids
UNION ALL
SELECT id, 'Quoted', 3 FROM page_ids
UNION ALL
SELECT id, 'Finalised', 4 FROM page_ids;
```

4. Then create storage buckets:
   - Go to **Storage** in the left sidebar
   - Create three buckets: `documents`, `photos`, `avatars`
   - Set them to public (for now; we'll configure policies later)

---

## Step 3: Create Environment Variables

1. In your project root (`/Users/devenblackburn/Downloads/klein-welgeluk`), create `.env.local` file
2. Add the three values you copied from Supabase:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
NEXT_PUBLIC_SITE_URL=https://kleinwelgeluk.co.za
```

Replace with your actual keys from Supabase Settings → API.

---

## Step 4: Deploy to Vercel (5 minutes)

1. Push your code to GitHub:
   ```bash
   cd /Users/devenblackburn/Downloads/klein-welgeluk
   git init
   git add .
   git commit -m "Initial Klein Welgeluk commit"
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/klein-welgeluk.git
   git push -u origin main
   ```

2. Go to [vercel.com](https://vercel.com) and sign up with GitHub
3. Click **"Add New..."** → **"Project"**
4. Select your `klein-welgeluk` repository
5. Under **Environment Variables**, add all three from step 3:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL`
6. Click **"Deploy"**
7. Vercel will build and deploy. Wait ~2 minutes.
8. You'll get a deployment URL (e.g., `klein-welgeluk.vercel.app`)

---

## Step 5: Connect Your Domain

1. In Vercel project settings, go to **Domains**
2. Add `kleinwelgeluk.co.za`
3. Follow Vercel's DNS instructions (update nameservers or CNAME record with your domain registrar)
4. DNS propagation takes ~24 hours, but Vercel's preview URL works immediately

---

## Step 6: Set Up Authentication

1. In Supabase, go to **Authentication → Providers**
2. Enable:
   - **Google OAuth**: Add your credentials from Google Cloud Console
   - **Microsoft OAuth**: Add credentials from Azure
   - **Email/Password**: Toggle on

For OAuth setup help, see the spec document section 4.1.

---

## Step 7: Test the App

1. Visit your deployment URL (or `kleinwelgeluk.co.za` after DNS propagates)
2. Click **"Sign in"** and test Google OAuth
3. Create a guest passcode via the admin panel (coming in next phase)

---

## Current Status

✅ **Complete:**
- Next.js app structure with all pages
- Supabase integration setup
- Mock API routes (documents, calendar, pages, auth)
- Component library (Sidebar, Footer, Forms)
- Tailwind styling matching your design tokens

⏳ **Next Phase (integration):**
- Wire API routes to Supabase queries
- Implement real authentication with Supabase Auth
- Add file uploads to Supabase Storage
- Build admin panel for user invites & settings
- Add real-time comment subscriptions
- Email notifications for @mentions and invites

---

## Troubleshooting

**"Cannot find module '@supabase/supabase-js'"**
→ Run `npm install` in the project directory

**"Supabase URL is missing"**
→ Check `.env.local` has correct keys (no typos, no spaces)

**"Database connection refused"**
→ Make sure Supabase project finished spinning up (check dashboard)

**"CORS error"**
→ Supabase should auto-configure CORS. If not, add your Vercel domain to Supabase settings.

---

## Support

- **Spec details:** See `Klein_Welgeluk_Developer_Spec.md`
- **Supabase docs:** https://supabase.com/docs
- **Vercel docs:** https://vercel.com/docs
- **Next.js docs:** https://nextjs.org/docs

You're all set! 🚀
