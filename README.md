# Klein Welgeluk — Build Diary App

A collaborative web app for planning and tracking the Klein Welgeluk house build
(Greyton). Owners, the architect, and contractors share a brief, per-area pages,
documents, photos, costing, a calendar, and comments.

## Tech Stack

- **Framework:** Next.js 14 (App Router) + React 18 + TypeScript
- **Styling:** Tailwind CSS plus a custom stylesheet (`src/app/globals.css`)
- **Backend:** Supabase (PostgreSQL + Storage), accessed from Next.js API routes
  using the service-role key
- **Hosting:** Netlify (`@netlify/plugin-nextjs`)

> The HTML files in the repo root (`mockup_*.html`, `index.html`) are **static
> design references only**. The running app is the source of truth.

## Local Development

```bash
npm install

# Create .env.local in the project root with your Supabase keys:
#   NEXT_PUBLIC_SUPABASE_URL=...
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
#   SUPABASE_SERVICE_ROLE_KEY=...

npm run dev        # http://localhost:3000
npm run build      # production build (also the type-check gate)
npm start          # serve the production build
```

Test locally before deploying — `npm run build` runs the same TypeScript check
that the Netlify build enforces.

## Supabase Setup

1. Create a Supabase project and run the schema in
   [`SUPABASE_SETUP_EXACT.md`](SUPABASE_SETUP_EXACT.md).
2. Create two **public** Storage buckets: `documents` and `photos`
   (carousel images are stored under a `carousel/` prefix in the `photos` bucket).
3. To enable document **tags/filtering**, add the column once:
   ```sql
   ALTER TABLE documents ADD COLUMN IF NOT EXISTS category TEXT;
   ```

## Features

### Navigation (left sidebar)
- Top links: **Overview, Home, Documents, Calendar**.
- Building / Services / Exterior are **collapsible groups** (Building expanded by
  default; the group containing the current page auto-expands).
- A single **“+ Add page”** action at the bottom creates either a top-level page
  or a sub-page under any existing page (slug is auto-generated from the title).

### Overview (`/overview`)
The project brief for the architect/engineers: a **Project scope** block plus
**Must-haves / Love / Hate** tabs, each a rich-text field. Has its own comments,
photos, and document attachments.

### Home (`/`)
Hero **photo carousel** (owners can upload/remove images in edit mode),
**Assigned to me** cards (showing each page’s tags), and a **Recent activity**
area.

### Area & sub-pages (`/[...slug]`, e.g. `/building/bathroom`)
Each building/services/exterior page (and any nested sub-page) has:
- **Brief** (rich text)
- **Costing** — collapsible accordion (collapsed by default): budgeted amount,
  quote received, actual invoiced, and rich-text notes
- **Documents** — upload with a description; open / delete
- **Photo gallery** — upload or add-by-URL with a description; delete
- **Sub-pages** — listed when present (created from the sidebar)
- **Comments** (rich text)
- **Assignees** and **Tags** — editable

### Documents (`/documents`)
Upload files with a description and a tag (Building / Services / Exterior /
Quotes); filter the list by tag; open or delete.

### Calendar (`/calendar`)
Events with an optional time and description; **Day / Week / Month / Year**
views; click an event for details; delete.

### Cross-cutting
- **Edit mode** — owners toggle “edit mode” in the top bar to reveal editing
  controls (brief, costing, assignees, tags, carousel). With edit mode off,
  content is read-only. Comments are always open.
- **Rich-text editor** — bold, italic, strikethrough, bulleted and numbered lists.
- **Toast notifications** — styled success/error toasts (no browser dialogs).

## Roles

Seeded users: Deven & Wernardt (`owner`), Daniel (`collaborator`). Owners are the
editors. (The current build authenticates as a fixed owner; full sign-in is not
yet wired up.)

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Home dashboard (carousel, assigned, activity)
│   ├── overview/             # Project brief (scope + tabs)
│   ├── [...slug]/            # Area & sub-pages (catch-all)
│   ├── documents/            # Document library
│   ├── calendar/             # Calendar (day/week/month/year)
│   ├── profile/ , login/
│   ├── globals.css           # Tailwind + custom styles
│   └── api/                  # Route handlers (see below)
├── components/
│   ├── Sidebar.tsx           # Collapsible nav + add page
│   ├── Topbar.tsx            # Edit-mode toggle + profile
│   ├── Footer.tsx
│   ├── Toast.tsx             # Toast provider + useToast()
│   ├── RichTextEditor.tsx    # WYSIWYG field
│   └── PageAttachments.tsx   # Shared comments/photos/documents (Overview)
├── hooks/usePages.ts         # Fetches + builds the page tree
└── lib/                      # Supabase client helpers
```

## API Routes

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/pages` | GET, POST | List page tree / create a page |
| `/api/pages/[id]` | PATCH, DELETE | Update (incl. brief) / delete (cascades to children) |
| `/api/comments`, `/api/comments/[id]` | GET, POST / DELETE | Comments per page |
| `/api/photos`, `/api/photos/upload`, `/api/photos/[id]` | POST (url) / POST (file) / DELETE | Page photos |
| `/api/documents`, `/api/documents/[id]` | GET, POST / DELETE | Documents (file + description + category) |
| `/api/costing` | GET, PUT | Per-page costing (upsert) |
| `/api/assignments` | GET, POST, DELETE | Assign users to pages |
| `/api/tags` | GET, POST, DELETE | Page tags (find-or-create + link) |
| `/api/calendar`, `/api/calendar/[id]` | GET, POST / DELETE | Calendar events |
| `/api/carousel`, `/api/carousel/[id]` | GET, POST / DELETE | Home hero carousel images |
| `/api/users` | GET, POST | Team members |

## Data Model

Core tables (full schema in `SUPABASE_SETUP_EXACT.md`):
`pages`, `tags`, `page_tags`, `assignments`, `documents`, `photos`,
`carousel_photos`, `costing`, `comments`, `calendar_events`, `users`,
`guest_passcode`. (The `stages` and `specifications` tables exist in the schema
but are not currently surfaced in the UI — the Specifications section was removed
from area pages.)

## Deployment

Connected to GitHub → Netlify with `@netlify/plugin-nextjs`. Build command
`npm run build`; set the three Supabase env vars in the Netlify dashboard. Verify
locally with `npm run build` first.

## Known Gaps

- Authentication is mocked (acts as a fixed owner); real sign-in / guest passcode
  is not yet implemented.
- “Recent activity” on the home page is a placeholder (no activity-log table yet).

## License

Private project for Klein Welgeluk.
