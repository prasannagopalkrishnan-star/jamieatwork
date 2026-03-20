import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { email_text } = await request.json()

    if (!email_text || typeof email_text !== 'string') {
      return NextResponse.json({ error: 'email_text is required' }, { status: 400 })
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: `You are a communication style analyst. Analyze the tone and style of the given email text. Return a brief analysis (3-4 sentences) covering:
1. Overall tone (formal, casual, bold, warm, etc.)
2. Key stylistic elements (sentence length, vocabulary level, use of humor/directness)
3. How it would feel to receive this email as a prospect

Be concise and specific. Do not use bullet points — write in flowing sentences.`,
      messages: [{ role: 'user', content: `Analyze the tone of this outreach email:\n\n${email_text}` }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ analysis: text })
  } catch (error) {
    console.error('Analyze tone API error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
