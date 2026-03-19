# Design System — Jamie@Work

## Product Context
- **What this is:** AI SDR marketplace — startup founders "hire" Jamie, an AI sales dev rep, and train her in 10 minutes
- **Who it's for:** Startup founders doing $0-$1M ARR who can't afford a full-time SDR
- **Space/industry:** AI sales tools (peers: 11x, AiSDR, Artisan, Ava)
- **Project type:** Marketing site + web app (onboarding flow, dashboard)

## Aesthetic Direction
- **Direction:** Refined Minimal — warm, credible, human. Not another dark-mode SaaS clone.
- **Decoration level:** Intentional — subtle background blobs, warm surface treatments, no heavy patterns
- **Mood:** Like hiring a sharp, friendly colleague. Professional but approachable. Warm cream tones signal "we're different from cold enterprise tools."
- **Differentiation:** Warm cream background + two-tone purple/rose palette. Competitors all converge on dark mode with blue/purple gradients.

## Typography
- **Display/Hero:** Cabinet Grotesk (weight 800-900) — sharp geometric edges, tight letter-spacing (-0.05em), feels modern and confident without being cold
- **Body:** DM Sans (weight 400-700) — crisp geometric sans that pairs well with Cabinet Grotesk's sharp edges. More precise than General Sans.
- **UI/Labels:** DM Sans 600-700
- **Data/Tables:** JetBrains Mono (weight 400-600) — clean monospace for stats, badges, labels
- **Code:** JetBrains Mono
- **Loading:**
  ```
  Cabinet Grotesk: https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@700,800,900&display=swap
  DM Sans: https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap
  JetBrains Mono: https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap
  ```
- **Scale:** 11px (mono labels) / 13px (small body) / 14-15px (body) / 16-17px (large body) / 20px (h4) / 24px (h3) / 32-36px (h2) / clamp(44px, 7vw, 70px) (hero)
- **CSS classes:** `.hd` (display), `.bd` (body), `.mn` (mono)

## Color

- **Approach:** Balanced — purple primary + rose co-equal accent. Two-tone gives personality; most AI tools are monochrome.

### Brand
| Token | Hex | Usage |
|-------|-----|-------|
| Purple | #7C3AED | Primary CTA, links, brand identity |
| Purple Light | #F3F0FF | Badge backgrounds, icon bg (even cards) |
| Purple Border | #E9E5FF | Badge borders, subtle purple outlines |
| Purple Muted | #C4B5FD | Decorative text (@ symbol in logo), ghost elements |
| Rose | #F43F5E | Secondary accent, section markers, step bars, badges |
| Rose Light | #FFF1F2 | Section wash background (alternating sections) |
| Rose 100 | #FFE4E6 | Icon backgrounds (odd cards), rose badge bg |
| Rose Border | #FECDD3 | Rose badge/section borders |
| Rose Muted | #FDA4AF | Decorative rose elements |
| Pink | #EC4899 | Gradient endpoint (purple-to-pink gradients) |

### Surfaces
| Token | Hex | Usage |
|-------|-----|-------|
| Background | #F8F7F4 | Page background (warm cream) |
| Bg Wash | #F5F3EE | Subtle alternate section bg |
| Card | #FFFFFF | Card surfaces |
| Border | #E8E5DF | Default borders |
| Border Subtle | #F0EDE8 | Lighter borders on cards |

### Text
| Token | Hex | Usage |
|-------|-----|-------|
| Primary | #1A1A1A | Headlines, primary content |
| Medium | #57534E | Subheadings, emphasized body |
| Secondary | #6B6B6B | Body text, descriptions |
| Tertiary | #A3A3A3 | Metadata, timestamps, placeholders |

### Semantic
| Token | Hex |
|-------|-----|
| Success | #16A34A |
| Warning | #EA580C |
| Error | #DC2626 |
| Info | #0EA5E9 |

### Gradients
- **Primary CTA gradient:** `linear-gradient(135deg, #7C3AED, #EC4899)` — used sparingly for hero text, upgrade buttons
- **Background blobs:** Purple blob `rgba(139,92,246,.07)`, Rose blob `rgba(244,63,94,.05)` — floating, blurred, animated

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable
- **Scale:** 2xs(2px) xs(4px) sm(8px) md(16px) lg(24px) xl(32px) 2xl(48px) 3xl(64px)
- **Section padding:** 64px vertical (inside sections), 24px horizontal
- **Card padding:** 24-32px

## Layout
- **Approach:** Grid-disciplined
- **Grid:** 3 columns for capabilities/steps (collapses to 1 on mobile at 700px)
- **Max content width:** 1060px (centered)
- **Border radius:** sm(8px), md(12px), lg(16px), xl(20px), full(100px)
- **Fold structure:** Each section is `minHeight: 100vh` with flex centering. Content must never cut across viewport boundaries.
- **Responsive:** All grids collapse to single column at 700px breakpoint. No horizontal overflow.

## Motion
- **Approach:** Intentional — entrance animations on load, hover feedback on interactive elements
- **Easing:** enter(`cubic-bezier(.22,1,.36,1)`) exit(`ease-in`) move(`ease-in-out`)
- **Duration:** micro(50-100ms) short(150-250ms) medium(250ms for card hover) long(700ms for entrance)
- **Patterns:**
  - `.r` rise animation: translateY(24px) to 0, opacity 0 to 1, 700ms
  - `.r1-.r5` stagger delays: 50ms increments
  - `.card-lift:hover`: translateY(-4px) + shadow increase
  - `.cta-primary:hover`: translateY(-1px) + shadow glow
  - Background blobs: slow drift animation (18-25s cycle)

## Section Color Pattern (Landing Page)
- **Fold 1 (Hero):** Default cream background (#F8F7F4)
- **Fold 2 (Capabilities):** Rose wash background (#FFF1F2 blend) with rose border accents
- **Fold 3 (How It Works):** Default cream background
- **Fold 4 (CTA):** Purple-tinted wash (#F3F0FF blend)
- **Section labels alternate:** Purple for odd sections, Rose for even sections

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-18 | Swapped body font from General Sans to DM Sans | Crisper geometric feel, pairs better with Cabinet Grotesk's sharp edges |
| 2026-03-18 | Added Rose (#F43F5E) as co-equal accent | Breaks purple monotone, adds warmth, differentiates from monochrome AI competitors |
| 2026-03-18 | Rose wash (#FFF1F2) for alternating sections | Creates visual rhythm between folds, prevents monotone cream |
| 2026-03-18 | Responsive grid collapse at 700px | Prevents content overflow on mobile, ensures fold containment |
| 2026-03-18 | No dark mode | Explicit decision — warm cream is the brand differentiator |
| 2026-03-18 | No red strikethrough pricing | Removed per design review — felt aggressive/cheap for the brand |
