# Supabase Setup — Exact, Granular Instructions

Follow **every single step**. Do not skip anything.

---

## PART 1: CREATE SUPABASE PROJECT (If you haven't already)

### 1.1: Go to Supabase

1. Open a web browser (Chrome, Safari, Firefox)
2. Go to: **https://supabase.com**
3. Look at the top-right corner
4. You should see either:
   - A green button that says **"Start your project"** — click it
   - OR you're already logged in, skip to **1.2**

5. If you see a login screen:
   - Click **"Sign up"**
   - Click **"Continue with GitHub"**
   - Authorize Supabase
   - You're now logged in

### 1.2: Create a New Project

1. You should be on the Supabase dashboard
2. Look at the top-left area
3. You should see your organization name
4. Look for a green button or link that says **"New Project"** or **"Create a new project"**
5. Click it

6. A form appears. Fill in:
   - **Organization**: Should already be selected (your org name)
   - **Project Name**: Type exactly: `klein-welgeluk`
   - **Database Password**: Create a strong password. Write it down but you won't need it again
   - **Region**: Click the dropdown and select **`Europe (Ireland) eu-west-1`**

7. Click the green **"Create new project"** button (bottom right)

8. **WAIT 1-2 MINUTES** — You'll see a loading spinner. Be patient. Do not close the page.

9. When done, you'll see a dashboard with "Project: klein-welgeluk" at the top

**You now have a Supabase project.** ✅

---

## PART 2: RUN THE DATABASE SCHEMA

### 2.1: Open SQL Editor

1. You're on the Supabase dashboard
2. Look at the LEFT SIDEBAR (dark area on the left)
3. Find **"SQL Editor"** in the sidebar
4. Click **"SQL Editor"**

5. You'll see a blank code editor in the middle

### 2.2: Paste the Schema SQL

1. Copy the entire SQL code below (all of it — it's very long)

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

2. In the SQL editor (the white text area in the middle), click to position your cursor
3. Select all text currently there (Cmd+A)
4. Delete it
5. Paste the SQL code you copied (Cmd+V)

### 2.3: Run the SQL

1. Look at the top-right of the SQL editor
2. You should see a blue button that says **"Run"** or has a play icon (▶️)
3. Click it
4. **WAIT** — The SQL will execute. You'll see messages at the bottom
5. Look for **"Success"** or checkmarks next to each statement
6. If you see red errors, something went wrong. Take a screenshot and tell me.

**If no errors: Your database tables are created.** ✅

---

## PART 3: CREATE STORAGE BUCKETS

### 3.1: Go to Storage

1. You're still on the Supabase dashboard
2. Look at the LEFT SIDEBAR
3. Find **"Storage"** (it's below "SQL Editor")
4. Click **"Storage"**

5. You'll see an empty storage area with a button that says **"Create a new bucket"** or **"+"**

### 3.2: Create Bucket #1: `documents`

1. Click **"Create a new bucket"**
2. A dialog appears with a text field
3. Type exactly: `documents`
4. Look for a checkbox that says **"Private bucket"** — UNCHECK it (make it public)
5. Click **"Create bucket"**
6. You should see `documents` listed in the buckets

### 3.3: Create Bucket #2: `photos`

1. Click **"Create a new bucket"** again
2. Type exactly: `photos`
3. UNCHECK **"Private bucket"**
4. Click **"Create bucket"**

### 3.4: Create Bucket #3: `avatars`

1. Click **"Create a new bucket"** again
2. Type exactly: `avatars`
3. UNCHECK **"Private bucket"**
4. Click **"Create bucket"**

**You now have 3 storage buckets.** ✅

---

## PART 4: GET YOUR API KEYS

### 4.1: Go to Settings

1. You're on the Supabase dashboard
2. Look at the LEFT SIDEBAR
3. Scroll down to the very bottom
4. Find **"Settings"** (it's at the bottom)
5. Click **"Settings"**

### 4.2: Go to API Section

1. You're now in Settings
2. Look at the LEFT SIDEBAR within Settings
3. Find **"API"**
4. Click **"API"**

5. You'll see several sections with keys

### 4.3: Copy the Three Keys

You're looking for three specific keys. Find each one and copy it.

#### KEY #1: Project URL

1. Look for a section labeled **"Project URL"** or **"YOUR_API_URL"**
2. You'll see a URL that looks like: `https://xyzabc.supabase.co`
3. Click the copy button (small icon to the right of the URL)
4. **Save this somewhere** — paste it in a text file named `keys.txt` on your desktop

#### KEY #2: anon public key

1. Look for **"anon public"** or **"ANON_KEY"**
2. It's a very long string starting with `eyJhbGciOi...`
3. Click the copy button next to it
4. Paste it into your `keys.txt` file

#### KEY #3: service_role secret

1. Look for **"service_role secret"** or **"SERVICE_ROLE_KEY"**
2. It's another long string
3. Click the copy button next to it
4. Paste it into your `keys.txt` file

**You now have your 3 keys saved.** ✅

---

## PART 5: ADD KEYS TO NETLIFY

### 5.1: Go to Netlify

1. Go to **https://app.netlify.com**
2. Find your `klein-welgeluk` site
3. Click on it

### 5.2: Go to Environment Variables

1. Click the **"Site settings"** tab (or button at top)
2. Look for **"Build & deploy"** in the left menu
3. Click **"Build & deploy"**
4. Look for **"Environment"** or **"Environment variables"**
5. Click **"Environment"**

### 5.3: Add Four Environment Variables

You need to add **4 variables**. Do this one at a time:

#### Variable 1: NEXT_PUBLIC_SUPABASE_URL

1. Click **"Add variable"** or **"Edit variables"**
2. In the **"Key"** field, type: `NEXT_PUBLIC_SUPABASE_URL`
3. In the **"Value"** field, paste the Project URL from your keys.txt
4. Click **"Save"**

#### Variable 2: NEXT_PUBLIC_SUPABASE_ANON_KEY

1. Click **"Add variable"** again
2. Key: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Value: Paste the anon public key from keys.txt
4. Click **"Save"**

#### Variable 3: SUPABASE_SERVICE_ROLE_KEY

1. Click **"Add variable"** again
2. Key: `SUPABASE_SERVICE_ROLE_KEY`
3. Value: Paste the service_role secret from keys.txt
4. Click **"Save"**

#### Variable 4: NEXT_PUBLIC_SITE_URL

1. Click **"Add variable"** again
2. Key: `NEXT_PUBLIC_SITE_URL`
3. Value: `https://kleinwelgeluk.co.za`
4. Click **"Save"**

**All 4 environment variables are now in Netlify.** ✅

---

## VERIFICATION: Check Everything Works

1. Go back to your Netlify site
2. You should see a notification that it's redeploying (building)
3. Wait 2-3 minutes for the build to complete
4. Visit your site URL
5. You should see the Klein Welgeluk login page
6. Click around — pages should load with real data from Supabase
7. Try adding a calendar event or comment — it should save to your database

---

## If Something Went Wrong

- **SQL errors**: Re-run the SQL. Make sure you copied all of it.
- **Storage buckets won't create**: Refresh the page and try again.
- **Keys don't work**: Copy them again carefully (no extra spaces).
- **Site still doesn't work**: Check that all 4 environment variables are in Netlify.

---

**You're done!** Your Supabase is now fully set up and connected to your Klein Welgeluk app. 🎉
