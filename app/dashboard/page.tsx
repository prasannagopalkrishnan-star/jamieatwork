'use client'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect, useCallback } from 'react'
import { TRUST_STAGES, getStage, getNextUnlockProgress, type TrustProgress, type ActivityLogEntry } from '@/lib/trust'

// ─── Types ───
interface DashboardData {
  todaysActivity: { prospects_found: number; messages_drafted: number; replies_handled: number; meetings_booked: number }
  pipeline: { new: number; contacted: number; replied: number; meeting_booked: number; closed: number }
  performanceScore: number
  replyRate: number
  meetingConversion: number
  totalProspects: number
  totalReplies: number
  totalMeetings: number
  activityLog: ActivityLogEntry[]
  trust: { trust_stage: number; trust_approved_count: number; trust_draft_approved_count: number; trust_reply_rate: number; trust_autopilot_enabled: boolean }
  upcomingMeetings: { id: string; prospect_name: string; prospect_company: string; scheduled_at: string; status: string }[]
}

// ─── Demo data fallback ───
const DEMO_DATA: DashboardData = {
  todaysActivity: { prospects_found: 0, messages_drafted: 0, replies_handled: 0, meetings_booked: 0 },
  pipeline: { new: 0, contacted: 0, replied: 0, meeting_booked: 0, closed: 0 },
  performanceScore: 0,
  replyRate: 0,
  meetingConversion: 0,
  totalProspects: 0,
  totalReplies: 0,
  totalMeetings: 0,
  activityLog: [],
  trust: { trust_stage: 1, trust_approved_count: 0, trust_draft_approved_count: 0, trust_reply_rate: 0, trust_autopilot_enabled: false },
  upcomingMeetings: [],
}

// ─── Performance Ring ───
function PerformanceRing({ score }: { score: number }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 70 ? '#16A34A' : score >= 40 ? '#EA580C' : '#DC2626'

  return (
    <div style={{ position: 'relative', width: '140px', height: '140px' }}>
      <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#F0EDE8" strokeWidth="8" />
        <circle
          cx="70" cy="70" r={radius} fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.22,1,.36,1)' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: '36px',
          fontWeight: 900, letterSpacing: '-.04em', color: '#1A1A1A', lineHeight: 1,
        }}>{score}</span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: '10px',
          color: '#A3A3A3', fontWeight: 600, letterSpacing: '.06em', marginTop: '2px',
        }}>/ 100</span>
      </div>
    </div>
  )
}

// ─── Stat Card ───
function StatCard({ label, value, icon, accent }: { label: string; value: number; icon: string; accent: string }) {
  return (
    <div style={{
      background: 'white', borderRadius: '14px', padding: '20px',
      border: '1px solid #E8E5DF', flex: 1, minWidth: '140px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '10px',
          background: accent + '15', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '16px',
        }}>{icon}</div>
        <span style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: '12px',
          color: '#6B6B6B', fontWeight: 600,
        }}>{label}</span>
      </div>
      <div style={{
        fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: '28px',
        fontWeight: 900, letterSpacing: '-.04em', color: '#1A1A1A',
      }}>{value}</div>
    </div>
  )
}

