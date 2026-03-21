# Customer Journey QA Report

**Date:** 2026-03-21
**Target:** https://jamieatwork.vercel.app
**Persona:** First-time startup founder wanting to hire an AI SDR
**Test scenario:** Register as "Acme Corp" (test@acmecorp.com), complete onboarding, check all pages

---

## Health Score

**94/100** (50 passed, 3 minor issues)

| Severity | Count |
|----------|-------|
| Passed | 50 |
| CRITICAL | 0 |
| HIGH | 1 |
| MEDIUM | 2 |
| LOW | 0 |

---

## What Works

### Landing Page
- Hero headline "Your AI SDR, ready in 10 minutes" is prominent and clear
- Primary CTA "Onboard Jamie in 10 min" appears 3x (nav, hero, footer) - all link to /register
- "How It Works" anchor link present
- Fixed navigation bar with logo, Dashboard link, and CTA
- **Progressive Trust section** with 5 stages (Observe, Draft, Send, Reply, Autopilot) - well visualized with icons
- **"What Jamie Does" capabilities** - all 6 listed: Inbound Chat, Outbound Email, Lead Qualification, Meeting Booking, Follow-ups, Pipeline Dashboard
- "Three steps to your AI SDR" section: Train Jamie, Review her work, Watch her grow
- Final CTA: "Stop doing SDR work yourself" with "No credit card required"
- Footer with copyright
- Page loads in ~955ms - excellent performance
- No console errors
- No broken images

### Registration Page
- Clean form: "Hire your AI SDR" heading with "Jamie will be ready in under 10 minutes" subtitle
- Create Account / Log In tab toggle works
- Fields: Your name, Email, Password (with placeholders)
- "Get Started" purple CTA button
- "Back to home" link at bottom
- **Registration successfully redirects to /dashboard** - the core signup flow works end-to-end

### Dashboard (Post-Registration)
- **Stage 1: Observe** is active with ACTIVE badge and progress bar
- "Jamie suggests prospects and draft messages. You approve every action." - clear stage explanation
- Progress tracker: "0/10 approved suggestions" with "Next unlock" link
- **Today's Activity** cards: Prospects Found (0), Messages Drafted (0), Replies Handled (0), Meetings Booked (0)
- **Performance** section with empty state: "Jamie needs data to calculate performance"
- **Pipeline** section with "No prospects yet" and "Generate Prospects" CTA button
- **Quick Actions**: Review Drafts, Approve Prospects, View Meetings, Settings
- **Recent Activity**: "No activity yet - Jamie's actions will appear here as she starts working"
- STAGE 1 badge in nav with Log out button
- Clean, well-structured layout

### Auth Guards
- /onboarding, /dashboard, /prospects, /outreach, /inbox all properly redirect to /register when unauthenticated
- Security is correctly enforced across all protected routes

### Responsive Design
- No horizontal overflow on mobile (375px)
- CTA visible and tappable on mobile
- Navigation visible on mobile
- All sections stack properly in single-column mobile layout
- Mobile landing page flows well from hero through all sections

---

## What's Broken

### HIGH

- **[Onboarding flow skip]** Registration redirects directly to /dashboard, bypassing /onboarding entirely. A first-time user who clicks "Onboard Jamie in 10 min" -> registers -> lands on dashboard with 0 data and no onboarding. The onboarding flow (website scan, ICP selection, vibe, chat training) never happens. This means Jamie has no playbook, no ICP, no training data.

### MEDIUM

- **[Silent auth redirects]** Clicking "Dashboard" in nav when not logged in silently redirects to /register with no message explaining why. Should show "Sign in to access your dashboard" or similar.
- **[Nav logo text]** Nav link renders as "Jjamie@work" (double J) - likely a rendering issue with the logo icon + text.

---

## What's Confusing as a First-Time User

### Critical Flow Gap
The biggest UX problem is the **registration -> dashboard shortcut**. The intended flow is:
1. Landing page -> Click "Onboard Jamie in 10 min"
2. Register
3. Complete onboarding (scan website, pick ICP, set vibe, chat with Jamie, review playbook)
4. Deploy Jamie -> Dashboard

