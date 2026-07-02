# Klein Welgeluk — Build Diary App

A collaborative web app for planning and tracking the Klein Welgeluk house build
(Greyton). Owners, architect, and contractors share a brief, per-area pages,
documents, photos, costing, milestones, decisions, a snag list, a calendar, an
activity feed, and in-app notifications. Friends/family can follow along in a
read-mostly **guest** mode.

## Tech Stack

- **Framework:** Next.js 14 (App Router) + React 18 + TypeScript
- **Styling:** Tailwind CSS plus a custom stylesheet (`src/app/globals.css`)
- **Backend:** Supabase (PostgreSQL + Storage + Auth), accessed from Next.js API
  routes using the service-role key (RLS is off; the API routes are the gate).
  All DB-backed routes are `export const dynamic = "force-dynamic"` and read
  with `cache: "no-store"` so data is never stale.
- **Images:** Supabase Storage image transforms (`/render/image`) serve resized,
  aspect-correct thumbnails/versions (see `src/lib/img.ts`).
- **Hosting:** Netlify (`@netlify/plugin-nextjs`).

> The HTML files in the repo root (`mockup_*.html`, `index.html`) are **static
> design references only**. The running app is the source of truth.

## Local Development

```bash
npm install

# .env.local in the project root:
#   NEXT_PUBLIC_SUPABASE_URL=...
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
#   SUPABASE_SERVICE_ROLE_KEY=...

npm run dev        # http://localhost:3000
npm run build      # production build (also the type-check gate)
npm start          # serve the production build
```

Local and production share one Supabase project, so migrations run once apply to
both. Verify with `npm run build` before deploying.

## Supabase Setup

1. Base schema: [`SUPABASE_SETUP_EXACT.md`](SUPABASE_SETUP_EXACT.md).
2. Two **public** Storage buckets: `documents` and `photos` (carousel + snag
   photos live in the `photos` bucket).
3. Image transformation must be enabled (used for fast, aspect-correct images).
4. Run the cumulative migrations below (all idempotent / safe to re-run):

```sql
-- Document tagging
ALTER TABLE documents ADD COLUMN IF NOT EXISTS category TEXT;

-- Calendar: tag users on events
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS tagged_user_ids uuid[] DEFAULT '{}';

-- In-app notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, type text NOT NULL, title text NOT NULL,
  body text, link text, ref_id uuid, actor_id uuid,
  read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, read_at, created_at DESC);

-- Photo reactions (multiple emoji per user per photo)
CREATE TABLE IF NOT EXISTS reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id uuid NOT NULL, user_id uuid NOT NULL, emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (photo_id, user_id, emoji));
CREATE INDEX IF NOT EXISTS reactions_photo_idx ON reactions (photo_id);

-- Photo comments (reuse the comments table)
ALTER TABLE comments ADD COLUMN IF NOT EXISTS photo_id uuid;
ALTER TABLE comments ALTER COLUMN page_id DROP NOT NULL;

-- Milestones + decision log
CREATE TABLE IF NOT EXISTS milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL, milestone_date date, end_date date, "precision" text,
  page_id uuid, sort_order int4 DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid, title text NOT NULL, detail text, author_id uuid,
  created_at timestamptz NOT NULL DEFAULT now());

-- Snag list (gated on the "Snagging" stage)
CREATE TABLE IF NOT EXISTS snags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL, title text NOT NULL, note text,
  is_fixed boolean NOT NULL DEFAULT false, fixed_at timestamptz, fixed_by uuid,
  photo_id uuid, created_at timestamptz NOT NULL DEFAULT now());

-- Per-user notification preferences
ALTER TABLE users ADD COLUMN IF NOT EXISTS notif_prefs jsonb;
```

## Authentication & Roles

- **Supabase Auth**, invite-only. `AppFrame` forces login: unauthenticated
  visitors are redirected to `/login`.
- Sign-in methods: **Google SSO**, **email/password**, or a shared **guest
  passcode**. Auth emails are mapped to a row in the `users` table via
  `/api/users/resolve` (unknown emails get 403 — an owner must add them first).
  The Google avatar is backfilled only when the row has no avatar (a user's own
  uploaded avatar is never overwritten).
- Roles: `owner` (full editor), `collaborator` (can write/comment/upload), and
  `guest`.
- **Guest mode** (shared "Guest" user, `role = guest`): can browse and **upload
  photos/documents**, but cannot delete, comment, react, edit, or see edit mode.
  Guests don't see the Documents top-level page, "Assigned to me", costing,
  milestones, decision log, or snag list. Guests get a **Sign out** control in
  the top bar (no profile page). The `users` list API excludes the guest user.