// ─── Pipeline Bar ───
function PipelineBar({ pipeline }: { pipeline: DashboardData['pipeline'] }) {
  const stages = [
    { key: 'new', label: 'New', color: '#7C3AED', count: pipeline.new },
    { key: 'contacted', label: 'Contacted', color: '#0EA5E9', count: pipeline.contacted },
    { key: 'replied', label: 'Replied', color: '#EA580C', count: pipeline.replied },
    { key: 'meeting', label: 'Meeting', color: '#F43F5E', count: pipeline.meeting_booked },
    { key: 'closed', label: 'Closed', color: '#16A34A', count: pipeline.closed },
  ]
  const total = stages.reduce((s, st) => s + st.count, 0)

  return (
    <div style={{
      background: 'white', borderRadius: '16px', padding: '24px',
      border: '1px solid #E8E5DF',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{
          fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: '16px',
          fontWeight: 800, letterSpacing: '-.03em', color: '#1A1A1A',
        }}>Pipeline</h3>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: '11px',
          color: '#A3A3A3', fontWeight: 500,
        }}>{total} total prospects</span>
      </div>

      {total === 0 ? (
        <div style={{
          padding: '32px', textAlign: 'center', borderRadius: '12px',
          background: '#FAFAF9', border: '1px dashed #E8E5DF',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎯</div>
          <p style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: '14px',
            color: '#6B6B6B', fontWeight: 600, marginBottom: '4px',
          }}>No prospects yet</p>
          <p style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: '#A3A3A3',
          }}>Head to Prospects to generate your first batch from your ICP.</p>
          <Link href="/prospects" style={{
            display: 'inline-block', marginTop: '16px', fontFamily: "'DM Sans', sans-serif",
            fontSize: '13px', fontWeight: 700, padding: '10px 20px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #7C3AED, #EC4899)', color: 'white',
            textDecoration: 'none', boxShadow: '0 2px 8px rgba(124,58,237,.2)',
          }}>Generate Prospects</Link>
        </div>
      ) : (
        <>
          {/* Visual bar */}
          <div style={{
            display: 'flex', height: '8px', borderRadius: '100px', overflow: 'hidden',
            background: '#F0EDE8', marginBottom: '16px',
          }}>
            {stages.map(s => s.count > 0 && (
              <div key={s.key} style={{
                width: `${(s.count / total) * 100}%`, background: s.color,
                transition: 'width .6s cubic-bezier(.22,1,.36,1)',
              }} />
            ))}
          </div>

          {/* Stage breakdown */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {stages.map(s => (
              <div key={s.key} style={{
                flex: 1, minWidth: '100px', padding: '14px 12px', borderRadius: '12px',
                background: '#FAFAF9', textAlign: 'center',
              }}>
                <div style={{
                  fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: '22px',
                  fontWeight: 900, letterSpacing: '-.03em', color: s.color, marginBottom: '2px',
                }}>{s.count}</div>
                <div style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: '11px',
                  color: '#A3A3A3', fontWeight: 600,
                }}>{s.label}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Trust Stage Card ───
function TrustStageCard({ progress }: { progress: TrustProgress }) {
  const current = getStage(progress.trust_stage)
  const next = getNextUnlockProgress(progress)

  return (
    <div style={{
      background: 'white', borderRadius: '16px', padding: '24px',
      border: '1px solid #E8E5DF',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '14px',
          background: current.badgeBg, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '24px',
        }}>{current.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: '18px',
              fontWeight: 800, letterSpacing: '-.03em', color: '#1A1A1A',
            }}>Stage {progress.trust_stage}: {current.label}</span>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', fontWeight: 600,
              color: current.badgeColor, background: current.badgeBg,
              padding: '3px 10px', borderRadius: '100px', letterSpacing: '.06em',
            }}>ACTIVE</span>
          </div>
          <p style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: '#6B6B6B', marginTop: '2px',
          }}>{current.description}</p>
        </div>
      </div>

      {/* Stage dots */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: next ? '16px' : '0' }}>
        {TRUST_STAGES.map((s) => (
          <div key={s.id} style={{
            flex: 1, height: '6px', borderRadius: '100px',
            background: s.id <= progress.trust_stage
              ? s.id === progress.trust_stage ? 'linear-gradient(135deg, #7C3AED, #EC4899)' : s.badgeColor
              : '#E8E5DF',
            opacity: s.id <= progress.trust_stage ? 1 : 0.4,
            transition: 'all .2s ease',
          }} title={`Stage ${s.id}: ${s.label}`} />
        ))}
      </div>

      {/* Next unlock progress */}
      {next && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: '#6B6B6B', fontWeight: 500,
            }}>Next unlock</span>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#A3A3A3', fontWeight: 500,
            }}>{next.label}</span>
          </div>
          <div style={{
            width: '100%', height: '4px', borderRadius: '100px', background: '#F0EDE8', overflow: 'hidden',
          }}>
            <div style={{
              width: `${next.percent}%`, height: '100%', borderRadius: '100px',
              background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
              transition: 'width .6s cubic-bezier(.22,1,.36,1)',
            }} />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Activity Feed ───
