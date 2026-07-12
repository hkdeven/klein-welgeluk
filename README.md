# 🏗️ Klein Welgeluk: Build Diary App

[![Netlify Status](https://api.netlify.com/api/v1/badges/3bef7a33-0cba-452d-8e09-5c7802e84a1e/deploy-status)](https://app.netlify.com/projects/astonishing-cranachan-f5b019/deploys)
&nbsp;
![Site](https://img.shields.io/website?url=https%3A%2F%2Fkleinwelgeluk.co.za&label=kleinwelgeluk.co.za&up_message=live&up_color=2F4030&down_message=down)
&nbsp;
![Next.js](https://img.shields.io/badge/Next.js-14-000?logo=nextdotjs&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%C2%B7%20Storage%20%C2%B7%20Auth-3ECF8E?logo=supabase&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)

<!--
  Deploy badge: reflects the latest production deploy (green/red) for the
  Netlify site "astonishing-cranachan-f5b019". The "Site" badge (shields.io)
  pings kleinwelgeluk.co.za for up/down. Supabase has no per-project status
  badge; platform health lives at https://status.supabase.com.
-->

A collaborative web app for planning and tracking the Klein Welgeluk house build
(Greyton). Owners, architect, and contractors share a brief, per-area pages,
documents, photos, costing, milestones, decisions, a snag list, a calendar, an
activity feed, and in-app notifications. Friends/family can follow along in a
read-mostly **guest** mode.

## 🧰 Tech Stack

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

## 💻 Local Development

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

## 🗄️ Supabase Setup

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

-- Weekly digest: stage-change history + global settings (on/off toggle)
CREATE TABLE IF NOT EXISTS stage_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL, stage_name text NOT NULL, changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS stage_changes_created_idx ON stage_changes (created_at DESC);
CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY, value jsonb, updated_at timestamptz NOT NULL DEFAULT now());
```

## 🔐 Authentication & Roles

- **Supabase Auth**, invite-only. `AppFrame` forces login: unauthenticated
  visitors are redirected to `/login`.
- Sign-in methods: **Google SSO**, **email/password**, or a shared **guest
  passcode**. Auth emails are mapped to a row in the `users` table via
  `/api/users/resolve` (unknown emails get 403: an owner must add them first).
- **Password reset**: "Forgot password?" under the email sign-in form sends a
  Supabase recovery email; the link lands on `/reset-password` (a bare route)
  where the user sets a new password. A `PASSWORD_RECOVERY` listener in
  `AuthProvider` routes the recovery session there even if the email link lands
  on the site root (the Supabase redirect allowlist controls the landing URL,
  so add `https://kleinwelgeluk.co.za/reset-password` to it for a direct
  landing).
  The Google avatar is backfilled only when the row has no avatar (a user's own
  uploaded avatar is never overwritten).
- Roles: `owner` (full editor), `collaborator` (can write/comment/upload), and
  `guest`.
- **Guest mode** (shared "Guest" user, `role = guest`): can browse and **upload
  photos/documents**, but cannot delete, comment, react, edit, or see edit mode.
  Guests don't see the Documents top-level page, "Assigned to me", costing,
  milestones, decision log, or snag list. Guests get a **Sign out** control in
  the top bar (no profile page). The `users` list API excludes the guest user.

## ✨ Features

### Top bar
- **Global search**: a rounded search field (left side) that queries **pages
  (incl. brief/description), milestones, decisions, snags, photos, documents, and
  comments** at once. Typing (debounced) drops an inline results panel grouped by
  type, with the matched text highlighted; each result links to its source
  (comments deep-link to `#comments`; milestones/decisions fall back to
  `/overview`). Keyboard: `/` or `Cmd/Ctrl+K` focuses it, ↑/↓ move, ↵ opens,
  `Esc` closes. Documents, milestones, decisions, and snags are omitted for
  guests (matching where they're hidden in the UI). On mobile it collapses to a
  search icon that expands into a full-width bar (with Cancel) so it doesn't
  crowd the bell/edit/profile controls.
- **Edit mode**: a pill that reads **"Edit"** (outlined) when off and
  **"Editing"** (solid green) when on; owners/collaborators toggle it to reveal
  editing controls. Content is read-only when off; comments/uploads stay open.
- **Notifications**: a bell with a brass unread-count badge (see below).
- **Profile**: avatar linking to `/profile` (guests: plain label + sign out).
- Sage-tinted bar; on mobile a hamburger opens the sidebar drawer.

### Navigation (left sidebar)
- Logo/wordmark links **home**.
- Top links: **Overview, Home, Documents (hidden for guests), Photos, Calendar**,
  and **Weekly Digest** (only when enabled by an owner, and never for guests).
- Building / Services / Exterior are **collapsible groups**.
- **"+ Add page"** creates a top-level or nested page (slug auto-generated).

### Home (`/`)
- Hero **photo carousel** (owners add/remove in edit mode; images transform-sized).
- **Upcoming events**: calendar events you're tagged in within the next 7 days
  (click opens the event popup). Hidden when none.
- **Assigned to me**: cards with current stage + colored tags (hidden for guests).
- **Recent activity**: colored icon-chip feed (comment / photo / document /
  event / page / **assigned**: someone assigned to a page); event rows open a
  popup; clicking a linked target navigates. Owners can delete an activity item
  **in edit mode** (photo comments, page-created, and assignment rows are not
  deletable from the feed).

### Overview (`/overview`)
Project brief: **Project scope** plus **Must-haves / Love / Hate** tabs (rich
text). Below (hidden from guests): a collapsible **Milestones** timeline and a
**Decision log** roll-up aggregating decisions from all sub-pages. Also has the
shared documents / photos / comments block.

### Area & sub-pages (`/[...slug]`, e.g. `/building/bathroom`)
- **Stages pipeline**: set the current stage; earlier stages mark completed.
- **Assignees** and **Tags** (tags render in deterministic per-name colors).
- **Brief** (rich text).
- **Sub-pages**: child cards showing current status + colored tags. The section
  renders **skeleton placeholders** until each child's current stage and tags have
  loaded, so cards never flash a wrong/default status first.
- **Documents / Photo gallery / Comments** (shared block, see below).
- **Decision log** for this page (hidden from guests; edit-mode delete).
- **Costing**: collapsible (fold style, white); hidden from guests, and hidden
  when empty unless an owner is editing. Sits at the bottom.
- **Snag list**: appears **only when the page's current stage is "Snagging"**.
  Checklist with fixed-by/date, an optional photo (a real photo row that opens in
  the full viewer with comments), edit-mode delete. Hidden from guests.

### Shared documents / photos / comments block
- **Documents**: "+ Add document" opens a modal with a pill file-picker,
  **multiple-file** upload, and a **File name** rename. Rows show uploader/date;
  delete in edit context. The category dropdown includes **"+ New category…"** to
  type a custom category at upload time (same for photos). Files upload
  **straight from the browser to storage** (signed URL), so large files work -
  the ceiling is Supabase's per-file limit (50MB default), not Vercel's 4.5MB
  request cap.
- **Photo gallery**: masonry of transform-sized thumbnails with a footer strip
  (caption, author, 💬 comment + reaction counts). "+ Add photos" uses the same
  pill picker (multi-file or add-by-URL). Category filter pills appear when there
  are photos. **Add-by-URL imports the image into storage server-side** (survives
  hotlink protection and expiring CDN links; scheme auto-prepended); pasting a
  page URL instead of a direct image returns a clear error.
- Documents and photos both show **loading skeletons** on first load (shimmer doc
  row / masonry pins) instead of briefly flashing "No documents / No photos yet."
  or empty caption bars: smoother, less jumpy.
- Clicking a photo opens the **Instagram-style photo view** (`PhotoModal`):
  large image + panel with caption (owner-editable), an **owner-editable tag
  pill** (click to switch category or add a "+ New tag…"), **reactions**, and a
  **comment thread** with **@mention autocomplete** (notifies the person).
  Mobile uses `100dvh` so the composer isn't hidden.
- **Comments** (page + photo): **@mention autocomplete** on both; picking a
  name notifies them (works on mobile).

### Reactions
WhatsApp-style: a quick emoji row plus a full picker. A user can add **multiple**
different emoji to a photo; tapping one you added removes it. Grid counts update
live. Reactions are for signed-in users (guests share one identity).

### Documents (`/documents`)
Lists **every** document across all pages, each tagged with (and linked to) its
source page. The **source-page tag is brass-tinted** to distinguish it from the
grey category tag. Filter by category (Building / Services / Exterior / Quotes).
Hidden from guests. Uploads from this page attach to a dedicated hidden
"documents" holding page (find-or-created, same pattern as `/photos`), so they
are no longer mis-attributed to the first page (Building); the self-referential
source tag is suppressed for them. `POST /api/pages` is **find-or-create by
slug**, so concurrent first-visits can't create duplicate holding pages.

### Calendar (`/calendar`)
Events with optional time/description; Day / Week / Month / Year (2 months per
row on mobile). **Tag users** on an event → they get a notification and see it in
Home "Upcoming events". Click an event for the popup (shows creator); the
**author can edit** their event.

### Weekly Digest (`/weekly-digest`)
A standalone **Sunday-Saturday** summary with prev/next week navigation. Top row:
**Progress** (stage changes only), **Decisions** (logged that week), and **Coming
up** (events in the following 7 days): each colour-delineated. Below, **Activity
by area**: one clickable card per sub-page that had activity, summarising photos,
comments, docs, decisions, snags fixed/new, and stage moves with the app's muted
activity-type colours. **Owner-toggleable** (Profile → Weekly Digest, stored in
`app_settings.weekly_digest_enabled`): when on it appears in the sidebar (after
Calendar) **immediately** for **all signed-in users** (owners and collaborators)
- **never for guests**. The toggle is owner-only; the page is visible to any
non-guest. Progress is powered by the `stage_changes` log (written whenever a
stage is set current).

### Notifications
In-app bell (polls; marks read on open; **✕ to dismiss**). Types:
`event_tagged`, `comment` (on an assigned page), `mention`, `photo_mention`,
`stage_moved`, `assigned` (being assigned a page). **Profile → Notifications**
toggles are persisted to `users.notif_prefs` and respected when sending;
"Assigned to a page" is always-on (not disableable).

### Cross-cutting
- **Rich-text editor**: bold/italic/strikethrough/lists/**links** (🔗 button:
  select text and paste a URL; re-click inside a link to edit it, clear to
  remove; links open in a new tab) + @mention autocomplete.
- **Toasts** for success/error (no browser dialogs).
- **Mobile-responsive** (phones): off-canvas sidebar drawer, viewport-safe
  modals/menus, stacked profile fields, single-column grids. Uses `100dvh` for
  the app shell so the **footer sticks to the bottom** of short pages (100vh
  overshot past mobile browser chrome).

## 📁 Project Structure

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

## 🔌 API Routes

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
| `/api/activity` | GET | Aggregated recent-activity feed (comments, photos, documents, events, pages, page assignments) |
| `/api/search` | GET (`?q=`, `&guest=1`) | Global search across pages, milestones, decisions, snags, photos, documents, comments |
| `/api/digest` | GET (`?start=&end=`) | Weekly digest aggregation for a Sun-Sat week |
| `/api/settings` | GET, PATCH (owner-only) | Global app settings (e.g. `weekly_digest_enabled`) |
| `/api/users`, `/api/users/[id]`, `/api/users/resolve` | GET/POST, PATCH/DELETE, POST | Team; PATCH accepts `notif_prefs`; resolve maps auth → user (invite-only) |
| `/api/guest-passcode`, `/api/auth/guest-verify` | POST | Set / verify guest passcode |

## 🧬 Data Model

`pages`, `tags`, `page_tags`, `assignments`, `documents` (+`category`), `photos`,
`carousel_photos`, `costing`, `comments` (+`photo_id`; `page_id` nullable),
`calendar_events` (+`tagged_user_ids`), `users` (+`notif_prefs`; includes a
`role = guest` user), `guest_passcode`, `stages`, `notifications`, `reactions`
(unique on `photo_id,user_id,emoji`), `milestones`, `decisions`, `snags`,
`stage_changes` (stage-move log for the digest), `app_settings` (key/value).
No FK constraints on the newer tables, so the API joins author/page/fixer names
manually. Snag photos are real `photos` rows referenced by `snags.photo_id`.

## 🚀 Deployment

GitHub → Netlify (`@netlify/plugin-nextjs`). Build `npm run build`; set the three
Supabase env vars in Netlify. Verify locally with `npm run build` first; run any
pending migrations (above) since local and prod share one Supabase project.

## 🧭 Backlog / Not Yet Built

- **"On this day"** photo memories (3/6/12-month lookback): designed, dormant
  until there are old-enough photos.
- **Greyton Resources page** (`/resources`): a native (non-embedded), category-
  indexed, on-page-searchable listings page two-way synced with a Google Sheet
  (`Name | Category | Contact | Phone | Email | Website | Notes`), with an
  add-listing form. **Code is built** (`src/lib/sheets.ts`, `/api/resources`,
  `/resources`) but **paused** pending: creating the Sheet, a Google service
  account (share the sheet Editor + env vars `GOOGLE_SERVICE_ACCOUNT_EMAIL`,
  `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, `RESOURCES_SHEET_ID`), then re-pointing
  the footer link. Not wired into the app yet.

## 📄 License

Private project for Klein Welgeluk.
