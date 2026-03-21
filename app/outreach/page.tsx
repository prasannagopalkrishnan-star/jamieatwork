'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'

// ─── Types ─────────────────────────────────────────────
type MessageStatus = 'draft' | 'approved' | 'sent' | 'recalled' | 'rejected'
type SequenceStatus = 'not_started' | 'in_progress' | 'replied' | 'booked' | 'unsubscribed' | 'completed'

interface SequenceMessage {
  step: number
  channel: 'email' | 'linkedin'
  day: number
  subject: string
  body: string
  status: MessageStatus
  sent_at?: string | null
  opened?: boolean
  clicked?: boolean
}

interface OutreachProspect {
  id: string
  name: string
  company: string
  role: string
  email?: string
  pain_point?: string
  notes?: string
  trustStage: number
  sequenceStatus: SequenceStatus
  messages: SequenceMessage[]
  replyText?: string
  replyAnalysis?: ReplyAnalysis | null
}

interface ReplyAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral' | 'out_of_office'
  intent: 'interested' | 'not_interested' | 'need_more_info' | 'unsubscribe' | 'out_of_office'
  key_signals: string[]
  draft_response: string
  recommended_action: string
}

// ─── Demo Data ─────────────────────────────────────────
const DEMO_PROSPECTS: OutreachProspect[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    company: 'Luminary AI',
    role: 'Head of Growth',
    email: 'sarah@luminary.ai',
    pain_point: 'Drowning in unqualified leads post-Series A',
    notes: 'Series A, 30 employees, AI analytics space',
    trustStage: 2,
    sequenceStatus: 'in_progress',
    messages: [
      { step: 1, channel: 'email', day: 1, subject: "Quick question about {{company}}'s growth stack", body: "Hi {{first_name}},\n\nI noticed {{company}} just closed your Series A — congrats! At that stage, most growth leaders I talk to are {{pain_point}}.\n\nWe help teams like yours qualify and engage prospects 24/7 without hiring a full SDR team. One founder told me it was like \"cloning their best sales rep.\"\n\nWorth a 15-min chat to see if it fits?\n\nBest,\nJamie", status: 'sent', sent_at: '2026-03-17T09:00:00Z', opened: true, clicked: true },
      { step: 2, channel: 'email', day: 3, subject: 'Re: The SDR problem at 30 people', body: "Hi {{first_name}},\n\nFollowing up — I know inbox noise is real, so I'll keep this short.\n\nCompanies your size typically spend $70K+/yr on an SDR who takes 3 months to ramp. Our AI SDR starts working in 10 minutes and costs a fraction of that.\n\nOne customer booked 23 qualified meetings in their first month.\n\nHappy to share the case study if helpful?\n\nJamie", status: 'sent', sent_at: '2026-03-19T09:00:00Z', opened: true, clicked: false },
      { step: 3, channel: 'linkedin', day: 5, subject: '', body: "Hey {{first_name}}! Sent a couple emails about helping {{company}} automate lead qualification. Would love to connect — think it could save your team serious time. Open to a quick chat?", status: 'approved' },
      { step: 4, channel: 'email', day: 10, subject: "Last one from me, {{first_name}}", body: "Hi {{first_name}},\n\nI don't want to be that person who won't take a hint, so this is my last note.\n\nIf automating lead qualification and outreach isn't a priority right now, totally understand. But if it is and timing just hasn't been right — I'm here whenever.\n\nEither way, wishing {{company}} a great quarter.\n\nJamie", status: 'draft' },
    ],
  },
  {
    id: '2',
    name: 'Marcus Johnson',
    company: 'FleetOps',
    role: 'CEO & Co-founder',
    email: 'marcus@fleetops.io',
    pain_point: 'Solo founder wearing the sales hat',
    notes: 'Pre-seed, logistics SaaS, solo founder doing sales',
    trustStage: 1,
    sequenceStatus: 'not_started',
    messages: [
      { step: 1, channel: 'email', day: 1, subject: "Solo founder doing sales? There's a better way", body: "Hi {{first_name}},\n\nI see you're building {{company}} — logistics SaaS is a tough but massive market. As a solo founder, I'm guessing you're {{pain_point}} on top of everything else.\n\nWhat if you had an AI SDR that could qualify your inbound leads, send personalized outreach, and book meetings while you focus on product?\n\nTakes 10 minutes to set up. Costs less than a coffee subscription.\n\nWant to see how it works?\n\nJamie", status: 'draft' },
      { step: 2, channel: 'email', day: 3, subject: 'Re: Your sales bandwidth', body: "Hi {{first_name}},\n\nQuick follow-up — I know as a founder your time is your scarcest resource.\n\nOur AI SDR Jamie learns your product, ICP, and objection handling in a 10-minute training session. Then it works 24/7 qualifying leads and booking meetings.\n\nNo hiring. No ramp time. No commission.\n\nWorth exploring?\n\nJamie", status: 'draft' },
      { step: 3, channel: 'linkedin', day: 5, subject: '', body: "Hey {{first_name}} — building {{company}} solo is impressive. Sent you a note about an AI SDR that could handle your outreach. Interested in a quick demo?", status: 'draft' },
      { step: 4, channel: 'email', day: 10, subject: 'Closing the loop, {{first_name}}', body: "Hi {{first_name}},\n\nLast note from me. If now isn't the right time for sales automation, no worries at all.\n\nBut when you're ready to stop doing sales yourself and let AI handle the top of funnel — we'll be here.\n\nRooting for {{company}} either way.\n\nJamie", status: 'draft' },
    ],
  },
  {
    id: '3',
    name: 'Priya Patel',
    company: 'HealthBridge',
    role: 'VP Sales',
    email: 'priya@healthbridge.com',
    pain_point: 'Scaling sales without scaling headcount post-Series B',
    notes: 'Series B healthtech, 80 people, scaling sales team',
    trustStage: 4,
    sequenceStatus: 'replied',
    replyText: "Hi Jamie,\n\nThis is interesting — we've been looking at ways to augment our SDR team without doubling headcount. Can you share more about how the AI handles HIPAA-related conversations?\n\nBest,\nPriya",
    replyAnalysis: {
      sentiment: 'positive',
      intent: 'need_more_info',
      key_signals: ['Interested in AI augmentation', 'Concerned about HIPAA compliance', 'Has existing SDR team'],
      draft_response: "Hi Priya,\n\nGreat question! Our AI SDR is trained to navigate HIPAA-aware conversations. It knows which claims to avoid and routes sensitive discussions to your human team.\n\nWant to see a quick demo focused on healthtech use cases? I can walk through exactly how the compliance guardrails work.\n\nJamie",
      recommended_action: 'send_info',
    },
    messages: [
      { step: 1, channel: 'email', day: 1, subject: "Scaling sales at {{company}} without scaling headcount", body: "Hi {{first_name}},\n\nCongrats on {{company}}'s Series B! As you scale the sales org, the math on SDR hiring gets painful fast — $70K+ per head, 3-month ramp, 40% annual turnover.\n\nWhat if you could add capacity without adding headcount? Our AI SDR handles lead qualification, personalized outreach, and meeting booking — 24/7.\n\nWould love to show you how it works for healthtech companies specifically.\n\nJamie", status: 'sent', sent_at: '2026-03-10T09:00:00Z', opened: true, clicked: true },
      { step: 2, channel: 'email', day: 3, subject: 'Re: AI SDRs in healthtech', body: "Hi {{first_name}},\n\nFollowing up with something specific — we recently helped a healthtech company similar to {{company}} book 31 qualified meetings in 6 weeks. Their VP Sales said it was like adding 2 SDRs overnight.\n\nThe AI learns your ICP, qualification criteria, and even handles HIPAA-aware objections.\n\n15 minutes to walk through it?\n\nJamie", status: 'sent', sent_at: '2026-03-12T09:00:00Z', opened: true, clicked: true },
      { step: 3, channel: 'linkedin', day: 5, subject: '', body: "Hi {{first_name}}! Following up on my emails about AI-powered sales dev for {{company}}. Happy to share healthtech-specific results. Open to connecting?", status: 'sent', sent_at: '2026-03-14T09:00:00Z', opened: false, clicked: false },
      { step: 4, channel: 'email', day: 10, subject: "One last thought for {{company}}", body: "Hi {{first_name}},\n\nFinal follow-up — I know {{pain_point}} is all-consuming.\n\nIf adding AI-powered SDR capacity is on your radar for this quarter, I'd love to help. If not, no hard feelings.\n\nWishing {{company}} a strong Q2.\n\nJamie", status: 'draft' },
    ],
  },
]

