'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

// ─── Types ───────────────────────────────────────────────────────────────────

type Intent = 'interested' | 'not_interested' | 'need_more_info' | 'unsubscribe' | 'out_of_office' | 'objection'

interface Reply {
  id: string
  prospectName: string
  prospectCompany: string
  prospectEmail: string
  prospectId: string | null
  sequenceId: string | null
  avatarColor: string
  replyBody: string
  receivedAt: string
  intent: Intent
  sentimentScore: number
  draftResponse: string
  status: 'pending' | 'approved' | 'sent' | 'dismissed'
  keySignals: string[]
  objectionDetected: string | null
  recommendedAction: string | null
  conversationHistory: string[]
}

interface Meeting {
  id: string
  prospectName: string
  prospectCompany: string
  prospectEmail: string
  day: number
  hour: number
  duration: number
  status: 'upcoming' | 'completed' | 'cancelled' | 'no_show'
  notes: string
  scheduledAt: string | null
}

// ─── Demo Data ───────────────────────────────────────────────────────────────

const DEMO_REPLIES: Reply[] = [
  {
    id: 'r1',
    prospectName: 'Sarah Chen',
    prospectCompany: 'Lumina AI',
    prospectEmail: 'sarah@lumina-ai.com',
    prospectId: null,
    sequenceId: null,
    avatarColor: '#7C3AED',
    replyBody: "Hey Jamie! This actually looks really interesting. We've been struggling with our outbound process and I'd love to learn more about how your AI SDR works. Can we set up a call this week?",
    receivedAt: '2 hours ago',
    intent: 'interested',
    sentimentScore: 0.9,
    draftResponse: "Hi Sarah! Great to hear from you. I'd love to walk you through how Jamie can help Lumina AI's outbound process. How does Thursday at 2 PM ET work for a quick 30-minute intro call? I'll send over a calendar invite.",
    status: 'pending',
    keySignals: ['Expressed interest', 'Requested call', 'Has pain point'],
    objectionDetected: null,
    recommendedAction: 'book_meeting',
    conversationHistory: [
      'Jamie: Hi Sarah, I noticed Lumina AI is scaling its sales team. Our AI SDR can help automate your outbound...',
    ],
  },
  {
    id: 'r2',
    prospectName: 'Marcus Johnson',
    prospectCompany: 'RevStack',
    prospectEmail: 'marcus@revstack.io',
    prospectId: null,
    sequenceId: null,
    avatarColor: '#F43F5E',
    replyBody: "Thanks for reaching out but we just signed a 2-year contract with another vendor for our sales tooling. Not looking to switch right now.",
    receivedAt: '3 hours ago',
    intent: 'not_interested',
    sentimentScore: -0.4,
    draftResponse: "Hi Marcus, completely understand! Sounds like you're all set for now. I'll make a note to check back in when your contract is closer to renewal. Wishing you and the RevStack team a great quarter!",
    status: 'pending',
    keySignals: ['Locked into contract', 'Polite decline', '2-year timeline'],
    objectionDetected: null,
    recommendedAction: 'wait_and_retry',
    conversationHistory: [],
  },
  {
    id: 'r3',
    prospectName: 'Priya Patel',
    prospectCompany: 'NexGen Health',
    prospectEmail: 'priya@nexgenhealth.com',
    prospectId: null,
    sequenceId: null,
    avatarColor: '#16A34A',
    replyBody: "Interesting concept. A few questions: How does it handle compliance in healthcare outreach? Do you have any case studies in the health tech space? Also, what's the pricing look like for a team of 5?",
    receivedAt: '4 hours ago',
    intent: 'need_more_info',
    sentimentScore: 0.3,
    draftResponse: "Hi Priya, great questions! Jamie is built with compliance guardrails that can be customized for regulated industries like healthcare. I'd be happy to share a health tech case study and walk through our pricing tiers. Would a quick 20-minute call work this week?",
    status: 'pending',
    keySignals: ['Compliance concern', 'Wants case studies', 'Pricing inquiry', 'Team of 5'],
    objectionDetected: null,
    recommendedAction: 'send_info',
    conversationHistory: [],
  },
  {
    id: 'r4',
    prospectName: 'David Kim',
    prospectCompany: 'Forge Analytics',
    prospectEmail: 'david@forgeanalytics.co',
    prospectId: null,
    sequenceId: null,
    avatarColor: '#EA580C',
    replyBody: "Please remove me from your mailing list. I don't want to receive any more emails.",
    receivedAt: '5 hours ago',
    intent: 'unsubscribe',
    sentimentScore: -0.7,
    draftResponse: "Hi David, I've removed you from our outreach list. You won't receive any further emails from us. Apologies for the inconvenience, and best of luck with Forge Analytics!",
    status: 'pending',
    keySignals: ['Unsubscribe request', 'Direct/firm tone'],
    objectionDetected: null,
    recommendedAction: 'remove_from_list',
    conversationHistory: [],
  },
  {
    id: 'r5',
    prospectName: 'Elena Rodriguez',
    prospectCompany: 'Bloom Commerce',
    prospectEmail: 'elena@bloomcommerce.com',
    prospectId: null,
    sequenceId: null,
    avatarColor: '#0EA5E9',
    replyBody: "I'm out of the office until March 28th with limited access to email. For urgent matters, please contact my colleague James at james@bloomcommerce.com. I'll respond to your email when I return.",
    receivedAt: '6 hours ago',
    intent: 'out_of_office',
    sentimentScore: 0.0,
    draftResponse: '[Auto-flagged] Elena is OOO until March 28th. Jamie will automatically follow up on March 29th. Alternative contact: James (james@bloomcommerce.com).',
    status: 'pending',
    keySignals: ['OOO auto-reply', 'Returns March 28', 'Alternative contact provided'],
    objectionDetected: null,
    recommendedAction: 'wait_and_retry',
    conversationHistory: [],
  },
  {
    id: 'r6',
    prospectName: 'Tom Whitaker',
    prospectCompany: 'CloudNine SaaS',
    prospectEmail: 'tom@cloudnine.io',
    prospectId: null,
    sequenceId: null,
    avatarColor: '#7C3AED',
    replyBody: "Wow, this is exactly what we've been looking for! We're a 15-person startup and our founder has been doing all the SDR work himself. When's the soonest we can get started? Also, is there a free trial?",
    receivedAt: '7 hours ago',
    intent: 'interested',
    sentimentScore: 0.95,
    draftResponse: "Hi Tom! Love the enthusiasm! Jamie is perfect for startup teams where founders are wearing the SDR hat. We do offer a free trial period so you can see the results firsthand. Let's hop on a quick call to get you set up — does tomorrow at 10 AM or 2 PM work?",
    status: 'pending',
    keySignals: ['High enthusiasm', 'Immediate interest', 'Free trial ask', '15-person team'],
    objectionDetected: null,
    recommendedAction: 'book_meeting',
    conversationHistory: [],
  },
  {
    id: 'r7',
    prospectName: 'Aisha Mohammed',
    prospectCompany: 'Finova',
    prospectEmail: 'aisha@finova.co',
    prospectId: null,
    sequenceId: null,
    avatarColor: '#F43F5E',
    replyBody: "Can you send me more details on how the AI training works? I want to make sure it can handle the nuances of financial services sales conversations before I commit to a demo.",
    receivedAt: '8 hours ago',
    intent: 'need_more_info',
    sentimentScore: 0.2,
    draftResponse: "Hi Aisha, absolutely! Jamie's training process is designed to capture industry-specific nuances. You spend about 10 minutes teaching Jamie your pitch, ICP, and common objections in fintech. I'll send over a short video walkthrough of the training flow. Would you also like to see a live demo with a financial services example?",
    status: 'pending',
    keySignals: ['Wants detail on AI training', 'Financial services focus', 'Cautious but interested'],
    objectionDetected: null,
    recommendedAction: 'send_info',
    conversationHistory: [],
  },
  {
    id: 'r8',
    prospectName: 'Ryan O\'Brien',
    prospectCompany: 'Apex Ventures',
    prospectEmail: 'ryan@apexvc.com',
    prospectId: null,
    sequenceId: null,
    avatarColor: '#16A34A',
    replyBody: "Interesting timing — one of our portfolio companies was just asking about AI SDR tools last week. I'd love to see a demo and potentially intro you to a few of our startups. Let's connect.",
    receivedAt: '1 day ago',
    intent: 'interested',
    sentimentScore: 0.85,
    draftResponse: "Hi Ryan, that's fantastic! We'd love to show you what Jamie can do and explore how it could help your portfolio companies. I'll send over some times for a demo this week. If it's a good fit, we have a partner program that could work well for Apex's startups.",
    status: 'pending',
    keySignals: ['VC/partner potential', 'Portfolio company intros', 'High-value lead'],
    objectionDetected: null,
    recommendedAction: 'book_meeting',
    conversationHistory: [],
  },
  {
    id: 'r9',
    prospectName: 'Jessica Tanaka',
    prospectCompany: 'Pivot Labs',
    prospectEmail: 'jess@pivotlabs.dev',
    prospectId: null,
    sequenceId: null,
    avatarColor: '#EA580C',
    replyBody: "We already use a combo of Apollo and Outreach, and honestly it works fine for us. Not sure what an AI SDR would add on top of that. Maybe reach out again in 6 months?",
    receivedAt: '1 day ago',
    intent: 'objection',
    sentimentScore: -0.2,
    draftResponse: "Hi Jessica, totally fair! Apollo + Outreach is a solid stack. The main difference with Jamie is that it handles the actual conversation and qualification — not just the sequencing. I'll set a reminder to check back in 6 months. In the meantime, if anything changes, I'm just a reply away!",
    status: 'pending',
    keySignals: ['Uses competitor tools', 'Soft objection', 'Open to future contact'],
    objectionDetected: 'Already using competitor tools (Apollo + Outreach)',
    recommendedAction: 'handle_objection',
    conversationHistory: [],
  },
]

