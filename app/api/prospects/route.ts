import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Anon client for reads and auth validation
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Service role client for inserts/updates (bypasses RLS)
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : supabase

// ── Types ───────────────────────────────────────────────────────────

interface OnboardingProfile {
  product_name: string
  product_description: string
  problem_solved: string
  target_industries: string
  target_titles: string
  company_sizes: string
  geographies: string
}

interface ProductAnalysis {
  buyer_trigger_signals: string[]
  company_characteristics: string[]
  pain_points: string[]
  ideal_company_types: string[]
  keywords_to_search: string[]
}

interface DiscoveredCompany {
  company_name: string
  website: string
  city: string
  state: string
  industry: string
  employee_count: string
  source: string
}

interface TitleMapping {
  primary_title: string
  secondary_title: string
  reasoning: string
}

interface ResolvedContact {
  name: string | null
  email: string | null
  phone: string | null
  linkedin_url: string | null
  confidence: 'high' | 'medium' | 'low'
  source: string
}

// ── Helpers ──────────────────────────────────────────────────────────

function parseJSON<T>(text: string, fallback: T): T {
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    // Try to extract JSON from mixed text
    const match = cleaned.match(/\[[\s\S]*\]/) || cleaned.match(/\{[\s\S]*\}/)
    if (match) {
      try { return JSON.parse(match[0]) } catch { /* fall through */ }
    }
    return fallback
  }
}

function extractTextFromClaude(response: Anthropic.Message): string {
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('\n')
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => {
      setTimeout(() => {
        console.warn(`${label} timed out after ${ms}ms`)
        resolve(null)
      }, ms)
    }),
  ])
}

function inferEmail(name: string, domain: string): { email: string; inferred: boolean } {
  const parts = name.toLowerCase().split(/\s+/)
  if (parts.length >= 2) {
    return { email: `${parts[0]}.${parts[parts.length - 1]}@${domain}`, inferred: true }
  }
  return { email: `${parts[0]}@${domain}`, inferred: true }
}

function domainFromWebsite(website: string): string {
  return website.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').toLowerCase()
}

function deduplicateCompanies(companies: DiscoveredCompany[]): DiscoveredCompany[] {
  const seen = new Map<string, DiscoveredCompany>()
  for (const c of companies) {
    const key = c.company_name.toLowerCase().trim()
    if (!key || !c.website) continue
    if (!seen.has(key)) {
      seen.set(key, c)
    }
  }
  return Array.from(seen.values())
}

// ── STAGE 0: Product Analysis ────────────────────────────────────────

async function analyzeProduct(profile: OnboardingProfile): Promise<ProductAnalysis> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `You are analyzing a B2B startup's product to identify ideal prospects.

Product: ${profile.product_name}
Description: ${profile.product_description}
Problem solved: ${profile.problem_solved}
Target industries: ${profile.target_industries}
Target titles: ${profile.target_titles}

Output ONLY a JSON object:
{
  "buyer_trigger_signals": ["signal1", "signal2", "signal3"],
  "company_characteristics": ["characteristic1", "characteristic2"],
  "pain_points": ["pain1", "pain2", "pain3"],
  "ideal_company_types": ["type1", "type2", "type3"],
  "keywords_to_search": ["keyword1", "keyword2", "keyword3"]
}`,
    }],
  })

  return parseJSON<ProductAnalysis>(extractTextFromClaude(response), {
    buyer_trigger_signals: ['scaling sales team', 'hiring SDRs', 'fundraising'],
    company_characteristics: ['B2B SaaS', 'seed to Series B'],
    pain_points: ['manual outbound', 'low reply rates', 'no dedicated SDR'],
    ideal_company_types: ['early-stage SaaS', 'B2B startups'],
    keywords_to_search: [profile.target_industries || 'SaaS startups', profile.product_name],
  })
}

// ── STAGE 1: Company Discovery ───────────────────────────────────────

async function discoverViaClaudeWeb(
  profile: OnboardingProfile,
  analysis: ProductAnalysis
): Promise<DiscoveredCompany[]> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    messages: [{
      role: 'user',
      content: `Search the web and find 15 real companies that would be ideal customers for this product:
Product: ${profile.product_name} — ${profile.product_description}
Industry: ${profile.target_industries}
Company characteristics: ${analysis.company_characteristics.join(', ')}
Keywords: ${analysis.keywords_to_search.join(', ')}
Company sizes: ${profile.company_sizes || '11-50, 51-200'}

Return ONLY a JSON array:
[{
  "company_name": "real company name",
  "website": "real website domain",
  "city": "city",
  "state": "state or country",
  "industry": "specific industry",
  "employee_count": "estimated size range",
  "source": "claude_web"
}]
Only include real companies with real websites. No hallucinated companies.`,
    }],
  })

  return parseJSON<DiscoveredCompany[]>(extractTextFromClaude(response), [])
}

