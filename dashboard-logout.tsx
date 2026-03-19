'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DashboardPage() {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8F7F4', color: '#1A1A1A' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, padding: '14px 24px', background: 'rgba(248,247,244,.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(0,0,0,.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '9px', textDecoration: 'none', color: '#1A1A1A' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg,#7C3AED,#EC4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '13px', fontWeight: 800 }}>J</div>
            <span style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: '16px', fontWeight: 900, letterSpacing: '-.03em' }}>jamie<span style={{ color: '#C4B5FD', fontWeight: 500 }}>@</span>work</span>
          </Link>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#6B6B6B', padding: '3px 10px', borderRadius: '6px', border: '1px solid rgba(0,0,0,.08)', background: 'white', letterSpacing: '.06em', fontWeight: 600 }}>DASHBOARD</span>
        </div>
        <button onClick={handleLogout} style={{
          fontFamily: "'General Sans', sans-serif", fontSize: '13px', padding: '8px 16px',
          borderRadius: '10px', border: '1.5px solid rgba(0,0,0,.1)', background: 'white',
          color: '#6B6B6B', fontWeight: 600, cursor: 'pointer',
        }}>Log out</button>
      </nav>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤖</div>
        <h1 style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: '32px', fontWeight: 900, letterSpacing: '-.04em', marginBottom: '8px' }}>Jamie is ready</h1>
        <p style={{ fontFamily: "'General Sans', sans-serif", fontSize: '16px', color: '#6B6B6B', fontWeight: 500, marginBottom: '32px' }}>Complete onboarding to train Jamie on your product and start generating pipeline.</p>
        <Link href="/onboarding" style={{ fontFamily: "'General Sans', sans-serif", display: 'inline-block', padding: '14px 32px', borderRadius: '14px', background: '#7C3AED', color: 'white', fontSize: '16px', fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 16px rgba(124,58,237,.25)' }}>Start Onboarding →</Link>
      </div>
    </div>
  )
}
