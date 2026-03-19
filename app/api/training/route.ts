import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Scrape website and extract product info
export async function POST(request: NextRequest) {
  try {
    const { action, messages, companyName, website, scrapedContent, formData } = await request.json()

    // ACTION: Scrape website
    if (action === 'scrape_website') {
      let pageText = ''
      try {
        const res = await fetch(website.startsWith('http') ? website : `https://${website}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JamieBot/1.0)' },
          signal: AbortSignal.timeout(8000),
        })
        const html = await res.text()
        // Strip HTML tags, scripts, styles — get plain text
        pageText = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 8000) // Limit to ~8k chars
      } catch {
        return NextResponse.json({ extracted: null, error: 'Could not reach website' })
      }

      // Use Claude to extract structured info
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: `Extract product/company information from this website text. Return ONLY valid JSON, no backticks or markdown:
{
  "product_name": "product or company name",
  "product_description": "1-2 sentence description of what they sell",
  "problem_solved": "the core problem they solve",
  "key_differentiators": "what makes them different (2-3 points)",
  "suggested_industries": "industries they likely serve",
  "suggested_roles": "job titles of likely buyers"
}
If you can't determine something, use an empty string.`,
        messages: [{ role: 'user', content: `Website content from ${website}:\n\n${pageText}` }],
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      
      try {
        const extracted = JSON.parse(cleaned)
        return NextResponse.json({ extracted })
      } catch {
        return NextResponse.json({ extracted: null, error: 'Could not parse website info' })
      }
    }

    // ACTION: Training chat (strict 3 questions only)
    if (action === 'chat') {
      const contextBlock = formData ? `
CONTEXT FROM ONBOARDING FORM (already collected — do NOT re-ask these):
- Product: ${formData.product_name}
- Description: ${formData.product_description}
- Problem Solved: ${formData.problem_solved}
- Differentiators: ${formData.key_differentiators}
- Company Size Target: ${formData.company_size}
- Industry: ${formData.industry}
- Buyer Roles: ${formData.target_roles}
- Tone: ${formData.tone}
- CTA: ${formData.cta_type}
- Calendar: ${formData.calendar_link || 'not provided'}
` : ''

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        system: `You are Jamie, an AI SDR being trained by a startup founder. The founder already provided product info via a form. You now need to ask EXACTLY 3 short conversational questions to fill in what the form couldn't capture.

${contextBlock}

YOUR 3 QUESTIONS (ask one per turn, in order):
Q1: Ask about their top 2-3 sales objections and how they handle them. Keep it casual.
Q2: Ask how they qualify leads — what questions determine if someone is worth a meeting, and what are the deal-breakers to walk away.
Q3: Ask for anything else Jamie should know — specific competitors to mention, phrases to avoid, or any special instructions.

After Q3 is answered, respond EXACTLY with:
"🎉 Perfect — I've got everything I need! Building your Sales Playbook now..."

RULES:
- Ask ONE question per turn, keep it under 3 sentences
- Acknowledge their answer in 1 sentence, then ask the next question
- Do NOT re-ask about product, ICP, tone, or CTA — you already have those
- Do NOT ask more than 3 questions total
- Be warm and brief`,
        messages: messages.map((m: { role: string; content: string }) => ({
          role: m.role === 'jamie' ? 'assistant' : 'user',
          content: m.content,
        })),
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      return NextResponse.json({ message: text })
    }

    // ACTION: Generate playbook
    if (action === 'generate_playbook') {
      const transcript = messages
        .map((m: { role: string; content: string }) => `${m.role === 'jamie' ? 'Jamie' : 'Founder'}: ${m.content}`)
        .join('\n\n')

      const formContext = formData ? `
FORM DATA:
- Product: ${formData.product_name}
- Description: ${formData.product_description}
- Problem: ${formData.problem_solved}
- Differentiators: ${formData.key_differentiators}
- Company Size: ${formData.company_size}
- Industry: ${formData.industry}
- Buyer Roles: ${formData.target_roles}
- Tone: ${formData.tone}
- CTA: ${formData.cta_type}
- Calendar: ${formData.calendar_link || ''}
` : ''

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: `You are an expert sales strategist. Generate a clean Sales Playbook from the form data and training conversation.

Return ONLY valid JSON, no backticks or markdown:
{
  "product_name": "string",
  "product_description": "1-2 sentences",
  "problem_solved": "core pain point",
  "key_differentiators": "what sets them apart",
  "target_company_size": "size/type",
  "target_industries": "industries",
  "target_roles": "buyer job titles",
  "icp_signals": "signals a prospect is a good fit",
  "qualification_questions": ["q1", "q2", "q3"],
  "disqualification_criteria": "when to walk away",
  "objection_playbook": [{"objection": "the pushback", "response": "how to handle it"}],
  "voice_style": "how Jamie should sound",
  "call_to_action": "what Jamie drives toward",
  "calendar_link": "URL or empty string"
}

Use BOTH the form data and conversation to build this. Keep qualification_questions to 3-4 max. Keep objection_playbook to 2-4 entries with clean objection/response pairs.`,
        messages: [{
          role: 'user',
          content: `${formContext}\n\nTRAINING CONVERSATION:\n${transcript}\n\nGenerate the Sales Playbook JSON for ${companyName}.`,
        }],
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const playbook = JSON.parse(cleaned)

      return NextResponse.json({ playbook })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Training API error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
