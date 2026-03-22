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

// ── Apollo.io helpers ────────────────────────────────────────────────

// Convert our "11-50" format to Apollo's "11,50" format
function toApolloEmployeeRange(size: string): string {
  return size.replace('-', ',')
}

// Map our ICP sizes to Apollo ranges
function buildApolloEmployeeRanges(companySizes: string): string[] {
  if (!companySizes) return []
  return companySizes
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(toApolloEmployeeRange)
}

// Map our ICP roles to Apollo person_titles
function buildApolloTitles(roles: string): string[] {
  if (!roles) return ['Founder', 'CEO', 'VP of Sales']
  return roles.split(',').map(r => r.trim()).filter(Boolean)
}

// Map our ICP geography to Apollo person_locations
function buildApolloLocations(geography: string): string[] {
  if (!geography) return ['United States']
  return geography.split(',').map(g => g.trim()).filter(Boolean)
}

// Normalize Apollo employee count to our standard range format
function toStandardSizeRange(numEmployees: number | null | undefined): string {
  if (!numEmployees) return '11-50'
  if (numEmployees <= 10) return '1-10'
  if (numEmployees <= 50) return '11-50'
  if (numEmployees <= 200) return '51-200'
  if (numEmployees <= 500) return '201-500'
  if (numEmployees <= 1000) return '501-1000'
  if (numEmployees <= 5000) return '1001-5000'
  return '5001+'
}

interface ApolloPersonResult {
  name?: string
  first_name?: string
  last_name?: string
  title?: string
  email?: string
  linkedin_url?: string
  city?: string
  state?: string
  organization?: {
    name?: string
    industry?: string
    estimated_num_employees?: number
    short_description?: string
  }
}

async function searchApollo(icp: Record<string, string>): Promise<ApolloPersonResult[]> {
  if (!process.env.APOLLO_API_KEY) return []

  const res = await fetch('https://api.apollo.io/v1/people/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': process.env.APOLLO_API_KEY!,
    },
    body: JSON.stringify({
      person_titles: buildApolloTitles(icp.roles),
      person_locations: buildApolloLocations(icp.geography),
      organization_num_employees_ranges: buildApolloEmployeeRanges(icp.company_size),
      q_organization_keyword_tags: icp.industries
        ? icp.industries.split(',').map((s: string) => s.trim()).filter(Boolean)
        : undefined,
      page: 1,
      per_page: 10,
    }),
  })

  if (!res.ok) {
    console.error(`Apollo API error: ${res.status} ${res.statusText}`)
    return []
  }

  const data = await res.json()
  return data.people || []
}

