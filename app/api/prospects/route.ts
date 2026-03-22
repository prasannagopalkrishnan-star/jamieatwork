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
        ? `\nProduct being sold (use this to make match_reasons and pain_points specific):
- Product: ${product_name}
- Description: ${product_description || 'N/A'}
- Problem solved: ${problem_solved || 'N/A'}`
        : ''

      const targetTitles = roles || 'CEO, VP of Sales, CRO, Head of Growth, Founder'

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 5000,
        system: `You are a B2B sales research assistant. Generate exactly 10 realistic prospect profiles based on the given ICP (Ideal Customer Profile). Each prospect should be a senior decision-maker at a fictional but realistic company.
${productContext}

Return ONLY a valid JSON array (no backticks, no markdown). Each object must have:
{
  "name": "Full Name",
  "title": "Senior decision-maker title (VP, Director, C-suite, Founder, Head of)",
  "company": "Realistic fictional company name",
  "email": "firstname.lastname@companydomain.com",
  "linkedin_url": "https://www.linkedin.com/search/results/people/?keywords=FirstName%20LastName%20CompanyName",
  "score": number 1-100,
  "reasoning": "One sentence on why they are a good ICP match",
  "match_reasons": ["specific reason 1", "specific reason 2", "specific reason 3"],
  "pain_points": ["pain point 1", "pain point 2"],
  "industry": "specific industry name",
  "company_size": "employee range",
  "location": "City, State"
}

RULES:
- Titles MUST be senior decision-makers only: VP, Director, C-suite, Founder, Head of, Partner. Never junior titles.
- Names must be diverse — mix of ethnicities, genders, and backgrounds
- Company names MUST be creative and varied — use natural-sounding startup names like Loom, Notion, Vanta, Datadog, Figma. Never use "[Industry]Tech" patterns. Each name must feel unique and real.
- linkedin_url MUST be a LinkedIn people search URL: https://www.linkedin.com/search/results/people/?keywords=FirstName%20LastName%20CompanyName (URL-encode spaces as %20). This lets the user find real people matching the profile.
- Email domains must match the company name (lowercase, no spaces, e.g. acme.com, vantahealth.com)
- Scores should vary: 2-3 strong (80-95), 4-5 medium (50-79), 2-3 weaker (30-49)
- match_reasons MUST be specific and actionable — reference the exact product, pain point, or problem. Never use generic filler like "growing company" or "scaling challenges."
- pain_points must be specific to the prospect's role and industry — what keeps them up at night that the product solves
- company_size values MUST use standard ranges: 1-10, 11-50, 51-200, 201-500, 501-1000, 1001-5000. High-scoring prospects should match the target sizes exactly.
- location must be a real US city and state (e.g. "Austin, TX", "San Francisco, CA")`,
        messages: [{
          role: 'user',
          content: `Generate 10 sales prospects for this ICP:
- Target Industries: ${industries || 'SaaS, Technology'}
- Company Size: ${company_size || '11-50 employees'}
- Target Titles (decision makers): ${targetTitles}
- Geography: ${geography || 'United States'}

Return the JSON array now.`,
        }],
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : '[]'
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

      let prospects: Record<string, unknown>[]
      try {
        prospects = JSON.parse(cleaned)
      } catch {
        return NextResponse.json({ prospects: [], error: 'Could not parse prospect data' }, { status: 500 })
      }

      // Save to Supabase
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
        }))

        const { data: saved, error } = await supabaseAdmin
          .from('prospects')
          .insert(rows)
          .select()

        if (error) {
          console.error('Supabase insert error:', error)
          return NextResponse.json({ prospects, saved: false })
        }

        return NextResponse.json({ prospects: saved, saved: true })
      }

      return NextResponse.json({ prospects, saved: false })
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
