import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch all dashboard data in parallel
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayISO = today.toISOString()

  const [
    { data: prospects },
    { data: todayProspects, count: todayProspectCount },
    { data: messages },
    { data: todayMessages, count: todayMessageCount },
    { data: replies, count: replyCount },
    { data: todayReplies, count: todayReplyCount },
    { data: meetings },
    { data: todayMeetings, count: todayMeetingCount },
    { data: activityLog },
    { data: trustProgress },
  ] = await Promise.all([
    // All prospects with status counts
    supabase.from('prospects').select('id, status').eq('user_id', user.id),
    // Today's new prospects
    supabase.from('prospects').select('id', { count: 'exact' }).eq('user_id', user.id).gte('created_at', todayISO),
    // All messages (drafts/sent)
    supabase.from('messages').select('id, status'),
    // Today's messages
    supabase.from('messages').select('id', { count: 'exact' }).gte('created_at', todayISO),
    // All replies
    supabase.from('replies').select('id, sentiment, intent', { count: 'exact' }),
    // Today's replies
    supabase.from('replies').select('id', { count: 'exact' }).gte('created_at', todayISO),
    // All meetings
    supabase.from('meetings').select('id, status, scheduled_at, prospect_name, prospect_company'),
    // Today's meetings
    supabase.from('meetings').select('id', { count: 'exact' }).gte('created_at', todayISO),
    // Recent activity (last 10)
    supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(10),
    // Trust progress
    supabase.from('user_profiles').select('trust_stage, trust_approved_count, trust_draft_approved_count, trust_reply_rate, trust_autopilot_enabled').eq('id', user.id).single(),
  ])

  // Pipeline counts
  const pipeline = {
    new: 0,
    contacted: 0,
    replied: 0,
    meeting_booked: 0,
    closed: 0,
  }
  if (prospects) {
    for (const p of prospects) {
      const s = p.status as string
      if (s === 'new' || s === 'approved') pipeline.new++
      else if (s === 'contacted') pipeline.contacted++
      else if (s === 'replied') pipeline.replied++
      else if (s === 'meeting_booked') pipeline.meeting_booked++
      else if (s === 'saved') pipeline.closed++
    }
  }

  // Performance score: weighted combo of reply rate and meeting conversion
  const totalProspects = prospects?.length || 0
  const totalReplies = replyCount || 0
  const totalMeetings = meetings?.length || 0
  const positiveReplies = replies?.filter(r => r.sentiment === 'positive').length || 0

  const replyRate = totalProspects > 0 ? (totalReplies / totalProspects) * 100 : 0
  const meetingConversion = totalReplies > 0 ? (totalMeetings / totalReplies) * 100 : 0
  const performanceScore = Math.min(100, Math.round(replyRate * 0.6 + meetingConversion * 0.4))

  // Today's activity counts
  const todaysActivity = {
    prospects_found: todayProspectCount || 0,
    messages_drafted: todayMessageCount || 0,
    replies_handled: todayReplyCount || 0,
    meetings_booked: todayMeetingCount || 0,
  }

  // Trust progress
  const trust = trustProgress || {
    trust_stage: 1,
    trust_approved_count: 0,
    trust_draft_approved_count: 0,
    trust_reply_rate: 0,
    trust_autopilot_enabled: false,
  }

  return NextResponse.json({
    todaysActivity,
    pipeline,
    performanceScore,
    replyRate: Math.round(replyRate),
    meetingConversion: Math.round(meetingConversion),
    totalProspects,
    totalReplies,
    totalMeetings,
    activityLog: activityLog || [],
    trust,
    upcomingMeetings: (meetings || []).filter(m => m.status === 'scheduled').slice(0, 5),
  })
}