async function discoverViaGemini(
  profile: OnboardingProfile,
  analysis: ProductAnalysis
): Promise<DiscoveredCompany[]> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.log('Gemini: no API key configured, skipping')
    return []
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are a B2B sales researcher. Find 15 real companies that would buy this product:
Product: ${profile.product_name} — ${profile.product_description}
Target industry: ${profile.target_industries}
Ideal company type: ${analysis.ideal_company_types.join(', ')}
Company sizes: ${profile.company_sizes || '11-50, 51-200'}

Return ONLY a JSON array (no markdown, no backticks):
[{
  "company_name": "real company name",
  "website": "real website domain",
  "city": "city",
  "state": "state",
  "industry": "industry",
  "employee_count": "size estimate",
  "source": "gemini"
}]
Only real companies. No fake names.`,
          }],
        }],
      }),
    }
  )

  if (!res.ok) {
    console.warn(`Gemini: HTTP ${res.status}`)
    return []
  }

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]'
  return parseJSON<DiscoveredCompany[]>(text, [])
}

async function discoverViaPerplexity(
  profile: OnboardingProfile,
  analysis: ProductAnalysis
): Promise<DiscoveredCompany[]> {
  const apiKey = process.env.PERPLEXITY_API_KEY
  if (!apiKey) {
    console.log('Perplexity: no API key configured, skipping')
    return []
  }

  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-sonar-small-128k-online',
      messages: [{
        role: 'user',
        content: `Find 15 real companies in ${profile.target_industries} that would need: ${profile.product_description}
Focus on: ${analysis.ideal_company_types.join(', ')}
Company sizes: ${profile.company_sizes || '11-50, 51-200'}

Return ONLY a JSON array (no markdown):
[{
  "company_name": "name",
  "website": "domain",
  "city": "city",
  "state": "state",
  "industry": "industry",
  "employee_count": "size",
  "source": "perplexity"
}]`,
      }],
      max_tokens: 2000,
    }),
  })

  if (!res.ok) {
    console.warn(`Perplexity: HTTP ${res.status}`)
    return []
  }

  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content || '[]'
  return parseJSON<DiscoveredCompany[]>(text, [])
}

// ── STAGE 2: Decision Maker Mapping ──────────────────────────────────

async function mapDecisionMakers(
  companies: DiscoveredCompany[],
  profile: OnboardingProfile
): Promise<Map<string, TitleMapping>> {
  const results = new Map<string, TitleMapping>()

  // Batch companies into groups of 5 for efficiency
  const batches: DiscoveredCompany[][] = []
  for (let i = 0; i < companies.length; i += 5) {
    batches.push(companies.slice(i, i + 5))
  }

  await Promise.all(batches.map(async (batch) => {
    const companySummaries = batch.map((c, i) =>
      `${i + 1}. ${c.company_name} (${c.industry}, ~${c.employee_count} employees)`
    ).join('\n')

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `For each company below, determine who would be the best buyer for this product:
Product: ${profile.product_name} — ${profile.product_description}
Suggested target titles: ${profile.target_titles || 'CEO, VP Sales, Head of Growth'}

Companies:
${companySummaries}

Consider company size — small companies (<50) have C-suite buyers, large companies (200+) have VP/Director buyers.