// ── Main handler ─────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (!action) {
      return NextResponse.json({ error: 'Missing required field: action' }, { status: 400 })
    }

    // ── Generate prospects from ICP ──────────────────────────────────
    if (action === 'generate') {
      const { user_id, icp: providedIcp } = body

      // Try to load ICP from Supabase onboarding_data if not provided
      let icp = providedIcp || { industries: '', company_size: '', roles: '', geography: '' }

      if (user_id && (!providedIcp || !providedIcp.industries)) {
        try {
          const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(user_id)
          const od = authUser?.user_metadata?.onboarding_data as Record<string, unknown> | undefined

          if (od) {
            icp = {
              industries: (od.target_industries as string[])?.join(', ') || icp.industries,
              company_size: (od.company_sizes as string[])?.join(', ') || icp.company_size,
              roles: (od.target_titles as string[])?.join(', ') || icp.roles,
              geography: (od.geographies as string[])?.join(', ') || icp.geography,
              product_name: (od.product_name as string) || '',
              product_description: (od.product_description as string) || '',
              problem_solved: (od.problem_solved as string) || '',
            }
          }
        } catch {
          // admin API not available — use ICP from request body
        }
      }

      const { industries, company_size, roles, geography, product_name, product_description, problem_solved } = icp

      const productContext = product_name
        ? `\nThe user's product context (use this to make match_reasons specific to this product):
- Product: ${product_name}
- Description: ${product_description || 'N/A'}
- Problem solved: ${problem_solved || 'N/A'}`
        : ''

      // ── Step 1: Try Apollo.io for real contact data ──────────────
      let prospects: Record<string, unknown>[] = []
      let source: 'apollo' | 'ai' = 'ai'

      try {
        const apolloPeople = await searchApollo(icp)

        if (apolloPeople.length > 0) {
          // Map Apollo results to our schema (without score/reasons yet)
          const apolloProspects = apolloPeople
            .filter(p => p.name || (p.first_name && p.last_name))
            .map(p => ({
              name: p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
              title: p.title || 'Unknown Title',
              company: p.organization?.name || 'Unknown Company',
              email: p.email || '',
              linkedin_url: p.linkedin_url || '',
              industry: p.organization?.industry || '',
              company_size: toStandardSizeRange(p.organization?.estimated_num_employees),
              location: [p.city, p.state].filter(Boolean).join(', '),
              org_description: p.organization?.short_description || '',
            }))

          if (apolloProspects.length > 0) {
            // ── Step 2: Use Claude to score Apollo results against ICP ──
            const scoreResponse = await anthropic.messages.create({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 3000,
              system: `You are a B2B sales research assistant. You are given REAL prospect data from Apollo.io and an ICP. Score each prospect on how well they match the ICP and explain why.
${productContext}

Return ONLY a valid JSON array (no backticks, no markdown). For each prospect, return:
{
  "index": 0,
  "score": number 0-100,
  "match_reasons": ["reason 1", "reason 2", "reason 3"]
}

RULES:
- score reflects how closely the person's title, company industry, and company size match the target ICP
- match_reasons MUST be specific: reference the prospect's actual title, company, industry, and how they relate to the product being sold
- Do NOT use generic filler like "growing company" or "scaling challenges"
- If the product context is provided, explain why THIS prospect would benefit from THAT specific product`,
              messages: [{
                role: 'user',
                content: `Score these ${apolloProspects.length} real prospects against this ICP:

ICP:
- Target Industries: ${industries || 'SaaS, Technology'}
- Company Size: ${company_size || '11-50 employees'}
- Target Roles: ${roles || 'Founders, CEOs, VPs of Sales'}
- Geography: ${geography || 'United States'}

Prospects:
${apolloProspects.map((p, i) => `[${i}] ${p.name} — ${p.title} at ${p.company} (${p.industry || 'unknown industry'}, ${p.company_size} employees, ${p.location || 'unknown location'})${p.org_description ? ` — "${p.org_description}"` : ''}`).join('\n')}

Return the JSON array now.`,
              }],
            })

            const scoreText = scoreResponse.content[0].type === 'text' ? scoreResponse.content[0].text : '[]'
            const scoreCleaned = scoreText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

            let scores: { index: number; score: number; match_reasons: string[] }[] = []
            try {
              scores = JSON.parse(scoreCleaned)
            } catch {
              // If scoring fails, assign default scores
              scores = apolloProspects.map((_, i) => ({
                index: i,
                score: 60,
                match_reasons: ['Matched via Apollo.io based on ICP criteria'],
              }))
            }

            // Merge Apollo data with Claude scores
            prospects = apolloProspects.map((p, i) => {
              const s = scores.find(sc => sc.index === i) || { score: 50, match_reasons: ['Matched via Apollo.io'] }
              return {
                name: p.name,
                title: p.title,
                company: p.company,
                email: p.email,
                linkedin_url: p.linkedin_url,
                score: s.score,
                match_reasons: s.match_reasons,
                industry: p.industry || industries?.split(',')[0]?.trim() || 'Technology',
                company_size: p.company_size,
              }
            })
            source = 'apollo'
          }
        }
      } catch (err) {
        console.error('Apollo enrichment failed, falling back to AI generation:', err)
        // Fall through to Claude generation below
      }

      // ── Step 3: Fall back to Claude-generated prospects if Apollo didn't work ──
      if (prospects.length === 0) {
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          system: `You are a B2B sales research assistant. Generate exactly 10 realistic prospect profiles based on the given ICP (Ideal Customer Profile). Each prospect should feel like a real person at a real company.

Return ONLY a valid JSON array (no backticks, no markdown). Each object must have:
{
  "name": "Full Name",
  "title": "Job Title",
  "company": "Company Name",
  "email": "realistic email using firstname.lastname@companydomain.com format",
  "linkedin_url": "https://linkedin.com/in/firstname-lastname",
  "score": number 0-100 representing ICP match quality,
  "match_reasons": ["reason 1", "reason 2", "reason 3"],
  "industry": "industry name",
  "company_size": "e.g. 11-50, 51-200, etc."
}

RULES:
- Generate diverse names, companies, and titles — include a mix of ethnicities, genders, and seniority levels
- Company names MUST be creative and varied — do NOT follow a repetitive "[Industry]Tech [Suffix]" pattern. Use natural-sounding names like real startups: short names (Loom, Notion, Vanta), compound words (Datadog, Cloudflare), or distinctive names (Stripe, Figma). Each company name should feel unique.
- Scores should vary realistically: 2-3 strong (80-95), 4-5 medium (50-79), 2-3 weaker (30-49)
- match_reasons MUST be specific and actionable — reference the exact product, pain point, or problem being solved. Never use generic filler like "growing company" or "scaling challenges." Each reason should explain a concrete connection between the prospect and the product.
- Companies should sound realistic but be fictional (do NOT use real company names like Google, Stripe, etc.)
- Email domains should match the company name (lowercase, no spaces)
- company_size values MUST use the exact same format as the target ICP sizes (e.g. if target is "11-50", use "11-50" not "31-75" or "20-40"). High-scoring prospects should match the target sizes exactly; lower-scoring prospects may be slightly outside range but must still use standard ranges: 1-10, 11-50, 51-200, 201-500, 501-1000, 1001-5000
- If geography is specified, prospects should be from that region${productContext}`,
          messages: [{
            role: 'user',
            content: `Generate 10 prospect profiles for this ICP:
- Target Industries: ${industries || 'SaaS, Technology'}
- Company Size: ${company_size || '11-50 employees'}
- Target Roles: ${roles || 'Founders, CEOs, VPs of Sales'}
- Geography: ${geography || 'United States'}

Return the JSON array now.`,
          }],
        })

        const text = response.content[0].type === 'text' ? response.content[0].text : '[]'
        const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

        try {
          prospects = JSON.parse(cleaned)
        } catch {
          return NextResponse.json({ prospects: [], error: 'Could not parse prospect data' }, { status: 500 })
        }
      }

      // ── Step 4: Save to Supabase ──────────────────────────────────
      if (user_id && prospects.length > 0) {
        const rows = prospects.map((p: Record<string, unknown>) => ({
          user_id,
          name: p.name,
          title: p.title,
          company: p.company,
          email: p.email || '',
          linkedin_url: p.linkedin_url || '',
          score: p.score,
          match_reasons: p.match_reasons,
          industry: p.industry,
          company_size: p.company_size,
          status: 'new',
          source,
        }))

        const { data: saved, error } = await supabaseAdmin
          .from('prospects')
          .insert(rows)
          .select()

        if (error) {
          console.error('Supabase insert error:', error)
          return NextResponse.json({ prospects, source, saved: false })
        }

        return NextResponse.json({ prospects: saved, source, saved: true })
      }

      return NextResponse.json({ prospects, source, saved: false })
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
