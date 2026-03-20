export interface TrustStage {
  id: number
  name: string
  label: string
  description: string
  unlockCriteria: string
  badgeColor: string
  badgeBg: string
  icon: string
  capabilities: string[]
}

export const TRUST_STAGES: TrustStage[] = [
  {
    id: 1,
    name: 'observe',
    label: 'Observe',
    description: 'Jamie suggests prospects and draft messages. You approve every action.',
    unlockCriteria: 'Default after onboarding',
    badgeColor: '#7C3AED',
    badgeBg: '#F3F0FF',
    icon: '👀',
    capabilities: [
      'Suggest prospects from your ICP',
      'Draft outreach messages for review',
      'Flag high-intent signals',
    ],
  },
  {
    id: 2,
    name: 'draft',
    label: 'Draft Mode',
    description: 'Jamie drafts outreach automatically. You review before send.',
    unlockCriteria: '10 approved suggestions',
    badgeColor: '#0EA5E9',
    badgeBg: '#F0F9FF',
    icon: '✍️',
    capabilities: [
      'Auto-draft personalized outreach',
      'Queue drafts for your review',
      'Learn from your edits',
    ],
  },
  {
    id: 3,
    name: 'supervised',
    label: 'Supervised Send',
    description: 'Jamie sends outreach with you CC\'d. 1-hour recall window.',
    unlockCriteria: '20 approved drafts',
    badgeColor: '#EA580C',
    badgeBg: '#FFF7ED',
    icon: '📤',
    capabilities: [
      'Send outreach with email CC',
      '1-hour recall window on sends',
      'Real-time send notifications',
    ],
  },
  {
    id: 4,
    name: 'replies',
    label: 'Reply Handling',
    description: 'Jamie handles replies autonomously. Weekly summary for you.',
    unlockCriteria: '50% positive reply rate',
    badgeColor: '#F43F5E',
    badgeBg: '#FFF1F2',
    icon: '💬',
    capabilities: [
      'Handle inbound replies autonomously',
      'Qualify and route conversations',
      'Weekly performance summary',
    ],
  },
  {
    id: 5,
    name: 'autopilot',
    label: 'Full Autopilot',
    description: 'Jamie runs the complete SDR cycle. You review metrics only.',
    unlockCriteria: 'Manually enabled by you',
    badgeColor: '#16A34A',
    badgeBg: '#F0FDF4',
    icon: '🚀',
    capabilities: [
      'Full autonomous outreach cycle',
      'Self-optimizing sequences',
      'Metrics-only reporting',
    ],
  },
]

export interface TrustProgress {
  trust_stage: number
  approved_suggestions: number
  approved_drafts: number
  positive_reply_rate: number
  total_replies: number
  stage_unlocked_at: string | null
}

export interface ActivityLogEntry {
  id: string
  company_id: string
  trust_stage: number
  action_type: string
  action_label: string
  detail: string
  status: 'pending' | 'approved' | 'rejected' | 'sent' | 'recalled' | 'auto'
  created_at: string
}

export function getStage(id: number): TrustStage {
  return TRUST_STAGES[id - 1] || TRUST_STAGES[0]
}

export function getNextUnlockProgress(progress: TrustProgress): { percent: number; label: string } | null {
  const stage = progress.trust_stage
  if (stage >= 5) return null
  if (stage === 1) {
    const p = Math.min(100, (progress.approved_suggestions / 10) * 100)
    return { percent: p, label: `${progress.approved_suggestions}/10 approved suggestions` }
  }
  if (stage === 2) {
    const p = Math.min(100, (progress.approved_drafts / 20) * 100)
    return { percent: p, label: `${progress.approved_drafts}/20 approved drafts` }
  }
  if (stage === 3) {
    const rate = progress.total_replies > 0 ? progress.positive_reply_rate : 0
    const p = Math.min(100, (rate / 50) * 100)
    return { percent: p, label: `${Math.round(rate)}%/50% positive reply rate` }
  }
  if (stage === 4) {
    return { percent: 0, label: 'Manually enable Full Autopilot in settings' }
  }
  return null
}
