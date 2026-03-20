import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    const supabase = await createClient()

    // ─── ACTION: Analyze a prospect's reply ───────────────────────────────
    if (action === 'analyze_reply') {
      const { reply_body, prospect_name, prospect_company, conversation_context, playbook } = body

      const playbookContext = playbook
        ? `\n\nCompany playbook for reference:
- Product: ${playbook.product_name || 'N/A'}
- Problem solved: ${playbook.problem_solved || 'N/A'}
- Key differentiators: ${playbook.key_differentiators || 'N/A'}
- Voice style: ${playbook.voice_style || 'professional and warm'}
- Objection playbook: ${JSON.stringify(playbook.objection_playbook || [])}
- Qualification questions: ${JSON.stringify(playbook.qualification_questions || [])}
- Disqualification criteria: ${playbook.disqualification_criteria || 'N/A'}
- CTA: ${playbook.call_to_action || 'book a demo'}`
        : ''

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: `You are Jamie, an AI SDR analyzing prospect email replies. Your job is to:
1. Categorize the reply intent
2. Score the sentiment
3. Draft an appropriate follow-up response using the company's voice and playbook

Return ONLY valid JSON, no backticks or markdown:
{
  "sentiment": "positive" | "negative" | "neutral",
  "sentiment_score": <number from -1.0 to 1.0>,
  "intent": "interested" | "not_interested" | "need_more_info" | "unsubscribe" | "out_of_office" | "objection",
  "intent_confidence": <number from 0.0 to 1.0>,
  "key_signals": ["signal1", "signal2"],
  "objection_detected": "<the specific objection if any, or null>",
  "draft_response": "Your drafted follow-up email body",
  "recommended_action": "book_meeting" | "send_info" | "handle_objection" | "remove_from_list" | "wait_and_retry" | "escalate_to_human"
}

Guidelines:
- For "interested" replies: draft a meeting booking response with enthusiasm
- For "not_interested": draft a graceful, non-pushy acknowledgment
- For "need_more_info": draft a response addressing their specific questions
- For "unsubscribe": draft a polite removal confirmation
- For "out_of_office": note to retry later
- For "objection": use the objection playbook to craft a response that addresses the specific concern
- Keep responses concise, warm, and professional
- Match the company voice style from the playbook${playbookContext}`,
        messages: [
          {
            role: 'user',
            content: `Prospect: ${prospect_name} at ${prospect_company || 'Unknown Company'}
${conversation_context ? `Previous conversation context: ${conversation_context}` : ''}

Their reply:
"""
${reply_body}
"""

Analyze this reply and draft an appropriate response.`,
          },
        ],
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      let parsed
      try {
        parsed = JSON.parse(text)
      } catch {
        return NextResponse.json(
          { error: 'Failed to parse AI response', raw: text },
          { status: 500 }
        )
      }

      return NextResponse.json({
        sentiment: parsed.sentiment,
        sentiment_score: parsed.sentiment_score,
        intent: parsed.intent,
        intent_confidence: parsed.intent_confidence,
        key_signals: parsed.key_signals,
        objection_detected: parsed.objection_detected,
        draft_response: parsed.draft_response,
        recommended_action: parsed.recommended_action,
      })
    }

    // ─── ACTION: Handle objection using playbook ──────────────────────────
    if (action === 'handle_objection') {
      const { reply_body, prospect_name, prospect_company, objection, playbook } = body

      const objectionPlaybook = playbook?.objection_playbook || []
      const matchingObjections = objectionPlaybook
        .map((o: { objection: string; response: string }) => `Objection: "${o.objection}"\nResponse: "${o.response}"`)
        .join('\n\n')

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: `You are Jamie, an AI SDR handling a prospect objection. Use the company's objection playbook to craft a response.

Known objection responses from playbook:
${matchingObjections || 'No playbook entries available.'}

Product context:
- Product: ${playbook?.product_name || 'N/A'}
- Problem solved: ${playbook?.problem_solved || 'N/A'}
- Differentiators: ${playbook?.key_differentiators || 'N/A'}
- Voice: ${playbook?.voice_style || 'professional and warm'}

Guidelines:
- Use playbook responses as a foundation, but personalize for this prospect
- Address the specific objection directly
- Keep it concise and non-pushy
- End with a soft CTA (offer more info or suggest a brief call)
- Never be defensive or dismissive of their concern

Return ONLY valid JSON:
{
  "response": "Your crafted response to the objection",
  "objection_category": "pricing" | "timing" | "competition" | "need" | "authority" | "other",
  "confidence": <0.0 to 1.0>,
  "playbook_match": true | false
}`,
        messages: [
          {
            role: 'user',
            content: `Prospect: ${prospect_name} at ${prospect_company}
Detected objection: "${objection}"

Their full reply:
"""
${reply_body}
"""

Craft a response using the playbook.`,
          },
        ],
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      let parsed
      try {
        parsed = JSON.parse(text)
      } catch {
        return NextResponse.json(
          { error: 'Failed to parse AI response', raw: text },
          { status: 500 }
        )
      }

      return NextResponse.json(parsed)
    }

    // ─── ACTION: Generate meeting booking response with times ─────────────
    if (action === 'generate_meeting_response') {
      const { prospect_name, prospect_company, calendar_link } = body

      const now = new Date()
      const dayOfWeek = now.getDay()
      const daysUntilNext = dayOfWeek === 0 ? 1 : dayOfWeek === 6 ? 2 : 1
      const nextDay = new Date(now)
      nextDay.setDate(now.getDate() + daysUntilNext)

      const dateOptions: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }

      const proposedDates: string[] = []
      const proposedSlots: { date: string; time: string; iso: string }[] = []
      const currentDay = new Date(nextDay)
      const times = ['10:00 AM', '2:00 PM', '11:30 AM']
      let count = 0
      while (proposedDates.length < 3) {
        if (currentDay.getDay() !== 0 && currentDay.getDay() !== 6) {
          const dateStr = currentDay.toLocaleDateString('en-US', dateOptions)
          proposedDates.push(`${dateStr} at ${times[count]}`)
          proposedSlots.push({
            date: dateStr,
            time: times[count],
            iso: currentDay.toISOString().split('T')[0],
          })
          count++
        }
        currentDay.setDate(currentDay.getDate() + 1)
      }

      const calendarNote = calendar_link
        ? `\n\nInclude this calendar booking link naturally: ${calendar_link}`
        : ''

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        system: `You are Jamie, a friendly and professional AI SDR. Write a concise meeting booking email. Be warm but not overly casual. Include the three proposed times naturally in the email body. Keep it under 150 words. Do NOT include a subject line.${calendarNote}`,
        messages: [
          {
            role: 'user',
            content: `Draft a meeting booking email for ${prospect_name} at ${prospect_company}.

Proposed times:
1. ${proposedDates[0]}
2. ${proposedDates[1]}
3. ${proposedDates[2]}

The prospect has expressed interest and we want to set up an introductory call.`,
          },
        ],
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : ''

      return NextResponse.json({
        response: text,
        proposed_times: proposedDates,
        proposed_slots: proposedSlots,
      })
    }

    // ─── ACTION: Approve and send a reply ─────────────────────────────────
    if (action === 'approve_reply') {
      const { reply_id, prospect_id, draft_response, sequence_id } = body

      // Save reply to Supabase
      const { error: replyError } = await supabase.from('replies').upsert({
        id: reply_id,
        sequence_id: sequence_id || null,
        prospect_id: prospect_id || null,
        body: draft_response,
        sentiment: body.sentiment || 'neutral',
        intent: body.intent || 'interested',
        status: 'approved',
        created_at: new Date().toISOString(),
      })

      if (replyError) {
        console.error('Reply save error:', replyError)
      }

      // Update prospect status if applicable
      if (prospect_id) {
        await supabase
          .from('prospects')
          .update({ status: 'replied' })
          .eq('id', prospect_id)
      }

      // Log activity
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('activity_log').insert({
          user_id: user.id,
          action: 'reply_approved',
          details: `Approved reply to ${body.prospect_name || 'prospect'}`,
          trust_stage: body.trust_stage || 1,
          category: 'reply',
        })
      }

      return NextResponse.json({ success: true, status: 'approved' })
    }

    // ─── ACTION: Dismiss a reply ──────────────────────────────────────────
    if (action === 'dismiss_reply') {
      const { reply_id, prospect_id } = body

      const { error } = await supabase
        .from('replies')
        .upsert({
          id: reply_id,
          prospect_id: prospect_id || null,
          status: 'dismissed',
          created_at: new Date().toISOString(),
        })

      if (error) {
        console.error('Dismiss error:', error)
      }

      return NextResponse.json({ success: true, status: 'dismissed' })
    }

    // ─── ACTION: Handle unsubscribe ───────────────────────────────────────
    if (action === 'handle_unsubscribe') {
      const { prospect_id, prospect_name, prospect_email, sequence_id } = body

      // Update prospect status to unsubscribed equivalent
      if (prospect_id) {
        await supabase
          .from('prospects')
          .update({ status: 'skipped' })
          .eq('id', prospect_id)
      }

      // Stop any active sequences for this prospect
      if (sequence_id) {
        await supabase
          .from('sequences')
          .update({ status: 'unsubscribed' })
          .eq('id', sequence_id)
      }

      // Save the unsubscribe reply
      await supabase.from('replies').insert({
        sequence_id: sequence_id || null,
        prospect_id: prospect_id || null,
        body: `Unsubscribe request from ${prospect_name || prospect_email}`,
        sentiment: 'negative',
        intent: 'unsubscribe',
        status: 'approved',
        created_at: new Date().toISOString(),
      })

      // Log activity
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('activity_log').insert({
          user_id: user.id,
          action: 'prospect_unsubscribed',
          details: `${prospect_name || prospect_email} unsubscribed and removed from sequences`,
          trust_stage: body.trust_stage || 1,
          category: 'reply',
        })
      }

      return NextResponse.json({
        success: true,
        message: `${prospect_name || 'Prospect'} has been unsubscribed`,
      })
    }

    // ─── ACTION: Book a meeting ───────────────────────────────────────────
    if (action === 'book_meeting') {
      const { prospect_id, prospect_name, prospect_company, prospect_email, scheduled_at, notes } = body

      const { data: meeting, error } = await supabase
        .from('meetings')
        .insert({
          prospect_id: prospect_id || null,
          prospect_name,
          prospect_company,
          scheduled_at,
          status: 'scheduled',
          notes: notes || null,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        console.error('Meeting booking error:', error)
        return NextResponse.json({ error: 'Failed to book meeting' }, { status: 500 })
      }

      // Update prospect status
      if (prospect_id) {
        await supabase
          .from('prospects')
          .update({ status: 'meeting_booked' })
          .eq('id', prospect_id)
      }

      // Log activity
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('activity_log').insert({
          user_id: user.id,
          action: 'meeting_booked',
          details: `Meeting booked with ${prospect_name} at ${prospect_company}`,
          trust_stage: body.trust_stage || 1,
          category: 'meeting',
        })
      }

      // Generate confirmation email draft
      const confirmResponse = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        system: 'You are Jamie, an AI SDR. Write a brief, warm meeting confirmation email. Include the date/time. Under 80 words. No subject line.',
        messages: [
          {
            role: 'user',
            content: `Confirm meeting with ${prospect_name} at ${prospect_company} for ${scheduled_at}. ${notes ? `Context: ${notes}` : ''}`,
          },
        ],
      })

      const confirmText = confirmResponse.content[0].type === 'text' ? confirmResponse.content[0].text : ''

      return NextResponse.json({
        success: true,
        meeting,
        confirmation_draft: confirmText,
      })
    }

    // ─── ACTION: List replies from Supabase ───────────────────────────────
    if (action === 'list_replies') {
      const { user_id, status_filter, intent_filter, limit = 50, offset = 0 } = body

      let query = supabase
        .from('replies')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (status_filter && status_filter !== 'all') {
        query = query.eq('status', status_filter)
      }
      if (intent_filter && intent_filter !== 'all') {
        query = query.eq('intent', intent_filter)
      }

      const { data: replies, error, count } = await query

      if (error) {
        console.error('List replies error:', error)
        return NextResponse.json({ error: 'Failed to fetch replies' }, { status: 500 })
      }

      return NextResponse.json({
        replies: replies || [],
        total: count || 0,
        has_more: (count || 0) > offset + limit,
      })
    }

    // ─── ACTION: List meetings from Supabase ──────────────────────────────
    if (action === 'list_meetings') {
      const { status_filter, limit = 20 } = body

      let query = supabase
        .from('meetings')
        .select('*')
        .order('scheduled_at', { ascending: true })
        .limit(limit)

      if (status_filter && status_filter !== 'all') {
        query = query.eq('status', status_filter)
      }

      const { data: meetings, error } = await query

      if (error) {
        console.error('List meetings error:', error)
        return NextResponse.json({ error: 'Failed to fetch meetings' }, { status: 500 })
      }

      return NextResponse.json({ meetings: meetings || [] })
    }

    // ─── ACTION: Re-draft a reply with edits ──────────────────────────────
    if (action === 'redraft_reply') {
      const { reply_body, prospect_name, prospect_company, current_draft, user_feedback, playbook } = body

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        system: `You are Jamie, an AI SDR. The user wants you to revise a draft reply based on their feedback.

Product: ${playbook?.product_name || 'N/A'}
Voice: ${playbook?.voice_style || 'professional and warm'}

Return ONLY the revised email body text. No JSON, no subject line, no extra formatting.`,
        messages: [
          {
            role: 'user',
            content: `Prospect: ${prospect_name} at ${prospect_company}

Their original reply:
"""
${reply_body}
"""

Current draft response:
"""
${current_draft}
"""

User feedback: "${user_feedback}"

Please revise the draft based on this feedback.`,
          },
        ],
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : ''

      return NextResponse.json({ draft_response: text })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Inbox API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