## Features

### Top bar
- **Edit mode** — a pill that reads **"Edit"** (outlined) when off and
  **"Editing"** (solid green) when on; owners/collaborators toggle it to reveal
  editing controls. Content is read-only when off; comments/uploads stay open.
- **Notifications** — a bell with a brass unread-count badge (see below).
- **Profile** — avatar linking to `/profile` (guests: plain label + sign out).
- Sage-tinted bar; on mobile a hamburger opens the sidebar drawer.

### Navigation (left sidebar)
- Logo/wordmark links **home**.
- Top links: **Overview, Home, Documents (hidden for guests), Photos, Calendar**.
- Building / Services / Exterior are **collapsible groups**.
- **"+ Add page"** creates a top-level or nested page (slug auto-generated).

### Home (`/`)
- Hero **photo carousel** (owners add/remove in edit mode; images transform-sized).
- **Upcoming events** — calendar events you're tagged in within the next 7 days
  (click opens the event popup). Hidden when none.
- **Assigned to me** — cards with current stage + colored tags (hidden for guests).
- **Recent activity** — colored icon-chip feed (comment / photo / document /
  event / page); event rows open a popup; clicking a linked target navigates.
  Owners can delete an activity item **in edit mode** (photo comments are
  excluded from the feed).

### Overview (`/overview`)
Project brief: **Project scope** plus **Must-haves / Love / Hate** tabs (rich
text). Below (hidden from guests): a collapsible **Milestones** timeline and a
**Decision log** roll-up aggregating decisions from all sub-pages. Also has the
shared documents / photos / comments block.

### Area & sub-pages (`/[...slug]`, e.g. `/building/bathroom`)
- **Stages pipeline** — set the current stage; earlier stages mark completed.
- **Assignees** and **Tags** (tags render in deterministic per-name colors).
- **Brief** (rich text).
- **Sub-pages** — child cards showing current status + colored tags.
- **Documents / Photo gallery / Comments** (shared block, see below).
- **Decision log** for this page (hidden from guests; edit-mode delete).
- **Costing** — collapsible (fold style, white); hidden from guests, and hidden
  when empty unless an owner is editing. Sits at the bottom.
- **Snag list** — appears **only when the page's current stage is "Snagging"**.
  Checklist with fixed-by/date, an optional photo (a real photo row that opens in
  the full viewer with comments), edit-mode delete. Hidden from guests.

### Shared documents / photos / comments block
- **Documents** — "+ Add document" opens a modal with a pill file-picker,
  **multiple-file** upload, and a **File name** rename. Rows show uploader/date;
  delete in edit context.
- **Photo gallery** — masonry of transform-sized thumbnails with a footer strip
  (caption, author, 💬 comment + reaction counts). "+ Add photos" uses the same
  pill picker (multi-file or add-by-URL). Category filter pills appear when there
  are photos.
- Clicking a photo opens the **Instagram-style photo view** (`PhotoModal`):
  large image + panel with caption (owner-editable), **reactions**, and a
  **comment thread**. Mobile uses `100dvh` so the composer isn't hidden.
- **Comments** — rich text with **@mention autocomplete** (notifies the person).

### Reactions
WhatsApp-style: a quick emoji row plus a full picker. A user can add **multiple**
different emoji to a photo; tapping one you added removes it. Grid counts update
live. Reactions are for signed-in users (guests share one identity).

### Documents (`/documents`)
Lists **every** document across all pages, each tagged with (and linked to) its
source page. Filter by category (Building / Services / Exterior / Quotes).
Hidden from guests.

### Calendar (`/calendar`)
Events with optional time/description; Day / Week / Month / Year (2 months per
row on mobile). **Tag users** on an event → they get a notification and see it in
Home "Upcoming events". Click an event for the popup (shows creator); the
**author can edit** their event.

### Notifications
In-app bell (polls; marks read on open; **✕ to dismiss**). Types:
`event_tagged`, `comment` (on an assigned page), `mention`, `photo_mention`,
`stage_moved`, `assigned` (being assigned a page). **Profile → Notifications**
toggles are persisted to `users.notif_prefs` and respected when sending;
"Assigned to a page" is always-on (not disableable).

