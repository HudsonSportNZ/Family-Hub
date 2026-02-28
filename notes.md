# Family Hub — Project Notes

## Live URLs
- Production: hudsonfamily.co.nz
- GitHub: github.com/HudsonSportNZ/family-hub
- Vercel: vercel.com
- Supabase: supabase.com (project: family-hub)

## Tech Stack
- Next.js (App Router, TypeScript)
- Supabase (database + auth)
- Vercel (hosting)
- Tailwind CSS

## Design
- Dark theme, Syne + Inter fonts
- Colour scheme: accent #6C8EFF, green #34D399, amber #FBBF24, pink #F472B6
- Dashboard reference: family-hub-v4.html
- **Mobile-first design** — build all new features mobile-first
- Mobile: bottom tab bar navigation, stacked single column cards
- Desktop: left sidebar nav, 3-column grid layout
- Current dashboard (v4) is desktop-only — when rebuilding in React properly, do mobile-first

## What's Built
- [x] Dashboard UI — live on hudsonfamily.co.nz
- [ ] Live data / Supabase wired up
- [ ] Family logins
- [ ] Tasks module
- [ ] Meals module
- [ ] Goals module
- [ ] Money module
- [ ] School board module
- [ ] Cleaning schedule

## Family Members
- Mum (M) — blue/purple
- Dad (D) — green/cyan  
- Isabel (I) — pink/purple
- James (J) — amber/orange

## Session History
- Session 1 (28 Feb 2026): Built and deployed full dashboard UI to hudsonfamily.co.nz
  - Supabase connected but not yet wired to UI (all data is still static/dummy)
  - Next session: wire up live data, add family logins, start Tasks module

## Design Decisions
- Dashboard shows: What's On Today, Today's Tasks, Goals, Tonight's Meal, Money
- What's On Today is the hero panel (tall, left column) — pulls from calendar
- Each family member has a colour-coded avatar
- Sidebar has 8 modules — only dashboard built so far
- Kept design simple/uncluttered — app should make life simpler, not overwhelming

## Environment Variables
- NEXT_PUBLIC_SUPABASE_URL (set in .env.local and Vercel)
- NEXT_PUBLIC_SUPABASE_ANON_KEY (set in .env.local and Vercel)
- .env.local is gitignored — never gets pushed to GitHub

## Key Files
- app/page.tsx — entry point
- app/components/Dashboard.tsx — main dashboard component
- lib/supabase.js — Supabase client connection

## About
- Family: Hudson family, Wellington, NZ
- Kids: Isabel (Year 3) and James (Year 1)
- School: Sacred Heart Primary School