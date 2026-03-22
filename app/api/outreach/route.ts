import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null

interface OnboardingProfile {
  product_name: string
  product_description: string
  problem_solved: string
  key_differentiators: string
  voice_style: string
  target_industries: string[]
  company_sizes: string[]
  target_titles: string[]
  geographies: string[]
}

async function fetchOnboardingProfile(userId: string): Promise<OnboardingProfile | null> {
  if (!supabaseAdmin || !userId) return null
  try {
    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId)
    const od = user?.user_metadata?.onboarding_data
    if (od) return od as OnboardingProfile
  } catch {
    // admin API unavailable
  }
  return null
}

function buildProductBlock(profile: OnboardingProfile | null, fallbackInfo?: Record<string, string> | null): string {
  const p = profile
  if (p?.product_name) {
    return `Product context (THIS is what you are selling — NOT Jamie or any AI SDR platform):
- Company/Product: ${p.product_name}
- Description: ${p.product_description || 'N/A'}
- Problem solved: ${p.problem_solved || 'N/A'}
- Differentiators: ${p.key_differentiators || 'N/A'}
- Target industries: ${p.target_industries?.join(', ') || 'N/A'}
- Target roles: ${p.target_titles?.join(', ') || 'N/A'}`
  }
  if (fallbackInfo?.product_name) {
    return `Product context (THIS is what you are selling — NOT Jamie or any AI SDR platform):
- Company/Product: ${fallbackInfo.product_name}
- Description: ${fallbackInfo.product_description || 'N/A'}
- Problem solved: ${fallbackInfo.problem_solved || 'N/A'}
- Differentiators: ${fallbackInfo.key_differentiators || 'N/A'}`
  }
  return 'No product info available — ask the prospect about their challenges and offer to share more about the product on a call.'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (!action) {
      return NextResponse.json({ error: 'Missing required field: action' }, { status: 400 })
    }

    // ACTION: Generate a 4-step outreach sequence
    if (action === 'generate_sequence') {
      const { prospect, voice_style, cta, product_info, user_id } = body

      if (!prospect?.name || !prospect?.company || !prospect?.role) {
        return NextResponse.json({ error: 'Missing required prospect fields: name, company, role' }, { status: 400 })
      }

      // Fetch the user's onboarding profile — single source of truth
      const profile = user_id ? await fetchOnboardingProfile(user_id) : null
      const productBlock = buildProductBlock(profile, product_info)
      const tone = profile?.voice_style || voice_style || 'Professional but warm'

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        system: `You are Jamie, an AI SDR working on behalf of a startup. Your job is to sell THEIR product (described below), NOT Jamie itself and NOT any AI SDR platform. Never mention Jamie, AI SDRs, or automation in the outreach.

Voice style: ${tone}
Call to action: ${cta || 'Book a demo'}

${productBlock}

PERSONALIZATION TOKENS — use these EXACTLY as written in ALL messages (emails AND LinkedIn):
- {{first_name}} for the prospect's first name
- {{company}} for the prospect's company name
- {{pain_point}} for an inferred pain point based on their role/company

IMPORTANT: ALWAYS use {{first_name}}, {{company}}, and {{pain_point}} tokens instead of the prospect's actual name/company. Never hardcode the prospect's real name or company name in the output — always use the token form so messages work as reusable templates.

RULES:
- Step 1: Cold email (Day 1) — personalized opener referencing the prospect's role/company, concise value prop, clear CTA
- Step 2: Follow-up email (Day 3) — different angle, reference step 1. Use ONLY real product capabilities from the product context above — do NOT invent statistics, percentages, case studies, or customer testimonials. If you want to reference social proof, use qualitative language like "teams we work with report..." rather than fabricated numbers.
- Step 3: LinkedIn message (Day 5) — max 300 characters, casual, reference the emails. MUST use {{first_name}} and {{company}} tokens, not the actual name.
- Step 4: Final email (Day 10) — breakup email, graceful close, leave door open. Do NOT use artificial urgency tactics like "closing my calendar" or fake deadlines.
- Each email should have a compelling subject line
- LinkedIn messages do NOT have a subject line (set subject to empty string)
- Keep emails under 150 words each
- Do NOT fabricate statistics, percentages, ROI numbers, or case studies. Only reference capabilities that are explicitly listed in the product context above.

Return ONLY valid JSON, no backticks or markdown:
{
  "messages": [
    { "step": 1, "channel": "email", "day": 1, "subject": "subject line", "body": "email body" },
    { "step": 2, "channel": "email", "day": 3, "subject": "subject line", "body": "email body" },
    { "step": 3, "channel": "linkedin", "day": 5, "subject": "", "body": "linkedin message (max 300 chars)" },
    { "step": 4, "channel": "email", "day": 10, "subject": "subject line", "body": "email body" }
  ]
}`,
        messages: [{
          role: 'user',
          content: `Generate a 4-step outreach sequence for this prospect:
- Name: ${prospect.name}
- Company: ${prospect.company}
- Role: ${prospect.role}
${prospect.email ? `- Email: ${prospect.email}` : ''}
${prospect.pain_point ? `- Pain point: ${prospect.pain_point}` : ''}
${prospect.notes ? `- Notes: ${prospect.notes}` : ''}`,
        }],
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

      try {
        const parsed = JSON.parse(cleaned)
        return NextResponse.json(parsed)
      } catch {
        return NextResponse.json({ error: 'Could not parse sequence' }, { status: 500 })
      }
    }

    // ACTION: Generate a single message (regenerate one step)
    if (action === 'generate_single') {
      const { prospect, step, channel, context, voice_style, cta, user_id } = body

      const isLinkedIn = channel === 'linkedin'
      const stepDescriptions: Record<number, string> = {
        1: 'Cold opener email (Day 1) — personalized, concise value prop',
        2: 'Follow-up email (Day 3) — different angle, social proof',
        3: 'LinkedIn connection message (Day 5) — max 300 chars, casual',
        4: 'Breakup email (Day 10) — last chance, create urgency',
      }

      // Fetch the user's onboarding profile — single source of truth
      const profile = user_id ? await fetchOnboardingProfile(user_id) : null
      const productBlock = buildProductBlock(profile)
      const tone = profile?.voice_style || voice_style || 'Professional but warm'

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        system: `You are Jamie, an AI SDR working on behalf of a startup. Your job is to sell THEIR product (described below), NOT Jamie itself and NOT any AI SDR platform. Never mention Jamie, AI SDRs, or automation in the outreach.

Voice style: ${tone}
Call to action: ${cta || 'Book a demo'}
Step purpose: ${stepDescriptions[step] || 'Outreach message'}

${productBlock}

${context ? `Additional context: ${context}` : ''}

PERSONALIZATION TOKENS — ALWAYS use these in the output instead of actual names:
- {{first_name}} for the prospect's first name
- {{company}} for the prospect's company name
- {{pain_point}} for their inferred pain point

RULES:
${isLinkedIn ? '- LinkedIn message: max 300 characters, casual tone, no subject line' : '- Email: compelling subject line, under 150 words, personalized'}
- ALWAYS use personalization tokens ({{first_name}}, {{company}}) — never hardcode the prospect's actual name or company
- Do NOT fabricate statistics, case studies, or ROI numbers

Return ONLY valid JSON, no backticks or markdown:
{
  "message": {
    "subject": "${isLinkedIn ? '' : 'subject line here'}",
    "body": "message body here"
  }
}`,
        messages: [{
          role: 'user',
          content: `Generate a ${channel} message (step ${step}) for:
- Name: ${prospect.name}
- Company: ${prospect.company}
- Role: ${prospect.role}
${prospect.pain_point ? `- Pain point: ${prospect.pain_point}` : ''}
${prospect.notes ? `- Notes: ${prospect.notes}` : ''}`,
        }],
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

      try {
        const parsed = JSON.parse(cleaned)
        return NextResponse.json(parsed)
      } catch {
        return NextResponse.json({ error: 'Could not parse message' }, { status: 500 })
      }
    }

    // ACTION: Analyze a reply for intent detection
    if (action === 'analyze_reply') {
      const { reply_text, prospect, sequence_context, user_id } = body

      // Fetch the user's onboarding profile so the draft response pitches the right product
      const profile = user_id ? await fetchOnboardingProfile(user_id) : null
      const productBlock = buildProductBlock(profile)

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: `You are Jamie, an AI SDR working on behalf of a startup. You are analyzing prospect replies and drafting responses that sell THEIR product (described below), NOT Jamie itself and NOT any AI SDR platform.

${productBlock}

Determine the intent and sentiment of the reply, and draft an appropriate response.

Intents: interested, not_interested, need_more_info, unsubscribe, out_of_office
Sentiments: positive, negative, neutral, out_of_office

Return ONLY valid JSON, no backticks or markdown:
{
  "sentiment": "positive|negative|neutral|out_of_office",
  "intent": "interested|not_interested|need_more_info|unsubscribe|out_of_office",
  "key_signals": ["signal 1", "signal 2"],
  "draft_response": "suggested reply text",
  "recommended_action": "book_meeting|send_info|pause_sequence|unsubscribe|wait"
}`,
        messages: [{
          role: 'user',
          content: `Analyze this reply from ${prospect?.name || 'a prospect'} at ${prospect?.company || 'their company'}:

"${reply_text}"

${sequence_context ? `Sequence context: ${sequence_context}` : ''}`,
        }],
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

      try {
        const parsed = JSON.parse(cleaned)
        return NextResponse.json(parsed)
      } catch {
        return NextResponse.json({ error: 'Could not parse reply analysis' }, { status: 500 })
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Outreach API error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
