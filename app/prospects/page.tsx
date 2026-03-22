'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Prospect {
  id?: string
  user_id?: string
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
  created_at?: string
}

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)

  // Filters
  const [scoreFilter, setScoreFilter] = useState('all')
  const [industryFilter, setIndustryFilter] = useState('all')
  const [sizeFilter, setSizeFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [filterIndustries, setFilterIndustries] = useState<string[]>([])
  const [filterSizes, setFilterSizes] = useState<string[]>([])

  // Infinite scroll
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadingMore = useRef(false)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchQuery), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  // Load user and initial prospects
  useEffect(() => {
    async function init() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        const uid = user?.id || null
        setUserId(uid)
        await loadProspects(uid, 0, true)
        await loadFilters(uid)
      } catch {
        await loadProspects(null, 0, true)
      } finally {
        setInitialLoading(false)
      }
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reload when filters change
  useEffect(() => {
    if (initialLoading) return
    loadProspects(userId, 0, true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoreFilter, industryFilter, sizeFilter, searchDebounced])

  const loadFilters = async (uid: string | null) => {
    try {
      const supabase = createClient()
      let industryQuery = supabase.from('prospects').select('industry')
      let sizeQuery = supabase.from('prospects').select('company_size')

      if (uid) {
        industryQuery = industryQuery.eq('user_id', uid)
        sizeQuery = sizeQuery.eq('user_id', uid)
      }

      const [{ data: industries }, { data: sizes }] = await Promise.all([industryQuery, sizeQuery])

      setFilterIndustries([...new Set((industries || []).map((r: { industry: string }) => r.industry))].sort())
      setFilterSizes([...new Set((sizes || []).map((r: { company_size: string }) => r.company_size))].sort())
    } catch {
      // Use client-side derived filters as fallback
    }
  }

  const loadProspects = async (uid: string | null, offset: number, reset: boolean) => {
    if (loadingMore.current && !reset) return
    loadingMore.current = true

    const limit = 10
    try {
      const supabase = createClient()
      let query = supabase
        .from('prospects')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (uid) query = query.eq('user_id', uid)

      // Score filter
      if (scoreFilter === '80+') query = query.gte('score', 80)
      else if (scoreFilter === '50-79') query = query.gte('score', 50).lt('score', 80)
      else if (scoreFilter === 'below50') query = query.lt('score', 50)

      // Industry filter
      if (industryFilter && industryFilter !== 'all') query = query.eq('industry', industryFilter)

      // Size filter
      if (sizeFilter && sizeFilter !== 'all') query = query.eq('company_size', sizeFilter)

      // Text search
      if (searchDebounced) {
        query = query.or(`name.ilike.%${searchDebounced}%,company.ilike.%${searchDebounced}%,title.ilike.%${searchDebounced}%,email.ilike.%${searchDebounced}%`)
      }

      // Pagination
      query = query.range(offset, offset + limit - 1)

      const { data, count, error } = await query

      if (error) {
        console.error('Failed to load prospects:', error)
        return
      }

      if (reset) {
        setProspects(data || [])
      } else {
        setProspects(prev => [...prev, ...(data || [])])
      }
      setTotal(count || 0)
      setHasMore((count || 0) > offset + limit)
    } catch (err) {
      console.error('Failed to load prospects:', err)
    } finally {
      loadingMore.current = false
    }
  }

  // Infinite scroll observer
  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore.current) return
    loadProspects(userId, prospects.length, false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, userId, prospects.length])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore() },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore])

  // Error state
  const [error, setError] = useState<string | null>(null)

  // Generate new batch
  const generateProspects = async () => {
    setLoading(true)
    setError(null)

    let icp = { industries: '', company_size: '', roles: '', geography: '', product_name: '', product_description: '', problem_solved: '' }
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.id) {
        // Onboarding data is stored in auth user_metadata, not user_profiles table
        const od = user.user_metadata?.onboarding_data as Record<string, unknown> | undefined
        if (od) {
          icp = {
            industries: ((od.target_industries as string[]) || []).join(', '),
            company_size: ((od.company_sizes as string[]) || []).join(', '),
            roles: ((od.target_titles as string[]) || []).join(', '),
            geography: ((od.geographies as string[]) || []).join(', '),
            product_name: (od.product_name as string) || '',
            product_description: (od.product_description as string) || '',
            problem_solved: (od.problem_solved as string) || '',
          }
        }
      }
    } catch {
      // Use defaults
    }

    try {
      const res = await fetch('/api/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', user_id: userId, icp }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || `Generation failed (${res.status})`)
        return
      }
      if (data.error) {
        setError(data.error)
        return
      }
      if (data.prospects?.length > 0) {
        // Reload from DB to get proper IDs and status
        await loadProspects(userId, 0, true)
        await loadFilters(userId)
      } else {
        setError('No prospects were generated. Please try again.')
      }
    } catch (err) {
      console.error('Failed to generate prospects:', err)
      setError('Network error — could not reach the server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Update prospect status
  const updateStatus = async (prospect: Prospect, newStatus: Prospect['status']) => {
    // Toggle: if already this status, revert to 'new'
    const finalStatus = prospect.status === newStatus ? 'new' : newStatus

    // Optimistic update
    setProspects(prev => prev.map(p =>
      p.id === prospect.id ? { ...p, status: finalStatus } : p
    ))

    if (prospect.id) {
      try {
        await fetch('/api/prospects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update_status', prospect_id: prospect.id, status: finalStatus }),
        })
      } catch {
        // Revert on error
        setProspects(prev => prev.map(p =>
          p.id === prospect.id ? { ...p, status: prospect.status } : p
        ))
      }
    }
  }

  // Derived filter values (fallback if server filters empty)
  const industries = useMemo(() => {
    if (filterIndustries.length > 0) return filterIndustries
    return [...new Set(prospects.map(p => p.industry))].sort()
  }, [filterIndustries, prospects])

  const sizes = useMemo(() => {
    if (filterSizes.length > 0) return filterSizes
    return [...new Set(prospects.map(p => p.company_size))].sort()
  }, [filterSizes, prospects])

  const scoreColor = (score: number) => {
    if (score >= 80) return '#16A34A'
    if (score >= 50) return '#D97706'
    return '#DC2626'
  }

  const scoreBg = (score: number) => {
    if (score >= 80) return '#F0FDF4'
    if (score >= 50) return '#FFFBEB'
    return '#FEF2F2'
  }

  const initials = (name: string) => {
    const parts = name.split(' ').filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }

  const avatarGradient = (name: string) => {
    const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    const gradients = [
      'linear-gradient(135deg, #7C3AED, #EC4899)',
      'linear-gradient(135deg, #0EA5E9, #7C3AED)',
      'linear-gradient(135deg, #F43F5E, #F59E0B)',
      'linear-gradient(135deg, #16A34A, #0EA5E9)',
      'linear-gradient(135deg, #EC4899, #F59E0B)',
      'linear-gradient(135deg, #7C3AED, #0EA5E9)',
    ]
    return gradients[hash % gradients.length]
  }

  const cardBg = (status: string) => {
    if (status === 'approved') return '#F0FDF4'
    if (status === 'skipped') return '#F9FAFB'
    if (status === 'saved') return '#FAF5FF'
    return 'white'
  }

  const cardBorder = (status: string) => {
    if (status === 'approved') return 'rgba(22,163,74,.2)'
    if (status === 'saved') return 'rgba(124,58,237,.2)'
    return 'rgba(0,0,0,.06)'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8F7F4', color: '#1A1A1A' }}>
      <style>{`
        .hd { font-family: 'Cabinet Grotesk', sans-serif; }
        .bd { font-family: 'DM Sans', sans-serif; }
        .mn { font-family: 'JetBrains Mono', monospace; }
        .prospect-card {
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .prospect-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,.08) !important;
        }
        .action-btn {
          transition: all 0.15s ease;
          cursor: pointer;
        }
        .action-btn:hover {
          transform: translateY(-1px);
        }
        .skeleton {
          background: linear-gradient(90deg, #F0EDE8 25%, #F8F7F4 50%, #F0EDE8 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 8px;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in {
          animation: fadeUp 0.4s cubic-bezier(.22,1,.36,1) forwards;
          opacity: 0;
        }
        @media (max-width: 700px) {
          .prospect-grid {
            grid-template-columns: 1fr !important;
          }
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
            <span className="hd" style={{ fontSize: '16px', fontWeight: 900, letterSpacing: '-.03em' }}>
              jamie<span style={{ color: '#C4B5FD', fontWeight: 500 }}>@</span>work
            </span>
          </Link>
          <span className="mn" style={{
            fontSize: '10px', color: '#7C3AED', padding: '3px 10px',
            borderRadius: '6px', border: '1px solid #E9E5FF',
            background: '#F3F0FF', letterSpacing: '.06em', fontWeight: 600,
          }}>PROSPECTS</span>
        </div>
        <Link href="/dashboard" className="bd" style={{
          fontSize: '13px', padding: '8px 16px', borderRadius: '10px',
          border: '1.5px solid rgba(0,0,0,.1)', background: 'white',
          color: '#6B6B6B', fontWeight: 600, textDecoration: 'none',
        }}>Back to Dashboard</Link>
      </nav>

      {/* Main content */}
      <div style={{ maxWidth: '1060px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="hd" style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-.04em', margin: 0 }}>
              Prospect Research
            </h1>
            <p className="bd" style={{ fontSize: '15px', color: '#6B6B6B', marginTop: '6px', fontWeight: 500 }}>
              AI-generated prospects matched to your ICP
              {total > 0 && <span className="mn" style={{ fontSize: '12px', color: '#A3A3A3', marginLeft: '8px' }}>{total} total</span>}
            </p>
          </div>
          <button
            className="action-btn bd"
            onClick={generateProspects}
            disabled={loading}
            style={{
              padding: '12px 28px', borderRadius: '12px', border: 'none',
              background: loading ? '#A78BFA' : 'linear-gradient(135deg, #7C3AED, #EC4899)',
              color: 'white', fontSize: '14px', fontWeight: 700,
              boxShadow: '0 4px 16px rgba(124,58,237,.25)',
              opacity: loading ? 0.8 : 1,
            }}
          >
            {loading ? 'Generating...' : prospects.length > 0 ? 'Generate More' : 'Generate Prospects'}
          </button>
        </div>

        {/* Filter bar */}
        {(prospects.length > 0 || !initialLoading) && (
          <div style={{
            display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap',
            padding: '16px', background: 'white', borderRadius: '14px',
            border: '1px solid rgba(0,0,0,.06)',
          }}>
            <select
              className="bd"
              value={scoreFilter}
              onChange={e => setScoreFilter(e.target.value)}
              style={{
                padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,.1)',
                background: 'white', fontSize: '13px', fontWeight: 500, color: '#1A1A1A',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Scores</option>
              <option value="80+">80+ (Strong)</option>
              <option value="50-79">50-79 (Medium)</option>
              <option value="below50">Below 50 (Weak)</option>
            </select>

            <select
              className="bd"
              value={industryFilter}
              onChange={e => setIndustryFilter(e.target.value)}
              style={{
                padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,.1)',
                background: 'white', fontSize: '13px', fontWeight: 500, color: '#1A1A1A',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Industries</option>
              {industries.map(ind => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>

            <select
              className="bd"
              value={sizeFilter}
              onChange={e => setSizeFilter(e.target.value)}
              style={{
                padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,.1)',
                background: 'white', fontSize: '13px', fontWeight: 500, color: '#1A1A1A',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Sizes</option>
              {sizes.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <input
              className="bd"
              type="text"
              placeholder="Search name, company, title..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                flex: 1, minWidth: '180px', padding: '8px 12px',
                borderRadius: '8px', border: '1px solid rgba(0,0,0,.1)',
                fontSize: '13px', fontWeight: 500, color: '#1A1A1A',
                outline: 'none',
              }}
            />
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div style={{
            padding: '14px 20px', marginBottom: '20px', borderRadius: '12px',
            background: '#FEF2F2', border: '1px solid #FECACA',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <p className="bd" style={{ fontSize: '14px', color: '#DC2626', fontWeight: 600, margin: 0 }}>
              {error}
            </p>
            <button
              onClick={() => setError(null)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '18px', color: '#DC2626', padding: '0 4px', lineHeight: 1,
              }}
            >
              &times;
            </button>
          </div>
        )}

        {/* Loading skeletons */}
        {(loading || initialLoading) && prospects.length === 0 && (
          <div className="prospect-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{
                background: 'white', borderRadius: '16px', padding: '24px',
                border: '1px solid rgba(0,0,0,.06)',
              }}>
                <div style={{ display: 'flex', gap: '14px', marginBottom: '14px' }}>
                  <div className="skeleton" style={{ width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ height: '18px', width: '60%', marginBottom: '6px' }} />
                    <div className="skeleton" style={{ height: '14px', width: '80%', marginBottom: '4px' }} />
                    <div className="skeleton" style={{ height: '14px', width: '45%' }} />
                  </div>
                </div>
                <div className="skeleton" style={{ height: '28px', width: '60px', marginBottom: '14px', borderRadius: '20px' }} />
                <div className="skeleton" style={{ height: '12px', width: '90%', marginBottom: '6px' }} />
                <div className="skeleton" style={{ height: '12px', width: '75%', marginBottom: '6px' }} />
                <div className="skeleton" style={{ height: '12px', width: '60%', marginBottom: '20px' }} />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div className="skeleton" style={{ height: '34px', width: '80px' }} />
                  <div className="skeleton" style={{ height: '34px', width: '60px' }} />
                  <div className="skeleton" style={{ height: '34px', width: '100px' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state — no prospects at all */}
        {!loading && !initialLoading && prospects.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '80px 24px', background: 'white',
            borderRadius: '16px', border: '1px solid rgba(0,0,0,.06)',
          }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: '#F3F0FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', fontSize: '28px',
            }}>&#x1F3AF;</div>
            <h2 className="hd" style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px', letterSpacing: '-.02em' }}>
              No prospects yet
            </h2>
            <p className="bd" style={{ fontSize: '15px', color: '#6B6B6B', marginBottom: '24px', maxWidth: '360px', margin: '0 auto 24px' }}>
              Generate your first batch of AI-matched prospects based on your ICP.
            </p>
            <button
              className="action-btn bd"
              onClick={generateProspects}
              disabled={loading}
              style={{
                padding: '12px 32px', borderRadius: '12px', border: 'none',
                background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
                color: 'white', fontSize: '14px', fontWeight: 700,
                boxShadow: '0 4px 16px rgba(124,58,237,.25)',
              }}
            >
              Generate Prospects
            </button>
          </div>
        )}

        {/* Prospect grid */}
        {prospects.length > 0 && (
          <>
            <div className="prospect-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {prospects.map((prospect, i) => (
                <div
                  key={prospect.id || i}
                  className="prospect-card fade-in"
                  style={{
                    background: cardBg(prospect.status),
                    borderRadius: '16px',
                    padding: '24px',
                    border: `1px solid ${cardBorder(prospect.status)}`,
                    boxShadow: '0 1px 3px rgba(0,0,0,.04)',
                    opacity: prospect.status === 'skipped' ? 0.6 : 1,
                    animationDelay: `${(i % 10) * 50}ms`,
                  }}
                >
                  {/* Avatar + Name row */}
                  <div style={{ display: 'flex', gap: '14px', marginBottom: '14px' }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '50%',
                      background: avatarGradient(prospect.name),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: '15px', fontWeight: 800,
                      flexShrink: 0, letterSpacing: '-.02em',
                    }}>
                      {initials(prospect.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 className="hd" style={{
                        fontSize: '17px', fontWeight: 800, margin: 0,
                        letterSpacing: '-.02em', overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {prospect.name}
                      </h3>
                      <p className="bd" style={{
                        fontSize: '13px', color: '#6B6B6B', margin: '1px 0 0 0', fontWeight: 500,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {prospect.title}
                      </p>
                      <p className="bd" style={{
                        fontSize: '14px', color: '#1A1A1A', margin: '1px 0 0 0', fontWeight: 700,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {prospect.company}
                      </p>
                    </div>
                  </div>

                  {/* Email */}
                  <p className="mn" style={{ fontSize: '11px', color: '#6B6B6B', margin: '0 0 12px 0' }}>
                    {prospect.email}
                  </p>

                  {/* Score + meta */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      padding: '4px 12px', borderRadius: '20px',
                      background: scoreBg(prospect.score),
                      border: `1px solid ${scoreColor(prospect.score)}20`,
                    }}>
                      <div style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: scoreColor(prospect.score),
                      }} />
                      <span className="mn" style={{
                        fontSize: '12px', fontWeight: 600,
                        color: scoreColor(prospect.score),
                      }}>{prospect.score}</span>
                    </div>
                    <span className="bd" style={{ fontSize: '11px', color: '#A3A3A3', fontWeight: 500 }}>
                      {prospect.industry}
                    </span>
                    <span className="bd" style={{ fontSize: '11px', color: '#A3A3A3', fontWeight: 500 }}>
                      {prospect.company_size}
                    </span>
                    {prospect.status !== 'new' && (
                      <span className="mn" style={{
                        fontSize: '10px', fontWeight: 600, letterSpacing: '.04em',
                        padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase',
                        background: prospect.status === 'approved' ? '#F0FDF4' : prospect.status === 'saved' ? '#F3F0FF' : '#F5F5F5',
                        color: prospect.status === 'approved' ? '#16A34A' : prospect.status === 'saved' ? '#7C3AED' : '#A3A3A3',
                        border: `1px solid ${prospect.status === 'approved' ? 'rgba(22,163,74,.15)' : prospect.status === 'saved' ? '#E9E5FF' : 'rgba(0,0,0,.06)'}`,
                      }}>
                        {prospect.status}
                      </span>
                    )}
                  </div>

                  {/* Match reasons */}
                  <div style={{ marginBottom: '16px' }}>
                    <p className="bd" style={{
                      fontSize: '11px', color: '#6B6B6B', fontWeight: 600,
                      textTransform: 'uppercase', letterSpacing: '.05em', margin: '0 0 6px 0',
                    }}>
                      Why this matches
                    </p>
                    {prospect.match_reasons?.map((reason, ri) => (
                      <div key={ri} style={{ display: 'flex', gap: '6px', marginBottom: '3px' }}>
                        <span style={{ color: '#7C3AED', fontSize: '10px', marginTop: '3px', flexShrink: 0 }}>&#x25CF;</span>
                        <span className="bd" style={{ fontSize: '12px', color: '#57534E', lineHeight: 1.4 }}>{reason}</span>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      className="action-btn bd"
                      onClick={() => updateStatus(prospect, 'approved')}
                      style={{
                        padding: '7px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                        border: prospect.status === 'approved' ? '1.5px solid #16A34A' : '1.5px solid rgba(22,163,74,.3)',
                        background: prospect.status === 'approved' ? '#16A34A' : 'white',
                        color: prospect.status === 'approved' ? 'white' : '#16A34A',
                      }}
                    >
                      {prospect.status === 'approved' ? 'Approved' : 'Approve'}
                    </button>
                    <button
                      className="action-btn bd"
                      onClick={() => updateStatus(prospect, 'skipped')}
                      style={{
                        padding: '7px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                        border: '1.5px solid rgba(0,0,0,.1)',
                        background: prospect.status === 'skipped' ? '#E5E7EB' : 'white',
                        color: '#6B6B6B',
                      }}
                    >
                      {prospect.status === 'skipped' ? 'Skipped' : 'Skip'}
                    </button>
                    <button
                      className="action-btn bd"
                      onClick={() => updateStatus(prospect, 'saved')}
                      style={{
                        padding: '7px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                        border: prospect.status === 'saved' ? '1.5px solid #7C3AED' : '1.5px solid rgba(124,58,237,.3)',
                        background: prospect.status === 'saved' ? '#7C3AED' : 'white',
                        color: prospect.status === 'saved' ? 'white' : '#7C3AED',
                      }}
                    >
                      {prospect.status === 'saved' ? 'Saved' : 'Save for Later'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} style={{ height: '1px' }} />

            {/* Loading more indicator */}
            {hasMore && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div className="skeleton" style={{ height: '12px', width: '120px', margin: '0 auto', borderRadius: '6px' }} />
              </div>
            )}

            {/* End of list */}
            {!hasMore && prospects.length > 0 && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <p className="bd" style={{ fontSize: '13px', color: '#A3A3A3', fontWeight: 500 }}>
                  {total} prospect{total !== 1 ? 's' : ''} loaded
                </p>
              </div>
            )}
          </>
        )}

        {/* Generating overlay when adding more */}
        {loading && prospects.length > 0 && (
          <div style={{
            textAlign: 'center', padding: '24px', marginTop: '16px',
            background: '#F3F0FF', borderRadius: '14px', border: '1px solid #E9E5FF',
          }}>
            <p className="bd" style={{ fontSize: '14px', color: '#7C3AED', fontWeight: 600, margin: 0 }}>
              Generating 10 more prospects...
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
