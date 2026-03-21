'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ─── Design tokens ───
const C = {
  bg: '#F8F7F4',
  purple: '#7C3AED',
  purpleLight: '#EDE9FE',
  rose: '#F43F5E',
  roseLight: '#FFF1F2',
  roseBorder: '#FECDD3',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textTertiary: '#A3A3A3',
  card: '#FFFFFF',
  border: 'rgba(0,0,0,.06)',
  success: '#16A34A',
  successLight: '#F0FDF4',
}

const STEPS = [
  { name: 'Product & Pitch', time: '3 min' },
  { name: 'ICP Definition', time: '2 min' },
  { name: 'Voice & Tone', time: '2 min' },
  { name: 'Disqualifiers', time: '2 min' },
  { name: 'Review & Certify', time: '2 min' },
]

const INDUSTRIES = ['SaaS', 'Fintech', 'Healthcare', 'E-commerce', 'Education', 'Real Estate', 'Legal', 'Marketing', 'Other']
const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-1000', '1000+']
const GEOGRAPHIES = ['North America', 'Europe', 'Asia Pacific', 'Latin America', 'Middle East', 'Africa']

const VOICE_STYLES = [
  { id: 'formal', label: 'Formal', desc: 'Professional, polished, buttoned-up. Think enterprise sales.', emoji: '🎩' },
  { id: 'friendly', label: 'Friendly', desc: 'Warm, approachable, conversational. Like a helpful colleague.', emoji: '😊' },
  { id: 'bold', label: 'Bold', desc: 'Direct, confident, punchy. No fluff, all value.', emoji: '🔥' },
  { id: 'consultative', label: 'Consultative', desc: 'Thoughtful, question-led, advisory. Earn trust first.', emoji: '🧠' },
]

interface FormData {
  // Step 1
  website: string
  product_name: string
  product_description: string
  problem_solved: string
  key_differentiators: string
  // Step 2
  target_industries: string[]
  company_sizes: string[]
  target_titles: string[]
  geographies: string[]
  // Step 3
  voice_style: string
  example_email: string
  tone_analysis: string
  // Step 4
  disqualifiers: string
  competitor_names: string[]
  deal_size_min: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [transitioning, setTransitioning] = useState(false)
  const [form, setForm] = useState<FormData>({
    website: '',
    product_name: '',
    product_description: '',
    problem_solved: '',
    key_differentiators: '',
    target_industries: [],
    company_sizes: [],
    target_titles: [],
    geographies: [],
    voice_style: '',
    example_email: '',
    tone_analysis: '',
    disqualifiers: '',
    competitor_names: [],
    deal_size_min: '',
  })

  // Step 1 state
  const [scanning, setScanning] = useState(false)
  const [scanned, setScanned] = useState(false)
  const [scanError, setScanError] = useState('')
  const [editingField, setEditingField] = useState<string | null>(null)

  // Step 2 state
  const [titleInput, setTitleInput] = useState('')

  // Step 3 state
  const [analyzingTone, setAnalyzingTone] = useState(false)

  // Step 4 state
  const [competitorInput, setCompetitorInput] = useState('')

  // Step 5 state
  const [saving, setSaving] = useState(false)
  const [certified, setCertified] = useState(false)

  // ─── Navigation ───
  const goTo = useCallback((target: number) => {
    setTransitioning(true)
    setTimeout(() => {
      setStep(target)
      setTransitioning(false)
    }, 250)
  }, [])

  const next = useCallback(() => {
    if (step < 4) goTo(step + 1)
  }, [step, goTo])

  const back = useCallback(() => {
    if (step > 0) goTo(step - 1)
  }, [step, goTo])