Return ONLY a JSON array with one object per company:
[{
  "company_name": "exact company name",
  "primary_title": "exact title",
  "secondary_title": "backup title",
  "reasoning": "one sentence why"
}]`,
      }],
    })

    const mappings = parseJSON<Array<TitleMapping & { company_name: string }>>(
      extractTextFromClaude(response), []
    )
    for (const m of mappings) {
      results.set(m.company_name.toLowerCase(), {
        primary_title: m.primary_title,
        secondary_title: m.secondary_title,
        reasoning: m.reasoning,
      })
    }
  }))

  return results
}

// ── STAGE 3: Contact Resolution ──────────────────────────────────────

async function resolveContacts(
  companies: DiscoveredCompany[],
  titleMap: Map<string, TitleMapping>,
  profile: OnboardingProfile,
  analysis: ProductAnalysis
): Promise<Array<{
  company: DiscoveredCompany
  title: TitleMapping
  contact: ResolvedContact
  pain_points: string[]
  match_reasons: string[]
  talking_points: string[]
}>> {
  // Process in batches of 5 for parallelism without overwhelming APIs
  const results: Array<{
    company: DiscoveredCompany
    title: TitleMapping
    contact: ResolvedContact
    pain_points: string[]
    match_reasons: string[]
    talking_points: string[]
  }> = []

  const batches: DiscoveredCompany[][] = []
  for (let i = 0; i < companies.length; i += 5) {
    batches.push(companies.slice(i, i + 5))
  }

  for (const batch of batches) {
    const batchResults = await Promise.all(batch.map(async (company) => {
      const titleMapping = titleMap.get(company.company_name.toLowerCase()) || {
        primary_title: profile.target_titles?.split(',')[0]?.trim() || 'CEO',
        secondary_title: 'Head of Growth',
        reasoning: 'Default mapping',
      }

      // Step A: Web search for real person
      let contact: ResolvedContact = {
        name: null,
        email: null,
        phone: null,
        linkedin_url: null,
        confidence: 'low',
        source: 'inferred',
      }

      try {
        const searchResult = await withTimeout(
          anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1500,
            tools: [{ type: 'web_search_20250305', name: 'web_search' }],
            messages: [{
              role: 'user',
              content: `Search for the ${titleMapping.primary_title} at ${company.company_name} (${company.website}).
Find their full name, LinkedIn profile URL, and email if publicly available.
If you can't find the ${titleMapping.primary_title}, try ${titleMapping.secondary_title}.