// ─── Style Constants ───────────────────────────────────
const c = {
  bg: '#F8F7F4',
  wash: '#F5F3EE',
  purple: '#7C3AED',
  purpleLight: 'rgba(124,58,237,.08)',
  purpleBorder: 'rgba(124,58,237,.18)',
  rose: '#F43F5E',
  roseLight: 'rgba(244,63,94,.08)',
  roseBorder: 'rgba(244,63,94,.18)',
  gradient: 'linear-gradient(135deg, #7C3AED, #EC4899)',
  textPrimary: '#1A1A1A',
  textMedium: '#57534E',
  textSecondary: '#6B6B6B',
  textTertiary: '#A3A3A3',
  white: '#FFFFFF',
  border: 'rgba(0,0,0,.06)',
  borderHover: 'rgba(0,0,0,.12)',
  success: '#16A34A',
  successLight: 'rgba(22,163,74,.08)',
  warning: '#EA580C',
  warningLight: 'rgba(234,88,12,.08)',
  error: '#DC2626',
  errorLight: 'rgba(220,38,38,.08)',
  info: '#0EA5E9',
  infoLight: 'rgba(14,165,233,.08)',
}

const f = {
  hd: "'Cabinet Grotesk', sans-serif",
  bd: "'DM Sans', sans-serif",
  mn: "'JetBrains Mono', monospace",
}

// ─── Helpers ───────────────────────────────────────────
function resolveTokens(text: string, prospect: OutreachProspect): string {
  const firstName = prospect.name.split(' ')[0]
  return text
    .replace(/\{\{first_name\}\}/g, firstName)
    .replace(/\{\{company\}\}/g, prospect.company)
    .replace(/\{\{pain_point\}\}/g, prospect.pain_point || 'scaling your pipeline')
}

function getStatusBadge(status: MessageStatus): { bg: string; color: string; label: string } {
  switch (status) {
    case 'draft': return { bg: 'rgba(0,0,0,.04)', color: c.textSecondary, label: 'Draft' }
    case 'approved': return { bg: c.purpleLight, color: c.purple, label: 'Approved' }
    case 'sent': return { bg: c.successLight, color: c.success, label: 'Sent' }
    case 'recalled': return { bg: c.warningLight, color: c.warning, label: 'Recalled' }
    case 'rejected': return { bg: c.errorLight, color: c.error, label: 'Rejected' }
    default: return { bg: 'rgba(0,0,0,.04)', color: c.textSecondary, label: status }
  }
}

function getSeqStatusConfig(status: SequenceStatus): { label: string; color: string; bg: string; icon: string } {
  switch (status) {
    case 'not_started': return { label: 'Not Started', color: c.textTertiary, bg: 'rgba(0,0,0,.04)', icon: '○' }
    case 'in_progress': return { label: 'In Progress', color: c.purple, bg: c.purpleLight, icon: '◉' }
    case 'replied': return { label: 'Replied', color: c.info, bg: c.infoLight, icon: '↩' }
    case 'booked': return { label: 'Booked', color: c.success, bg: c.successLight, icon: '✓' }
    case 'unsubscribed': return { label: 'Unsubscribed', color: c.error, bg: c.errorLight, icon: '✕' }
    case 'completed': return { label: 'Completed', color: c.success, bg: c.successLight, icon: '✓✓' }
    default: return { label: status, color: c.textSecondary, bg: 'rgba(0,0,0,.04)', icon: '?' }
  }
}

function getTrustLabel(stage: number): { label: string; icon: string; color: string } {
  switch (stage) {
    case 1: return { label: 'Observe', icon: '👀', color: c.textSecondary }
    case 2: return { label: 'Draft', icon: '✍️', color: c.info }
    case 3: return { label: 'Supervised', icon: '📤', color: c.warning }
    case 4: return { label: 'Replies', icon: '💬', color: c.rose }
    case 5: return { label: 'Autopilot', icon: '🚀', color: c.success }
    default: return { label: 'Unknown', icon: '?', color: c.textSecondary }
  }
}

// ─── Tab type ──────────────────────────────────────────
type Tab = 'sequence' | 'tracking' | 'reply'

