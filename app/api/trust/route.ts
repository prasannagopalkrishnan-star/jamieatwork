import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get trust progress for this user's company
  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!company) {
    return NextResponse.json({
      trust_stage: 1,
      approved_suggestions: 0,
      approved_drafts: 0,
      positive_reply_rate: 0,
      total_replies: 0,
      stage_unlocked_at: null,
    })
  }

  const { data: trust } = await supabase
    .from('trust_progress')
    .select('*')
    .eq('company_id', company.id)
    .single()

  if (!trust) {
    return NextResponse.json({
      trust_stage: 1,
      approved_suggestions: 0,
      approved_drafts: 0,
      positive_reply_rate: 0,
      total_replies: 0,
      stage_unlocked_at: null,
    })
  }

  return NextResponse.json(trust)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { action } = body

  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!company) {
    return NextResponse.json({ error: 'No company found' }, { status: 404 })
  }

  if (action === 'set_stage') {
    const { stage } = body
    if (stage < 1 || stage > 5) {
      return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('trust_progress')
      .upsert({
        company_id: company.id,
        trust_stage: stage,
        stage_unlocked_at: new Date().toISOString(),
      }, { onConflict: 'company_id' })
      .select()
      .single()

    // Log the stage change
    await supabase.from('activity_log').insert({
      company_id: company.id,
      trust_stage: stage,
      action_type: 'stage_change',
      action_label: 'Trust Stage Updated',
      detail: `Trust level manually set to Stage ${stage}`,
      status: 'auto',
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  }

  if (action === 'log_activity') {
    const { trust_stage, action_type, action_label, detail, status } = body

    const { data, error } = await supabase
      .from('activity_log')
      .insert({
        company_id: company.id,
        trust_stage,
        action_type,
        action_label,
        detail,
        status: status || 'auto',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  }

  if (action === 'approve_suggestion') {
    // Increment approved_suggestions, check for stage unlock
    const { data: trust } = await supabase
      .from('trust_progress')
      .select('*')
      .eq('company_id', company.id)
      .single()

    const current = trust || { trust_stage: 1, approved_suggestions: 0, approved_drafts: 0, positive_reply_rate: 0, total_replies: 0 }
    const newCount = (current.approved_suggestions || 0) + 1
    const shouldUnlock = current.trust_stage === 1 && newCount >= 10

    const { data, error } = await supabase
      .from('trust_progress')
      .upsert({
        company_id: company.id,
        approved_suggestions: newCount,
        trust_stage: shouldUnlock ? 2 : current.trust_stage,
        stage_unlocked_at: shouldUnlock ? new Date().toISOString() : current.stage_unlocked_at,
        approved_drafts: current.approved_drafts || 0,
        positive_reply_rate: current.positive_reply_rate || 0,
        total_replies: current.total_replies || 0,
      }, { onConflict: 'company_id' })
      .select()
      .single()

    await supabase.from('activity_log').insert({
      company_id: company.id,
      trust_stage: shouldUnlock ? 2 : current.trust_stage,
      action_type: 'suggestion_approved',
      action_label: 'Suggestion Approved',
      detail: `Approved suggestion #${newCount}${shouldUnlock ? ' — Stage 2 unlocked!' : ''}`,
      status: 'approved',
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ...data, stage_unlocked: shouldUnlock ? 2 : null })
  }

  if (action === 'approve_draft') {
    const { data: trust } = await supabase
      .from('trust_progress')
      .select('*')
      .eq('company_id', company.id)
      .single()

    const current = trust || { trust_stage: 2, approved_suggestions: 0, approved_drafts: 0, positive_reply_rate: 0, total_replies: 0 }
    const newCount = (current.approved_drafts || 0) + 1
    const shouldUnlock = current.trust_stage === 2 && newCount >= 20

    const { data, error } = await supabase
      .from('trust_progress')
      .upsert({
        company_id: company.id,
        approved_drafts: newCount,
        trust_stage: shouldUnlock ? 3 : current.trust_stage,
        stage_unlocked_at: shouldUnlock ? new Date().toISOString() : current.stage_unlocked_at,
        approved_suggestions: current.approved_suggestions || 0,
        positive_reply_rate: current.positive_reply_rate || 0,
        total_replies: current.total_replies || 0,
      }, { onConflict: 'company_id' })
      .select()
      .single()

    await supabase.from('activity_log').insert({
      company_id: company.id,
      trust_stage: shouldUnlock ? 3 : current.trust_stage,
      action_type: 'draft_approved',
      action_label: 'Draft Approved',
      detail: `Approved draft #${newCount}${shouldUnlock ? ' — Stage 3 unlocked!' : ''}`,
      status: 'approved',
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ...data, stage_unlocked: shouldUnlock ? 3 : null })
  }

  if (action === 'get_activity') {
    const { limit = 50 } = body

    const { data, error } = await supabase
      .from('activity_log')
      .select('*')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