function ActivityFeed({ entries }: { entries: ActivityLogEntry[] }) {
  const iconMap: Record<string, string> = {
    prospect_suggested: '🎯',
    suggestion_approved: '✅',
    draft_created: '✍️',
    draft_approved: '📝',
    message_sent: '📤',
    message_recalled: '↩️',
    reply_received: '💬',
    reply_approved: '📨',
    meeting_booked: '📅',
    stage_change: '🔓',
    onboarding_complete: '🎓',
    action_rejected: '❌',
    prospect_unsubscribed: '🚫',
  }

  return (
    <div style={{
      background: 'white', borderRadius: '16px', padding: '24px',
      border: '1px solid #E8E5DF',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{
          fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: '16px',
          fontWeight: 800, letterSpacing: '-.03em', color: '#1A1A1A',
        }}>Recent Activity</h3>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: '10px',
          color: '#A3A3A3', fontWeight: 500, letterSpacing: '.06em',
        }}>LAST 10</span>
      </div>

      {entries.length === 0 ? (
        <div style={{
          padding: '32px', textAlign: 'center', borderRadius: '12px',
          background: '#FAFAF9', border: '1px dashed #E8E5DF',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📋</div>
          <p style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: '14px',
            color: '#6B6B6B', fontWeight: 600, marginBottom: '4px',
          }}>No activity yet</p>
          <p style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: '#A3A3A3',
          }}>Jamie&apos;s actions will appear here as she starts working.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          {entries.map((entry) => (
            <div key={entry.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 0',
              borderBottom: '1px solid #F5F3EE',
            }}>
              <span style={{ fontSize: '16px', marginTop: '1px', flexShrink: 0 }}>
                {iconMap[entry.action_type] || '📌'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: '13px', fontWeight: 600,
                  color: '#1A1A1A',
                }}>{entry.action_label}</div>
                <div style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: '#A3A3A3',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{entry.detail}</div>
              </div>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#A3A3A3',
                flexShrink: 0, marginTop: '2px',
              }}>{formatRelativeTime(entry.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// ─── Quick Actions ───
function QuickActions() {
  const actions = [
    { label: 'Review Drafts', href: '/outreach', icon: '✍️', color: '#7C3AED' },
    { label: 'Approve Prospects', href: '/prospects', icon: '🎯', color: '#0EA5E9' },
    { label: 'View Meetings', href: '/inbox', icon: '📅', color: '#F43F5E' },
    { label: 'Settings', href: '/settings', icon: '⚙️', color: '#6B6B6B' },
  ]

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px',
    }}>
      {actions.map(a => (
        <Link key={a.label} href={a.href} style={{
          background: 'white', borderRadius: '14px', padding: '18px 16px',
          border: '1px solid #E8E5DF', textDecoration: 'none',
          textAlign: 'center', transition: 'all .2s ease',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
        }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '12px',
            background: a.color + '12', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '20px',
          }}>{a.icon}</div>
          <span style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: '12px',
            fontWeight: 700, color: '#1A1A1A',
          }}>{a.label}</span>
        </Link>
      ))}
    </div>
  )
}

