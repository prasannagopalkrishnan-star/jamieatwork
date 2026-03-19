# Jamie@Work — AI SDR Marketplace Platform

## What This Is

Jamie@Work (jamieatwork.app) is an AI digital employee platform. The first product is **Jamie the SDR** — an AI sales development rep that startup founders can "hire" and train in 10 minutes. Jamie learns the founder's product, pitch, ICP, objections, and qualification criteria, then qualifies leads, sends outreach, and books meetings 24/7.

**Target customer:** Startup founders doing $0–$1M ARR who can't afford a full-time SDR ($70K+/yr).

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** Supabase (project ID: `mneowgfoglguuwjxcwi`)
- **AI:** Claude API (Anthropic) via `@anthropic-ai/sdk`
- **Hosting:** Vercel (planned, not yet deployed)
- **Styling:** Inline styles with CSS-in-JS (no Tailwind usage currently despite it being installed)

## Project Structure

```
app/
├── page.tsx                    # Landing page
├── globals.css                 # Global CSS variables + base styles
├── layout.tsx                  # Root layout
├── onboarding/
│   └── page.tsx                # Cards-style onboarding flow (client component)
├── dashboard/
│   └── page.tsx                # SDR command center (server component)
├── api/
│   └── training/
│       └── route.ts            # Claude API: scrape, chat, generate_playbook
lib/
├── supabase/
│   ├── client.ts               # Browser Supabase client
│   └── server.ts               # Server Supabase client
```

## Database Schema (Supabase)

### `companies`
- `id` UUID PK, `name` TEXT, `domain` TEXT, `created_at` TIMESTAMPTZ

### `digital_employees`
- `id` UUID PK, `company_id` UUID FK→companies, `name` TEXT, `title` TEXT
- `department` TEXT, `category` TEXT, `status` TEXT (active|setup|inactive)

### `onboarding_profiles`
- `id` UUID PK, `company_id` UUID FK→companies, `status` TEXT (in_progress|completed|archived)
- **The Pitch:** `product_name`, `product_description`, `problem_solved`, `key_differentiators`
- **ICP:** `target_company_size`, `target_industries`, `target_roles`, `icp_signals`
- **Qualification:** `qualification_questions` JSONB, `disqualification_criteria` TEXT
- **Objections:** `objection_playbook` JSONB `[{objection, response}]`
- **Style:** `voice_style`, `call_to_action`, `calendar_link`
- **Training:** `training_transcript` JSONB, `uploaded_docs` JSONB

### `leads`
- `id` UUID PK, `company_id` UUID FK→companies
- `name`, `email`, `company_name`, `role_title`, `source` (inbound_chat|outbound_email|manual)
- `status` (new|contacted|qualified|disqualified|meeting_booked|closed)
- `qualification_score` INT, `qualification_notes`, `conversation_history` JSONB

### `tickets`
- `id` UUID PK, `ticket_ref`, `submitter_name`, `category`, `question`, `status`

All tables have RLS enabled with public access policies (auth not yet implemented).

## API Routes

### `POST /api/training`

Three actions via `action` field in request body:

**`scrape_website`** — Fetches URL, strips HTML, sends to Claude to extract structured product info. Returns `{ extracted: { product_name, product_description, problem_solved, key_differentiators, suggested_industries, suggested_roles } }`.

**`chat`** — Training conversation. Claude plays "Jamie" and asks exactly 3 questions about objections, qualification criteria, and special instructions. Accepts `messages[]`, `companyName`, `formData` (context from onboarding cards). Returns `{ message: string }`.

**`generate_playbook`** — Takes full conversation + form data, returns structured JSON playbook matching the `onboarding_profiles` schema. Returns `{ playbook: {...} }`.

## Design System

### Color Palette (Stripe/Vercel Warm Light)

```
Background:       #FAF9F7 (cream)
Background Wash:  #F5F3EE (warm gray)
Card:             #FFFFFF (white)
Border:           #E8E5DF (warm border)
Border Subtle:    #F0EDE8
Border Focus:     #0D9488 (teal)
Text Primary:     #1C1917 (dark brown)
Text Medium:      #57534E
Text Secondary:   #78716C
Text Tertiary:    #A8A29E
Accent:           #0D9488 (teal)
Accent Light:     #F0FDFA (teal tint)
Accent Border:    #99F6E4
Gradient:         linear-gradient(135deg, #0D9488, #06B6D4)
Warning:          #EA580C
Danger:           #DC2626
Success:          #16A34A
```

### Typography

- **Display/Headings:** Satoshi (fontshare.com) — weight 700-900, letter-spacing -0.03em to -0.04em
- **Body:** DM Sans (Google Fonts) — weight 400-700
- **Mono/Labels:** JetBrains Mono (Google Fonts) — weight 400-700

CSS classes used: `.fd` (display), `.fb` (body), `.fm` (mono)

### Design Principles

- Light, warm backgrounds with subtle noise texture overlay
- White cards with 1px warm borders and subtle shadows
- Teal gradient for primary CTAs
- No dark theme anywhere
- Varied border-radius: 8px (small), 12px (medium), 14-16px (cards), 18px (large)
- Staggered fadeUp animations on page load
- Hover effects: translateY(-2px) + shadow increase + border color change to teal
- Inline editable fields: click to edit, teal highlight background, dashed underline on hover