What actually happens:
1. Landing page -> Click "Onboard Jamie in 10 min"
2. Register
3. **Immediately land on Dashboard with zero data**
4. User sees "0 Prospects Found, 0 Messages Drafted" and has no idea what to do

The user never goes through the onboarding that trains Jamie.

### Additional UX Issues
- **No pricing on landing page:** Founders evaluating Jamie vs hiring a $70K/yr SDR need pricing upfront. Even "Free during beta" would help conversion.
- **No demo or preview:** There's no way to see what the dashboard looks like before registering.
- **Dashboard empty state could be better:** While it shows "Generate Prospects" and "No activity yet" messages, it doesn't guide the user to complete onboarding first.
- **Trust stages need brief explainer:** The Observe/Draft/Send/Reply/Autopilot progression is a novel concept - a tooltip or "Learn more" would help new users understand the trust model.

---

## Priority Fixes

### P0 - Ship Blockers
- **Fix registration -> onboarding -> dashboard flow.** After registration, redirect to /onboarding (not /dashboard). Only show dashboard after onboarding is complete and Jamie has a playbook.

### P1 - Must Fix Before Launch
- **Add onboarding gate on dashboard.** If `onboarding_profiles` is empty for the user, redirect /dashboard to /onboarding with a message like "Let's train Jamie first!"
- **Fix nav logo double-J rendering** ("Jjamie@work" -> "jamie@work")

### P2 - Should Fix
- **Add contextual redirect messages.** When auth guard fires, show "Sign in to continue" on the registration page.
- **Add pricing section to landing page.** Even "$0/mo during beta" or "Starting at $X/mo" helps founders evaluate.

### P3 - Nice to Have
- Add loading spinner on "Get Started" button during registration
- Add onboarding preview on landing page (animated mockup or video)
- Add tooltips to trust stage icons on landing page

---

## Screenshots

All screenshots saved to `test-results/customer-journey/`

| Screenshot | Description |
|-----------|-------------|
| `01-landing-above-fold.png` | Landing page hero + nav |
| `01-landing-full.png` | Full landing page scroll |
| `02-register-page.png` | Registration form (empty) |
| `02-register-filled.png` | Registration form (filled) |
| `02-register-after-submit.png` | **Dashboard after successful registration** |
| `03-onboarding-attempt.png` | Onboarding redirect (auth guard) |
| `04-dashboard.png` | Dashboard redirect (auth guard, diff session) |
| `05-prospects.png` | Prospects redirect (auth guard) |
| `06-outreach.png` | Outreach redirect (auth guard) |
| `07-inbox.png` | Inbox redirect (auth guard) |
| `08-mobile-landing.png` | Mobile viewport (375px) |
| `08-tablet-landing.png` | Tablet viewport (768px) |

---

## Recommendations

1. **Fix the onboarding flow** (P0) - Registration must redirect to /onboarding, not /dashboard. This is the #1 conversion killer. Without onboarding, Jamie has no training data and the dashboard is an empty shell.

2. **Add onboarding gate to dashboard** (P1) - If the user hasn't completed onboarding, redirect them there with a friendly message. Dashboard without a playbook is useless.

3. **Add pricing to landing page** (P2) - Startup founders need to compare Jamie ($X/mo) vs human SDR ($70K/yr). Even "Free during beta" builds urgency.

4. **Show contextual messages on auth redirects** (P2) - "Sign in to access your dashboard" instead of silently landing on /register.

5. **Add a loading state to registration** (P3) - The "Get Started" button should show a spinner or "Creating your account..." during submission.

---

## Test Execution Details

- **Framework:** Playwright 1.58.2 (Chromium)
- **Total tests:** 8
- **All passed:** Yes (8/8)
- **Total runtime:** ~54 seconds
- **Config:** Custom config without webServer (testing live Vercel deployment)
