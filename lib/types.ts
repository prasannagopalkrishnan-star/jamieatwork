export interface Company {
  id: string
  name: string
  domain: string | null
  plan: string | null
  max_employees: number | null
  created_at: string
}

export interface DigitalEmployee {
  id: string
  company_id: string | null
  name: string
  title: string
  department: string | null
  manager_name: string | null
  manager_email: string | null
  employee_id: string | null
  category: string | null
  status: string
  created_at: string
}

export interface Ticket {
  id: string
  company_id: string | null
  employee_id: string | null
  ticket_ref: string | null
  submitter_name: string | null
  submitter_email: string | null
  category: string | null
  question: string
  response: string | null
  status: string
  escalated: boolean
  created_at: string
  resolved_at: string | null
}

// Onboarding types
export interface OnboardingData {
  // Step 1 - Product
  website_url?: string
  product_name?: string
  product_description?: string
  problem_solved?: string
  key_differentiators?: string
  // Step 2 - ICP
  target_industries?: string[]
  target_company_size?: string[]
  target_roles?: string[]
  target_geography?: string[]
  // Step 3 - Voice & Tone
  communication_style?: string
  example_email?: string
  tone_analysis?: string
  // Step 4 - Disqualifiers
  disqualifiers?: string
  excluded_competitors?: string[]
  deal_size_minimum?: number
  // Meta
  current_step?: number
  completed?: boolean
}

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  onboarding_data: OnboardingData | null
  onboarding_complete: boolean
  trust_stage: number
  trust_approved_count: number
  trust_draft_approved_count: number
  trust_reply_rate: number
  trust_autopilot_enabled: boolean
  created_at: string
}

// Trust stages
export type TrustStage = 1 | 2 | 3 | 4 | 5

export const TRUST_STAGES = {
  1: { name: 'Observe', description: 'Jamie suggests prospects and draft messages. You approve every action.', icon: '👀', color: '#A3A3A3', unlockText: 'Default after onboarding' },
  2: { name: 'Draft Mode', description: 'Jamie drafts outreach automatically. You review before send.', icon: '✍️', color: '#0EA5E9', unlockText: 'Unlocks after 10 approved suggestions' },
  3: { name: 'Supervised Send', description: 'Jamie sends outreach. You get CC and 1-hour recall window.', icon: '📤', color: '#F59E0B', unlockText: 'Unlocks after 20 approved drafts' },
  4: { name: 'Reply Handling', description: 'Jamie handles replies autonomously. You get weekly summaries.', icon: '💬', color: '#F43F5E', unlockText: 'Unlocks after 50% positive reply rate' },
  5: { name: 'Full Autopilot', description: 'Jamie runs the complete SDR cycle. You review metrics only.', icon: '🚀', color: '#16A34A', unlockText: 'Manually enabled by you' },
} as const

// Prospect types
export interface Prospect {
  id: string
  user_id: string
  name: string
  title: string
  company: string
  email: string
  linkedin_url: string
  score: number
  match_reasons: string[]
  industry: string
  company_size: string
  status: 'new' | 'approved' | 'skipped' | 'saved' | 'contacted' | 'replied' | 'meeting_booked'
  created_at: string
}

export interface ProspectNote {
  id: string
  prospect_id: string
  note: string
  created_at: string
}

// Outreach types
export interface Sequence {
  id: string
  user_id: string
  prospect_id: string
  prospect_name?: string
  prospect_company?: string
  status: 'not_started' | 'in_progress' | 'replied' | 'booked' | 'unsubscribed' | 'completed'
  current_step: number
  created_at: string
}

export interface Message {
  id: string
  sequence_id: string
  step: number
  channel: 'email' | 'linkedin'
  subject: string
  body: string
  status: 'draft' | 'approved' | 'sent' | 'recalled' | 'rejected'
  sent_at: string | null
  created_at: string
}

// Inbox types
export interface Reply {
  id: string
  sequence_id: string
  prospect_id: string
  prospect_name: string
  prospect_company: string
  body: string
  sentiment: 'positive' | 'negative' | 'neutral' | 'out_of_office'
  intent: 'interested' | 'not_interested' | 'need_more_info' | 'unsubscribe' | 'out_of_office'
  jamie_draft: string | null
  status: 'pending' | 'approved' | 'sent' | 'dismissed'
  created_at: string
}

export interface Meeting {
  id: string
  prospect_id: string
  prospect_name: string
  prospect_company: string
  scheduled_at: string
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  notes: string | null
  created_at: string
}

// Activity log
export interface ActivityLogEntry {
  id: string
  user_id: string
  action: string
  details: string
  trust_stage: number
  category: 'prospect' | 'outreach' | 'reply' | 'meeting' | 'system'
  created_at: string
}