### Cross-cutting
- **Rich-text editor** — bold/italic/strikethrough/lists + @mention autocomplete.
- **Toasts** for success/error (no browser dialogs).
- **Mobile-responsive** (phones): off-canvas sidebar drawer, viewport-safe
  modals/menus, stacked profile fields, single-column grids.

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Home (carousel, upcoming events, assigned, activity)
│   ├── overview/             # Brief + milestones + decision-log roll-up
│   ├── [...slug]/            # Area & sub-pages (stages, snags, decisions, costing…)
│   ├── documents/            # All documents, tagged by source page
│   ├── photos/               # Aggregate photo gallery
│   ├── calendar/ , profile/ , login/
│   ├── globals.css           # Tailwind + custom styles
│   └── api/                  # Route handlers (see below)
├── components/
│   ├── Sidebar.tsx  Topbar.tsx  Footer.tsx  AppFrame.tsx  AuthProvider.tsx
│   ├── NotificationBell.tsx  Toast.tsx  RichTextEditor.tsx  EditModeContext.tsx
│   ├── PageMedia.tsx         # Shared documents/photos/comments block
│   ├── PhotoModal.tsx  PhotoReactions.tsx   # Instagram-style photo view
│   ├── MilestonesSection.tsx  DecisionLog.tsx  SnagList.tsx
│   ├── PhotoUploadModal.tsx  DocUploadModal.tsx  ProfilePhotoCropper.tsx
│   └── EventDetailModal.tsx
├── hooks/usePages.ts         # Fetches + builds the page tree
└── lib/                      # supabase client, upload, img transforms, notify, tagColor
```

## API Routes

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/pages`, `/api/pages/[id]` | GET, POST / PATCH, DELETE | Page tree / create / update / delete (cascades) |
| `/api/comments`, `/api/comments/[id]` | GET (page_id/photo_id/photo_ids), POST / DELETE | Page **and** photo comments; POST notifies mentions/assignees |
| `/api/photos`, `/api/photos/[id]`, `/api/storage/sign-upload` | GET/POST, GET/PATCH/DELETE, POST | Photos (snag photos excluded from lists); caption/category edit; signed upload |
| `/api/documents`, `/api/documents/[id]` | GET (all + page join), POST / DELETE | Documents (rename, category) |
| `/api/costing` | GET, PUT | Per-page costing (upsert) |
| `/api/assignments` | GET, POST, DELETE | Assign users (POST notifies the assignee) |
| `/api/tags` | GET, POST, DELETE | Page tags |
| `/api/stages`, `/api/stages/[id]` | GET/POST/PATCH, DELETE | Stage pipeline (PATCH notifies assignees) |
| `/api/calendar`, `/api/calendar/[id]` | GET (+`upcoming_for`), POST / GET, PATCH, DELETE | Events + tagging notifications |
| `/api/carousel`, `/api/carousel/[id]` | GET, POST / DELETE | Home hero images |
| `/api/reactions` | GET, POST, DELETE (`&emoji`) | Photo reactions |
| `/api/notifications` | GET, PATCH (mark read), DELETE (dismiss) | In-app notifications |
| `/api/milestones` | GET, POST, DELETE | Overview milestones |
| `/api/decisions` | GET (page or roll-up), POST, DELETE | Decision log |
| `/api/snags` | GET, POST, PATCH, DELETE | Snag list |
| `/api/activity` | GET | Aggregated recent-activity feed |
| `/api/users`, `/api/users/[id]`, `/api/users/resolve` | GET/POST, PATCH/DELETE, POST | Team; PATCH accepts `notif_prefs`; resolve maps auth → user (invite-only) |
| `/api/guest-passcode`, `/api/auth/guest-verify` | POST | Set / verify guest passcode |

## Data Model

`pages`, `tags`, `page_tags`, `assignments`, `documents` (+`category`), `photos`,
`carousel_photos`, `costing`, `comments` (+`photo_id`; `page_id` nullable),
`calendar_events` (+`tagged_user_ids`), `users` (+`notif_prefs`; includes a
`role = guest` user), `guest_passcode`, `stages`, `notifications`, `reactions`
(unique on `photo_id,user_id,emoji`), `milestones`, `decisions`, `snags`.
No FK constraints on the newer tables, so the API joins author/page/fixer names
manually. Snag photos are real `photos` rows referenced by `snags.photo_id`.

## Deployment

GitHub → Netlify (`@netlify/plugin-nextjs`). Build `npm run build`; set the three
Supabase env vars in Netlify. Verify locally with `npm run build` first; run any
pending migrations (above) since local and prod share one Supabase project.

## Backlog / Not Yet Built

- **Weekly digest** on the home page (design parked).
- **"On this day"** photo memories (3/6/12-month lookback) — designed, dormant
  until there are old-enough photos.
- **Global search** across pages/comments/docs/photos.
- **Instagram cross-post** of a photo to the @kleinwelgeluk account.
- Photo-comment **@mention autocomplete** (tagging works by typing `@shortname`;
  no dropdown picker yet).

## License

Private project for Klein Welgeluk.