// ─── Main Component ────────────────────────────────────
export default function OutreachPage() {
  const [prospects, setProspects] = useState<OutreachProspect[]>(DEMO_PROSPECTS)
  const [selectedId, setSelectedId] = useState<string>(DEMO_PROSPECTS[0]?.id || '')
  const [expandedStep, setExpandedStep] = useState<number | null>(1)
  const [editingStep, setEditingStep] = useState<number | null>(null)
  const [editSubject, setEditSubject] = useState('')
  const [editBody, setEditBody] = useState('')
  const [generating, setGenerating] = useState(false)
  const [regeneratingStep, setRegeneratingStep] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('sequence')
  const [showTokenPreview, setShowTokenPreview] = useState(true)
  const [analyzingReply, setAnalyzingReply] = useState(false)
  const [replyInput, setReplyInput] = useState('')

  // New prospect form
  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCompany, setNewCompany] = useState('')
  const [newRole, setNewRole] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPainPoint, setNewPainPoint] = useState('')
  const [newNotes, setNewNotes] = useState('')

  const selected = prospects.find(p => p.id === selectedId)

  // Auto-send timer for stage 3
  const [autoSendTimers, setAutoSendTimers] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!selected || selected.trustStage !== 3) return
    const interval = setInterval(() => {
      setAutoSendTimers(prev => {
        const next = { ...prev }
        selected.messages.forEach(msg => {
          const key = `${selected.id}-${msg.step}`
          if (msg.status === 'approved' && !next[key]) {
            next[key] = 3600 // 1 hour in seconds
          }
          if (next[key] && next[key] > 0) {
            next[key] -= 1
          }
          if (next[key] === 0) {
            // Auto-send
            setProspects(prev2 => prev2.map(p => {
              if (p.id !== selected.id) return p
              return {
                ...p,
                sequenceStatus: 'in_progress',
                messages: p.messages.map(m =>
                  m.step === msg.step && m.status === 'approved'
                    ? { ...m, status: 'sent' as const, sent_at: new Date().toISOString() }
                    : m
                ),
              }
            }))
            delete next[key]
          }
        })
        return next
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [selected])

  const updateProspect = useCallback((id: string, updater: (p: OutreachProspect) => OutreachProspect) => {
    setProspects(prev => prev.map(p => p.id === id ? updater(p) : p))
  }, [])

  const handleApprove = (step: number) => {
    if (!selected) return
    const wasNotStarted = selected.sequenceStatus === 'not_started'
    updateProspect(selected.id, p => ({
      ...p,
      sequenceStatus: wasNotStarted ? 'in_progress' : p.sequenceStatus,
      messages: p.messages.map(m =>
        m.step === step ? { ...m, status: 'approved' as const } : m
      ),
    }))
    // Stage 4-5: auto-send immediately on approve
    if (selected.trustStage >= 4) {
      setTimeout(() => {
        updateProspect(selected.id, p => ({
          ...p,
          sequenceStatus: 'in_progress',
          messages: p.messages.map(m =>
            m.step === step && m.status === 'approved'
              ? { ...m, status: 'sent' as const, sent_at: new Date().toISOString() }
              : m
          ),
        }))
      }, 500)
    }
  }

  const handleApproveAll = () => {
    if (!selected) return
    updateProspect(selected.id, p => ({
      ...p,
      sequenceStatus: 'in_progress',
      messages: p.messages.map(m =>
        m.status === 'draft'
          ? { ...m, status: (p.trustStage >= 4 ? 'sent' : 'approved') as MessageStatus, sent_at: p.trustStage >= 4 ? new Date().toISOString() : null }
          : m
      ),
    }))
  }

  const handleRecall = (step: number) => {
    if (!selected) return
    updateProspect(selected.id, p => ({
      ...p,
      messages: p.messages.map(m =>
        m.step === step ? { ...m, status: 'recalled' as const } : m
      ),
    }))
    // Clear auto-send timer
    setAutoSendTimers(prev => {
      const next = { ...prev }
      delete next[`${selected.id}-${step}`]
      return next
    })
  }

  const handleReject = (step: number) => {
    if (!selected) return
    updateProspect(selected.id, p => ({
      ...p,
      messages: p.messages.map(m =>
        m.step === step ? { ...m, status: 'rejected' as const } : m
      ),
    }))
  }

  const handleSetSequenceStatus = (status: SequenceStatus) => {
    if (!selected) return
    updateProspect(selected.id, p => ({ ...p, sequenceStatus: status }))
  }

  const startEdit = (msg: SequenceMessage) => {
    setEditingStep(msg.step)
    setEditSubject(msg.subject)
    setEditBody(msg.body)
  }

  const saveEdit = () => {
    if (editingStep === null || !selected) return
    updateProspect(selected.id, p => ({
      ...p,
      messages: p.messages.map(m =>
        m.step === editingStep ? { ...m, subject: editSubject, body: editBody } : m
      ),
    }))
    setEditingStep(null)
  }

  const handleRegenerateStep = async (step: number) => {
    if (!selected) return
    const msg = selected.messages.find(m => m.step === step)
    if (!msg) return

    setRegeneratingStep(step)
    try {
      const res = await fetch('/api/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_single',
          prospect: { name: selected.name, company: selected.company, role: selected.role, pain_point: selected.pain_point, notes: selected.notes },
          step,
          channel: msg.channel,
          voice_style: 'Professional but warm',
          cta: 'Book a demo',
        }),
      })
      const data = await res.json()
      if (data.message) {
        updateProspect(selected.id, p => ({
          ...p,
          messages: p.messages.map(m =>
            m.step === step ? { ...m, subject: data.message.subject || '', body: data.message.body, status: 'draft' as const } : m
          ),
        }))
      }
    } catch {
      // silently fail — message stays as-is
    }
    setRegeneratingStep(null)
  }

  const handleGenerateSequence = async () => {
    if (!newName || !newCompany || !newRole) return
    setGenerating(true)

    const newProspect: OutreachProspect = {
      id: Date.now().toString(),
      name: newName,
      company: newCompany,
      role: newRole,
      email: newEmail || undefined,
      pain_point: newPainPoint || undefined,
      notes: newNotes || undefined,
      trustStage: 1,
      sequenceStatus: 'not_started',
      messages: [],
    }

    try {
      const res = await fetch('/api/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_sequence',
          prospect: { name: newName, company: newCompany, role: newRole, email: newEmail, pain_point: newPainPoint, notes: newNotes },
          voice_style: 'Professional but warm',
          cta: 'Book a demo',
          product_info: null,
        }),
      })
      const data = await res.json()
      if (data.messages) {
        newProspect.messages = data.messages.map((m: SequenceMessage) => ({ ...m, status: 'draft' as const }))
      }
    } catch {
      newProspect.messages = [
        { step: 1, channel: 'email', day: 1, subject: `Intro to {{first_name}}`, body: 'Hi {{first_name}},\n\nCould not generate — please edit this message.\n\nJamie', status: 'draft' },
        { step: 2, channel: 'email', day: 3, subject: 'Following up', body: 'Hi {{first_name}},\n\nCould not generate — please edit this message.\n\nJamie', status: 'draft' },
        { step: 3, channel: 'linkedin', day: 5, subject: '', body: 'Hey {{first_name}} — could not generate. Please edit.', status: 'draft' },
        { step: 4, channel: 'email', day: 10, subject: 'Last note', body: 'Hi {{first_name}},\n\nCould not generate — please edit this message.\n\nJamie', status: 'draft' },
      ]
    }

    setProspects(prev => [...prev, newProspect])
    setSelectedId(newProspect.id)
    setActiveTab('sequence')
    setExpandedStep(1)
    setShowNewForm(false)
    setNewName(''); setNewCompany(''); setNewRole(''); setNewEmail(''); setNewPainPoint(''); setNewNotes('')
    setGenerating(false)
  }

  const handleAnalyzeReply = async () => {
    if (!selected || !replyInput.trim()) return
    setAnalyzingReply(true)
    try {
      const res = await fetch('/api/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze_reply',
          reply_text: replyInput,
          prospect: { name: selected.name, company: selected.company, role: selected.role },
          sequence_context: `4-step outreach sequence, ${selected.messages.filter(m => m.status === 'sent').length} messages sent`,
        }),
      })
      const data = await res.json()
      updateProspect(selected.id, p => ({
        ...p,
        sequenceStatus: 'replied',
        replyText: replyInput,
        replyAnalysis: data,
      }))
      setReplyInput('')
    } catch {
      // silent fail
    }
    setAnalyzingReply(false)
  }

  // ─── Render helpers ──────────────────────────────────
  const renderTokenHighlight = (text: string) => {
    const parts = text.split(/(\{\{[^}]+\}\})/g)
    return parts.map((part, i) => {
      if (part.match(/^\{\{[^}]+\}\}$/)) {
        return (
          <span key={i} style={{ background: c.roseLight, color: c.rose, padding: '1px 6px', borderRadius: '4px', fontFamily: f.mn, fontSize: '12px', fontWeight: 600 }}>
            {part}
          </span>
        )
      }
      return part
    })
  }

  const formatTimerDisplay = (seconds: number): string => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // ─── Render ──────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: c.bg, color: c.textPrimary }}>
      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@700,800,900&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap');
        .msg-card:hover { border-color: rgba(0,0,0,.12) !important; }
        .prospect-btn:hover { background: rgba(124,58,237,.03) !important; }
        .action-btn:hover { transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,.08); }
        .regen-btn:hover { background: rgba(244,63,94,.12) !important; }
        .token-toggle:hover { background: rgba(124,58,237,.12) !important; }
      `}</style>

      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, padding: '14px 24px', background: 'rgba(248,247,244,.85)', backdropFilter: 'blur(16px)', borderBottom: `1px solid ${c.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '9px', textDecoration: 'none', color: c.textPrimary }}>
            <div aria-hidden="true" style={{ width: '28px', height: '28px', borderRadius: '8px', background: c.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '13px', fontWeight: 800, flexShrink: 0 }}>J</div>
            <span style={{ fontFamily: f.hd, fontSize: '16px', fontWeight: 900, letterSpacing: '-.03em' }}>jamie<span style={{ color: '#C4B5FD', fontWeight: 500 }}>@</span>work</span>
          </Link>
          <span style={{ fontFamily: f.mn, fontSize: '10px', color: c.textSecondary, padding: '3px 10px', borderRadius: '6px', border: '1px solid rgba(0,0,0,.08)', background: 'white', letterSpacing: '.06em', fontWeight: 600 }}>OUTREACH</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Link href="/prospects" style={{ fontFamily: f.bd, fontSize: '13px', color: c.textSecondary, textDecoration: 'none', fontWeight: 600, padding: '8px 16px', borderRadius: '10px', border: '1.5px solid rgba(0,0,0,.1)', background: 'white' }}>
            Prospects
          </Link>
          <Link href="/dashboard" style={{ fontFamily: f.bd, fontSize: '13px', color: c.textSecondary, textDecoration: 'none', fontWeight: 600, padding: '8px 16px', borderRadius: '10px', border: '1.5px solid rgba(0,0,0,.1)', background: 'white' }}>
            Dashboard
          </Link>
        </div>
      </nav>

      {/* Main layout */}
      <div style={{ display: 'flex', height: 'calc(100vh - 57px)' }}>

        {/* ─── LEFT SIDEBAR ─── */}
        <div style={{ width: '320px', borderRight: `1px solid ${c.border}`, background: c.white, overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ padding: '20px 16px 12px', borderBottom: `1px solid ${c.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <h2 style={{ fontFamily: f.hd, fontSize: '18px', fontWeight: 800, letterSpacing: '-.02em', margin: 0 }}>Sequences</h2>
              <button
                onClick={() => setShowNewForm(true)}
                style={{ fontFamily: f.bd, fontSize: '13px', fontWeight: 700, color: c.white, background: c.gradient, border: 'none', borderRadius: '10px', padding: '7px 14px', cursor: 'pointer' }}
              >
                + New
              </button>
            </div>
            <p style={{ fontFamily: f.bd, fontSize: '13px', color: c.textSecondary, margin: 0 }}>
              {prospects.length} prospect{prospects.length !== 1 ? 's' : ''} &middot; {prospects.filter(p => p.sequenceStatus === 'in_progress').length} active
            </p>
          </div>

          {/* New prospect form */}
          {showNewForm && (
            <div style={{ padding: '16px', borderBottom: `1px solid ${c.border}`, background: 'rgba(124,58,237,.03)' }}>
              <p style={{ fontFamily: f.hd, fontSize: '14px', fontWeight: 700, margin: '0 0 12px' }}>New Prospect</p>
              {[
                { placeholder: 'Full name *', value: newName, setter: setNewName },
                { placeholder: 'Company *', value: newCompany, setter: setNewCompany },
                { placeholder: 'Role / Title *', value: newRole, setter: setNewRole },
                { placeholder: 'Email', value: newEmail, setter: setNewEmail },
                { placeholder: 'Pain point (for personalization)', value: newPainPoint, setter: setNewPainPoint },
                { placeholder: 'Notes (optional)', value: newNotes, setter: setNewNotes },
              ].map(({ placeholder, value, setter }) => (
                <input
                  key={placeholder}
                  placeholder={placeholder}
                  value={value}
                  onChange={e => setter(e.target.value)}
                  style={{ fontFamily: f.bd, fontSize: '13px', width: '100%', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${c.border}`, marginBottom: '8px', outline: 'none', boxSizing: 'border-box' }}
                />
              ))}
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  onClick={handleGenerateSequence}
                  disabled={generating || !newName || !newCompany || !newRole}
                  style={{ fontFamily: f.bd, fontSize: '13px', fontWeight: 700, color: c.white, background: generating ? c.textSecondary : c.purple, border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: generating ? 'wait' : 'pointer', flex: 1, opacity: (!newName || !newCompany || !newRole) ? 0.5 : 1, transition: 'all .15s' }}
                >
                  {generating ? 'Generating...' : 'Generate Sequence'}
                </button>
                <button
                  onClick={() => setShowNewForm(false)}
                  style={{ fontFamily: f.bd, fontSize: '13px', fontWeight: 600, color: c.textSecondary, background: 'transparent', border: `1px solid ${c.border}`, borderRadius: '8px', padding: '8px 12px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Prospect list */}
          {prospects.map(p => {
            const seqCfg = getSeqStatusConfig(p.sequenceStatus)
            const trustCfg = getTrustLabel(p.trustStage)
            const isSelected = p.id === selectedId
            return (
              <button
                key={p.id}
                className="prospect-btn"
                onClick={() => { setSelectedId(p.id); setExpandedStep(1); setEditingStep(null); setActiveTab('sequence') }}
                style={{
                  width: '100%', textAlign: 'left', padding: '14px 16px', border: 'none',
                  borderBottom: `1px solid ${c.border}`, cursor: 'pointer',
                  background: isSelected ? 'rgba(124,58,237,.05)' : 'transparent',
                  borderLeft: isSelected ? `3px solid ${c.purple}` : '3px solid transparent',
                  transition: 'background .1s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <span style={{ fontFamily: f.bd, fontSize: '14px', fontWeight: 700, color: c.textPrimary }}>{p.name}</span>
                  <span style={{ fontFamily: f.mn, fontSize: '10px', fontWeight: 600, color: seqCfg.color, padding: '2px 8px', borderRadius: '4px', background: seqCfg.bg, whiteSpace: 'nowrap' }}>
                    {seqCfg.icon} {seqCfg.label}
                  </span>
                </div>
                <div style={{ fontFamily: f.bd, fontSize: '12px', color: c.textSecondary, marginBottom: '6px' }}>{p.role} at {p.company}</div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{ fontFamily: f.mn, fontSize: '9px', fontWeight: 600, color: trustCfg.color, padding: '2px 6px', borderRadius: '4px', background: 'rgba(0,0,0,.04)' }}>
                    {trustCfg.icon} Stage {p.trustStage}
                  </span>
                  <span style={{ fontFamily: f.mn, fontSize: '9px', color: c.textTertiary }}>
                    {p.messages.filter(m => m.status === 'sent').length}/{p.messages.length} sent
                  </span>
                  {p.replyText && (
                    <span style={{ fontFamily: f.mn, fontSize: '9px', fontWeight: 600, color: c.info, background: c.infoLight, padding: '1px 5px', borderRadius: '3px' }}>REPLY</span>
                  )}
                </div>
              </button>
            )
          })}

          {prospects.length === 0 && !showNewForm && (
            <div style={{ padding: '40px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📭</div>
              <p style={{ fontFamily: f.bd, fontSize: '14px', color: c.textSecondary, margin: '0 0 16px' }}>No prospects yet</p>
              <button
                onClick={() => setShowNewForm(true)}
                style={{ fontFamily: f.bd, fontSize: '13px', fontWeight: 700, color: c.white, background: c.purple, border: 'none', borderRadius: '10px', padding: '10px 20px', cursor: 'pointer' }}
              >
                Add First Prospect
              </button>
            </div>
          )}
        </div>

        {/* ─── MAIN AREA ─── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 40px' }}>
          {selected ? (
            <>
              {/* Prospect header */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h1 style={{ fontFamily: f.hd, fontSize: '28px', fontWeight: 900, letterSpacing: '-.03em', margin: '0 0 4px' }}>{selected.name}</h1>
                    <p style={{ fontFamily: f.bd, fontSize: '15px', color: c.textSecondary, margin: '0 0 4px' }}>
                      {selected.role} at {selected.company}
                      {selected.email && <span style={{ color: c.textTertiary }}> &middot; {selected.email}</span>}
                    </p>
                    {selected.pain_point && (
                      <p style={{ fontFamily: f.bd, fontSize: '13px', color: c.rose, margin: '0', fontStyle: 'italic' }}>Pain: {selected.pain_point}</p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                    {/* Sequence status dropdown */}
                    <select
                      value={selected.sequenceStatus}
                      onChange={e => handleSetSequenceStatus(e.target.value as SequenceStatus)}
                      style={{ fontFamily: f.mn, fontSize: '11px', fontWeight: 600, color: getSeqStatusConfig(selected.sequenceStatus).color, background: getSeqStatusConfig(selected.sequenceStatus).bg, border: `1px solid ${c.border}`, borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', appearance: 'auto' }}
                    >
                      <option value="not_started">Not Started</option>
                      <option value="in_progress">In Progress</option>
                      <option value="replied">Replied</option>
                      <option value="booked">Booked</option>
                      <option value="unsubscribed">Unsubscribed</option>
                      <option value="completed">Completed</option>
                    </select>
                    {/* Trust badge */}
                    <span style={{ fontFamily: f.mn, fontSize: '10px', fontWeight: 600, color: c.purple, padding: '5px 10px', borderRadius: '6px', background: c.purpleLight, letterSpacing: '.04em' }}>
                      {getTrustLabel(selected.trustStage).icon} STAGE {selected.trustStage}
                    </span>
                    {/* Approve All */}
                    {selected.trustStage <= 2 && selected.messages.some(m => m.status === 'draft') && (
                      <button
                        onClick={handleApproveAll}
                        className="action-btn"
                        style={{ fontFamily: f.bd, fontSize: '13px', fontWeight: 700, color: c.white, background: c.gradient, border: 'none', borderRadius: '10px', padding: '8px 18px', cursor: 'pointer', transition: 'all .15s' }}
                      >
                        Approve All
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: `1px solid ${c.border}`, paddingBottom: '0' }}>
                {([
                  { key: 'sequence' as Tab, label: 'Sequence Builder', count: selected.messages.length },
                  { key: 'tracking' as Tab, label: 'Tracking', count: selected.messages.filter(m => m.status === 'sent').length },
                  { key: 'reply' as Tab, label: 'Reply Detection', count: selected.replyText ? 1 : 0 },
                ]).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    style={{
                      fontFamily: f.bd, fontSize: '13px', fontWeight: activeTab === tab.key ? 700 : 500,
                      color: activeTab === tab.key ? c.purple : c.textSecondary,
                      background: 'transparent', border: 'none',
                      borderBottom: activeTab === tab.key ? `2px solid ${c.purple}` : '2px solid transparent',
                      padding: '10px 16px', cursor: 'pointer', transition: 'all .1s',
                    }}
                  >
                    {tab.label}
                    {tab.count > 0 && (
                      <span style={{ fontFamily: f.mn, fontSize: '10px', fontWeight: 700, color: activeTab === tab.key ? c.purple : c.textTertiary, background: activeTab === tab.key ? c.purpleLight : 'rgba(0,0,0,.04)', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* ─── TAB: Sequence Builder ─── */}
              {activeTab === 'sequence' && (
                <>
                  {/* Token preview toggle */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                    <button
                      className="token-toggle"
                      onClick={() => setShowTokenPreview(!showTokenPreview)}
                      style={{ fontFamily: f.mn, fontSize: '11px', fontWeight: 600, color: showTokenPreview ? c.rose : c.textTertiary, background: showTokenPreview ? c.roseLight : 'transparent', border: `1px solid ${showTokenPreview ? c.roseBorder : c.border}`, borderRadius: '8px', padding: '5px 12px', cursor: 'pointer', transition: 'all .15s' }}
                    >
                      {showTokenPreview ? '✦ Tokens → Preview' : '✦ Tokens → Raw'}
                    </button>
                  </div>

                  {/* Timeline */}
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '19px', top: '24px', bottom: '24px', width: '2px', background: c.gradient, borderRadius: '1px' }} />

                    {selected.messages.map(msg => {
                      const isExpanded = expandedStep === msg.step
                      const isEditing = editingStep === msg.step
                      const badge = getStatusBadge(msg.status)
                      const isRegenerating = regeneratingStep === msg.step
                      const timerKey = `${selected.id}-${msg.step}`
                      const timerSeconds = autoSendTimers[timerKey]
                      const displayBody = showTokenPreview ? resolveTokens(msg.body, selected) : msg.body
                      const displaySubject = showTokenPreview ? resolveTokens(msg.subject, selected) : msg.subject

                      return (
                        <div key={msg.step} style={{ position: 'relative', paddingLeft: '52px', marginBottom: '16px' }}>
                          {/* Timeline dot */}
                          <div style={{
                            position: 'absolute', left: '12px', top: '20px', width: '16px', height: '16px',
                            borderRadius: '50%',
                            background: msg.status === 'sent' ? c.success : msg.status === 'approved' ? c.purple : msg.status === 'recalled' ? c.warning : msg.status === 'rejected' ? c.error : c.white,
                            border: `2px solid ${msg.status === 'sent' ? c.success : msg.status === 'approved' ? c.purple : msg.status === 'recalled' ? c.warning : msg.status === 'rejected' ? c.error : 'rgba(0,0,0,.15)'}`,
                            zIndex: 1,
                          }} />

                          {/* Message card */}
                          <div
                            className="msg-card"
                            style={{
                              background: c.white, borderRadius: '16px', border: `1px solid ${c.border}`,
                              overflow: 'hidden', transition: 'all .15s',
                              boxShadow: isExpanded ? '0 4px 24px rgba(0,0,0,.06)' : 'none',
                            }}
                          >
                            {/* Card header */}
                            <button
                              onClick={() => setExpandedStep(isExpanded ? null : msg.step)}
                              style={{ width: '100%', textAlign: 'left', padding: '16px 20px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
                            >
                              <span style={{ fontFamily: f.mn, fontSize: '11px', fontWeight: 600, color: c.purple, background: c.purpleLight, padding: '4px 8px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                                DAY {msg.day}
                              </span>
                              <span style={{ fontSize: '16px' }}>{msg.channel === 'email' ? '📧' : '💼'}</span>
                              <span style={{ fontFamily: f.bd, fontSize: '14px', fontWeight: 600, color: c.textPrimary, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {msg.channel === 'linkedin' ? 'LinkedIn Message' : (showTokenPreview ? displaySubject : msg.subject) || 'No subject'}
                              </span>
                              <span style={{ fontFamily: f.mn, fontSize: '10px', fontWeight: 600, color: badge.color, background: badge.bg, padding: '3px 8px', borderRadius: '4px', letterSpacing: '.04em' }}>
                                {badge.label}
                              </span>
                              <span style={{ fontSize: '12px', color: c.textSecondary, transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform .15s' }}>▼</span>
                            </button>

                            {/* Expanded content */}
                            {isExpanded && (
                              <div style={{ padding: '0 20px 20px', borderTop: `1px solid ${c.border}` }}>
                                {isEditing ? (
                                  <div style={{ paddingTop: '16px' }}>
                                    {msg.channel === 'email' && (
                                      <div style={{ marginBottom: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                          <label style={{ fontFamily: f.mn, fontSize: '10px', fontWeight: 600, color: c.textSecondary, letterSpacing: '.06em' }}>SUBJECT</label>
                                          <span style={{ fontFamily: f.mn, fontSize: '10px', color: c.textTertiary }}>Use {'{{first_name}}'}, {'{{company}}'}, {'{{pain_point}}'}</span>
                                        </div>
                                        <input
                                          value={editSubject}
                                          onChange={e => setEditSubject(e.target.value)}
                                          style={{ fontFamily: f.bd, fontSize: '14px', width: '100%', padding: '10px 14px', borderRadius: '10px', border: `1.5px solid ${c.purple}`, outline: 'none', boxSizing: 'border-box' }}
                                        />
                                      </div>
                                    )}
                                    <div style={{ marginBottom: '16px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                        <label style={{ fontFamily: f.mn, fontSize: '10px', fontWeight: 600, color: c.textSecondary, letterSpacing: '.06em' }}>
                                          {msg.channel === 'linkedin' ? 'MESSAGE (300 chars max)' : 'BODY'}
                                        </label>
                                        {msg.channel === 'linkedin' && (
                                          <span style={{ fontFamily: f.mn, fontSize: '10px', color: editBody.length > 300 ? c.error : c.textTertiary }}>
                                            {editBody.length}/300
                                          </span>
                                        )}
                                      </div>
                                      <textarea
                                        value={editBody}
                                        onChange={e => setEditBody(e.target.value)}
                                        rows={msg.channel === 'linkedin' ? 4 : 8}
                                        style={{ fontFamily: f.bd, fontSize: '14px', width: '100%', padding: '12px 14px', borderRadius: '10px', border: `1.5px solid ${c.purple}`, outline: 'none', resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box' }}
                                      />
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                      <button onClick={saveEdit} className="action-btn" style={{ fontFamily: f.bd, fontSize: '13px', fontWeight: 700, color: c.white, background: c.purple, border: 'none', borderRadius: '8px', padding: '8px 18px', cursor: 'pointer', transition: 'all .15s' }}>Save</button>
                                      <button onClick={() => setEditingStep(null)} style={{ fontFamily: f.bd, fontSize: '13px', fontWeight: 600, color: c.textSecondary, background: 'transparent', border: `1px solid ${c.border}`, borderRadius: '8px', padding: '8px 14px', cursor: 'pointer' }}>Cancel</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ paddingTop: '16px' }}>
                                    {/* Subject line */}
                                    {msg.channel === 'email' && msg.subject && (
                                      <div style={{ marginBottom: '10px' }}>
                                        <span style={{ fontFamily: f.mn, fontSize: '10px', fontWeight: 600, color: c.textTertiary, letterSpacing: '.06em' }}>SUBJECT </span>
                                        <span style={{ fontFamily: f.bd, fontSize: '14px', fontWeight: 700, color: c.textPrimary }}>
                                          {showTokenPreview ? displaySubject : renderTokenHighlight(msg.subject)}
                                        </span>
                                      </div>
                                    )}

                                    {/* LinkedIn char count */}
                                    {msg.channel === 'linkedin' && (
                                      <div style={{ marginBottom: '8px' }}>
                                        <span style={{ fontFamily: f.mn, fontSize: '10px', fontWeight: 600, color: msg.body.length > 300 ? c.error : c.textTertiary }}>
                                          {msg.body.length}/300 chars
                                        </span>
                                      </div>
                                    )}

                                    {/* Body */}
                                    <pre style={{ fontFamily: f.bd, fontSize: '14px', color: c.textPrimary, margin: '0 0 16px', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                                      {showTokenPreview ? displayBody : renderTokenHighlight(msg.body)}
                                    </pre>

                                    {/* Action buttons */}
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                      {/* Edit — available if not sent */}
                                      {msg.status !== 'sent' && (
                                        <button onClick={() => startEdit(msg)} className="action-btn" style={{ fontFamily: f.bd, fontSize: '13px', fontWeight: 600, color: c.textSecondary, background: 'transparent', border: `1px solid ${c.border}`, borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', transition: 'all .15s' }}>
                                          ✏️ Edit
                                        </button>
                                      )}

                                      {/* Regenerate — available if not sent */}
                                      {msg.status !== 'sent' && (
                                        <button
                                          onClick={() => handleRegenerateStep(msg.step)}
                                          disabled={isRegenerating}
                                          className="regen-btn"
                                          style={{ fontFamily: f.bd, fontSize: '13px', fontWeight: 600, color: c.rose, background: c.roseLight, border: 'none', borderRadius: '8px', padding: '7px 14px', cursor: isRegenerating ? 'wait' : 'pointer', opacity: isRegenerating ? 0.6 : 1, transition: 'all .15s' }}
                                        >
                                          {isRegenerating ? '↻ Generating...' : '↻ Regenerate'}
                                        </button>
                                      )}

                                      {/* Stage 1-2: Approve / Reject */}
                                      {selected.trustStage <= 2 && msg.status === 'draft' && (
                                        <>
                                          <button onClick={() => handleApprove(msg.step)} className="action-btn" style={{ fontFamily: f.bd, fontSize: '13px', fontWeight: 700, color: c.white, background: c.purple, border: 'none', borderRadius: '8px', padding: '7px 16px', cursor: 'pointer', transition: 'all .15s' }}>
                                            ✓ Approve
                                          </button>
                                          <button onClick={() => handleReject(msg.step)} style={{ fontFamily: f.bd, fontSize: '13px', fontWeight: 600, color: c.error, background: 'transparent', border: `1px solid ${c.errorLight}`, borderRadius: '8px', padding: '7px 12px', cursor: 'pointer' }}>
                                            ✕
                                          </button>
                                        </>
                                      )}

                                      {/* Stage 3: Auto-send timer + recall */}
                                      {selected.trustStage === 3 && msg.status === 'approved' && (
                                        <>
                                          <span style={{ fontFamily: f.mn, fontSize: '11px', fontWeight: 600, color: c.warning, background: c.warningLight, padding: '5px 12px', borderRadius: '6px' }}>
                                            {timerSeconds != null && timerSeconds > 0
                                              ? `Auto-sends in ${formatTimerDisplay(timerSeconds)}`
                                              : 'Auto-sends in 1:00:00'
                                            }
                                          </span>
                                          <button onClick={() => handleRecall(msg.step)} className="action-btn" style={{ fontFamily: f.bd, fontSize: '13px', fontWeight: 600, color: c.rose, background: c.roseLight, border: 'none', borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', transition: 'all .15s' }}>
                                            Recall
                                          </button>
                                        </>
                                      )}

                                      {/* Stage 4-5: Auto-sent badge */}
                                      {selected.trustStage >= 4 && msg.status === 'draft' && (
                                        <button onClick={() => handleApprove(msg.step)} className="action-btn" style={{ fontFamily: f.bd, fontSize: '13px', fontWeight: 700, color: c.white, background: c.success, border: 'none', borderRadius: '8px', padding: '7px 16px', cursor: 'pointer', transition: 'all .15s' }}>
                                          Send Now
                                        </button>
                                      )}

                                      {/* Sent badge */}
                                      {msg.status === 'sent' && (
                                        <span style={{ fontFamily: f.mn, fontSize: '11px', fontWeight: 600, color: c.success, background: c.successLight, padding: '5px 12px', borderRadius: '6px' }}>
                                          ✓ Delivered {msg.sent_at ? new Date(msg.sent_at).toLocaleDateString() : ''}
                                        </span>
                                      )}

                                      {/* Recalled */}
                                      {msg.status === 'recalled' && (
                                        <span style={{ fontFamily: f.mn, fontSize: '11px', fontWeight: 600, color: c.warning, background: c.warningLight, padding: '5px 12px', borderRadius: '6px' }}>
                                          Recalled — edit and re-approve
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Personalization token legend */}
                  <div style={{ marginTop: '24px', padding: '16px 20px', background: c.wash, borderRadius: '12px', border: `1px solid ${c.border}` }}>
                    <p style={{ fontFamily: f.mn, fontSize: '10px', fontWeight: 600, color: c.textTertiary, letterSpacing: '.06em', margin: '0 0 10px' }}>PERSONALIZATION TOKENS</p>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      {[
                        { token: '{{first_name}}', resolved: selected.name.split(' ')[0] },
                        { token: '{{company}}', resolved: selected.company },
                        { token: '{{pain_point}}', resolved: selected.pain_point || 'scaling your pipeline' },
                      ].map(t => (
                        <div key={t.token} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontFamily: f.mn, fontSize: '11px', fontWeight: 600, color: c.rose, background: c.roseLight, padding: '2px 8px', borderRadius: '4px' }}>{t.token}</span>
                          <span style={{ fontFamily: f.bd, fontSize: '12px', color: c.textSecondary }}>→</span>
                          <span style={{ fontFamily: f.bd, fontSize: '12px', color: c.textPrimary, fontWeight: 600 }}>{t.resolved}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ─── TAB: Tracking ─── */}
              {activeTab === 'tracking' && (
                <div>
                  {/* Stats overview */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
                    {[
                      { label: 'Sent', value: selected.messages.filter(m => m.status === 'sent').length, total: selected.messages.length, color: c.success },
                      { label: 'Opened', value: selected.messages.filter(m => m.opened).length, total: selected.messages.filter(m => m.status === 'sent').length, color: c.purple },
                      { label: 'Clicked', value: selected.messages.filter(m => m.clicked).length, total: selected.messages.filter(m => m.status === 'sent').length, color: c.rose },
                      { label: 'Replied', value: selected.replyText ? 1 : 0, total: 1, color: c.info },
                    ].map(stat => (
                      <div key={stat.label} style={{ background: c.white, borderRadius: '14px', border: `1px solid ${c.border}`, padding: '20px', textAlign: 'center' }}>
                        <p style={{ fontFamily: f.mn, fontSize: '10px', fontWeight: 600, color: c.textTertiary, letterSpacing: '.06em', margin: '0 0 8px' }}>{stat.label.toUpperCase()}</p>
                        <p style={{ fontFamily: f.hd, fontSize: '32px', fontWeight: 900, color: stat.color, margin: '0 0 4px', letterSpacing: '-.03em' }}>
                          {stat.value}<span style={{ fontSize: '16px', color: c.textTertiary }}>/{stat.total}</span>
                        </p>
                        <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(0,0,0,.04)', overflow: 'hidden', marginTop: '8px' }}>
                          <div style={{ height: '100%', borderRadius: '2px', background: stat.color, width: `${stat.total > 0 ? (stat.value / stat.total) * 100 : 0}%`, transition: 'width .3s' }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Message-level tracking */}
                  <h3 style={{ fontFamily: f.hd, fontSize: '16px', fontWeight: 800, margin: '0 0 12px', letterSpacing: '-.02em' }}>Message Activity</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selected.messages.map(msg => (
                      <div key={msg.step} style={{ background: c.white, borderRadius: '12px', border: `1px solid ${c.border}`, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ fontFamily: f.mn, fontSize: '11px', fontWeight: 600, color: c.purple, background: c.purpleLight, padding: '4px 8px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                          DAY {msg.day}
                        </span>
                        <span style={{ fontSize: '14px' }}>{msg.channel === 'email' ? '📧' : '💼'}</span>
                        <span style={{ fontFamily: f.bd, fontSize: '13px', fontWeight: 600, flex: 1, color: c.textPrimary }}>
                          {msg.channel === 'linkedin' ? 'LinkedIn Message' : resolveTokens(msg.subject, selected)}
                        </span>

                        {/* Tracking indicators */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {msg.status === 'sent' ? (
                            <>
                              <span style={{ fontFamily: f.mn, fontSize: '10px', fontWeight: 600, color: c.success, background: c.successLight, padding: '3px 8px', borderRadius: '4px' }}>
                                Sent
                              </span>
                              {msg.channel === 'email' && (
                                <>
                                  <span style={{ fontFamily: f.mn, fontSize: '10px', fontWeight: 600, color: msg.opened ? c.purple : c.textTertiary, background: msg.opened ? c.purpleLight : 'rgba(0,0,0,.04)', padding: '3px 8px', borderRadius: '4px' }}>
                                    {msg.opened ? '👁 Opened' : '— Not opened'}
                                  </span>
                                  <span style={{ fontFamily: f.mn, fontSize: '10px', fontWeight: 600, color: msg.clicked ? c.rose : c.textTertiary, background: msg.clicked ? c.roseLight : 'rgba(0,0,0,.04)', padding: '3px 8px', borderRadius: '4px' }}>
                                    {msg.clicked ? '🔗 Clicked' : '— No clicks'}
                                  </span>
                                </>
                              )}
                              {msg.sent_at && (
                                <span style={{ fontFamily: f.mn, fontSize: '10px', color: c.textTertiary }}>
                                  {new Date(msg.sent_at).toLocaleDateString()}
                                </span>
                              )}
                            </>
                          ) : (
                            <span style={{ fontFamily: f.mn, fontSize: '10px', fontWeight: 600, color: getStatusBadge(msg.status).color, background: getStatusBadge(msg.status).bg, padding: '3px 8px', borderRadius: '4px' }}>
                              {getStatusBadge(msg.status).label}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Tracking notes */}
                  <div style={{ marginTop: '24px', padding: '16px 20px', background: c.wash, borderRadius: '12px', border: `1px solid ${c.border}` }}>
                    <p style={{ fontFamily: f.mn, fontSize: '10px', fontWeight: 600, color: c.textTertiary, letterSpacing: '.06em', margin: '0 0 8px' }}>TRACKING INFO</p>
                    <p style={{ fontFamily: f.bd, fontSize: '13px', color: c.textSecondary, margin: 0, lineHeight: 1.6 }}>
                      Open and click tracking will activate once email sending is connected. Currently showing placeholder data for demo purposes. Connect your email provider in Settings to enable real tracking.
                    </p>
                  </div>
                </div>
              )}

              {/* ─── TAB: Reply Detection ─── */}
              {activeTab === 'reply' && (
                <div>
                  {/* Existing reply analysis */}
                  {selected.replyText && selected.replyAnalysis && (
                    <div style={{ marginBottom: '24px' }}>
                      {/* Reply card */}
                      <div style={{ background: c.white, borderRadius: '14px', border: `1px solid ${c.border}`, overflow: 'hidden', marginBottom: '16px' }}>
                        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${c.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '18px' }}>↩</span>
                            <span style={{ fontFamily: f.hd, fontSize: '15px', fontWeight: 800 }}>Reply from {selected.name}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <span style={{ fontFamily: f.mn, fontSize: '10px', fontWeight: 600, color: selected.replyAnalysis.sentiment === 'positive' ? c.success : selected.replyAnalysis.sentiment === 'negative' ? c.error : c.textSecondary, background: selected.replyAnalysis.sentiment === 'positive' ? c.successLight : selected.replyAnalysis.sentiment === 'negative' ? c.errorLight : 'rgba(0,0,0,.04)', padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                              {selected.replyAnalysis.sentiment}
                            </span>
                            <span style={{ fontFamily: f.mn, fontSize: '10px', fontWeight: 600, color: c.info, background: c.infoLight, padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                              {selected.replyAnalysis.intent.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </div>
                        <div style={{ padding: '20px' }}>
                          <pre style={{ fontFamily: f.bd, fontSize: '14px', color: c.textPrimary, margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                            {selected.replyText}
                          </pre>
                        </div>
                      </div>

                      {/* Analysis */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        {/* Key signals */}
                        <div style={{ background: c.white, borderRadius: '14px', border: `1px solid ${c.border}`, padding: '20px' }}>
                          <p style={{ fontFamily: f.mn, fontSize: '10px', fontWeight: 600, color: c.textTertiary, letterSpacing: '.06em', margin: '0 0 12px' }}>KEY SIGNALS</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {selected.replyAnalysis.key_signals.map((signal, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                <span style={{ color: c.purple, fontSize: '12px', marginTop: '2px' }}>●</span>
                                <span style={{ fontFamily: f.bd, fontSize: '13px', color: c.textPrimary, lineHeight: 1.5 }}>{signal}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Recommended action */}
                        <div style={{ background: c.white, borderRadius: '14px', border: `1px solid ${c.border}`, padding: '20px' }}>
                          <p style={{ fontFamily: f.mn, fontSize: '10px', fontWeight: 600, color: c.textTertiary, letterSpacing: '.06em', margin: '0 0 12px' }}>RECOMMENDED ACTION</p>
                          <span style={{ fontFamily: f.bd, fontSize: '14px', fontWeight: 700, color: c.purple, background: c.purpleLight, padding: '6px 14px', borderRadius: '8px', display: 'inline-block' }}>
                            {selected.replyAnalysis.recommended_action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </div>
                      </div>

                      {/* Draft response */}
                      <div style={{ background: c.white, borderRadius: '14px', border: `1px solid ${c.purpleBorder}`, padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <p style={{ fontFamily: f.mn, fontSize: '10px', fontWeight: 600, color: c.purple, letterSpacing: '.06em', margin: 0 }}>JAMIE&apos;S DRAFT RESPONSE</p>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {selected.trustStage <= 2 && (
                              <button className="action-btn" style={{ fontFamily: f.bd, fontSize: '13px', fontWeight: 700, color: c.white, background: c.purple, border: 'none', borderRadius: '8px', padding: '7px 16px', cursor: 'pointer', transition: 'all .15s' }}>
                                ✓ Approve & Send
                              </button>
                            )}
                            {selected.trustStage >= 3 && selected.trustStage <= 3 && (
                              <span style={{ fontFamily: f.mn, fontSize: '11px', fontWeight: 600, color: c.warning, background: c.warningLight, padding: '5px 12px', borderRadius: '6px' }}>
                                Auto-sends in 1 hour
                              </span>
                            )}
                            {selected.trustStage >= 4 && (
                              <span style={{ fontFamily: f.mn, fontSize: '11px', fontWeight: 600, color: c.success, background: c.successLight, padding: '5px 12px', borderRadius: '6px' }}>
                                Auto-sent
                              </span>
                            )}
                          </div>
                        </div>
                        <pre style={{ fontFamily: f.bd, fontSize: '14px', color: c.textPrimary, margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6, background: c.purpleLight, padding: '16px', borderRadius: '10px' }}>
                          {selected.replyAnalysis.draft_response}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Reply input — detect new replies */}
                  <div style={{ background: c.white, borderRadius: '14px', border: `1px solid ${c.border}`, padding: '20px' }}>
                    <p style={{ fontFamily: f.hd, fontSize: '15px', fontWeight: 800, margin: '0 0 4px' }}>
                      {selected.replyText ? 'Detect Another Reply' : 'Detect Reply'}
                    </p>
                    <p style={{ fontFamily: f.bd, fontSize: '13px', color: c.textSecondary, margin: '0 0 16px' }}>
                      Paste a reply from {selected.name} and Jamie will analyze sentiment, intent, and draft a response.
                    </p>
                    <textarea
                      value={replyInput}
                      onChange={e => setReplyInput(e.target.value)}
                      placeholder={`Paste ${selected.name}'s reply here...`}
                      rows={5}
                      style={{ fontFamily: f.bd, fontSize: '14px', width: '100%', padding: '12px 14px', borderRadius: '10px', border: `1.5px solid ${c.border}`, outline: 'none', resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box', marginBottom: '12px' }}
                    />
                    <button
                      onClick={handleAnalyzeReply}
                      disabled={analyzingReply || !replyInput.trim()}
                      className="action-btn"
                      style={{ fontFamily: f.bd, fontSize: '13px', fontWeight: 700, color: c.white, background: analyzingReply ? c.textSecondary : c.gradient, border: 'none', borderRadius: '10px', padding: '10px 24px', cursor: analyzingReply ? 'wait' : 'pointer', opacity: !replyInput.trim() ? 0.5 : 1, transition: 'all .15s' }}
                    >
                      {analyzingReply ? 'Analyzing...' : 'Analyze Reply'}
                    </button>
                  </div>

                  {/* No reply state */}
                  {!selected.replyText && !replyInput && (
                    <div style={{ marginTop: '24px', padding: '16px 20px', background: c.wash, borderRadius: '12px', border: `1px solid ${c.border}` }}>
                      <p style={{ fontFamily: f.mn, fontSize: '10px', fontWeight: 600, color: c.textTertiary, letterSpacing: '.06em', margin: '0 0 8px' }}>REPLY DETECTION</p>
                      <p style={{ fontFamily: f.bd, fontSize: '13px', color: c.textSecondary, margin: 0, lineHeight: 1.6 }}>
                        Automatic reply detection will activate when email integration is connected. For now, paste replies manually above to get Jamie&apos;s AI analysis and draft responses.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Empty state */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📨</div>
              <h2 style={{ fontFamily: f.hd, fontSize: '24px', fontWeight: 900, letterSpacing: '-.03em', margin: '0 0 8px' }}>No sequences yet</h2>
              <p style={{ fontFamily: f.bd, fontSize: '15px', color: c.textSecondary, margin: '0 0 24px', maxWidth: '360px' }}>
                Add a prospect and generate a personalized outreach sequence with AI.
              </p>
              <button
                onClick={() => setShowNewForm(true)}
                style={{ fontFamily: f.bd, fontSize: '15px', fontWeight: 700, color: c.white, background: c.gradient, border: 'none', borderRadius: '12px', padding: '12px 28px', cursor: 'pointer', boxShadow: '0 4px 16px rgba(124,58,237,.25)' }}
              >
                + Add Prospect
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