Return ONLY JSON (no markdown):
{
  "name": "full name or null",
  "email": "email or null",
  "phone": "phone or null",
  "linkedin_url": "direct LinkedIn profile URL or null",
  "confidence": "high/medium/low",
  "source": "where you found this"
}`,
            }],
          }),
          10000,
          `Contact search: ${company.company_name}`
        )

        if (searchResult) {
          const parsed = parseJSON<ResolvedContact>(
            extractTextFromClaude(searchResult),
            contact
          )
          contact = { ...contact, ...parsed }
        }
      } catch (err) {
        console.warn(`Contact search failed for ${company.company_name}:`, err)
      }

      // Step B: LinkedIn search URL fallback
      if (!contact.linkedin_url && contact.name) {
        contact.linkedin_url = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(contact.name + ' ' + company.company_name)}`
      } else if (!contact.linkedin_url) {
        contact.linkedin_url = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(titleMapping.primary_title + ' ' + company.company_name)}`
      }

      // Step C: Email pattern inference
      if (!contact.email && contact.name) {
        const domain = domainFromWebsite(company.website)
        const { email } = inferEmail(contact.name, domain)
        contact.email = email
      }

      // Generate pain points and match reasons specific to this prospect
      const pain_points = analysis.pain_points.slice(0, 3)
      const match_reasons = [
        `${company.company_name} operates in ${company.industry} — direct ICP match for ${profile.product_name}`,
        `${titleMapping.primary_title} at a ${company.employee_count}-person company is the ideal buyer`,
        titleMapping.reasoning,
      ]
      const talking_points = [
        `Reference their ${company.industry} focus and how ${profile.product_name} solves ${analysis.pain_points[0] || 'their key challenge'}`,
        `Mention companies similar to ${company.company_name} that benefit from ${profile.product_name}`,
      ]

      return { company, title: titleMapping, contact, pain_points, match_reasons, talking_points }
    }))

    results.push(...batchResults)
  }

  return results
}

// ── STAGE 4: Score + Save ────────────────────────────────────────────

function scoreProspect(
  company: DiscoveredCompany,
  contact: ResolvedContact
): number {
  let score = 50 // base

  // Source quality
  if (company.source === 'claude_web' || company.source === 'perplexity') score += 15
  else if (company.source === 'gemini') score += 10

  // Contact confidence
  if (contact.confidence === 'high') score += 25
  else if (contact.confidence === 'medium') score += 15
  else score += 5

  // Has real name
  if (contact.name) score += 5

  // Has linkedin URL (not just search)
  if (contact.linkedin_url?.includes('/in/')) score += 5

  // Cap at 100
  return Math.min(score, 100)
}

// ── Load onboarding profile ──────────────────────────────────────────

async function loadProfile(userId: string): Promise<OnboardingProfile | null> {
  try {
    const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(userId)
    const od = authUser?.user_metadata?.onboarding_data as Record<string, unknown> | undefined
    if (!od) return null

    return {
      product_name: (od.product_name as string) || '',
      product_description: (od.product_description as string) || '',
      problem_solved: (od.problem_solved as string) || '',
      target_industries: (od.target_industries as string[])?.join(', ') || '',
      target_titles: (od.target_titles as string[])?.join(', ') || '',
      company_sizes: (od.company_sizes as string[])?.join(', ') || '',
      geographies: (od.geographies as string[])?.join(', ') || '',
    }
  } catch {
    return null
  }
}

// ── Main handler ─────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (!action) {
      return NextResponse.json({ error: 'Missing required field: action' }, { status: 400 })
    }

    // ── Generate prospects — 4-stage pipeline ─────────────────────────
    if (action === 'generate') {
      const { user_id, icp: providedIcp } = body

      if (!user_id) {
        return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
      }

      // Load onboarding profile
      let profile: OnboardingProfile
      const loaded = await loadProfile(user_id)

      if (loaded && loaded.product_name) {
        profile = loaded
      } else if (providedIcp) {
        profile = {
          product_name: providedIcp.product_name || 'Our Product',
          product_description: providedIcp.product_description || '',
          problem_solved: providedIcp.problem_solved || '',
          target_industries: providedIcp.industries || 'SaaS, Technology',
          target_titles: providedIcp.roles || 'CEO, VP of Sales, Head of Growth',
          company_sizes: providedIcp.company_size || '11-50',
          geographies: providedIcp.geography || 'United States',
        }
      } else {
        return NextResponse.json({ error: 'No onboarding profile found. Complete onboarding first.' }, { status: 400 })
      }

      const sourcesUsed: string[] = []
      let skipped = 0

      // ── STAGE 0: Product Analysis ─────────────────────────────────
      console.log('[Pipeline] Stage 0: Analyzing product...')
      const analysis = await analyzeProduct(profile)
      console.log('[Pipeline] Stage 0 complete:', analysis.keywords_to_search)

      // ── STAGE 1: Company Discovery (parallel) ─────────────────────
      console.log('[Pipeline] Stage 1: Discovering companies...')
      const [claudeCompanies, geminiCompanies, perplexityCompanies] = await Promise.all([
        withTimeout(discoverViaClaudeWeb(profile, analysis), 30000, 'Claude Web')
          .then(r => { if (r?.length) sourcesUsed.push('claude_web'); return r || [] }),
        withTimeout(discoverViaGemini(profile, analysis), 10000, 'Gemini')
          .then(r => { if (r?.length) sourcesUsed.push('gemini'); return r || [] }),
        withTimeout(discoverViaPerplexity(profile, analysis), 10000, 'Perplexity')
          .then(r => { if (r?.length) sourcesUsed.push('perplexity'); return r || [] }),
      ])

      const allCompanies = [...claudeCompanies, ...geminiCompanies, ...perplexityCompanies]
      const uniqueCompanies = deduplicateCompanies(allCompanies).slice(0, 20)
      console.log(`[Pipeline] Stage 1 complete: ${allCompanies.length} found, ${uniqueCompanies.length} unique`)

      if (uniqueCompanies.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No companies discovered. Try broadening your ICP.',
          prospects_generated: 0,
          prospects_saved: 0,
          sources_used: sourcesUsed,
          skipped: 0,
        })
      }

      // ── STAGE 2: Decision Maker Mapping ───────────────────────────
      console.log('[Pipeline] Stage 2: Mapping decision makers...')
      const titleMap = await mapDecisionMakers(uniqueCompanies, profile)
      console.log(`[Pipeline] Stage 2 complete: ${titleMap.size} titles mapped`)

      // ── STAGE 3: Contact Resolution ───────────────────────────────
      console.log('[Pipeline] Stage 3: Resolving contacts...')
      const prospects = await resolveContacts(uniqueCompanies, titleMap, profile, analysis)
      console.log(`[Pipeline] Stage 3 complete: ${prospects.length} contacts resolved`)

      // ── STAGE 4: Score + Dedup + Save ─────────────────────────────
      console.log('[Pipeline] Stage 4: Scoring and saving...')
      const rows: Record<string, unknown>[] = []

      for (const p of prospects) {
        const score = scoreProspect(p.company, p.contact)

        // Skip below threshold
        if (score < 50) {
          skipped++
          continue
        }

        // Check for existing duplicate
        const { data: existing } = await supabaseAdmin
          .from('prospects')
          .select('id')
          .eq('user_id', user_id)
          .ilike('company', p.company.company_name)
          .maybeSingle()

        if (existing) {
          skipped++
          continue
        }

        rows.push({
          user_id,
          name: p.contact.name || `${p.title.primary_title} at ${p.company.company_name}`,
          title: p.title.primary_title,
          company: p.company.company_name,
          industry: p.company.industry,
          company_size: p.company.employee_count,
          email: p.contact.email || '',
          phone: p.contact.phone || '',
          linkedin_url: p.contact.linkedin_url || '',
          score,
          reasoning: p.title.reasoning,
          match_reasons: p.match_reasons,
          pain_points: p.pain_points,
          talking_points: p.talking_points,
          source: p.company.source,
          company_verified: p.company.source === 'claude_web' || p.company.source === 'perplexity',
          contact_inferred: p.contact.confidence !== 'high',
          confidence: p.contact.confidence,
          status: 'new',
        })
      }

      let savedCount = 0
      if (rows.length > 0) {
        const { data: saved, error } = await supabaseAdmin
          .from('prospects')
          .insert(rows)
          .select()

        if (error) {
          console.error('Supabase insert error:', error)
          // Try inserting without new columns in case migration hasn't run
          const fallbackRows = rows.map(r => ({
            user_id: r.user_id,
            name: r.name,
            title: r.title,
            company: r.company,
            industry: r.industry,
            company_size: r.company_size,
            email: r.email,
            linkedin_url: r.linkedin_url,
            score: r.score,
            reasoning: r.reasoning,
            match_reasons: r.match_reasons,
            status: 'new',
          }))

          const { data: fallbackSaved, error: fallbackError } = await supabaseAdmin
            .from('prospects')
            .insert(fallbackRows)
            .select()

          if (fallbackError) {
            console.error('Fallback insert also failed:', fallbackError)
          } else {
            savedCount = fallbackSaved?.length || 0
          }
        } else {
          savedCount = saved?.length || 0
        }
      }

      console.log(`[Pipeline] Stage 4 complete: ${savedCount} saved, ${skipped} skipped`)

      return NextResponse.json({
        success: true,
        prospects_generated: prospects.length,
        prospects_saved: savedCount,
        sources_used: sourcesUsed,
        skipped,
      })
    }

    // ── List prospects with pagination + filters ─────────────────────
    if (action === 'list') {
      const { user_id, offset = 0, limit = 10, score_filter, industry_filter, size_filter, search, status_filter } = body

      let query = supabase
        .from('prospects')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (user_id) query = query.eq('user_id', user_id)

      // Score filter
      if (score_filter === '80+') query = query.gte('score', 80)
      else if (score_filter === '50-79') query = query.gte('score', 50).lt('score', 80)
      else if (score_filter === 'below50') query = query.lt('score', 50)

      // Industry filter
      if (industry_filter && industry_filter !== 'all') {
        query = query.eq('industry', industry_filter)
      }

      // Size filter
      if (size_filter && size_filter !== 'all') {
        query = query.eq('company_size', size_filter)
      }

      // Status filter
      if (status_filter && status_filter !== 'all') {
        query = query.eq('status', status_filter)
      }

      // Text search
      if (search) {
        query = query.or(`name.ilike.%${search}%,company.ilike.%${search}%,title.ilike.%${search}%,email.ilike.%${search}%`)
      }

      // Pagination
      query = query.range(offset, offset + limit - 1)

      const { data, count, error } = await query

      if (error) {
        console.error('List prospects error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        prospects: data || [],
        total: count || 0,
        has_more: (count || 0) > offset + limit,
      })
    }

    // ── Update prospect status ───────────────────────────────────────
    if (action === 'update_status') {
      const { prospect_id, status } = body

      const { data, error } = await supabaseAdmin
        .from('prospects')
        .update({ status })
        .eq('id', prospect_id)
        .select()
        .single()

      if (error) {
        console.error('Update status error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ prospect: data })
    }

    // ── Add note to prospect ─────────────────────────────────────────
    if (action === 'add_note') {
      const { prospect_id, note } = body

      const { data, error } = await supabaseAdmin
        .from('prospect_notes')
        .insert({ prospect_id, note })
        .select()
        .single()

      if (error) {
        console.error('Add note error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ note: data })
    }

    // ── Get distinct filter values ───────────────────────────────────
    if (action === 'filters') {
      const { user_id } = body

      let industryQuery = supabase.from('prospects').select('industry')
      let sizeQuery = supabase.from('prospects').select('company_size')

      if (user_id) {
        industryQuery = industryQuery.eq('user_id', user_id)
        sizeQuery = sizeQuery.eq('user_id', user_id)
      }

      const [{ data: industries }, { data: sizes }] = await Promise.all([industryQuery, sizeQuery])

      const uniqueIndustries = [...new Set((industries || []).map((r: { industry: string }) => r.industry))].sort()
      const uniqueSizes = [...new Set((sizes || []).map((r: { company_size: string }) => r.company_size))].sort()

      return NextResponse.json({ industries: uniqueIndustries, sizes: uniqueSizes })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Prospects API error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