// ─── Main Dashboard ───
export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>(DEMO_DATA)
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<TrustProgress>({
    trust_stage: 1,
    approved_suggestions: 0,
    approved_drafts: 0,
    positive_reply_rate: 0,
    total_replies: 0,
    stage_unlocked_at: null,
  })
  const [localLog, setLocalLog] = useState<ActivityLogEntry[]>([])

  // Fetch dashboard data
  useEffect(() => {
    async function fetchData() {
      try {
        const [dashRes, trustRes] = await Promise.all([
          fetch('/api/dashboard'),
          fetch('/api/trust'),
        ])

        if (dashRes.ok) {
          const dashData = await dashRes.json()
          setData(dashData)
          setLocalLog(dashData.activityLog || [])
        }

        if (trustRes.ok) {
          const trustData = await trustRes.json()
          setProgress(trustData)
        }
      } catch {
        // Use demo data on error
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const current = getStage(progress.trust_stage)

  return (
    <div style={{ minHeight: '100vh', background: '#F8F7F4', color: '#1A1A1A' }}>
      <style>{`
        @keyframes fadeUp {
          from { transform: translateY(16px); opacity: 0 }
          to { transform: translateY(0); opacity: 1 }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0 }
          100% { background-position: 200% 0 }
        }
        .fade-up { animation: fadeUp .5s cubic-bezier(.22,1,.36,1) both; }
        .fade-up-1 { animation-delay: .05s; }
        .fade-up-2 { animation-delay: .1s; }
        .fade-up-3 { animation-delay: .15s; }
        .fade-up-4 { animation-delay: .2s; }
        .fade-up-5 { animation-delay: .25s; }
        .skeleton {
          background: linear-gradient(90deg, #F0EDE8 25%, #F8F7F4 50%, #F0EDE8 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 8px;
        }
        .quick-action:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,.06);
          border-color: #C4B5FD !important;
        }
        @media (max-width: 700px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .quick-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .two-col { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100, padding: '14px 24px',
        background: 'rgba(248,247,244,.85)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(0,0,0,.06)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '5px', textDecoration: 'none', color: '#1A1A1A' }}>
            <div aria-hidden="true" style={{
              width: '28px', height: '28px', borderRadius: '8px',
              background: 'linear-gradient(135deg,#7C3AED,#EC4899)',
              flexShrink: 0,
            }} />
            <span style={{
              fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: '16px',
              fontWeight: 900, letterSpacing: '-.03em',
            }}>jamie<span style={{ color: '#FDA4AF', fontWeight: 500 }}>@</span>work</span>
          </Link>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#6B6B6B',
            padding: '3px 10px', borderRadius: '6px', border: '1px solid rgba(0,0,0,.08)',
            background: 'white', letterSpacing: '.06em', fontWeight: 600,
          }}>DASHBOARD</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', fontWeight: 600,
            color: current.badgeColor, background: current.badgeBg,
            padding: '4px 12px', borderRadius: '100px', letterSpacing: '.04em',
          }}>{current.icon} STAGE {progress.trust_stage}</span>
          <button onClick={handleLogout} style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: '13px', padding: '8px 16px',
            borderRadius: '10px', border: '1.5px solid rgba(0,0,0,.1)', background: 'white',
            color: '#6B6B6B', fontWeight: 600, cursor: 'pointer',
          }}>Log out</button>
        </div>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 24px 64px' }}>

        {/* ─── Trust Stage Card ─── */}
        <div className="fade-up" style={{ marginBottom: '20px' }}>
          <TrustStageCard progress={progress} />
        </div>

        {/* ─── Today's Activity ─── */}
        <div className="fade-up fade-up-1" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <h2 style={{
              fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: '16px',
              fontWeight: 800, letterSpacing: '-.03em', color: '#1A1A1A',
            }}>Today&apos;s Activity</h2>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: '10px',
              color: '#A3A3A3', fontWeight: 500, letterSpacing: '.06em',
            }}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          </div>
          {loading ? (
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="skeleton" style={{ height: '100px' }} />
              ))}
            </div>
          ) : (
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              <StatCard label="Prospects Found" value={data.todaysActivity.prospects_found} icon="🎯" accent="#7C3AED" />
              <StatCard label="Messages Drafted" value={data.todaysActivity.messages_drafted} icon="✍️" accent="#0EA5E9" />
              <StatCard label="Replies Handled" value={data.todaysActivity.replies_handled} icon="💬" accent="#F43F5E" />
              <StatCard label="Meetings Booked" value={data.todaysActivity.meetings_booked} icon="📅" accent="#16A34A" />
            </div>
          )}
        </div>

        {/* ─── Performance + Pipeline (two columns) ─── */}
        <div className="fade-up fade-up-2 two-col" style={{
          display: 'grid', gridTemplateColumns: '280px 1fr', gap: '16px', marginBottom: '20px',
        }}>
          {/* Performance Score */}
          <div style={{
            background: 'white', borderRadius: '16px', padding: '24px',
            border: '1px solid #E8E5DF', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <h3 style={{
              fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: '16px',
              fontWeight: 800, letterSpacing: '-.03em', color: '#1A1A1A',
              marginBottom: '16px', alignSelf: 'flex-start',
            }}>Performance</h3>

            {loading ? (
              <div className="skeleton" style={{ width: '140px', height: '140px', borderRadius: '50%' }} />
            ) : data.totalProspects === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: '40px', marginBottom: '8px', opacity: 0.4 }}>📊</div>
                <p style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: '#A3A3A3',
                }}>Jamie needs data to calculate performance. Generate prospects to get started.</p>
              </div>
            ) : (
              <>
                <PerformanceRing score={data.performanceScore} />
                <div style={{ marginTop: '16px', width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F5F3EE' }}>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: '#6B6B6B' }}>Reply Rate</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#1A1A1A', fontWeight: 600 }}>{data.replyRate}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: '#6B6B6B' }}>Meeting Conv.</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#1A1A1A', fontWeight: 600 }}>{data.meetingConversion}%</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Pipeline */}
          <PipelineBar pipeline={data.pipeline} />
        </div>

        {/* ─── Quick Actions ─── */}
        <div className="fade-up fade-up-3" style={{ marginBottom: '20px' }}>
          <h2 style={{
            fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: '16px',
            fontWeight: 800, letterSpacing: '-.03em', color: '#1A1A1A',
            marginBottom: '12px',
          }}>Quick Actions</h2>
          <div className="quick-grid" style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px',
          }}>
            {[
              { label: 'Review Drafts', href: '/outreach', icon: '✍️', color: '#7C3AED' },
              { label: 'Approve Prospects', href: '/prospects', icon: '🎯', color: '#0EA5E9' },
              { label: 'View Meetings', href: '/inbox', icon: '📅', color: '#F43F5E' },
              { label: 'Settings', href: '/settings', icon: '⚙️', color: '#6B6B6B' },
            ].map(a => (
              <Link key={a.label} href={a.href} className="quick-action" style={{
                background: 'white', borderRadius: '14px', padding: '18px 16px',
                border: '1px solid #E8E5DF', textDecoration: 'none',
                textAlign: 'center', transition: 'all .2s ease',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
              }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '12px',
                  background: a.color + '12', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '20px',
                }}>{a.icon}</div>
                <span style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: '12px',
                  fontWeight: 700, color: '#1A1A1A',
                }}>{a.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* ─── Recent Activity Feed ─── */}
        <div className="fade-up fade-up-4">
          <ActivityFeed entries={localLog} />
        </div>

      </div>
    </div>
  )
}
