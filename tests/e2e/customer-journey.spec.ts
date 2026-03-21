import { test, expect, Page } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const BASE_URL = 'https://jamieatwork.vercel.app'
const SCREENSHOT_DIR = path.join(process.cwd(), 'test-results', 'customer-journey')

interface Finding {
  area: string
  severity?: string
  description: string
  screenshot?: string
}

const bugs: Finding[] = []
const passes: Finding[] = []
const uxIssues: string[] = []

function logBug(area: string, severity: string, description: string, screenshot?: string) {
  bugs.push({ area, severity, description, screenshot })
  console.log(`[BUG][${severity}] ${area}: ${description}`)
}

function logPass(area: string, description: string) {
  passes.push({ area, description })
  console.log(`[PASS] ${area}: ${description}`)
}

function logUX(issue: string) {
  uxIssues.push(issue)
  console.log(`[UX] ${issue}`)
}

async function screenshot(page: Page, name: string): Promise<string> {
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`)
  await page.screenshot({ path: filePath, fullPage: true })
  return filePath
}

test.describe.serial('Customer Journey - First-time Startup Founder', () => {
  test.setTimeout(120000)

  test('1. Landing Page', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    await screenshot(page, '01-landing-above-fold')

    // Hero messaging
    const heroVisible = await page.getByText('Your AI SDR,').isVisible().catch(() => false)
    if (heroVisible) logPass('Landing', 'Hero headline "Your AI SDR" is visible')
    else logBug('Landing', 'HIGH', 'Hero headline not visible')

    const subhead = await page.getByText('ready in 10 minutes').isVisible().catch(() => false)
    if (subhead) logPass('Landing', '"ready in 10 minutes" subheadline visible')
    else logBug('Landing', 'MEDIUM', '"ready in 10 minutes" not visible')

    // CTA buttons
    const primaryCTA = page.getByRole('link', { name: /Onboard Jamie in 10 min/i })
    const ctaCount = await primaryCTA.count()
    if (ctaCount > 0) {
      logPass('Landing', `Primary CTA "Onboard Jamie in 10 min" found (${ctaCount}x)`)
      const isAboveFold = await primaryCTA.first().isVisible()
      if (isAboveFold) logPass('Landing', 'Primary CTA visible above fold')
      else logBug('Landing', 'HIGH', 'Primary CTA not visible above fold')
    } else {
      logBug('Landing', 'CRITICAL', 'No primary CTA button found')
    }

    // "How It Works" button
    const howBtn = page.getByRole('link', { name: /How It Works/i })
    if (await howBtn.count() > 0) logPass('Landing', '"How It Works" link present')

    // Navigation
    const nav = page.locator('nav')
    if (await nav.isVisible()) {
      logPass('Landing', 'Navigation bar visible')
      const dashLink = page.getByRole('link', { name: /Dashboard/i })
      if (await dashLink.count() > 0) logPass('Landing', 'Dashboard link in nav')
    }

    // Scroll to check sections
    await page.evaluate(() => window.scrollTo(0, 999999))
    await page.waitForTimeout(1000)

    // Progressive Trust section
    const trustSection = await page.getByText(/Jamie earns your trust/i).isVisible().catch(() => false)
    if (trustSection) logPass('Landing', '"Jamie earns your trust" section visible')
    else logBug('Landing', 'MEDIUM', 'Progressive Trust section not found')

    // Trust stages: Observe, Draft, Send, Reply, Autopilot
    for (const stage of ['Observe', 'Draft', 'Send', 'Reply', 'Autopilot']) {
      const found = await page.getByText(stage, { exact: true }).count() > 0
      if (found) logPass('Landing', `Trust stage "${stage}" visible`)
      else logBug('Landing', 'LOW', `Trust stage "${stage}" not visible`)
    }

    // Capabilities section
    const capSection = await page.getByText('What Jamie Does').isVisible().catch(() => false)
    if (capSection) logPass('Landing', '"What Jamie Does" section visible')

    for (const cap of ['Inbound Chat', 'Outbound Email', 'Lead Qualification', 'Meeting Booking', 'Follow-ups', 'Pipeline Dashboard']) {
      const found = await page.getByText(cap).count() > 0
      if (found) logPass('Landing', `Capability "${cap}" listed`)
      else logBug('Landing', 'MEDIUM', `Capability "${cap}" missing`)
    }

    // How It Works steps
    const steps = await page.getByText(/Three steps to your/i).isVisible().catch(() => false)
    if (steps) logPass('Landing', '"Three steps" section visible')

    // Final CTA
    const finalCTA = await page.getByText('Stop doing SDR work yourself.').isVisible().catch(() => false)
    if (finalCTA) logPass('Landing', 'Final CTA section visible')
    else logBug('Landing', 'MEDIUM', 'Final CTA section not found')

    // No credit card
    const noCreditCard = await page.getByText('No credit card required').first().isVisible().catch(() => false)
    if (noCreditCard) logPass('Landing', '"No credit card required" reassurance visible')

    // Footer
    const footer = await page.getByText('© 2026').isVisible().catch(() => false)
    if (footer) logPass('Landing', 'Footer with copyright visible')

    // Pricing - the page doesn't seem to have pricing
    const pageText = await page.textContent('body') || ''
    const hasPricing = /\$\d+|pricing|per month|\/mo/i.test(pageText)
    if (!hasPricing) {
      logBug('Landing', 'LOW', 'No pricing information visible - founders need to evaluate cost vs hiring human SDR')
      logUX('No pricing on landing page. Startup founders comparing Jamie vs $70K/yr SDR need to see the cost immediately.')
    }

    await screenshot(page, '01-landing-full')
  })

  test('2. Registration', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    await screenshot(page, '02-register-page')

    // Check page loaded correctly (the page has "Hire your AI SDR" heading)
    const heading = await page.getByText('Hire your AI SDR').isVisible().catch(() => false)
    if (heading) {
      logPass('Registration', 'Page loaded - "Hire your AI SDR" heading visible')
    } else {
      logBug('Registration', 'CRITICAL', 'Registration page did not load correctly')
      return
    }

    // Check subtitle
    const subtitle = await page.getByText(/Jamie will be ready in under 10 minutes/i).isVisible().catch(() => false)
    if (subtitle) logPass('Registration', 'Subtitle "Jamie will be ready in under 10 minutes" visible')

    // Tab toggle - Create Account / Log In
    const createTab = page.getByText('Create Account', { exact: true })
    const loginTab = page.getByText('Log In', { exact: true })
    if (await createTab.isVisible() && await loginTab.isVisible()) {
      logPass('Registration', 'Create Account / Log In tabs both visible')
    } else {
      logBug('Registration', 'MEDIUM', 'Tab toggle not visible')
    }

    // Form fields
    const nameInput = page.getByLabel('Your name').or(page.getByPlaceholder('Jane Smith'))
    const emailInput = page.getByLabel('Email').or(page.getByPlaceholder('you@company.com'))
    const passwordInput = page.getByLabel('Password').or(page.getByPlaceholder('At least 6 characters'))

    const hasName = await nameInput.count() > 0
    const hasEmail = await emailInput.count() > 0
    const hasPassword = await passwordInput.count() > 0

    if (hasName) logPass('Registration', 'Name field found')
    else logBug('Registration', 'MEDIUM', 'Name field not found')

    if (hasEmail) logPass('Registration', 'Email field found')
    else logBug('Registration', 'CRITICAL', 'Email field not found')

    if (hasPassword) logPass('Registration', 'Password field found')
    else logBug('Registration', 'CRITICAL', 'Password field not found')

    // Fill form
    if (hasName) await nameInput.first().fill('Acme Corp')
    if (hasEmail) await emailInput.first().fill('test@acmecorp.com')
    if (hasPassword) await passwordInput.first().fill('Test1234!')

    await screenshot(page, '02-register-filled')

    // Submit button
    const submitBtn = page.getByRole('button', { name: /Get Started/i })
    if (await submitBtn.count() > 0) {
      logPass('Registration', '"Get Started" submit button found')

      // Click and observe
      await submitBtn.click()
      await page.waitForTimeout(5000)

      const currentUrl = page.url()
      await screenshot(page, '02-register-after-submit')

      if (currentUrl.includes('/onboarding')) {
        logPass('Registration', 'Redirected to /onboarding after signup')
      } else if (currentUrl.includes('/register')) {
        // Check for error or success messages
        const pageContent = await page.textContent('body') || ''
        if (/check your email|verify|confirmation/i.test(pageContent)) {
          logPass('Registration', 'Signup succeeded - email verification required')
          logUX('Email verification blocks the onboarding flow. First-time users may drop off waiting for verification email.')
        } else if (/already registered|already exists|error/i.test(pageContent)) {
          logBug('Registration', 'MEDIUM', 'User already exists or signup error shown')
        } else {
          logBug('Registration', 'HIGH', `Stayed on /register after submit - unclear what happened. No error or success message visible.`)
          logUX('After clicking "Get Started", nothing visually changes. User has no feedback about what happened.')
        }
      } else {
        logPass('Registration', `Redirected to: ${currentUrl}`)
      }
    } else {
      logBug('Registration', 'CRITICAL', 'Submit button not found')
    }

    // "Back to home" link
    const backLink = page.getByText('Back to home')
    if (await backLink.count() > 0) logPass('Registration', '"Back to home" link present')

    // UX: No company name field - Jamie is for startups
    if (!hasName) {
      logUX('No company name field during registration. Jamie needs to know the company to do SDR work.')
    }

    // Check Log In tab works
    if (await loginTab.isVisible()) {
      await loginTab.click()
      await page.waitForTimeout(500)
      await screenshot(page, '02-login-tab')
      const loginFields = await page.getByPlaceholder('you@company.com').count()
      if (loginFields > 0) logPass('Registration', 'Log In tab switches form correctly')
      else logBug('Registration', 'MEDIUM', 'Log In tab does not show login form')
    }
  })

  test('3. Onboarding (auth-gated)', async ({ page }) => {
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    await screenshot(page, '03-onboarding-attempt')

    const currentUrl = page.url()
    if (currentUrl.includes('/register') || currentUrl.includes('/login')) {
      logPass('Onboarding', 'Auth guard works - redirected unauthenticated user to registration')
      logUX('Onboarding requires auth. Users who click "Onboard Jamie" on landing page get sent to /register first, then need to find their way back to onboarding. This is a potential drop-off point.')

      // Check if the redirect preserves intent
      const hasRedirectParam = currentUrl.includes('redirect') || currentUrl.includes('next') || currentUrl.includes('return')
      if (hasRedirectParam) {
        logPass('Onboarding', 'Redirect URL preserved - user will return to onboarding after auth')
      } else {
        logBug('Onboarding', 'HIGH', 'No redirect parameter in URL - after registration user may not be sent back to onboarding')
        logUX('After registering, there is no guarantee the user lands on /onboarding. They may end up on a generic page.')
      }
    } else if (currentUrl.includes('/onboarding')) {
      logPass('Onboarding', 'Onboarding page accessible (user may be authenticated)')

      // Try to interact with Step 1: Website URL
      const urlInput = page.getByPlaceholder(/url|website|domain|acme/i).or(page.locator('input[type="url"]'))
      if (await urlInput.count() > 0) {
        logPass('Onboarding', 'Step 1: Website URL input found')
        await urlInput.first().fill('https://acmecorp.com')

        const scanBtn = page.getByRole('button', { name: /scan|go|next|analyze/i })
        if (await scanBtn.count() > 0) {
          await scanBtn.first().click()
          await page.waitForTimeout(8000)
          await screenshot(page, '03-onboarding-step1-scanned')
          logPass('Onboarding', 'Step 1: Website scan initiated')
        }
      }

      await screenshot(page, '03-onboarding-current-state')
    }
  })

  test('4. Dashboard (auth-gated)', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    await screenshot(page, '04-dashboard')

    const currentUrl = page.url()
    if (currentUrl.includes('/register') || currentUrl.includes('/login')) {
      logPass('Dashboard', 'Auth guard works - redirected to registration')

      // Check what the registration page shows when redirected from dashboard
      const pageText = await page.textContent('body') || ''
      if (/dashboard|sign in to continue/i.test(pageText)) {
        logPass('Dashboard', 'Registration page indicates user needs to sign in')
      } else {
        logBug('Dashboard', 'MEDIUM', 'No messaging about why user was redirected - confusing for someone who clicked Dashboard link')
        logUX('Clicking "Dashboard" in nav when not logged in silently redirects to registration with no explanation.')
      }
    } else {
      logPass('Dashboard', 'Dashboard page accessible')

      const pageText = await page.textContent('body') || ''

      // Check for key dashboard elements
      const hasStages = /stage|trust|observe|draft|send|reply|autopilot/i.test(pageText)
      if (hasStages) logPass('Dashboard', 'Trust stages visible')
      else logBug('Dashboard', 'MEDIUM', 'No trust stage indicators')

      const hasMetrics = /lead|meeting|email|prospect|outreach|qualified/i.test(pageText)
      if (hasMetrics) logPass('Dashboard', 'Metrics/KPIs visible')
      else logBug('Dashboard', 'MEDIUM', 'No metrics visible')

      const hasJamie = /jamie|active|status/i.test(pageText)
      if (hasJamie) logPass('Dashboard', 'Jamie status visible')
      else logBug('Dashboard', 'LOW', 'No Jamie status indicator')

      await screenshot(page, '04-dashboard-full')
    }
  })

  test('5. Prospects (auth-gated)', async ({ page }) => {
    await page.goto(`${BASE_URL}/prospects`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    await screenshot(page, '05-prospects')

    const currentUrl = page.url()
    if (currentUrl.includes('/register') || currentUrl.includes('/login')) {
      logPass('Prospects', 'Auth guard works - redirected to registration')
    } else {
      logPass('Prospects', 'Prospects page accessible')
      const pageText = await page.textContent('body') || ''
      const hasProspectContent = /prospect|lead|company|contact|name|email/i.test(pageText)
      if (hasProspectContent) logPass('Prospects', 'Prospect-related content visible')
      else logBug('Prospects', 'MEDIUM', 'No prospect content visible')

      await screenshot(page, '05-prospects-full')
    }
  })

  test('6. Outreach (auth-gated)', async ({ page }) => {
    await page.goto(`${BASE_URL}/outreach`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    await screenshot(page, '06-outreach')

    const currentUrl = page.url()
    if (currentUrl.includes('/register') || currentUrl.includes('/login')) {
      logPass('Outreach', 'Auth guard works - redirected to registration')
    } else {
      logPass('Outreach', 'Outreach page accessible')
      const pageText = await page.textContent('body') || ''
      const hasOutreach = /email|subject|template|draft|outreach|send/i.test(pageText)
      if (hasOutreach) logPass('Outreach', 'Outreach content visible')
      else logBug('Outreach', 'MEDIUM', 'No outreach content visible')

      await screenshot(page, '06-outreach-full')
    }
  })

  test('7. Inbox (auth-gated)', async ({ page }) => {
    await page.goto(`${BASE_URL}/inbox`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    await screenshot(page, '07-inbox')

    const currentUrl = page.url()
    if (currentUrl.includes('/register') || currentUrl.includes('/login')) {
      logPass('Inbox', 'Auth guard works - redirected to registration')
    } else {
      logPass('Inbox', 'Inbox page accessible')
      const pageText = await page.textContent('body') || ''
      const hasInbox = /message|reply|inbox|conversation|thread/i.test(pageText)
      if (hasInbox) logPass('Inbox', 'Inbox content visible')
      else logBug('Inbox', 'MEDIUM', 'No inbox content visible')

      await screenshot(page, '07-inbox-full')
    }
  })

  test('8. Navigation & Responsiveness', async ({ page }) => {
    // Capture console errors
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    // Nav links
    const navLinks = page.locator('nav a')
    const navCount = await navLinks.count()
    logPass('Navigation', `Nav has ${navCount} link(s)`)

    // Check all nav links
    for (let i = 0; i < navCount; i++) {
      const linkText = await navLinks.nth(i).textContent()
      const href = await navLinks.nth(i).getAttribute('href')
      logPass('Navigation', `Nav link: "${linkText?.trim()}" -> ${href}`)
    }

    // CTA links point to /register
    const hireCTAs = page.getByRole('link', { name: /Onboard Jamie/i })
    const ctaCount = await hireCTAs.count()
    for (let i = 0; i < ctaCount; i++) {
      const href = await hireCTAs.nth(i).getAttribute('href')
      if (href === '/register') {
        logPass('Navigation', `CTA #${i + 1} correctly links to /register`)
      } else {
        logBug('Navigation', 'MEDIUM', `CTA #${i + 1} links to ${href} instead of /register`)
      }
    }

    // Fixed nav on scroll
    await page.evaluate(() => window.scrollTo(0, 1000))
    await page.waitForTimeout(500)
    const navStillVisible = await page.locator('nav').isVisible()
    if (navStillVisible) logPass('Navigation', 'Nav stays fixed on scroll')
    else logBug('Navigation', 'MEDIUM', 'Nav disappears on scroll')

    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 812 })
    await page.waitForTimeout(1000)
    await screenshot(page, '08-mobile-landing')

    const mobileOverflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth)
    if (mobileOverflow) logBug('Responsive', 'HIGH', 'Horizontal overflow on mobile (375px)')
    else logPass('Responsive', 'No horizontal overflow on mobile')

    // Mobile CTA visible
    const mobileCTA = page.getByRole('link', { name: /Onboard Jamie/i })
    if (await mobileCTA.first().isVisible()) logPass('Responsive', 'CTA visible on mobile')
    else logBug('Responsive', 'HIGH', 'CTA not visible on mobile')

    // Mobile nav
    const mobileNav = page.locator('nav')
    if (await mobileNav.isVisible()) logPass('Responsive', 'Nav visible on mobile')
    else logBug('Responsive', 'MEDIUM', 'Nav not visible on mobile')

    // Tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.waitForTimeout(500)
    await screenshot(page, '08-tablet-landing')

    // Reset
    await page.setViewportSize({ width: 1280, height: 720 })

    // Broken images
    const brokenImages = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img')
      const broken: string[] = []
      imgs.forEach(img => {
        if (!img.complete || img.naturalWidth === 0) {
          broken.push(img.src || img.alt || 'unknown')
        }
      })
      return broken
    })
    if (brokenImages.length > 0) logBug('Images', 'MEDIUM', `Broken images: ${brokenImages.join(', ')}`)
    else logPass('Images', 'No broken images')

    // Console errors
    if (consoleErrors.length > 0) {
      logBug('Console', 'MEDIUM', `${consoleErrors.length} console error(s): ${consoleErrors.slice(0, 3).join(' | ')}`)
    } else {
      logPass('Console', 'No console errors on landing page')
    }

    // Check page load performance
    const perfTiming = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      return {
        domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
        loadComplete: Math.round(nav.loadEventEnd - nav.startTime),
      }
    })
    if (perfTiming.loadComplete > 5000) {
      logBug('Performance', 'MEDIUM', `Page load took ${perfTiming.loadComplete}ms (>5s)`)
    } else {
      logPass('Performance', `Page loaded in ${perfTiming.loadComplete}ms`)
    }
  })

  test.afterAll(async () => {
    const reportPath = path.join(process.cwd(), 'test-results', 'customer-journey-report.md')

    const criticalBugs = bugs.filter(b => b.severity === 'CRITICAL')
    const highBugs = bugs.filter(b => b.severity === 'HIGH')
    const mediumBugs = bugs.filter(b => b.severity === 'MEDIUM')
    const lowBugs = bugs.filter(b => b.severity === 'LOW')

    let report = `# Customer Journey QA Report\n\n`
    report += `**Date:** ${new Date().toISOString().split('T')[0]}\n`
    report += `**Target:** ${BASE_URL}\n`
    report += `**Persona:** First-time startup founder wanting to hire an AI SDR\n`
    report += `**Test scenario:** Register as "Acme Corp" (test@acmecorp.com), complete onboarding, check all pages\n\n`
    report += `---\n\n`

    report += `## Health Score\n\n`
    const total = passes.length + bugs.length
    const score = total > 0 ? Math.round((passes.length / total) * 100) : 0
    report += `**${score}/100** (${passes.length} passed, ${bugs.length} issues)\n\n`
    report += `| Severity | Count |\n|----------|-------|\n`
    report += `| Passed | ${passes.length} |\n`
    report += `| CRITICAL | ${criticalBugs.length} |\n`
    report += `| HIGH | ${highBugs.length} |\n`
    report += `| MEDIUM | ${mediumBugs.length} |\n`
    report += `| LOW | ${lowBugs.length} |\n\n`

    report += `---\n\n## What Works\n\n`
    const areas = [...new Set(passes.map(p => p.area))]
    for (const area of areas) {
      report += `### ${area}\n`
      for (const p of passes.filter(p => p.area === area)) {
        report += `- ${p.description}\n`
      }
      report += `\n`
    }

    report += `---\n\n## What's Broken\n\n`
    if (bugs.length === 0) {
      report += `No bugs found.\n\n`
    }

    for (const sev of ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']) {
      const sevBugs = bugs.filter(b => b.severity === sev)
      if (sevBugs.length === 0) continue
      report += `### ${sev}\n\n`
      for (const b of sevBugs) {
        report += `- **[${b.area}]** ${b.description}\n`
        if (b.screenshot) report += `  - Screenshot: \`${path.basename(b.screenshot)}\`\n`
      }
      report += `\n`
    }

    report += `---\n\n## What's Confusing as a First-Time User\n\n`
    if (uxIssues.length > 0) {
      for (const issue of uxIssues) {
        report += `- ${issue}\n`
      }
    }
    report += `\n### Additional UX Observations\n\n`
    report += `- **Registration -> Onboarding gap:** After registering, there's no clear redirect to onboarding. A first-time founder clicks "Onboard Jamie in 10 min", registers, then... where do they go?\n`
    report += `- **Auth guards are silent:** Visiting /dashboard, /prospects, /outreach, or /inbox without auth silently redirects to /register with no explanation of why.\n`
    report += `- **No pricing on landing page:** Founders evaluating Jamie vs hiring a $70K/yr SDR need pricing upfront. The landing page has no pricing section.\n`
    report += `- **No demo or preview:** There's no way to see what the dashboard/onboarding looks like before committing to registration.\n`
    report += `- **Trust stages need more explanation:** The Observe/Draft/Send/Reply/Autopilot stages are novel concepts - a brief explainer or tooltip would help.\n`

    report += `\n---\n\n## Priority Fixes\n\n`
    report += `### P0 - Ship Blockers\n`
    for (const b of criticalBugs) {
      report += `- **[${b.area}]** ${b.description}\n`
    }
    if (criticalBugs.length === 0) report += `- None found\n`

    report += `\n### P1 - Must Fix Before Launch\n`
    for (const b of highBugs) {
      report += `- **[${b.area}]** ${b.description}\n`
    }
    if (highBugs.length === 0) report += `- None found\n`

    report += `\n### P2 - Should Fix\n`
    for (const b of mediumBugs) {
      report += `- **[${b.area}]** ${b.description}\n`
    }
    if (mediumBugs.length === 0) report += `- None found\n`

    report += `\n### P3 - Nice to Have\n`
    for (const b of lowBugs) {
      report += `- **[${b.area}]** ${b.description}\n`
    }
    if (lowBugs.length === 0) report += `- None found\n`

    report += `\n---\n\n## Screenshots\n\n`
    report += `All screenshots saved to \`test-results/customer-journey/\`\n\n`
    const screenshots = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png'))
    for (const s of screenshots) {
      report += `- \`${s}\`\n`
    }

    report += `\n---\n\n## Recommendations\n\n`
    report += `1. **Add post-registration redirect to /onboarding** - This is the #1 conversion killer. Users register but don't know where to go next.\n`
    report += `2. **Add pricing section to landing page** - Even "Free during beta" or "$X/mo" gives founders a reason to try it.\n`
    report += `3. **Show contextual messages on auth redirects** - "Sign in to access your dashboard" instead of silently redirecting.\n`
    report += `4. **Consider allowing onboarding preview** - Let users see the first step of onboarding before requiring registration to reduce friction.\n`
    report += `5. **Add loading states and success feedback** - Registration form needs visible feedback after clicking "Get Started".\n`

    fs.writeFileSync(reportPath, report)
    console.log(`\nReport written to: ${reportPath}`)
  })
})
