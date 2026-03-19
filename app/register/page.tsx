'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function AuthPage() {
  const [mode, setMode] = useState<'register' | 'login'>('register')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) return
    setLoading(true)
    setError(null)

    const supabase = createClient()

    if (mode === 'register') {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      if (mode === 'register') {
        setError('Account created! Check your email to confirm, then log in.')
      } else {
        setError(signInError.message)
      }
      setLoading(false)
      return
    }

    window.location.href = '/dashboard'
  }

  return (
    <>
      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@700,800,900&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=General+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F8F7F4; }
        .hd { font-family: 'Cabinet Grotesk', -apple-system, sans-serif; }
        .bd { font-family: 'General Sans', -apple-system, sans-serif; }
        @keyframes rise { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        .r { animation: rise .6s cubic-bezier(.22,1,.36,1) both; }
        .r1 { animation-delay: .08s; }
        input:focus { border-color: #7C3AED !important; box-shadow: 0 0 0 3px rgba(124,58,237,.1) !important; outline: none; }
        .btn-go { transition: all .2s; }
        .btn-go:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(124,58,237,.3); }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#F8F7F4', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,.06) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,.04) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />

        <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }}>
          {/* Logo */}
          <div className="r" style={{ textAlign: 'center', marginBottom: '32px' }}>
            <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', textDecoration: 'none', color: '#1A1A1A' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'linear-gradient(135deg,#7C3AED,#EC4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '16px', fontWeight: 800 }}>J</div>
              <span className="hd" style={{ fontSize: '19px', fontWeight: 800, letterSpacing: '-.03em' }}>
                jamie<span style={{ color: '#C4B5FD', fontWeight: 500 }}>@</span>work
              </span>
            </Link>
          </div>

          {/* Card */}
          <div className="r r1" style={{
            padding: '36px', borderRadius: '20px', background: 'white',
            border: '1px solid rgba(0,0,0,.06)',
            boxShadow: '0 4px 24px rgba(0,0,0,.04)',
          }}>
            {/* Toggle */}
            <div style={{
              display: 'flex', padding: '4px', borderRadius: '12px',
              background: '#F3F0FF', marginBottom: '28px',
            }}>
              <button onClick={() => { setMode('register'); setError(null) }} className="bd"
                style={{
                  flex: 1, padding: '10px', borderRadius: '9px', border: 'none',
                  background: mode === 'register' ? '#7C3AED' : 'transparent',
                  color: mode === 'register' ? 'white' : '#6B6B6B',
                  fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                  transition: 'all .2s',
                }}>
                Create Account
              </button>
              <button onClick={() => { setMode('login'); setError(null) }} className="bd"
                style={{
                  flex: 1, padding: '10px', borderRadius: '9px', border: 'none',
                  background: mode === 'login' ? '#7C3AED' : 'transparent',
                  color: mode === 'login' ? 'white' : '#6B6B6B',
                  fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                  transition: 'all .2s',
                }}>
                Log In
              </button>
            </div>

            <h1 className="hd" style={{ fontSize: '26px', fontWeight: 900, letterSpacing: '-.04em', marginBottom: '6px', color: '#1A1A1A' }}>
              {mode === 'register' ? 'Hire your AI SDR' : 'Welcome back'}
            </h1>
            <p className="bd" style={{ fontSize: '14px', color: '#6B6B6B', marginBottom: '24px', fontWeight: 500, lineHeight: 1.5 }}>
              {mode === 'register'
                ? 'Create your account — Jamie will be ready in under 10 minutes.'
                : 'Log in to manage Jamie and your pipeline.'}
            </p>

            {error && (
              <div className="bd" style={{
                padding: '10px 14px', borderRadius: '10px', marginBottom: '20px',
                background: error.includes('Check your email') ? '#F3F0FF' : '#FEF2F2',
                border: error.includes('Check your email') ? '1px solid #E9E5FF' : '1px solid #FECACA',
                fontSize: '13px',
                color: error.includes('Check your email') ? '#7C3AED' : '#DC2626',
                fontWeight: 500,
              }}>{error}</div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {mode === 'register' && (
                <div>
                  <label className="bd" style={{ fontSize: '13px', fontWeight: 600, color: '#3D3D3D', display: 'block', marginBottom: '5px' }}>Your name</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="Jane Smith" autoFocus autoComplete="off" className="bd"
                    style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid rgba(0,0,0,.1)', background: '#F8F7F4', color: '#1A1A1A', fontSize: '14px', fontWeight: 500, outline: 'none', transition: 'all .2s' }} />
                </div>
              )}

              <div>
                <label className="bd" style={{ fontSize: '13px', fontWeight: 600, color: '#3D3D3D', display: 'block', marginBottom: '5px' }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com" autoComplete="off" autoFocus={mode === 'login'} className="bd"
                  style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid rgba(0,0,0,.1)', background: '#F8F7F4', color: '#1A1A1A', fontSize: '14px', fontWeight: 500, outline: 'none', transition: 'all .2s' }} />
              </div>

              <div>
                <label className="bd" style={{ fontSize: '13px', fontWeight: 600, color: '#3D3D3D', display: 'block', marginBottom: '5px' }}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'At least 6 characters' : 'Your password'} autoComplete="new-password" className="bd"
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid rgba(0,0,0,.1)', background: '#F8F7F4', color: '#1A1A1A', fontSize: '14px', fontWeight: 500, outline: 'none', transition: 'all .2s' }} />
              </div>

              <button onClick={handleSubmit} disabled={loading || !email.trim() || !password.trim()}
                className="bd btn-go"
                style={{
                  width: '100%', padding: '13px', borderRadius: '12px', border: 'none',
                  background: loading ? '#E5E5E5' : '#7C3AED',
                  color: loading ? '#6B6B6B' : 'white',
                  fontSize: '15px', fontWeight: 700,
                  cursor: loading ? 'default' : 'pointer',
                  boxShadow: loading ? 'none' : '0 3px 12px rgba(124,58,237,.25)',
                  marginTop: '4px',
                }}>
                {loading
                  ? (mode === 'register' ? 'Creating account...' : 'Logging in...')
                  : (mode === 'register' ? 'Get Started →' : 'Log In →')}
              </button>
            </div>
          </div>

          <p className="bd" style={{ textAlign: 'center', marginTop: '16px', fontSize: '12px' }}>
            <Link href="/" style={{ color: '#A3A3A3', textDecoration: 'none', fontWeight: 500 }}>← Back to home</Link>
          </p>
        </div>
      </div>
    </>
  )
}