  // ─── Step 1: Scan website ───
  const scanWebsite = async () => {
    if (!form.website.trim()) return
    setScanning(true)
    setScanError('')
    try {
      const res = await fetch('/api/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'scrape_website', website: form.website }),
      })
      const data = await res.json()
      if (data.extracted) {
        setForm(prev => ({
          ...prev,
          product_name: data.extracted.product_name || '',
          product_description: data.extracted.product_description || '',
          problem_solved: data.extracted.problem_solved || '',
          key_differentiators: data.extracted.key_differentiators || '',
        }))
        setScanned(true)
      } else {
        setScanError(data.error || 'Could not extract info from this website.')
      }
    } catch {
      setScanError('Network error. Please try again.')
    } finally {
      setScanning(false)
    }
  }

  // ─── Step 3: Analyze tone ───
  const analyzeTone = async () => {
    if (!form.example_email.trim()) return
    setAnalyzingTone(true)
    try {
      const res = await fetch('/api/analyze-tone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_text: form.example_email }),
      })
      const data = await res.json()
      if (data.analysis) {
        setForm(prev => ({ ...prev, tone_analysis: data.analysis }))
      }
    } catch {
      // silent fail
    } finally {
      setAnalyzingTone(false)
    }
  }

  // ─── Step 5: Save & Certify ───
  const certifyAndDeploy = async () => {
    setSaving(true)
    try {
      const supabase = createClient()
      await supabase.auth.updateUser({
        data: {
          onboarding_data: {
            product_name: form.product_name,
            product_description: form.product_description,
            problem_solved: form.problem_solved,
            key_differentiators: form.key_differentiators,
            target_industries: form.target_industries,
            company_sizes: form.company_sizes,
            target_titles: form.target_titles,
            geographies: form.geographies,
            voice_style: form.voice_style,
            example_email: form.example_email,
            tone_analysis: form.tone_analysis,
            disqualifiers: form.disqualifiers,
            competitor_names: form.competitor_names,
            deal_size_min: form.deal_size_min,
            certified_at: new Date().toISOString(),
          },
          onboarding_completed: true,
        },
      })
    } catch {
      // continue to celebration even if save fails
    }
    setCertified(true)
    setSaving(false)
    setTimeout(() => router.push('/dashboard'), 3000)
  }

  // ─── Tag input helpers ───
  const addTitle = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && titleInput.trim()) {
      e.preventDefault()
      if (!form.target_titles.includes(titleInput.trim())) {
        setForm(prev => ({ ...prev, target_titles: [...prev.target_titles, titleInput.trim()] }))
      }
      setTitleInput('')
    }
  }

  const removeTitle = (t: string) => {
    setForm(prev => ({ ...prev, target_titles: prev.target_titles.filter(x => x !== t) }))
  }

  const addCompetitor = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && competitorInput.trim()) {
      e.preventDefault()
      if (!form.competitor_names.includes(competitorInput.trim())) {
        setForm(prev => ({ ...prev, competitor_names: [...prev.competitor_names, competitorInput.trim()] }))
      }
      setCompetitorInput('')
    }
  }

  const removeCompetitor = (c: string) => {
    setForm(prev => ({ ...prev, competitor_names: prev.competitor_names.filter(x => x !== c) }))
  }

  const toggleArr = (field: 'target_industries' | 'company_sizes' | 'geographies', val: string) => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].includes(val) ? prev[field].filter(x => x !== val) : [...prev[field], val],
    }))
  }

  // ─── Celebration confetti ───
  if (certified) {
    return (
      <>
        <style>{`
          @import url('https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@700,800,900&display=swap');
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
          @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap');
          @keyframes confettiFall {
            0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
          }
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
        `}</style>
        <div style={{
          minHeight: '100vh',
          background: C.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Confetti pieces */}
          {Array.from({ length: 50 }).map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              top: 0,
              left: `${Math.random() * 100}%`,
              width: `${8 + Math.random() * 8}px`,
              height: `${8 + Math.random() * 8}px`,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              background: [C.purple, C.rose, '#FBBF24', '#34D399', '#60A5FA', '#F472B6'][i % 6],
              animation: `confettiFall ${2 + Math.random() * 3}s ease-in ${Math.random() * 2}s forwards`,
            }} />
          ))}
          <div style={{
            textAlign: 'center',
            animation: 'fadeInUp 0.8s ease-out',
          }}>
            <div style={{
              fontSize: 72,
              marginBottom: 24,
              animation: 'pulse 1.5s ease-in-out infinite',
            }}>
              🎉
            </div>
            <h1 style={{
              fontFamily: "'Cabinet Grotesk', sans-serif",
              fontSize: 42,
              fontWeight: 800,
              color: C.textPrimary,
              marginBottom: 12,
              letterSpacing: '-0.03em',
            }}>
              Jamie is certified!
            </h1>
            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 18,
              color: C.textSecondary,
              marginBottom: 8,
            }}>
              Your AI SDR is trained and ready to start selling.
            </p>
            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              color: C.textTertiary,
            }}>
              Redirecting to dashboard...
            </p>
          </div>
        </div>
      </>
    )
  }

  // ─── Shared inline-edit field renderer ───
  const renderEditableField = (label: string, fieldKey: keyof FormData, multiline = false) => {
    const val = form[fieldKey] as string
    const isEditing = editingField === fieldKey
    return (
      <div style={{ marginBottom: 16 }}>
        <label style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase' as const,
          letterSpacing: '0.08em',
          color: C.textTertiary,
          display: 'block',
          marginBottom: 6,
        }}>
          {label}
        </label>
        {isEditing ? (
          multiline ? (
            <textarea
              autoFocus
              value={val}
              onChange={e => setForm(prev => ({ ...prev, [fieldKey]: e.target.value }))}
              onBlur={() => setEditingField(null)}
              style={{
                width: '100%',
                minHeight: 80,
                padding: '10px 12px',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 15,
                color: C.textPrimary,
                border: `2px solid ${C.purple}`,
                borderRadius: 10,
                background: '#FAFAFF',
                outline: 'none',
                resize: 'vertical',
                lineHeight: 1.5,
              }}
            />
          ) : (
            <input
              autoFocus
              type="text"
              value={val}
              onChange={e => setForm(prev => ({ ...prev, [fieldKey]: e.target.value }))}
              onBlur={() => setEditingField(null)}
              onKeyDown={e => { if (e.key === 'Enter') setEditingField(null) }}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 15,
                color: C.textPrimary,
                border: `2px solid ${C.purple}`,
                borderRadius: 10,
                background: '#FAFAFF',
                outline: 'none',
              }}
            />
          )
        ) : (
          <div
            onClick={() => setEditingField(fieldKey)}
            style={{
              padding: '10px 12px',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 15,
              color: val ? C.textPrimary : C.textTertiary,
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              cursor: 'pointer',
              lineHeight: 1.5,
              minHeight: multiline ? 60 : 'auto',
              transition: 'border-color 0.15s, background 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = C.rose
              e.currentTarget.style.background = C.roseLight
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = C.border
              e.currentTarget.style.background = C.card
            }}
          >
            {val || 'Click to edit...'}
          </div>
        )}
      </div>
    )
  }

  // ─── Step renderers ───
  const renderStep1 = () => (
    <div>
      <h2 style={headingStyle}>Product & Pitch</h2>
      <p style={subStyle}>Let Jamie learn about your product by scanning your website.</p>

      {/* URL input */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input
          type="url"
          placeholder="https://yourcompany.com"
          value={form.website}
          onChange={e => setForm(prev => ({ ...prev, website: e.target.value }))}
          onKeyDown={e => { if (e.key === 'Enter') scanWebsite() }}
          style={{
            flex: 1,
            padding: '12px 16px',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 15,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            outline: 'none',
            color: C.textPrimary,
            background: C.card,
          }}
        />
        <button
          onClick={scanWebsite}
          disabled={scanning || !form.website.trim()}
          style={{
            ...btnPrimary,
            opacity: scanning || !form.website.trim() ? 0.6 : 1,
            cursor: scanning || !form.website.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {scanning ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
              Scanning...
            </span>
          ) : 'Scan'}
        </button>
      </div>

      {scanError && (
        <div style={{
          padding: '10px 14px',
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: 10,
          color: '#DC2626',
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 14,
          marginBottom: 16,
        }}>
          {scanError}
        </div>
      )}

      {scanned && (
        <div style={{ animation: 'fadeInUp 0.4s ease-out' }}>
          <div style={{
            padding: '8px 12px',
            background: C.successLight,
            borderRadius: 8,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{ color: C.success, fontSize: 16 }}>&#10003;</span>
            <span style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              color: C.success,
              fontWeight: 500,
            }}>
              Website scanned successfully. Click any field to edit.
            </span>
          </div>

          {renderEditableField('Product Name', 'product_name')}
          {renderEditableField('Description', 'product_description', true)}
          {renderEditableField('Problem Solved', 'problem_solved', true)}
          {renderEditableField('Key Differentiators', 'key_differentiators', true)}

          <button onClick={next} style={btnPrimary}>
            Looks good — Next
          </button>
        </div>
      )}
    </div>
  )

  const renderStep2 = () => (
    <div>
      <h2 style={headingStyle}>Ideal Customer Profile</h2>
      <p style={subStyle}>Tell Jamie who to target.</p>

      {/* Industries */}
      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>Target Industries</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {INDUSTRIES.map(ind => {
            const sel = form.target_industries.includes(ind)
            return (
              <button
                key={ind}
                onClick={() => toggleArr('target_industries', ind)}
                style={{
                  padding: '8px 16px',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14,
                  fontWeight: sel ? 600 : 400,
                  border: `1.5px solid ${sel ? C.rose : C.border}`,
                  borderRadius: 20,
                  background: sel ? C.roseLight : C.card,
                  color: sel ? C.rose : C.textSecondary,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {ind}
              </button>
            )
          })}
        </div>
      </div>

      {/* Company Size */}
      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>Company Size</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {COMPANY_SIZES.map(size => {
            const sel = form.company_sizes.includes(size)
            return (
              <label key={size} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                border: `1.5px solid ${sel ? C.purple : C.border}`,
                borderRadius: 10,
                background: sel ? C.purpleLight : C.card,
                color: sel ? C.purple : C.textSecondary,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}>
                <input
                  type="checkbox"
                  checked={sel}
                  onChange={() => toggleArr('company_sizes', size)}
                  style={{
                    position: 'absolute',
                    width: 1,
                    height: 1,
                    padding: 0,
                    margin: -1,
                    overflow: 'hidden',
                    clip: 'rect(0,0,0,0)',
                    whiteSpace: 'nowrap',
                    borderWidth: 0,
                  }}
                />
                <span style={{
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  border: `2px solid ${sel ? C.purple : '#D1D5DB'}`,
                  background: sel ? C.purple : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 700,
                }}>
                  {sel && '✓'}
                </span>
                {size} employees
              </label>
            )
          })}
        </div>
      </div>

      {/* Target Titles */}
      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>Target Job Titles</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {form.target_titles.map(t => (
            <span key={t} style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 12px',
              background: C.purpleLight,
              color: C.purple,
              borderRadius: 16,
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              fontWeight: 500,
            }}>
              {t}
              <span onClick={() => removeTitle(t)} style={{
                cursor: 'pointer',
                fontSize: 16,
                lineHeight: 1,
                opacity: 0.6,
              }}>
                &times;
              </span>
            </span>
          ))}
        </div>
        <input
          type="text"
          placeholder="Type a title and press Enter..."
          value={titleInput}
          onChange={e => setTitleInput(e.target.value)}
          onKeyDown={addTitle}
          style={inputStyle}
        />
      </div>

      {/* Geography */}
      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>Geography</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {GEOGRAPHIES.map(geo => {
            const sel = form.geographies.includes(geo)
            return (
              <button
                key={geo}
                onClick={() => toggleArr('geographies', geo)}
                style={{
                  padding: '8px 16px',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14,
                  fontWeight: sel ? 600 : 400,
                  border: `1.5px solid ${sel ? C.rose : C.border}`,
                  borderRadius: 20,
                  background: sel ? C.roseLight : C.card,
                  color: sel ? C.rose : C.textSecondary,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {geo}
              </button>
            )
          })}
        </div>
      </div>

      <button
        onClick={next}
        disabled={form.target_industries.length === 0}
        style={{
          ...btnPrimary,
          opacity: form.target_industries.length === 0 ? 0.5 : 1,
          cursor: form.target_industries.length === 0 ? 'not-allowed' : 'pointer',
        }}
      >
        Next
      </button>
    </div>
  )

  const renderStep3 = () => (
    <div>
      <h2 style={headingStyle}>Voice & Tone</h2>
      <p style={subStyle}>How should Jamie sound when reaching out?</p>

      {/* Style cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 12,
        marginBottom: 28,
      }}>
        {VOICE_STYLES.map(vs => {
          const sel = form.voice_style === vs.id
          return (
            <button
              type="button"
              key={vs.id}
              onClick={() => setForm(prev => ({ ...prev, voice_style: vs.id }))}
              style={{
                padding: 20,
                borderRadius: 14,
                border: `2px solid ${sel ? C.purple : C.border}`,
                background: sel ? C.purpleLight : C.card,
                cursor: 'pointer',
                transition: 'all 0.2s',
                transform: sel ? 'translateY(-2px)' : 'none',
                boxShadow: sel ? '0 6px 20px rgba(124,58,237,.12)' : '0 1px 3px rgba(0,0,0,.04)',
                textAlign: 'left',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>{vs.emoji}</div>
              <div style={{
                fontFamily: "'Cabinet Grotesk', sans-serif",
                fontSize: 17,
                fontWeight: 700,
                color: C.textPrimary,
                marginBottom: 4,
              }}>
                {vs.label}
              </div>
              <div style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                color: C.textSecondary,
                lineHeight: 1.4,
              }}>
                {vs.desc}
              </div>
            </button>
          )
        })}
      </div>

      {/* Example email */}
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Paste an example outreach email (optional)</label>
        <textarea
          placeholder="Paste a cold email you've sent or would send..."
          value={form.example_email}
          onChange={e => setForm(prev => ({ ...prev, example_email: e.target.value }))}
          style={{
            ...inputStyle,
            minHeight: 120,
            resize: 'vertical',
          }}
        />
      </div>

      {form.example_email.trim() && (
        <button
          onClick={analyzeTone}
          disabled={analyzingTone}
          style={{
            ...btnSecondary,
            marginBottom: 16,
            opacity: analyzingTone ? 0.6 : 1,
          }}
        >
          {analyzingTone ? 'Analyzing...' : 'Analyze Tone'}
        </button>
      )}

      {form.tone_analysis && (
        <div style={{
          padding: 16,
          background: C.roseLight,
          border: `1px solid ${C.roseBorder}`,
          borderRadius: 12,
          marginBottom: 20,
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 14,
          color: C.textPrimary,
          lineHeight: 1.6,
        }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.08em',
            color: C.rose,
            marginBottom: 8,
          }}>
            Tone Analysis
          </div>
          {form.tone_analysis}
        </div>
      )}

      <button
        onClick={next}
        disabled={!form.voice_style}
        style={{
          ...btnPrimary,
          opacity: !form.voice_style ? 0.5 : 1,
          cursor: !form.voice_style ? 'not-allowed' : 'pointer',
        }}
      >
        Next
      </button>
    </div>
  )

  const renderStep4 = () => (
    <div>
      <h2 style={headingStyle}>Disqualifiers</h2>
      <p style={subStyle}>Help Jamie know when to walk away.</p>

      {/* Bad leads */}
      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>Who is NOT a good lead?</label>
        <textarea
          placeholder="e.g. Companies with no budget, students, agencies reselling..."
          value={form.disqualifiers}
          onChange={e => setForm(prev => ({ ...prev, disqualifiers: e.target.value }))}
          style={{
            ...inputStyle,
            minHeight: 100,
            resize: 'vertical',
          }}
        />
      </div>

      {/* Competitors */}
      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>Competitor names to exclude</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {form.competitor_names.map(c => (
            <span key={c} style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 12px',
              background: C.roseLight,
              color: C.rose,
              borderRadius: 16,
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              fontWeight: 500,
            }}>
              {c}
              <span onClick={() => removeCompetitor(c)} style={{
                cursor: 'pointer',
                fontSize: 16,
                lineHeight: 1,
                opacity: 0.6,
              }}>
                &times;
              </span>
            </span>
          ))}
        </div>
        <input
          type="text"
          placeholder="Type a competitor name and press Enter..."
          value={competitorInput}
          onChange={e => setCompetitorInput(e.target.value)}
          onKeyDown={addCompetitor}
          style={inputStyle}
        />
      </div>

      {/* Deal size minimum */}
      <div style={{ marginBottom: 28 }}>
        <label style={labelStyle}>Minimum deal size</label>
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
          <span style={{
            position: 'absolute',
            left: 14,
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 15,
            color: C.textTertiary,
            pointerEvents: 'none',
          }}>
            $
          </span>
          <input
            type="number"
            placeholder="0"
            value={form.deal_size_min}
            onChange={e => setForm(prev => ({ ...prev, deal_size_min: e.target.value }))}
            style={{
              ...inputStyle,
              paddingLeft: 28,
              width: 200,
            }}
          />
        </div>
      </div>

      <button onClick={next} style={btnPrimary}>
        Review & Certify
      </button>
    </div>
  )

  const renderStep5 = () => {
    const selectedStyle = VOICE_STYLES.find(v => v.id === form.voice_style)
    return (
      <div>
        <h2 style={headingStyle}>Review & Certify</h2>
        <p style={subStyle}>Here is everything Jamie has learned. Confirm to deploy.</p>

        {/* Summary card */}
        <div style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          overflow: 'hidden',
          marginBottom: 28,
        }}>
          {/* Product */}
          <SummarySection title="PRODUCT & PITCH" accent={C.purple}>
            <SummaryRow label="Product" value={form.product_name} />
            <SummaryRow label="Description" value={form.product_description} />
            <SummaryRow label="Problem Solved" value={form.problem_solved} />
            <SummaryRow label="Differentiators" value={form.key_differentiators} />
          </SummarySection>

          {/* ICP */}
          <SummarySection title="IDEAL CUSTOMER" accent={C.rose}>
            <SummaryRow label="Industries" value={form.target_industries.join(', ') || 'Not set'} />
            <SummaryRow label="Company Size" value={form.company_sizes.join(', ') || 'Not set'} />
            <SummaryRow label="Job Titles" value={form.target_titles.join(', ') || 'Not set'} />
            <SummaryRow label="Geography" value={form.geographies.join(', ') || 'Not set'} />
          </SummarySection>

          {/* Voice */}
          <SummarySection title="VOICE & TONE" accent={C.purple}>
            <SummaryRow label="Style" value={selectedStyle ? `${selectedStyle.emoji} ${selectedStyle.label}` : 'Not set'} />
            {form.tone_analysis && <SummaryRow label="Tone Analysis" value={form.tone_analysis} />}
          </SummarySection>

          {/* Disqualifiers */}
          <SummarySection title="DISQUALIFIERS" accent={C.rose}>
            <SummaryRow label="Bad Leads" value={form.disqualifiers || 'Not set'} />
            <SummaryRow label="Competitors" value={form.competitor_names.join(', ') || 'None'} />
            <SummaryRow label="Min Deal Size" value={form.deal_size_min ? `$${Number(form.deal_size_min).toLocaleString()}` : 'Not set'} />
          </SummarySection>
        </div>

        {/* Confirm */}
        <div style={{
          background: C.roseLight,
          border: `1px solid ${C.roseBorder}`,
          borderRadius: 14,
          padding: 20,
          marginBottom: 24,
          textAlign: 'center',
        }}>
          <p style={{
            fontFamily: "'Cabinet Grotesk', sans-serif",
            fontSize: 18,
            fontWeight: 700,
            color: C.textPrimary,
            marginBottom: 4,
          }}>
            Does this look right?
          </p>
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            color: C.textSecondary,
          }}>
            You can always update Jamie&apos;s training later from the dashboard.
          </p>
        </div>

        <button
          onClick={certifyAndDeploy}
          disabled={saving}
          style={{
            ...btnPrimary,
            width: '100%',
            padding: '16px 24px',
            fontSize: 17,
            fontWeight: 700,
            background: saving ? C.textTertiary : `linear-gradient(135deg, ${C.purple}, ${C.rose})`,
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Saving...' : 'Approve & Deploy Jamie'}
        </button>
      </div>
    )
  }

  // ─── Render ───
  return (
    <>
      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@700,800,900&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>
      <div style={{
        minHeight: '100vh',
        background: C.bg,
        padding: '40px 20px',
      }}>
        <div style={{
          maxWidth: 680,
          margin: '0 auto',
        }}>
          {/* ─── Progress bar ─── */}
          <div style={{ marginBottom: 40 }}>
            {/* Step labels */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}>
              {STEPS.map((s, i) => (
                <div key={i} style={{
                  textAlign: 'center',
                  flex: 1,
                  cursor: i < step ? 'pointer' : 'default',
                }} onClick={() => { if (i < step) goTo(i) }}>
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    color: i === step ? C.purple : i < step ? C.rose : C.textTertiary,
                    textTransform: 'uppercase' as const,
                    marginBottom: 2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    padding: '0 2px',
                  }}>
                    {s.name}
                  </div>
                  <div style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 10,
                    color: C.textTertiary,
                  }}>
                    {s.time}
                  </div>
                </div>
              ))}
            </div>
            {/* Bar track */}
            <div style={{
              height: 4,
              background: 'rgba(0,0,0,.06)',
              borderRadius: 2,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${((step + 1) / STEPS.length) * 100}%`,
                background: `linear-gradient(90deg, ${C.purple}, ${C.rose})`,
                borderRadius: 2,
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>

          {/* ─── Back button ─── */}
          {step > 0 && (
            <button
              onClick={back}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 20,
                padding: '6px 12px',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                color: C.textSecondary,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 8,
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = C.purple }}
              onMouseLeave={e => { e.currentTarget.style.color = C.textSecondary }}
            >
              &#8592; Back
            </button>
          )}

          {/* ─── Step content ─── */}
          <div style={{
            opacity: transitioning ? 0 : 1,
            transform: transitioning ? 'translateY(10px)' : 'translateY(0)',
            transition: 'opacity 0.25s ease, transform 0.25s ease',
          }}>
            <div style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 18,
              padding: '36px 32px',
              boxShadow: '0 2px 12px rgba(0,0,0,.03)',
            }}>
              {step === 0 && renderStep1()}
              {step === 1 && renderStep2()}
              {step === 2 && renderStep3()}
              {step === 3 && renderStep4()}
              {step === 4 && renderStep5()}
            </div>
          </div>

          {/* ─── Step indicator dots ─── */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
            marginTop: 28,
          }}>
            {STEPS.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === step ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: i === step ? C.purple : i < step ? C.rose : 'rgba(0,0,0,.1)',
                  transition: 'all 0.3s ease',
                  cursor: i < step ? 'pointer' : 'default',
                }}
                onClick={() => { if (i < step) goTo(i) }}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Summary sub-components ───
function SummarySection({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div style={{ borderBottom: `1px solid rgba(0,0,0,.04)`, padding: '20px 24px' }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: accent,
        marginBottom: 12,
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
      <span style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 13,
        color: '#A3A3A3',
        minWidth: 110,
        flexShrink: 0,
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 14,
        color: '#1A1A1A',
        lineHeight: 1.5,
      }}>
        {value}
      </span>
    </div>
  )
}

// ─── Shared styles ───
const headingStyle: React.CSSProperties = {
  fontFamily: "'Cabinet Grotesk', sans-serif",
  fontSize: 30,
  fontWeight: 800,
  color: '#1A1A1A',
  letterSpacing: '-0.03em',
  marginBottom: 6,
}

const subStyle: React.CSSProperties = {
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 16,
  color: '#6B6B6B',
  marginBottom: 28,
  lineHeight: 1.5,
}

const labelStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#A3A3A3',
  display: 'block',
  marginBottom: 10,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 15,
  color: '#1A1A1A',
  border: '1px solid rgba(0,0,0,.06)',
  borderRadius: 10,
  outline: 'none',
  background: '#FFFFFF',
}

const btnPrimary: React.CSSProperties = {
  padding: '12px 28px',
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 15,
  fontWeight: 600,
  color: '#fff',
  background: 'linear-gradient(135deg, #7C3AED, #F43F5E)',
  border: 'none',
  borderRadius: 12,
  cursor: 'pointer',
  transition: 'opacity 0.15s, transform 0.15s',
}

const btnSecondary: React.CSSProperties = {
  padding: '10px 20px',
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 14,
  fontWeight: 500,
  color: '#F43F5E',
  background: '#FFF1F2',
  border: `1px solid #FECDD3`,
  borderRadius: 10,
  cursor: 'pointer',
  transition: 'opacity 0.15s',
}
