# Deployment Checklist

Use this checklist to track your setup progress and ensure everything is ready for launch.

## Pre-Deployment (Do These First)

- [ ] **Supabase Account Created**
  - [ ] Project created and running
  - [ ] API keys copied to `.env.local`
  - [ ] Database schema imported (see SETUP_GUIDE.md)
  - [ ] Storage buckets created: `documents`, `photos`, `avatars`

- [ ] **Environment Variables Set**
  - [ ] `.env.local` file created with:
    - [ ] `NEXT_PUBLIC_SUPABASE_URL`
    - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - [ ] `SUPABASE_SERVICE_ROLE_KEY`
    - [ ] `NEXT_PUBLIC_SITE_URL=https://kleinwelgeluk.co.za`

- [ ] **GitHub Repository Ready**
  - [ ] Repository created
  - [ ] Code pushed to main branch
  - [ ] `.env.local` is in `.gitignore` (not committed)

- [ ] **Local Build Test**
  - [ ] Run `npm run build` locally with no errors
  - [ ] Run `npm run dev` and test pages load

## Deployment to Vercel

- [ ] **Vercel Account Created**
  - [ ] Signed in with GitHub
  - [ ] Connected to klein-welgeluk repository

- [ ] **Project Created on Vercel**
  - [ ] Select Next.js as framework (auto-detected)
  - [ ] All environment variables added
  - [ ] Initial deployment successful

- [ ] **Custom Domain Connected**
  - [ ] Added `kleinwelgeluk.co.za` in Vercel Domains
  - [ ] DNS updated (CNAME or nameservers)
  - [ ] SSL certificate issued (Vercel handles this)

## Post-Deployment Testing

- [ ] **Site Loads**
  - [ ] `https://kleinwelgeluk.co.za` responds (or temp Vercel URL while DNS propagates)
  - [ ] No 500 errors in browser console

- [ ] **Login Page Works**
  - [ ] Collaborator sign-in toggle works
  - [ ] Guest sign-in toggle works
  - [ ] Footer displays with weather (may take a moment)

- [ ] **Navigation Works**
  - [ ] Sidebar renders on protected pages
  - [ ] Home page loads
  - [ ] Documents page loads
  - [ ] Calendar page loads
  - [ ] Profile page loads

- [ ] **Database Connected**
  - [ ] Pages load from database (not mock data)
  - [ ] Can create new pages (if edit mode is on)

## Authentication Setup

- [ ] **Email/Password Auth Ready**
  - [ ] Supabase Auth enabled
  - [ ] Test user accounts created (initial 3 are seeded)

- [ ] **Google OAuth Configured**
  - [ ] Google Cloud Console project created
  - [ ] OAuth 2.0 credentials obtained
  - [ ] Added to Supabase Authentication → Providers → Google
  - [ ] Tested sign-in with Google account

- [ ] **Microsoft OAuth Configured**
  - [ ] Azure App registration created
  - [ ] Credentials obtained
  - [ ] Added to Supabase Authentication → Providers → Microsoft
  - [ ] Tested sign-in with Microsoft account

- [ ] **Guest Passcode Set**
  - [ ] Supabase `guest_passcode` table populated
  - [ ] Passcode hash created
  - [ ] Tested guest access with passcode

## Initial Data Setup

- [ ] **Page Tree Seeded**
  - [ ] Building, Services, Exterior top-level pages exist
  - [ ] Sub-pages created under Building (Bedrooms, Bathroom, etc.)
  - [ ] All pages have default stages assigned

- [ ] **Initial Users Created**
  - [ ] Deven Blackburn (owner)
  - [ ] Wernardt Toerien (owner)
  - [ ] Daniel Robbins (collaborator)
  - [ ] Invitations sent (if auto-invite enabled)

- [ ] **Design Tokens Applied**
  - [ ] Colors match spec (whitewash, bottle, sage, pine, brass, mist)
  - [ ] Fonts loaded correctly (Fraunces, Source Sans 3, IBM Plex Mono)
  - [ ] Layout looks right (sidebar 240px, main area responsive)

## Performance & Security

- [ ] **NoIndex Set**
  - [ ] All pages have `<meta name="robots" content="noindex, nofollow">`
  - [ ] Verified with browser source

- [ ] **HTTPS Enforced**
  - [ ] Site redirects HTTP → HTTPS
  - [ ] SSL certificate valid

- [ ] **Guest Restrictions Enforced**
  - [ ] Costing sections hidden from guests (server-side)
  - [ ] Comments disabled for guests
  - [ ] File uploads disabled for guests
  - [ ] Edit mode hidden from guests

- [ ] **Supabase Policies Configured**
  - [ ] `documents` bucket: authenticated users can upload, all can read
  - [ ] `photos` bucket: authenticated users can upload, all can read
  - [ ] `avatars` bucket: users can upload own, all can read
  - [ ] `guest_passcode` table: secure (no direct client access)

## Monitoring & Next Steps

- [ ] **Error Logging Set Up**
  - [ ] Vercel error tracking enabled
  - [ ] Check Vercel dashboard regularly for deployment errors

- [ ] **Backups Configured**
  - [ ] Supabase automated backups (enabled by default)
  - [ ] Manual backup taken before launch

- [ ] **Team Notified**
  - [ ] Owners given access to Supabase dashboard
  - [ ] Architects/contractors given invite links
  - [ ] Guest passcode shared with friends/family (secure channel)

## Future Enhancements

- [ ] Real-time comment subscriptions (Supabase realtime)
- [ ] Email notifications (@mentions, activity)
- [ ] Advanced file preview (PDF, DWG)
- [ ] Photo lightbox/full-screen view
- [ ] Admin panel for user management
- [ ] Analytics dashboard
- [ ] Mobile app (React Native)

---

## Support Contacts

- **Supabase Issues:** https://supabase.com/docs
- **Vercel Issues:** https://vercel.com/support
- **Questions:** Check the full spec document (Klein_Welgeluk_Developer_Spec.md)

---

**Estimated time to complete:** 30-45 minutes end-to-end

**Good luck! 🚀**
