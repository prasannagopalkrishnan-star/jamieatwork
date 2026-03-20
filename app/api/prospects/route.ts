import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    // ── Generate prospects from ICP ──────────────────────────────────
    if (action === 'generate') {
      const { user_id, icp: providedIcp } = body

      // Try to load ICP from Supabase onboarding_data if not provided
      let icp = providedIcp || { industries: '', company_size: '', roles: '', geography: '' }

      if (user_id && (!providedIcp || !providedIcp.industries)) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('onboarding_data')
          .eq('id', user_id)
          .single()

        if (profile?.onboarding_data) {
          const od = profile.onboarding_data as Record<string, unknown>
          icp = {
            industries: (od.target_industries as string[])?.join(', ') || icp.industries,
            company_size: (od.target_company_size as string[])?.join(', ') || icp.company_size,
            roles: (od.target_roles as string[])?.join(', ') || icp.roles,
            geography: (od.target_geography as string[])?.join(', ') || icp.geography,
            product_name: od.product_name || '',
            product_description: od.product_description || '',
            problem_solved: od.problem_solved || '',
          }
        }
      }

      const { industries, company_size, roles, geography, product_name, product_description, problem_solved } = icp

      const productContext = product_name
        ? `\n\nThe user's product context (use this to make match_reasons more specific):
- Product: ${product_name}
- Description: ${product_description || 'N/A'}
- Problem solved: ${problem_solved || 'N/A'}`
        : ''

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
- Generate diverse names, companies, and titles
- Scores should vary realistically: 2-3 strong (80-95), 4-5 medium (50-79), 2-3 weaker (30-49)
- match_reasons should be specific to WHY this prospect is a good ICP match — reference the product/problem if provided
- Companies should sound realistic but be fictional (do NOT use real company names)
- Email domains should match the company name (lowercase, no spaces)
- Vary company sizes around the target but include some slightly outside range
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

      let prospects
      try {
        prospects = JSON.parse(cleaned)
      } catch {
        return NextResponse.json({ prospects: [], error: 'Could not parse prospect data' }, { status: 500 })
      }

      // Save to Supabase if user_id provided
      if (user_id && prospects.length > 0) {
        const rows = prospects.map((p: Record<string, unknown>) => ({
          user_id,
          name: p.name,
          title: p.title,
          company: p.company,
          email: p.email,
          linkedin_url: p.linkedin_url,
          score: p.score,
          match_reasons: p.match_reasons,
          industry: p.industry,
          company_size: p.company_size,
          status: 'new',
        }))

        const { data: saved, error } = await supabase
          .from('prospects')
          .insert(rows)
          .select()

        if (error) {
          console.error('Supabase insert error:', error)
          // Return generated data even if save fails
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

      const { data, error } = await supabase
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

      const { data, error } = await supabase
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