const DEMO_MEETINGS: Meeting[] = [
  {
    id: 'm1',
    prospectName: 'Sarah Chen',
    prospectCompany: 'Lumina AI',
    prospectEmail: 'sarah@lumina-ai.com',
    day: 3,
    hour: 14,
    duration: 0.5,
    status: 'upcoming',
    notes: 'Interested in AI SDR for outbound. Wants to see demo of training flow.',
    scheduledAt: null,
  },
  {
    id: 'm2',
    prospectName: 'Tom Whitaker',
    prospectCompany: 'CloudNine SaaS',
    prospectEmail: 'tom@cloudnine.io',
    day: 1,
    hour: 10,
    duration: 0.5,
    status: 'upcoming',
    notes: '15-person startup. Founder doing SDR work. Interested in free trial.',
    scheduledAt: null,
  },
  {
    id: 'm3',
    prospectName: 'Ryan O\'Brien',
    prospectCompany: 'Apex Ventures',
    prospectEmail: 'ryan@apexvc.com',
    day: 2,
    hour: 15,
    duration: 1,
    status: 'upcoming',
    notes: 'VC firm. Wants demo + potential intros to portfolio companies. High value.',
    scheduledAt: null,
  },
  {
    id: 'm4',
    prospectName: 'Lena Park',
    prospectCompany: 'Metric AI',
    prospectEmail: 'lena@metric.ai',
    day: 0,
    hour: 11,
    duration: 0.5,
    status: 'completed',
    notes: 'Completed intro call. Interested in pilot program. Follow up with pricing.',
    scheduledAt: null,
  },
  {
    id: 'm5',
    prospectName: 'Jake Morrison',
    prospectCompany: 'SalesLoop',
    prospectEmail: 'jake@salesloop.io',
    day: 0,
    hour: 14,
    duration: 0.5,
    status: 'completed',
    notes: 'Good conversation. Needs to discuss with co-founder. Will follow up Friday.',
    scheduledAt: null,
  },
  {
    id: 'm6',
    prospectName: 'Aisha Mohammed',
    prospectCompany: 'Finova',
    prospectEmail: 'aisha@finova.co',
    day: 4,
    hour: 11,
    duration: 0.5,
    status: 'upcoming',
    notes: 'Wants detailed walkthrough of AI training for financial services use case.',
    scheduledAt: null,
  },
]

// ─── Constants ───────────────────────────────────────────────────────────────

const COLORS = {
  bg: '#F8F7F4',
  bgWash: '#F5F3EE',
  purple: '#7C3AED',
  purpleLight: '#F3F0FF',
  purpleMid: '#EDE9FE',
  rose: '#F43F5E',
  roseLight: '#FFF1F2',
  green: '#16A34A',
  greenLight: '#F0FDF4',
  yellow: '#CA8A04',
  yellowLight: '#FEFCE8',
  blue: '#2563EB',
  blueLight: '#EFF6FF',
  orange: '#EA580C',
  orangeLight: '#FFF7ED',
  gray: '#6B7280',
  grayLight: '#F3F4F6',
  textPrimary: '#1A1A1A',
  textMedium: '#57534E',
  textSecondary: '#6B6B6B',
  textTertiary: '#A3A3A3',
  white: '#FFFFFF',
  border: 'rgba(0,0,0,0.06)',
  borderHover: 'rgba(0,0,0,0.12)',
  error: '#DC2626',
  success: '#16A34A',
}

const INTENT_CONFIG: Record<Intent, { label: string; color: string; bg: string; icon: string }> = {
  interested: { label: 'Interested', color: COLORS.green, bg: COLORS.greenLight, icon: '\u{1F525}' },
  not_interested: { label: 'Not Interested', color: COLORS.rose, bg: COLORS.roseLight, icon: '\u{1F44B}' },
  need_more_info: { label: 'Need Info', color: COLORS.yellow, bg: COLORS.yellowLight, icon: '\u{2753}' },
  unsubscribe: { label: 'Unsubscribe', color: COLORS.gray, bg: COLORS.grayLight, icon: '\u{1F6D1}' },
  out_of_office: { label: 'Out of Office', color: COLORS.blue, bg: COLORS.blueLight, icon: '\u{2708}\u{FE0F}' },
  objection: { label: 'Objection', color: COLORS.orange, bg: COLORS.orangeLight, icon: '\u{1F6E1}\u{FE0F}' },
}

const ACTION_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  book_meeting: { label: 'Book Meeting', color: COLORS.green, bg: COLORS.greenLight },
  send_info: { label: 'Send Info', color: COLORS.blue, bg: COLORS.blueLight },
  handle_objection: { label: 'Handle Objection', color: COLORS.orange, bg: COLORS.orangeLight },
  remove_from_list: { label: 'Unsubscribe', color: COLORS.gray, bg: COLORS.grayLight },
  wait_and_retry: { label: 'Follow Up Later', color: COLORS.yellow, bg: COLORS.yellowLight },
  escalate_to_human: { label: 'Needs You', color: COLORS.rose, bg: COLORS.roseLight },
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const HOURS = Array.from({ length: 9 }, (_, i) => i + 9)

type FilterType = 'all' | 'interested' | 'need_more_info' | 'not_interested' | 'objection' | 'unsubscribe'
type TabType = 'inbox' | 'meetings'

// ─── Component ───────────────────────────────────────────────────────────────

