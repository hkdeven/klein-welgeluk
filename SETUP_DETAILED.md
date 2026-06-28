# Klein Welgeluk — EXACT Setup Instructions

Follow these **exact steps**. Every click is spelled out.

---

## PART 1: CREATE SUPABASE PROJECT

### Step 1.1: Sign Up for Supabase

1. Go to **https://supabase.com**
2. Click **"Start your project"** (top right button)
3. Click **"Sign up"**
4. Sign up with GitHub (easiest)
   - Click "Continue with GitHub"
   - Authorize Supabase
5. You're now logged in

### Step 1.2: Create a New Project

1. Click the **"New project"** button (top left, green button)
2. Fill in:
   - **Organization**: (should be pre-selected, click it)
   - **Project Name**: `klein-welgeluk`
   - **Database Password**: Create a strong one, save it somewhere (you won't need it again)
   - **Region**: Pick `eu-west-1` (Ireland, closest to South Africa) OR `us-east-1` (if you prefer)
3. Click **"Create new project"** button (green, bottom right)
4. **WAIT** — This takes 1-2 minutes. You'll see a spinning loader. Be patient.
5. When it's done, you'll see the Supabase dashboard

---

## PART 2: GET YOUR API KEYS

### Step 2.1: Open Settings

1. In the Supabase dashboard (left sidebar), find **"Settings"** at the very bottom
2. Click **"Settings"**
3. In the Settings menu, look for **"API"** in the left sidebar
4. Click **"API"**

### Step 2.2: Copy the Three Keys

You're now in the API section. You'll see several boxes with keys in them.

**Find these THREE and copy each one:**

#### Key 1: NEXT_PUBLIC_SUPABASE_URL
- Look for the section labeled **"Project URL"**
- It looks like: `https://xyzabc.supabase.co`
- Click the copy button (small icon) next to it
- Paste it into a notepad or text file for now

#### Key 2: NEXT_PUBLIC_SUPABASE_ANON_KEY
- Look for the section labeled **"anon public"**
- It's a long string starting with `eyJhbGciOi...`
- Click the copy button next to it
- Paste it into your notepad

#### Key 3: SUPABASE_SERVICE_ROLE_KEY
- Look for the section labeled **"service_role secret"**
- It's a long string (similar to Key 2, but different)
- Click the copy button next to it
- Paste it into your notepad

**You now have three keys saved.** ✅

---

## PART 3: CREATE THE .env.local FILE

### Step 3.1: Create the File

1. Open a text editor (Mac: TextEdit, or VS Code, or any text editor)
2. Create a new blank file
3. Copy-paste this exactly:

```
NEXT_PUBLIC_SUPABASE_URL=YOUR_URL_HERE
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE
NEXT_PUBLIC_SITE_URL=https://kleinwelgeluk.co.za
```

### Step 3.2: Fill in Your Keys

1. Replace `YOUR_URL_HERE` with the Project URL you copied (from Step 2.2, Key 1)
   - Example: `NEXT_PUBLIC_SUPABASE_URL=https://xyzabc.supabase.co`

2. Replace `YOUR_ANON_KEY_HERE` with the anon public key (from Step 2.2, Key 2)
   - Example: `NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...`

3. Replace `YOUR_SERVICE_ROLE_KEY_HERE` with the service_role secret (from Step 2.2, Key 3)
   - Example: `SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...`

4. Leave `NEXT_PUBLIC_SITE_URL=https://kleinwelgeluk.co.za` as is

### Step 3.3: Save the File

1. Save the file with the name: `.env.local`
   - **Important**: It starts with a DOT (.)
   - **Important**: No file extension
   - Location: Save it directly in `/Users/devenblackburn/Downloads/klein-welgeluk/`

2. Verify the file was created:
   - Open Finder
   - Go to `/Users/devenblackburn/Downloads/klein-welgeluk/`
   - Look for `.env.local` (might be hidden — press Cmd+Shift+. to show hidden files)

**You now have your config file.** ✅

---

## PART 4: SET UP THE DATABASE

### Step 4.1: Open SQL Editor in Supabase

1. Go back to Supabase (https://supabase.com)
2. Make sure you're in the `klein-welgeluk` project (top left should show the project name)
3. In the left sidebar, find **"SQL Editor"**
4. Click **"SQL Editor"**

### Step 4.2: Create a New Query

1. Click the **"New query"** button (or "+" icon)
2. You'll see a blank SQL editor

### Step 4.3: Paste the Database Schema

1. Copy the **entire SQL schema below** (all of it — it's long)
2. Paste it into the SQL editor
3. Click the **"Run"** button (or press Cmd+Enter)
4. Wait for it to complete — you'll see "Success!" or a checkmark

**SQL Schema to paste:**

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

-- Insert initial users
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

**Wait for the query to complete.** You should see all 13 tables created. ✅

---

## PART 5: CREATE STORAGE BUCKETS

### Step 5.1: Go to Storage

1. In Supabase sidebar, find **"Storage"**
2. Click **"Storage"**

### Step 5.2: Create Three Buckets

You need to create 3 buckets. Do this three times:

**First Bucket: `documents`**
1. Click **"Create a new bucket"** button
2. Name: `documents`
3. Uncheck "Private bucket" (make it public)
4. Click **"Create bucket"**

**Second Bucket: `photos`**
1. Click **"Create a new bucket"** button
2. Name: `photos`
3. Uncheck "Private bucket" (make it public)
4. Click **"Create bucket"**

**Third Bucket: `avatars`**
1. Click **"Create a new bucket"** button
2. Name: `avatars`
3. Uncheck "Private bucket" (make it public)
4. Click **"Create bucket"**

**You now have 3 storage buckets.** ✅

---

## PART 6: PUSH TO GITHUB

### Step 6.1: Create a GitHub Repository

1. Go to **https://github.com/new**
2. Fill in:
   - **Repository name**: `klein-welgeluk`
   - **Description**: (optional, you can leave blank)
   - **Public**: Yes (or private if you prefer)
3. Click **"Create repository"**
4. You'll see a page with commands. **Copy the commands shown.**

### Step 6.2: Open Terminal and Push Your Code

1. Open Terminal (Mac: Cmd+Space, type "Terminal", press Enter)
2. Navigate to your project:
   ```
   cd /Users/devenblackburn/Downloads/klein-welgeluk
   ```
3. Run these commands (copy-paste exactly):
   ```
   git init
   git add .
   git commit -m "Initial Klein Welgeluk commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/klein-welgeluk.git
   git push -u origin main
   ```
   Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username.

4. You might be asked to authenticate. Follow the prompts.

**Your code is now on GitHub.** ✅

---

## PART 7: DEPLOY TO VERCEL

### Step 7.1: Sign Up for Vercel

1. Go to **https://vercel.com**
2. Click **"Sign Up"**
3. Click **"Continue with GitHub"**
4. Authorize Vercel to access GitHub
5. You're now logged in to Vercel

### Step 7.2: Create a New Project

1. Click **"Add New..."** (top left)
2. Click **"Project"**
3. You'll see a list of your GitHub repos
4. Find **`klein-welgeluk`** and click **"Import"**

### Step 7.3: Add Environment Variables

1. You're now in the "Import Git Repository" screen
2. Scroll down to **"Environment Variables"**
3. Add four variables (one at a time):

**Variable 1:**
- Name: `NEXT_PUBLIC_SUPABASE_URL`
- Value: (paste your Project URL from Step 2.2, Key 1)
- Click "Add"

**Variable 2:**
- Name: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Value: (paste your Anon Public key from Step 2.2, Key 2)
- Click "Add"

**Variable 3:**
- Name: `SUPABASE_SERVICE_ROLE_KEY`
- Value: (paste your Service Role key from Step 2.2, Key 3)
- Click "Add"

**Variable 4:**
- Name: `NEXT_PUBLIC_SITE_URL`
- Value: `https://kleinwelgeluk.co.za`
- Click "Add"

### Step 7.4: Deploy

1. Click **"Deploy"** button (bottom right, blue button)
2. **WAIT** — This takes 2-3 minutes. You'll see logs.
3. When done, you'll see "Congratulations! Your project has been successfully deployed."
4. Click the preview URL to see your live site

**Your site is now live on Vercel!** ✅

---

## PART 8: CONNECT YOUR DOMAIN

### Step 8.1: Add Domain in Vercel

1. You're still on the Vercel project page
2. Go to **"Settings"** tab (top)
3. In left sidebar, find **"Domains"**
4. Click **"Domains"**
5. Click **"Add"** or **"Add Domain"**
6. Type: `kleinwelgeluk.co.za`
7. Click **"Add"**
8. You'll see instructions for updating DNS

### Step 8.2: Update DNS at Your Domain Registrar

The instructions from Vercel will tell you to either:
- **Option A**: Update nameservers (easier if supported)
- **Option B**: Add a CNAME record (if nameservers don't work)

Go to wherever you bought `kleinwelgeluk.co.za` and follow those instructions.

**DNS will propagate in 24 hours.** While waiting, use the Vercel preview URL. ✅

---

## DONE! 🎉

Your Klein Welgeluk site is now:
- ✅ Built and deployed to Vercel
- ✅ Connected to a Supabase database
- ✅ Live at `https://kleinwelgeluk.co.za` (or the Vercel preview URL immediately)

---

## Test It

1. Visit your site (Vercel URL or your domain after DNS propagates)
2. You should see the Klein Welgeluk login page
3. Click the sidebar links to navigate
4. Everything should work

---

## Troubleshooting

**"Cannot find module '@supabase/supabase-js'"**
→ This is already in your project. Should work automatically.

**"Supabase URL is missing"**
→ Check `.env.local` exists in the project folder with all three keys filled in correctly (no typos, no spaces)

**"Deployment failed"**
→ Check Vercel deployment logs. Usually it's a missing environment variable.

**"DNS not working after 24 hours"**
→ Try visiting the Vercel URL directly instead. Works immediately while DNS propagates.

---

That's it. You're done. Site is live. 🚀