### Fonts Import Block

```css
@import url('https://api.fontshare.com/v2/css?f[]=satoshi@500,700,800,900&display=swap');
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
```

## Onboarding Flow (Current: v10 Cards Style)

The onboarding is a single `'use client'` page component with three phases:

### Phase 1: Cards (7 steps, auto-advance on selection)
0. **Website URL** → scans site, extracts product info via Claude
1. **What Jamie Learned** → editable fields (product, description, problem, edge) with ✨ AI Suggest buttons
2. **Team Size** → emoji icon cards (Just me through 200+)
3. **Industry** → 4×2 grid of emoji cards
4. **Jamie's Vibe** → 2×2 gradient cards (Chill/Sharp/Warm/Nerdy) with hover preview
5. **Goal/CTA** → vertical cards with icons (Book demo, Free trial, Call, Quote)
6. **Calendar Link** → optional input

### Phase 2: Chat (3 questions)
- Claude-powered conversation
- Jamie asks about objections, qualification, special instructions
- Clickable suggestion pills below messages
- Auto-transitions to playbook generation when Jamie says "got everything"

### Phase 3: Playbook Review
- Sections: THE PITCH, IDEAL CUSTOMER, QUALIFICATION, OBJECTIONS, STYLE & CTA
- All fields are inline editable (click to edit)
- ✨ Improve buttons for AI refinement
- "Approve & Deploy Jamie" saves everything to Supabase

### State Flow
```
website scan → edit fields → team size → industry → vibe → CTA → calendar
  → chat (3 Q&A) → generate playbook → review/edit → deploy to Supabase
```

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://mneowgfoglguuwjxcwi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
ANTHROPIC_API_KEY=<your-api-key>
```

## Known Issues & Pending Work (v10 → v11)

### Priority 1: Authentication
- No auth currently — anyone can create companies and deploy Jamie
- Need signup/login flow BEFORE "Hire Jamie" button
- Supabase Auth is available but not wired up
- RLS policies need to be scoped to authenticated users

### Priority 2: Landing Page Fixes
- No content should cut between viewport folds — each section fully visible or on next scroll
- Remove red strikethrough pricing on comparison card (right panel)
- Add pink/rose color accents as background palette additions
- Sharper, bolder fonts throughout (Satoshi weight 800-900)
- Better use of page real estate, less wasted whitespace

### Priority 3: Onboarding UX Fixes
- Playbook inline editing is broken/inconsistent — clicking fields doesn't always open textarea
- AI Suggest buttons confuse users — need clear visual separation between "edit this field" and "let AI fill it"
- Suggestion: Move AI buttons to a separate action bar or make them secondary/ghost buttons

### Priority 4: End-to-End Test Suite
Build automated tests covering:
- Website scan → fields populate correctly
- Click-to-edit on every field → textarea opens, edits persist
- AI Suggest buttons → API fires, field updates
- Card selection steps auto-advance
- Chat sends/receives, suggestion pills work
- Playbook generates from chat conversation
- Playbook review editing works on every field
- Deploy saves correct data to Supabase
- Navigation (back buttons, dot indicators) work
- Error states display correctly

### Future Work
- Chat widget for inbound leads (Jamie actually selling)
- Outbound email drafting using playbook
- Lead tracking and conversation history
- Vercel deployment to jamieatwork.app
- Stripe billing integration

## Code Conventions

- All pages use inline styles (not Tailwind classes) with the color palette constants
- Landing page and dashboard are server components; onboarding is `'use client'`
- API routes use Next.js App Router `route.ts` pattern
- Supabase client/server split via `lib/supabase/`
- Claude API calls use `@anthropic-ai/sdk` with `claude-sonnet-4-20250514` model
- Font classes: `.fd` for display, `.fb` for body, `.fm` for mono
- Animation classes: `.ai` for fadeUp, `.d1-.d4` for stagger delays
- Hover classes: `.ch` for card hover, `.vc` for vibe card hover

## Testing

No test framework is currently set up. Recommended:
- **Playwright** for E2E browser tests
- **Vitest** for unit tests on API routes
- Test against local dev server (`npm run dev`)

## Useful Commands

```bash
npm run dev          # Start dev server on localhost:3000
npm run build        # Production build
npm run lint         # ESLint
```

## gstack

Use the /browse skill from gstack for all web browsing. Never use mcp__claude-in-chrome__* tools.

Available skills:
- /plan-ceo-review � Founder mode. Rethink the problem. Find the 10-star product.
- /plan-eng-review � Lock architecture, data flow, edge cases before coding.
- /plan-design-review � Review plans through a design lens.
- /design-consultation � Research competitors, propose palette, generate mockups, write DESIGN.md.
- /review � Paranoid staff engineer. Find bugs before they hit Vercel.
- /ship � Sync main, run tests, push, open PR.
- /qa � Full QA run with browser automation.
- /qa-only � QA without code review.
- /qa-design-review � QA that reads DESIGN.md choices.
- /retro � Weekly metrics: commits, LOC, velocity, hotspots.
- /document-release � Document what shipped.
- /debug � Debug mode for hard problems.

If gstack skills aren't working, run: cd .claude/skills/gstack && ./setup

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.