export default function InboxPage() {
  // ─── State ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabType>('inbox')
  const [filter, setFilter] = useState<FilterType>('all')
  const [replies, setReplies] = useState<Reply[]>(DEMO_REPLIES)
  const [expandedReply, setExpandedReply] = useState<string | null>(null)
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [showBookModal, setShowBookModal] = useState(false)
  const [meetings, setMeetings] = useState<Meeting[]>(DEMO_MEETINGS)
  const [bookForm, setBookForm] = useState({ name: '', company: '', email: '', day: 1, hour: 10, notes: '' })
  const [trustStage, setTrustStage] = useState(2)
  const [editingDraft, setEditingDraft] = useState<string | null>(null)
  const [editDraftText, setEditDraftText] = useState('')
  const [loadingReply, setLoadingReply] = useState<string | null>(null)
  const [showConversation, setShowConversation] = useState<string | null>(null)
  const [reAnalyzing, setReAnalyzing] = useState<string | null>(null)
  const [bookingMeetingFor, setBookingMeetingFor] = useState<Reply | null>(null)
  const [proposedTimes, setProposedTimes] = useState<string[]>([])
  const [meetingResponse, setMeetingResponse] = useState('')
  const [loadingMeetingTimes, setLoadingMeetingTimes] = useState(false)
  const [unsubscribing, setUnsubscribing] = useState<string | null>(null)
  const [redraftFeedback, setRedraftFeedback] = useState('')
  const [showRedraftInput, setShowRedraftInput] = useState<string | null>(null)

  // ─── Derived ───────────────────────────────────────────────────────────
  const filteredReplies = replies.filter((r) => {
    if (r.status === 'dismissed') return false
    if (filter === 'all') return true
    return r.intent === filter
  })

  const pendingCount = replies.filter((r) => r.status === 'pending').length
  const meetingStats = {
    total: meetings.length,
    upcoming: meetings.filter((m) => m.status === 'upcoming').length,
    completed: meetings.filter((m) => m.status === 'completed').length,
  }

  const replyStats = {
    total: replies.length,
    pending: pendingCount,
    interested: replies.filter((r) => r.intent === 'interested' && r.status === 'pending').length,
    objections: replies.filter((r) => (r.intent === 'objection' || r.objectionDetected) && r.status === 'pending').length,
  }

  // ─── Helpers ───────────────────────────────────────────────────────────
  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase()

  const formatHour = (h: number) => {
    if (h === 12) return '12 PM'
    return h > 12 ? `${h - 12} PM` : `${h} AM`
  }

  const getSentimentColor = (score: number) => {
    if (score >= 0.5) return COLORS.green
    if (score >= 0) return COLORS.yellow
    return COLORS.rose
  }

  const getSentimentBar = (score: number) => {
    const normalized = (score + 1) / 2
    return Math.round(normalized * 100)
  }

  // Trust stage determines approval requirements
  const needsApproval = trustStage < 4
  const autoSendLabel = trustStage >= 4 ? 'Auto-sending' : trustStage === 3 ? 'Send (CC you)' : 'Approve & Send'

  // ─── Handlers ──────────────────────────────────────────────────────────
  const handleApprove = async (id: string) => {
    const reply = replies.find((r) => r.id === id)
    if (!reply) return

    setLoadingReply(id)
    try {
      await fetch('/api/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve_reply',
          reply_id: id,
          prospect_id: reply.prospectId,
          sequence_id: reply.sequenceId,
          draft_response: reply.draftResponse,
          prospect_name: reply.prospectName,
          sentiment: reply.sentimentScore >= 0 ? 'positive' : 'negative',
          intent: reply.intent,
          trust_stage: trustStage,
        }),
      })
    } catch {
      // Proceed with local update even if API fails
    }

    setReplies((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'approved' as const } : r)))
    setLoadingReply(null)
    setExpandedReply(null)
  }

  const handleDismiss = async (id: string) => {
    setLoadingReply(id)
    try {
      await fetch('/api/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss_reply', reply_id: id }),
      })
    } catch {
      // Proceed with local update
    }
    setReplies((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'dismissed' as const } : r)))
    setLoadingReply(null)
  }

  const handleUnsubscribe = async (reply: Reply) => {
    setUnsubscribing(reply.id)
    try {
      await fetch('/api/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'handle_unsubscribe',
          prospect_id: reply.prospectId,
          prospect_name: reply.prospectName,
          prospect_email: reply.prospectEmail,
          sequence_id: reply.sequenceId,
          trust_stage: trustStage,
        }),
      })
    } catch {
      // Proceed locally
    }
    setReplies((prev) => prev.map((r) => (r.id === reply.id ? { ...r, status: 'approved' as const } : r)))
    setUnsubscribing(null)
  }

  const handleReAnalyze = async (reply: Reply) => {
    setReAnalyzing(reply.id)
    try {
      const res = await fetch('/api/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze_reply',
          reply_body: reply.replyBody,
          prospect_name: reply.prospectName,
          prospect_company: reply.prospectCompany,
          conversation_context: reply.conversationHistory.join('\n'),
        }),
      })
      const data = await res.json()
      if (data.draft_response) {
        setReplies((prev) =>
          prev.map((r) =>
            r.id === reply.id
              ? {
                  ...r,
                  intent: data.intent || r.intent,
                  sentimentScore: data.sentiment_score ?? r.sentimentScore,
                  draftResponse: data.draft_response,
                  keySignals: data.key_signals || r.keySignals,
                  objectionDetected: data.objection_detected || r.objectionDetected,
                  recommendedAction: data.recommended_action || r.recommendedAction,
                }
              : r
          )
        )
      }
    } catch {
      // Silently fail
    }
    setReAnalyzing(null)
  }

  const handleRedraft = async (reply: Reply) => {
    if (!redraftFeedback.trim()) return
    setLoadingReply(reply.id)
    try {
      const res = await fetch('/api/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'redraft_reply',
          reply_body: reply.replyBody,
          prospect_name: reply.prospectName,
          prospect_company: reply.prospectCompany,
          current_draft: reply.draftResponse,
          user_feedback: redraftFeedback,
        }),
      })
      const data = await res.json()
      if (data.draft_response) {
        setReplies((prev) =>
          prev.map((r) => (r.id === reply.id ? { ...r, draftResponse: data.draft_response } : r))
        )
      }
    } catch {
      // Silently fail
    }
    setLoadingReply(null)
    setShowRedraftInput(null)
    setRedraftFeedback('')
  }

  const handleBookMeeting = async (reply: Reply) => {
    setBookingMeetingFor(reply)
    setLoadingMeetingTimes(true)
    try {
      const res = await fetch('/api/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_meeting_response',
          prospect_name: reply.prospectName,
          prospect_company: reply.prospectCompany,
        }),
      })
      const data = await res.json()
      setProposedTimes(data.proposed_times || [])
      setMeetingResponse(data.response || '')
    } catch {
      setProposedTimes(['Tomorrow at 10:00 AM', 'Tomorrow at 2:00 PM', 'Day after at 11:30 AM'])
      setMeetingResponse('')
    }
    setLoadingMeetingTimes(false)
  }

  const confirmBookMeeting = async (timeSlot: string) => {
    if (!bookingMeetingFor) return
    setLoadingReply(bookingMeetingFor.id)

    try {
      await fetch('/api/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'book_meeting',
          prospect_id: bookingMeetingFor.prospectId,
          prospect_name: bookingMeetingFor.prospectName,
          prospect_company: bookingMeetingFor.prospectCompany,
          prospect_email: bookingMeetingFor.prospectEmail,
          scheduled_at: timeSlot,
          notes: `Booked from inbox reply. Original reply: "${bookingMeetingFor.replyBody.slice(0, 100)}..."`,
          trust_stage: trustStage,
        }),
      })
    } catch {
      // Continue locally
    }

    // Add to local meetings
    const newMeeting: Meeting = {
      id: `m-${Date.now()}`,
      prospectName: bookingMeetingFor.prospectName,
      prospectCompany: bookingMeetingFor.prospectCompany,
      prospectEmail: bookingMeetingFor.prospectEmail,
      day: new Date().getDay() < 5 ? new Date().getDay() : 1,
      hour: 10,
      duration: 0.5,
      status: 'upcoming',
      notes: `Booked via inbox. Time: ${timeSlot}`,
      scheduledAt: timeSlot,
    }
    setMeetings((prev) => [...prev, newMeeting])

    // Update reply status
    setReplies((prev) =>
      prev.map((r) => (r.id === bookingMeetingFor.id ? { ...r, status: 'approved' as const } : r))
    )

    setBookingMeetingFor(null)
    setProposedTimes([])
    setMeetingResponse('')
    setLoadingReply(null)
  }

  const handleStartEditDraft = (reply: Reply) => {
    setEditingDraft(reply.id)
    setEditDraftText(reply.draftResponse)
  }

  const handleSaveEditDraft = (id: string) => {
    setReplies((prev) =>
      prev.map((r) => (r.id === id ? { ...r, draftResponse: editDraftText } : r))
    )
    setEditingDraft(null)
    setEditDraftText('')
  }

  const handleBookNew = () => {
    if (!bookForm.name) return
    const newMeeting: Meeting = {
      id: `m-${Date.now()}`,
      prospectName: bookForm.name,
      prospectCompany: bookForm.company,
      prospectEmail: bookForm.email,
      day: bookForm.day,
      hour: bookForm.hour,
      duration: 0.5,
      status: 'upcoming',
      notes: bookForm.notes,
      scheduledAt: null,
    }
    setMeetings((prev) => [...prev, newMeeting])
    setShowBookModal(false)
    setBookForm({ name: '', company: '', email: '', day: 1, hour: 10, notes: '' })
  }

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        .hd { font-family: 'Cabinet Grotesk', sans-serif; }
        .bd { font-family: 'DM Sans', sans-serif; }
        .mn { font-family: 'JetBrains Mono', monospace; }
        .reply-card { transition: all 0.2s ease; }
        .reply-card:hover { border-color: ${COLORS.borderHover} !important; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,0,0,0.06) !important; }
        .meeting-card:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.08) !important; }
        .tab-btn:hover { background: ${COLORS.purpleLight} !important; color: ${COLORS.purple} !important; }
        .filter-btn:hover { background: ${COLORS.grayLight} !important; }
        .action-btn { transition: all 0.15s ease; }
        .action-btn:hover { opacity: 0.85; transform: translateY(-1px); }
        .calendar-meeting:hover { opacity: 0.9; cursor: pointer; }
        .signal-tag { transition: all 0.15s; }
        .signal-tag:hover { transform: scale(1.03); }
        .sentiment-bar { transition: width 0.6s ease; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .fade-up { animation: fadeUp 0.4s ease-out forwards; }
        .d1 { animation-delay: 0.05s; }
        .d2 { animation-delay: 0.1s; }
        .d3 { animation-delay: 0.15s; }
        .d4 { animation-delay: 0.2s; }
        .loading-shimmer { background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
      `}</style>

      <div style={{ minHeight: '100vh', background: COLORS.bg }} className="bd">
        {/* ─── Nav ─── */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 32px',
            borderBottom: `1px solid ${COLORS.border}`,
            background: COLORS.white,
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                className="hd"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: `linear-gradient(135deg, ${COLORS.purple}, ${COLORS.rose})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: COLORS.white,
                  fontWeight: 800,
                  fontSize: 16,
                }}
              >
                J
              </div>
              <span className="hd" style={{ fontSize: 18, fontWeight: 800, color: COLORS.textPrimary }}>
                Jamie
              </span>
            </Link>
            <span
              className="mn"
              style={{
                fontSize: 11,
                fontWeight: 600,
                background: COLORS.purpleLight,
                color: COLORS.purple,
                padding: '3px 10px',
                borderRadius: 6,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              Inbox
            </span>
            {/* Trust Stage Badge */}
            <div
              className="mn"
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: COLORS.textSecondary,
                background: COLORS.bgWash,
                padding: '3px 10px',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {trustStage >= 4 ? '\u{1F916}' : '\u{1F441}\u{FE0F}'} Stage {trustStage}
              {trustStage >= 4 && (
                <span style={{ color: COLORS.green, marginLeft: 2 }}>Auto-reply</span>
              )}
              {trustStage < 4 && (
                <span style={{ color: COLORS.orange, marginLeft: 2 }}>Approval required</span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link
              href="/outreach"
              className="bd"
              style={{
                fontSize: 13,
                color: COLORS.textSecondary,
                textDecoration: 'none',
                fontWeight: 500,
                padding: '6px 14px',
                borderRadius: 8,
                border: `1px solid ${COLORS.border}`,
                transition: 'all 0.15s',
              }}
            >
              Outreach
            </Link>
            <Link
              href="/dashboard"
              className="bd"
              style={{
                fontSize: 13,
                color: COLORS.textSecondary,
                textDecoration: 'none',
                fontWeight: 500,
                padding: '6px 14px',
                borderRadius: 8,
                border: `1px solid ${COLORS.border}`,
                transition: 'all 0.15s',
              }}
            >
              Dashboard
            </Link>
          </div>
        </nav>

        {/* ─── Stats Row ─── */}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
            {[
              { label: 'Pending Replies', value: replyStats.pending, color: COLORS.purple, icon: '\u{1F4E8}' },
              { label: 'Hot Leads', value: replyStats.interested, color: COLORS.green, icon: '\u{1F525}' },
              { label: 'Objections', value: replyStats.objections, color: COLORS.orange, icon: '\u{1F6E1}\u{FE0F}' },
              { label: 'Meetings Booked', value: meetingStats.upcoming, color: COLORS.blue, icon: '\u{1F4C5}' },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: COLORS.white,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 14,
                  padding: '16px 18px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 16 }}>{stat.icon}</span>
                  <span className="mn" style={{ fontSize: 10, fontWeight: 600, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {stat.label}
                  </span>
                </div>
                <div className="hd" style={{ fontSize: 28, fontWeight: 900, color: stat.color }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* ─── Tab Switcher ─── */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
            {(['inbox', 'meetings'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="hd tab-btn"
                style={{
                  padding: '10px 24px',
                  borderRadius: 10,
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  background: activeTab === tab ? COLORS.purple : 'transparent',
                  color: activeTab === tab ? COLORS.white : COLORS.textSecondary,
                }}
              >
                {tab === 'inbox' ? 'Inbox' : 'Meetings'}
                <span
                  className="mn"
                  style={{
                    marginLeft: 8,
                    fontSize: 11,
                    background: activeTab === tab ? 'rgba(255,255,255,0.2)' : COLORS.grayLight,
                    padding: '2px 7px',
                    borderRadius: 5,
                  }}
                >
                  {tab === 'inbox' ? pendingCount : meetingStats.upcoming}
                </span>
              </button>
            ))}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* INBOX TAB                                                          */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'inbox' && (
            <div className="fade-up">
              {/* Filter Pills */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
                {([
                  { key: 'all' as FilterType, label: 'All', count: replies.filter((r) => r.status !== 'dismissed').length },
                  { key: 'interested' as FilterType, label: 'Interested', count: replies.filter((r) => r.intent === 'interested' && r.status !== 'dismissed').length },
                  { key: 'need_more_info' as FilterType, label: 'Need Info', count: replies.filter((r) => r.intent === 'need_more_info' && r.status !== 'dismissed').length },
                  { key: 'objection' as FilterType, label: 'Objections', count: replies.filter((r) => r.intent === 'objection' && r.status !== 'dismissed').length },
                  { key: 'not_interested' as FilterType, label: 'Not Interested', count: replies.filter((r) => r.intent === 'not_interested' && r.status !== 'dismissed').length },
                  { key: 'unsubscribe' as FilterType, label: 'Unsubscribe', count: replies.filter((r) => r.intent === 'unsubscribe' && r.status !== 'dismissed').length },
                ]).map(({ key, label, count }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className="bd filter-btn"
                    style={{
                      padding: '6px 14px',
                      borderRadius: 8,
                      border: `1px solid ${filter === key ? COLORS.purple : COLORS.border}`,
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                      background: filter === key ? COLORS.purpleLight : COLORS.white,
                      color: filter === key ? COLORS.purple : COLORS.textSecondary,
                      transition: 'all 0.15s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {label}
                    {count > 0 && (
                      <span
                        className="mn"
                        style={{
                          fontSize: 10,
                          background: filter === key ? COLORS.purple : COLORS.grayLight,
                          color: filter === key ? COLORS.white : COLORS.textSecondary,
                          padding: '1px 6px',
                          borderRadius: 4,
                        }}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Reply Cards */}
              {filteredReplies.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '80px 24px',
                    color: COLORS.textSecondary,
                  }}
                >
                  <div style={{ fontSize: 48, marginBottom: 16 }}>
                    {filter === 'all' ? '\u{1F4ED}' : '\u{1F50D}'}
                  </div>
                  <p className="hd" style={{ fontSize: 18, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 8 }}>
                    {filter === 'all' ? 'No replies yet' : 'No matching replies'}
                  </p>
                  <p className="bd" style={{ fontSize: 14 }}>
                    {filter === 'all'
                      ? "Jamie is working on it! Replies will appear here as prospects respond."
                      : 'Try a different filter to see more replies.'}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 40 }}>
                  {filteredReplies.map((reply, i) => {
                    const intentCfg = INTENT_CONFIG[reply.intent] || INTENT_CONFIG.need_more_info
                    const actionCfg = reply.recommendedAction ? ACTION_CONFIG[reply.recommendedAction] : null
                    const isExpanded = expandedReply === reply.id
                    const isLoading = loadingReply === reply.id
                    const isReAnalyzing = reAnalyzing === reply.id
                    const isEditingDraft = editingDraft === reply.id
                    const isUnsubscribing = unsubscribing === reply.id
                    const isShowingRedraft = showRedraftInput === reply.id

                    return (
                      <div
                        key={reply.id}
                        className={`reply-card fade-up d${Math.min(i + 1, 4)}`}
                        style={{
                          background: COLORS.white,
                          border: `1px solid ${reply.status === 'approved' ? COLORS.green + '40' : COLORS.border}`,
                          borderLeft: `3px solid ${intentCfg.color}`,
                          borderRadius: 16,
                          padding: 20,
                          opacity: reply.status === 'approved' ? 0.65 : 1,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                          position: 'relative',
                        }}
                      >
                        {/* Loading overlay */}
                        {(isLoading || isUnsubscribing) && (
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              background: 'rgba(255,255,255,0.7)',
                              borderRadius: 16,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              zIndex: 10,
                            }}
                          >
                            <div className="mn" style={{ fontSize: 13, color: COLORS.purple, animation: 'pulse 1s infinite' }}>
                              {isUnsubscribing ? 'Unsubscribing...' : 'Processing...'}
                            </div>
                          </div>
                        )}

                        {/* Header Row */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                          {/* Avatar */}
                          <div
                            className="hd"
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 12,
                              background: reply.avatarColor,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: COLORS.white,
                              fontWeight: 800,
                              fontSize: 14,
                              flexShrink: 0,
                            }}
                          >
                            {getInitials(reply.prospectName)}
                          </div>

                          {/* Content */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {/* Name + badges row */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                              <span className="hd" style={{ fontSize: 15, fontWeight: 700, color: COLORS.textPrimary }}>
                                {reply.prospectName}
                              </span>
                              <span className="bd" style={{ fontSize: 13, color: COLORS.textSecondary }}>
                                {reply.prospectCompany}
                              </span>
                              <span
                                className="mn"
                                style={{
                                  fontSize: 10,
                                  fontWeight: 600,
                                  color: intentCfg.color,
                                  background: intentCfg.bg,
                                  padding: '2px 8px',
                                  borderRadius: 5,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.04em',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 3,
                                }}
                              >
                                <span style={{ fontSize: 11 }}>{intentCfg.icon}</span>
                                {intentCfg.label}
                              </span>
                              {actionCfg && (
                                <span
                                  className="mn"
                                  style={{
                                    fontSize: 9,
                                    fontWeight: 600,
                                    color: actionCfg.color,
                                    background: actionCfg.bg,
                                    padding: '2px 7px',
                                    borderRadius: 5,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                  }}
                                >
                                  {actionCfg.label}
                                </span>
                              )}
                              {reply.status === 'approved' && (
                                <span
                                  className="mn"
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 600,
                                    color: COLORS.green,
                                    background: COLORS.greenLight,
                                    padding: '2px 8px',
                                    borderRadius: 5,
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  {trustStage >= 3 ? 'Sent' : 'Approved'}
                                </span>
                              )}
                              <span className="bd" style={{ fontSize: 12, color: COLORS.textTertiary, marginLeft: 'auto' }}>
                                {reply.receivedAt}
                              </span>
                            </div>

                            {/* Sentiment bar */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <div
                                style={{
                                  flex: 1,
                                  maxWidth: 120,
                                  height: 4,
                                  background: COLORS.grayLight,
                                  borderRadius: 2,
                                  overflow: 'hidden',
                                }}
                              >
                                <div
                                  className="sentiment-bar"
                                  style={{
                                    width: `${getSentimentBar(reply.sentimentScore)}%`,
                                    height: '100%',
                                    background: getSentimentColor(reply.sentimentScore),
                                    borderRadius: 2,
                                  }}
                                />
                              </div>
                              <span className="mn" style={{ fontSize: 10, color: getSentimentColor(reply.sentimentScore), fontWeight: 600 }}>
                                {reply.sentimentScore > 0 ? '+' : ''}{reply.sentimentScore.toFixed(1)}
                              </span>
                            </div>

                            {/* Reply body */}
                            <p
                              className="bd"
                              style={{
                                fontSize: 14,
                                color: COLORS.textPrimary,
                                margin: '6px 0',
                                lineHeight: 1.6,
                                background: '#FAFAF8',
                                padding: '10px 14px',
                                borderRadius: 10,
                                border: `1px solid ${COLORS.border}`,
                              }}
                            >
                              {reply.replyBody}
                            </p>

                            {/* Key Signals */}
                            {reply.keySignals.length > 0 && (
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, marginBottom: 4 }}>
                                {reply.keySignals.map((signal, si) => (
                                  <span
                                    key={si}
                                    className="mn signal-tag"
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 500,
                                      color: COLORS.textMedium,
                                      background: COLORS.bgWash,
                                      padding: '3px 8px',
                                      borderRadius: 5,
                                      border: `1px solid ${COLORS.border}`,
                                    }}
                                  >
                                    {signal}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Objection callout */}
                            {reply.objectionDetected && (
                              <div
                                style={{
                                  marginTop: 8,
                                  padding: '10px 14px',
                                  background: COLORS.orangeLight,
                                  borderRadius: 10,
                                  border: `1px solid ${COLORS.orange}20`,
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: 8,
                                }}
                              >
                                <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{'\u{1F6E1}\u{FE0F}'}</span>
                                <div>
                                  <div className="mn" style={{ fontSize: 10, fontWeight: 600, color: COLORS.orange, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
                                    Objection Detected
                                  </div>
                                  <div className="bd" style={{ fontSize: 13, color: COLORS.textPrimary, lineHeight: 1.4 }}>
                                    {reply.objectionDetected}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Action Buttons Row */}
                            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                              <button
                                onClick={() => setExpandedReply(isExpanded ? null : reply.id)}
                                className="bd"
                                style={{
                                  fontSize: 13,
                                  color: COLORS.purple,
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '4px 0',
                                  fontWeight: 600,
                                }}
                              >
                                {isExpanded ? 'Hide draft' : "View Jamie's draft"} {isExpanded ? '\u25B2' : '\u25BC'}
                              </button>

                              {reply.conversationHistory.length > 0 && (
                                <>
                                  <span style={{ color: COLORS.border }}>|</span>
                                  <button
                                    onClick={() => setShowConversation(showConversation === reply.id ? null : reply.id)}
                                    className="bd"
                                    style={{
                                      fontSize: 13,
                                      color: COLORS.textSecondary,
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      padding: '4px 0',
                                      fontWeight: 500,
                                    }}
                                  >
                                    {showConversation === reply.id ? 'Hide thread' : 'View thread'}
                                  </button>
                                </>
                              )}

                              {reply.status === 'pending' && (
                                <>
                                  <span style={{ color: COLORS.border }}>|</span>
                                  <button
                                    onClick={() => handleReAnalyze(reply)}
                                    disabled={isReAnalyzing}
                                    className="bd"
                                    style={{
                                      fontSize: 13,
                                      color: COLORS.textTertiary,
                                      background: 'none',
                                      border: 'none',
                                      cursor: isReAnalyzing ? 'wait' : 'pointer',
                                      padding: '4px 0',
                                      fontWeight: 500,
                                      opacity: isReAnalyzing ? 0.5 : 1,
                                    }}
                                  >
                                    {isReAnalyzing ? 'Analyzing...' : 'Re-analyze'}
                                  </button>
                                </>
                              )}
                            </div>

                            {/* Conversation Thread */}
                            {showConversation === reply.id && reply.conversationHistory.length > 0 && (
                              <div
                                style={{
                                  marginTop: 12,
                                  padding: 14,
                                  background: COLORS.bgWash,
                                  borderRadius: 10,
                                  border: `1px solid ${COLORS.border}`,
                                }}
                              >
                                <div
                                  className="mn"
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 600,
                                    color: COLORS.textSecondary,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.06em',
                                    marginBottom: 10,
                                  }}
                                >
                                  Conversation Thread
                                </div>
                                {reply.conversationHistory.map((msg, mi) => (
                                  <div
                                    key={mi}
                                    style={{
                                      padding: '8px 12px',
                                      background: COLORS.white,
                                      borderRadius: 8,
                                      marginBottom: mi < reply.conversationHistory.length - 1 ? 6 : 0,
                                      border: `1px solid ${COLORS.border}`,
                                    }}
                                  >
                                    <p className="bd" style={{ fontSize: 13, color: COLORS.textPrimary, margin: 0, lineHeight: 1.5 }}>
                                      {msg}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Expanded Draft Section */}
                            {isExpanded && (
                              <div
                                style={{
                                  marginTop: 12,
                                  padding: 16,
                                  background: '#FAFAF8',
                                  borderRadius: 12,
                                  border: `1px solid ${COLORS.border}`,
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                  <div
                                    className="mn"
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 600,
                                      color: COLORS.purple,
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.06em',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 6,
                                    }}
                                  >
                                    {'\u{2728}'} Jamie&apos;s Draft Response
                                    {trustStage >= 4 && (
                                      <span style={{ color: COLORS.green, fontSize: 9, background: COLORS.greenLight, padding: '1px 6px', borderRadius: 4 }}>
                                        AUTO-SEND
                                      </span>
                                    )}
                                  </div>
                                  {reply.status === 'pending' && !isEditingDraft && (
                                    <button
                                      onClick={() => handleStartEditDraft(reply)}
                                      className="bd"
                                      style={{
                                        fontSize: 12,
                                        color: COLORS.textSecondary,
                                        background: 'none',
                                        border: `1px solid ${COLORS.border}`,
                                        borderRadius: 6,
                                        padding: '3px 10px',
                                        cursor: 'pointer',
                                        fontWeight: 500,
                                      }}
                                    >
                                      Edit
                                    </button>
                                  )}
                                </div>

                                {isEditingDraft ? (
                                  <div>
                                    <textarea
                                      className="bd"
                                      value={editDraftText}
                                      onChange={(e) => setEditDraftText(e.target.value)}
                                      style={{
                                        width: '100%',
                                        minHeight: 120,
                                        padding: 12,
                                        borderRadius: 10,
                                        border: `1.5px solid ${COLORS.purple}`,
                                        fontSize: 13,
                                        color: COLORS.textPrimary,
                                        lineHeight: 1.6,
                                        resize: 'vertical',
                                        outline: 'none',
                                        boxSizing: 'border-box',
                                        background: COLORS.white,
                                      }}
                                    />
                                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                                      <button
                                        onClick={() => handleSaveEditDraft(reply.id)}
                                        className="bd action-btn"
                                        style={{
                                          padding: '7px 16px',
                                          borderRadius: 8,
                                          border: 'none',
                                          fontSize: 13,
                                          fontWeight: 600,
                                          cursor: 'pointer',
                                          background: COLORS.purple,
                                          color: COLORS.white,
                                        }}
                                      >
                                        Save Draft
                                      </button>
                                      <button
                                        onClick={() => { setEditingDraft(null); setEditDraftText(''); }}
                                        className="bd action-btn"
                                        style={{
                                          padding: '7px 16px',
                                          borderRadius: 8,
                                          border: `1px solid ${COLORS.border}`,
                                          fontSize: 13,
                                          fontWeight: 600,
                                          cursor: 'pointer',
                                          background: COLORS.white,
                                          color: COLORS.textSecondary,
                                        }}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="bd" style={{ fontSize: 13, color: COLORS.textPrimary, lineHeight: 1.6, margin: 0 }}>
                                    {reply.draftResponse}
                                  </p>
                                )}

                                {/* AI Redraft */}
                                {reply.status === 'pending' && !isEditingDraft && (
                                  <>
                                    {isShowingRedraft ? (
                                      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                                        <input
                                          className="bd"
                                          type="text"
                                          value={redraftFeedback}
                                          onChange={(e) => setRedraftFeedback(e.target.value)}
                                          placeholder="e.g. Make it shorter, mention our pricing..."
                                          onKeyDown={(e) => e.key === 'Enter' && handleRedraft(reply)}
                                          style={{
                                            flex: 1,
                                            padding: '8px 12px',
                                            borderRadius: 8,
                                            border: `1px solid ${COLORS.border}`,
                                            fontSize: 13,
                                            outline: 'none',
                                            color: COLORS.textPrimary,
                                          }}
                                        />
                                        <button
                                          onClick={() => handleRedraft(reply)}
                                          className="bd action-btn"
                                          style={{
                                            padding: '8px 14px',
                                            borderRadius: 8,
                                            border: 'none',
                                            fontSize: 12,
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            background: `linear-gradient(135deg, ${COLORS.purple}, ${COLORS.rose})`,
                                            color: COLORS.white,
                                            whiteSpace: 'nowrap',
                                          }}
                                        >
                                          {'\u{2728}'} Redraft
                                        </button>
                                        <button
                                          onClick={() => { setShowRedraftInput(null); setRedraftFeedback(''); }}
                                          className="bd"
                                          style={{
                                            padding: '8px 10px',
                                            borderRadius: 8,
                                            border: `1px solid ${COLORS.border}`,
                                            fontSize: 12,
                                            cursor: 'pointer',
                                            background: COLORS.white,
                                            color: COLORS.textSecondary,
                                          }}
                                        >
                                          {'\u2715'}
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => setShowRedraftInput(reply.id)}
                                        className="bd"
                                        style={{
                                          marginTop: 10,
                                          fontSize: 12,
                                          color: COLORS.purple,
                                          background: 'none',
                                          border: 'none',
                                          cursor: 'pointer',
                                          padding: 0,
                                          fontWeight: 500,
                                        }}
                                      >
                                        {'\u{2728}'} Ask Jamie to redraft...
                                      </button>
                                    )}
                                  </>
                                )}

                                {/* Primary Action Buttons */}
                                {reply.status === 'pending' && !isEditingDraft && (
                                  <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                                    {/* Unsubscribe-specific actions */}
                                    {reply.intent === 'unsubscribe' ? (
                                      <>
                                        <button
                                          onClick={() => handleUnsubscribe(reply)}
                                          className="bd action-btn"
                                          style={{
                                            padding: '8px 18px',
                                            borderRadius: 8,
                                            border: 'none',
                                            fontSize: 13,
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            background: COLORS.gray,
                                            color: COLORS.white,
                                          }}
                                        >
                                          {'\u{1F6D1}'} Confirm Unsubscribe & Send
                                        </button>
                                        <button
                                          onClick={() => handleDismiss(reply.id)}
                                          className="bd action-btn"
                                          style={{
                                            padding: '8px 18px',
                                            borderRadius: 8,
                                            border: `1px solid ${COLORS.border}`,
                                            fontSize: 13,
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            background: COLORS.white,
                                            color: COLORS.textSecondary,
                                          }}
                                        >
                                          Dismiss
                                        </button>
                                      </>
                                    ) : reply.recommendedAction === 'book_meeting' ? (
                                      <>
                                        <button
                                          onClick={() => handleBookMeeting(reply)}
                                          className="bd action-btn"
                                          style={{
                                            padding: '8px 18px',
                                            borderRadius: 8,
                                            border: 'none',
                                            fontSize: 13,
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            background: `linear-gradient(135deg, ${COLORS.purple}, ${COLORS.rose})`,
                                            color: COLORS.white,
                                          }}
                                        >
                                          {'\u{1F4C5}'} Propose Meeting Times
                                        </button>
                                        <button
                                          onClick={() => handleApprove(reply.id)}
                                          className="bd action-btn"
                                          style={{
                                            padding: '8px 18px',
                                            borderRadius: 8,
                                            border: 'none',
                                            fontSize: 13,
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            background: COLORS.green,
                                            color: COLORS.white,
                                          }}
                                        >
                                          {autoSendLabel}
                                        </button>
                                        <button
                                          onClick={() => handleDismiss(reply.id)}
                                          className="bd action-btn"
                                          style={{
                                            padding: '8px 18px',
                                            borderRadius: 8,
                                            border: `1px solid ${COLORS.border}`,
                                            fontSize: 13,
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            background: COLORS.white,
                                            color: COLORS.textSecondary,
                                          }}
                                        >
                                          Dismiss
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => handleApprove(reply.id)}
                                          className="bd action-btn"
                                          style={{
                                            padding: '8px 18px',
                                            borderRadius: 8,
                                            border: 'none',
                                            fontSize: 13,
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            background: COLORS.green,
                                            color: COLORS.white,
                                          }}
                                        >
                                          {autoSendLabel}
                                        </button>
                                        <button
                                          onClick={() => handleDismiss(reply.id)}
                                          className="bd action-btn"
                                          style={{
                                            padding: '8px 18px',
                                            borderRadius: 8,
                                            border: `1px solid ${COLORS.border}`,
                                            fontSize: 13,
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            background: COLORS.white,
                                            color: COLORS.textSecondary,
                                          }}
                                        >
                                          Dismiss
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* MEETINGS TAB                                                       */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'meetings' && (
            <div className="fade-up">
              {/* Meeting Stats */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                {[
                  { label: 'Total This Week', value: meetingStats.total, color: COLORS.purple },
                  { label: 'Upcoming', value: meetingStats.upcoming, color: COLORS.green },
                  { label: 'Completed', value: meetingStats.completed, color: COLORS.blue },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    style={{
                      flex: 1,
                      background: COLORS.white,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 14,
                      padding: '18px 20px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div className="mn" style={{ fontSize: 11, fontWeight: 600, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                      {stat.label}
                    </div>
                    <div className="hd" style={{ fontSize: 28, fontWeight: 900, color: stat.color }}>
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Calendar Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 className="hd" style={{ fontSize: 20, fontWeight: 800, color: COLORS.textPrimary, margin: 0 }}>
                  This Week
                </h2>
                <button
                  onClick={() => setShowBookModal(true)}
                  className="bd action-btn"
                  style={{
                    padding: '9px 20px',
                    borderRadius: 10,
                    border: 'none',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: `linear-gradient(135deg, ${COLORS.purple}, ${COLORS.rose})`,
                    color: COLORS.white,
                  }}
                >
                  + Book New Meeting
                </button>
              </div>

              {/* Week Calendar Grid */}
              <div
                style={{
                  background: COLORS.white,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 16,
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  marginBottom: 28,
                }}
              >
                {/* Day Headers */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '60px repeat(5, 1fr)',
                    borderBottom: `1px solid ${COLORS.border}`,
                  }}
                >
                  <div style={{ padding: 12 }} />
                  {DAYS.map((day) => (
                    <div
                      key={day}
                      className="hd"
                      style={{
                        padding: '12px 8px',
                        fontSize: 13,
                        fontWeight: 700,
                        color: COLORS.textPrimary,
                        textAlign: 'center',
                        borderLeft: `1px solid ${COLORS.border}`,
                      }}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Time Rows */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '60px repeat(5, 1fr)',
                      minHeight: 52,
                      borderBottom: `1px solid ${COLORS.border}`,
                    }}
                  >
                    <div
                      className="mn"
                      style={{
                        padding: '6px 8px',
                        fontSize: 10,
                        fontWeight: 500,
                        color: COLORS.textSecondary,
                        textAlign: 'right',
                      }}
                    >
                      {formatHour(hour)}
                    </div>
                    {DAYS.map((_, dayIdx) => {
                      const meeting = meetings.find((m) => m.day === dayIdx && m.hour === hour)
                      return (
                        <div
                          key={dayIdx}
                          style={{
                            borderLeft: `1px solid ${COLORS.border}`,
                            padding: 3,
                            position: 'relative',
                          }}
                        >
                          {meeting && (
                            <div
                              className="calendar-meeting"
                              onClick={() => setSelectedMeeting(meeting)}
                              style={{
                                background:
                                  meeting.status === 'completed'
                                    ? COLORS.grayLight
                                    : meeting.status === 'cancelled'
                                    ? COLORS.roseLight
                                    : `linear-gradient(135deg, ${COLORS.purpleLight}, #F5F3FF)`,
                                border: `1px solid ${
                                  meeting.status === 'completed'
                                    ? COLORS.border
                                    : meeting.status === 'cancelled'
                                    ? COLORS.rose + '30'
                                    : '#DDD6FE'
                                }`,
                                borderRadius: 8,
                                padding: '6px 8px',
                                height: meeting.duration > 0.5 ? 92 : 42,
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                className="hd"
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color:
                                    meeting.status === 'completed'
                                      ? COLORS.textSecondary
                                      : meeting.status === 'cancelled'
                                      ? COLORS.rose
                                      : COLORS.purple,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {meeting.prospectName}
                              </div>
                              <div
                                className="bd"
                                style={{
                                  fontSize: 10,
                                  color: COLORS.textSecondary,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {meeting.prospectCompany}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>

              {/* Upcoming Meetings List */}
              <h3 className="hd" style={{ fontSize: 17, fontWeight: 800, color: COLORS.textPrimary, marginBottom: 14 }}>
                Upcoming Meetings
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 40 }}>
                {meetings
                  .filter((m) => m.status === 'upcoming')
                  .sort((a, b) => a.day - b.day || a.hour - b.hour)
                  .map((meeting) => (
                    <div
                      key={meeting.id}
                      className="meeting-card"
                      onClick={() => setSelectedMeeting(meeting)}
                      style={{
                        background: COLORS.white,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: 14,
                        padding: '16px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      }}
                    >
                      <div
                        style={{
                          background: COLORS.purpleLight,
                          borderRadius: 10,
                          padding: '10px 14px',
                          textAlign: 'center',
                          minWidth: 70,
                        }}
                      >
                        <div className="hd" style={{ fontSize: 13, fontWeight: 800, color: COLORS.purple }}>
                          {DAYS[meeting.day]}
                        </div>
                        <div className="mn" style={{ fontSize: 11, fontWeight: 500, color: COLORS.purple }}>
                          {formatHour(meeting.hour)}
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="hd" style={{ fontSize: 15, fontWeight: 700, color: COLORS.textPrimary }}>
                          {meeting.prospectName}
                        </div>
                        <div className="bd" style={{ fontSize: 13, color: COLORS.textSecondary }}>
                          {meeting.prospectCompany}
                        </div>
                      </div>
                      <div
                        className="mn"
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          color: COLORS.textSecondary,
                          background: COLORS.grayLight,
                          padding: '4px 10px',
                          borderRadius: 6,
                        }}
                      >
                        {meeting.duration === 1 ? '1 hr' : '30 min'}
                      </div>
                    </div>
                  ))}
                {meetings.filter((m) => m.status === 'upcoming').length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 24px', color: COLORS.textSecondary }}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>{'\u{1F4C5}'}</div>
                    <p className="hd" style={{ fontSize: 16, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 4 }}>No upcoming meetings</p>
                    <p className="bd" style={{ fontSize: 13 }}>Meetings will appear here when prospects are ready to talk.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* MEETING BOOKING MODAL (from reply)                                 */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {bookingMeetingFor && (
          <div
            onClick={() => { setBookingMeetingFor(null); setProposedTimes([]); setMeetingResponse(''); }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              backdropFilter: 'blur(4px)',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="fade-up"
              style={{
                background: COLORS.white,
                borderRadius: 20,
                padding: 28,
                width: 520,
                maxWidth: '90vw',
                maxHeight: '85vh',
                overflow: 'auto',
                boxShadow: '0 24px 48px rgba(0,0,0,0.12)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h3 className="hd" style={{ fontSize: 20, fontWeight: 800, color: COLORS.textPrimary, margin: 0 }}>
                  {'\u{1F4C5}'} Book Meeting
                </h3>
                <button
                  onClick={() => { setBookingMeetingFor(null); setProposedTimes([]); setMeetingResponse(''); }}
                  style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: COLORS.textSecondary, padding: 4 }}
                >
                  {'\u2715'}
                </button>
              </div>

              <div style={{ padding: '12px 16px', background: COLORS.purpleLight, borderRadius: 12, marginBottom: 20 }}>
                <div className="hd" style={{ fontSize: 15, fontWeight: 700, color: COLORS.purple }}>
                  {bookingMeetingFor.prospectName}
                </div>
                <div className="bd" style={{ fontSize: 13, color: COLORS.textSecondary }}>
                  {bookingMeetingFor.prospectCompany} &middot; {bookingMeetingFor.prospectEmail}
                </div>
              </div>

              {loadingMeetingTimes ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div className="mn" style={{ fontSize: 14, color: COLORS.purple, animation: 'pulse 1s infinite' }}>
                    {'\u{2728}'} Jamie is preparing meeting options...
                  </div>
                </div>
              ) : (
                <>
                  {/* Proposed Times */}
                  <div className="mn" style={{ fontSize: 10, fontWeight: 600, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                    Select a time to propose
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                    {proposedTimes.map((time, i) => (
                      <button
                        key={i}
                        onClick={() => confirmBookMeeting(time)}
                        className="bd action-btn"
                        style={{
                          padding: '12px 18px',
                          borderRadius: 10,
                          border: `1px solid ${COLORS.purple}30`,
                          fontSize: 14,
                          fontWeight: 500,
                          cursor: 'pointer',
                          background: COLORS.white,
                          color: COLORS.textPrimary,
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                        }}
                      >
                        <span style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background: COLORS.purpleLight,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 13,
                          fontWeight: 700,
                          color: COLORS.purple,
                          flexShrink: 0,
                        }}>
                          {i + 1}
                        </span>
                        {time}
                      </button>
                    ))}
                  </div>

                  {/* Meeting Response Preview */}
                  {meetingResponse && (
                    <div>
                      <div className="mn" style={{ fontSize: 10, fontWeight: 600, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                        Email Draft Preview
                      </div>
                      <div
                        style={{
                          padding: 14,
                          background: '#FAFAF8',
                          borderRadius: 10,
                          border: `1px solid ${COLORS.border}`,
                        }}
                      >
                        <p className="bd" style={{ fontSize: 13, color: COLORS.textPrimary, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                          {meetingResponse}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* MEETING DETAIL MODAL                                               */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {selectedMeeting && (
          <div
            onClick={() => setSelectedMeeting(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              backdropFilter: 'blur(4px)',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="fade-up"
              style={{
                background: COLORS.white,
                borderRadius: 20,
                padding: 28,
                width: 440,
                maxWidth: '90vw',
                boxShadow: '0 24px 48px rgba(0,0,0,0.12)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h3 className="hd" style={{ fontSize: 20, fontWeight: 800, color: COLORS.textPrimary, margin: 0 }}>
                  Meeting Details
                </h3>
                <button
                  onClick={() => setSelectedMeeting(null)}
                  style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: COLORS.textSecondary, padding: 4 }}
                >
                  {'\u2715'}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <div className="mn" style={{ fontSize: 10, fontWeight: 600, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                    Prospect
                  </div>
                  <div className="hd" style={{ fontSize: 16, fontWeight: 700, color: COLORS.textPrimary }}>
                    {selectedMeeting.prospectName}
                  </div>
                  <div className="bd" style={{ fontSize: 13, color: COLORS.textSecondary }}>
                    {selectedMeeting.prospectCompany} &middot; {selectedMeeting.prospectEmail}
                  </div>
                </div>

                <div>
                  <div className="mn" style={{ fontSize: 10, fontWeight: 600, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                    When
                  </div>
                  <div className="bd" style={{ fontSize: 15, fontWeight: 600, color: COLORS.textPrimary }}>
                    {selectedMeeting.scheduledAt
                      ? selectedMeeting.scheduledAt
                      : `${DAYS[selectedMeeting.day]}, ${formatHour(selectedMeeting.hour)} — ${selectedMeeting.duration === 1 ? '1 hour' : '30 minutes'}`
                    }
                  </div>
                </div>

                <div>
                  <div className="mn" style={{ fontSize: 10, fontWeight: 600, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                    Status
                  </div>
                  <span
                    className="mn"
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: selectedMeeting.status === 'upcoming' ? COLORS.green
                        : selectedMeeting.status === 'completed' ? COLORS.blue
                        : selectedMeeting.status === 'cancelled' ? COLORS.rose
                        : COLORS.orange,
                      background: selectedMeeting.status === 'upcoming' ? COLORS.greenLight
                        : selectedMeeting.status === 'completed' ? COLORS.blueLight
                        : selectedMeeting.status === 'cancelled' ? COLORS.roseLight
                        : COLORS.orangeLight,
                      padding: '3px 10px',
                      borderRadius: 6,
                      textTransform: 'uppercase',
                    }}
                  >
                    {selectedMeeting.status}
                  </span>
                </div>

                {selectedMeeting.notes && (
                  <div>
                    <div className="mn" style={{ fontSize: 10, fontWeight: 600, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                      Notes
                    </div>
                    <p className="bd" style={{ fontSize: 14, color: COLORS.textPrimary, lineHeight: 1.5, margin: 0 }}>
                      {selectedMeeting.notes}
                    </p>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                {selectedMeeting.status === 'upcoming' && (
                  <button
                    onClick={() => {
                      setMeetings((prev) => prev.map((m) => m.id === selectedMeeting.id ? { ...m, status: 'cancelled' as const } : m))
                      setSelectedMeeting(null)
                    }}
                    className="bd action-btn"
                    style={{
                      flex: 1,
                      padding: '10px 20px',
                      borderRadius: 10,
                      border: `1px solid ${COLORS.rose}30`,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: COLORS.roseLight,
                      color: COLORS.rose,
                    }}
                  >
                    Cancel Meeting
                  </button>
                )}
                <button
                  onClick={() => setSelectedMeeting(null)}
                  className="bd action-btn"
                  style={{
                    flex: 1,
                    padding: '10px 20px',
                    borderRadius: 10,
                    border: `1px solid ${COLORS.border}`,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: COLORS.white,
                    color: COLORS.textPrimary,
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* BOOK NEW MEETING MODAL                                             */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {showBookModal && (
          <div
            onClick={() => setShowBookModal(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              backdropFilter: 'blur(4px)',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="fade-up"
              style={{
                background: COLORS.white,
                borderRadius: 20,
                padding: 28,
                width: 440,
                maxWidth: '90vw',
                boxShadow: '0 24px 48px rgba(0,0,0,0.12)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h3 className="hd" style={{ fontSize: 20, fontWeight: 800, color: COLORS.textPrimary, margin: 0 }}>
                  Book New Meeting
                </h3>
                <button
                  onClick={() => setShowBookModal(false)}
                  style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: COLORS.textSecondary, padding: 4 }}
                >
                  {'\u2715'}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { label: 'Prospect Name', key: 'name' as const, placeholder: 'e.g. Sarah Chen', type: 'text' },
                  { label: 'Company', key: 'company' as const, placeholder: 'e.g. Lumina AI', type: 'text' },
                  { label: 'Email', key: 'email' as const, placeholder: 'e.g. sarah@lumina.com', type: 'email' },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="mn" style={{ fontSize: 10, fontWeight: 600, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                      {field.label}
                    </label>
                    <input
                      className="bd"
                      type={field.type}
                      value={bookForm[field.key]}
                      onChange={(e) => setBookForm({ ...bookForm, [field.key]: e.target.value })}
                      placeholder={field.placeholder}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: `1px solid ${COLORS.border}`,
                        fontSize: 14,
                        color: COLORS.textPrimary,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                ))}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="mn" style={{ fontSize: 10, fontWeight: 600, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                      Day
                    </label>
                    <select
                      className="bd"
                      value={bookForm.day}
                      onChange={(e) => setBookForm({ ...bookForm, day: Number(e.target.value) })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: `1px solid ${COLORS.border}`,
                        fontSize: 14,
                        color: COLORS.textPrimary,
                        outline: 'none',
                        background: COLORS.white,
                        boxSizing: 'border-box',
                      }}
                    >
                      {DAYS.map((day, i) => (
                        <option key={i} value={i}>{day}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mn" style={{ fontSize: 10, fontWeight: 600, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                      Time
                    </label>
                    <select
                      className="bd"
                      value={bookForm.hour}
                      onChange={(e) => setBookForm({ ...bookForm, hour: Number(e.target.value) })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: `1px solid ${COLORS.border}`,
                        fontSize: 14,
                        color: COLORS.textPrimary,
                        outline: 'none',
                        background: COLORS.white,
                        boxSizing: 'border-box',
                      }}
                    >
                      {HOURS.map((h) => (
                        <option key={h} value={h}>{formatHour(h)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mn" style={{ fontSize: 10, fontWeight: 600, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                    Notes
                  </label>
                  <textarea
                    className="bd"
                    value={bookForm.notes}
                    onChange={(e) => setBookForm({ ...bookForm, notes: e.target.value })}
                    placeholder="Meeting context, topics to discuss..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: `1px solid ${COLORS.border}`,
                      fontSize: 14,
                      color: COLORS.textPrimary,
                      outline: 'none',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <button
                onClick={handleBookNew}
                className="bd action-btn"
                style={{
                  marginTop: 20,
                  width: '100%',
                  padding: '12px 20px',
                  borderRadius: 10,
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: `linear-gradient(135deg, ${COLORS.purple}, ${COLORS.rose})`,
                  color: COLORS.white,
                }}
              >
                Book Meeting
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
