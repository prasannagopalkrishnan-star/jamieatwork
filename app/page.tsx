import Link from 'next/link'

const CAPABILITIES = [
  { icon: '\u{1F3AF}', title: 'Inbound Chat', desc: 'Engages visitors the moment they land, qualifies them, and books meetings.' },
  { icon: '\u{2709}\u{FE0F}', title: 'Outbound Email', desc: 'Personalized cold outreach based on your ICP. Zero generic templates.' },
  { icon: '\u{1F50D}', title: 'Lead Qualification', desc: 'Scores every lead against your framework. Bad fits get filtered out.' },
  { icon: '\u{1F4C5}', title: 'Meeting Booking', desc: 'Qualified leads go straight to your calendar. No scheduling ping-pong.' },
  { icon: '\u{1F504}', title: 'Follow-ups', desc: 'Persistent, natural follow-ups until they respond or opt out.' },
  { icon: '\u{1F4CA}', title: 'Pipeline Dashboard', desc: 'Every lead, conversation, and meeting — one view.' },
]

const STEPS = [
  { n: '1', title: 'Drop your website', desc: 'Jamie scans your site and pre-fills product, ICP, and differentiators. You just review.', time: '2 min' },
  { n: '2', title: 'Pick her personality', desc: 'Choose Jamie\'s tone, your CTA, and target market with visual cards. No forms.', time: '3 min' },
  { n: '3', title: 'Answer 3 questions', desc: 'Jamie asks about objections, qualification, and special context. That\'s it.', time: '5 min' },
]

export default function Home() {
  return (
    <>
      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@700,800,900&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: #F8F7F4; -webkit-font-smoothing: antialiased; }

        .hd { font-family: 'Cabinet Grotesk', -apple-system, sans-serif; }
        .bd { font-family: 'DM Sans', -apple-system, sans-serif; }
        .mn { font-family: 'JetBrains Mono', monospace; }

        @keyframes rise {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes glow {
          0%, 100% { opacity: .7; }
          50% { opacity: 1; }
        }
        @keyframes drift {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(12px, -8px); }
          50% { transform: translate(-6px, 12px); }
          75% { transform: translate(8px, 6px); }
        }
        .r { animation: rise .7s cubic-bezier(.22,1,.36,1) both; }
        .r1 { animation-delay: .05s; }
        .r2 { animation-delay: .12s; }
        .r3 { animation-delay: .19s; }
        .r4 { animation-delay: .26s; }
        .r5 { animation-delay: .33s; }

        .card-lift { transition: transform .25s cubic-bezier(.22,1,.36,1), box-shadow .25s ease; }
        .card-lift:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(124,58,237,.1), 0 2px 6px rgba(0,0,0,.04); }

        .cta-primary { transition: all .2s; }
        .cta-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(124,58,237,.3); }
        .cta-ghost { transition: all .2s; }
        .cta-ghost:hover { border-color: #7C3AED; color: #7C3AED; }

        @media (max-width: 700px) {
          .grid-3 { grid-template-columns: 1fr !important; }
          .hero-headline { font-size: 40px !important; }
          .hero-ctas { flex-direction: column !important; align-items: center !important; }
          .section-inner { padding: 48px 20px !important; }
        }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#F8F7F4', color: '#1A1A1A', position: 'relative', overflow: 'hidden' }}>

        {/* -- BACKGROUND BLOBS -- */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          <div style={{ position: 'absolute', top: '-15%', right: '10%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,.07) 0%, transparent 70%)', filter: 'blur(40px)', animation: 'drift 20s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', bottom: '5%', left: '-5%', width: '450px', height: '450px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(244,63,94,.06) 0%, transparent 70%)', filter: 'blur(50px)', animation: 'drift 25s ease-in-out infinite reverse' }} />
          <div style={{ position: 'absolute', top: '35%', left: '50%', width: '350px', height: '350px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,.04) 0%, transparent 70%)', filter: 'blur(40px)', animation: 'drift 18s ease-in-out infinite' }} />
        </div>

        {/* -- NAV -- */}
        <nav style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          padding: '14px 0',
          background: 'rgba(248,247,244,.85)',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(0,0,0,.06)',
        }}>
          <div style={{ maxWidth: '1060px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '9px', textDecoration: 'none', color: '#1A1A1A' }}>
              <div style={{
                width: '30px', height: '30px', borderRadius: '9px',
                background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: '14px', fontWeight: 800,
                fontFamily: "'Cabinet Grotesk', sans-serif",
              }}>J</div>
              <span className="hd" style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '-.03em' }}>
                jamie<span style={{ color: '#FDA4AF', fontWeight: 500 }}>@</span>work
              </span>
            </Link>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Link href="/dashboard" className="bd cta-ghost" style={{
                fontSize: '13px', padding: '8px 16px', borderRadius: '10px',
                border: '1.5px solid rgba(0,0,0,.1)', background: 'white', color: '#1A1A1A',
                textDecoration: 'none', fontWeight: 600,
              }}>Dashboard</Link>
              <Link href="/register" className="bd cta-primary" style={{
                fontSize: '13px', padding: '8px 18px', borderRadius: '10px',
                background: '#7C3AED', color: 'white',
                textDecoration: 'none', fontWeight: 700, border: 'none',
                boxShadow: '0 2px 8px rgba(124,58,237,.2)',
              }}>Hire Jamie &rarr;</Link>
            </div>
          </div>
        </nav>

        {/* ============================
            FOLD 1 -- HERO
           ============================ */}
        <section style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', zIndex: 1, padding: '0 24px',
        }}>
          <div style={{ maxWidth: '720px', textAlign: 'center' }}>
            {/* Badge */}
            <div className="r bd" style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '6px 16px', borderRadius: '100px',
              background: 'white', border: '1px solid rgba(124,58,237,.15)',
              boxShadow: '0 1px 4px rgba(124,58,237,.06)',
              fontSize: '13px', color: '#7C3AED', fontWeight: 600,
              marginBottom: '28px',
            }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#7C3AED', animation: 'glow 2s infinite' }} />
              Your AI Sales Development Rep
            </div>

            {/* Headline */}
            <h1 className="r r1 hd hero-headline" style={{
              fontSize: 'clamp(44px, 7vw, 70px)',
              fontWeight: 900, lineHeight: 1.0,
              letterSpacing: '-.05em',
              marginBottom: '20px',
            }}>
              Your SDR.{' '}
              <br />
              <span style={{
                background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>Trained in 10 minutes.</span>
            </h1>

            {/* Subheadline */}
            <p className="r r2 bd" style={{
              fontSize: '18px', color: '#6B6B6B', lineHeight: 1.6,
              maxWidth: '520px', margin: '0 auto 36px', fontWeight: 500,
            }}>
              Jamie learns your product, pitch, and ICP — then qualifies leads, sends outreach, and books meetings on your calendar. Around the clock.
            </p>

            {/* CTAs */}
            <div className="r r3 hero-ctas" style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '20px' }}>
              <Link href="/register" className="bd cta-primary" style={{
                padding: '14px 32px', borderRadius: '14px',
                background: '#7C3AED', color: 'white',
                fontSize: '16px', fontWeight: 700, textDecoration: 'none',
                boxShadow: '0 4px 16px rgba(124,58,237,.25)',
              }}>Hire Jamie — Free to Start &rarr;</Link>
              <a href="#how-it-works" className="bd cta-ghost" style={{
                padding: '14px 24px', borderRadius: '14px',
                background: 'white', border: '1.5px solid rgba(0,0,0,.1)',
                color: '#1A1A1A', fontSize: '16px', fontWeight: 600, textDecoration: 'none',
              }}>How It Works</a>
            </div>

            <p className="r r4 bd" style={{ fontSize: '13px', color: '#A3A3A3', fontWeight: 500 }}>
            </p>
          </div>
        </section>

        {/* ============================
            FOLD 2 -- WHAT JAMIE DOES (rose wash)
           ============================ */}
        <section style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center',
          position: 'relative', zIndex: 1,
          background: 'linear-gradient(180deg, #F8F7F4 0%, #FFF1F2 30%, #FFF1F2 70%, #F8F7F4 100%)',
          borderTop: '1px solid rgba(244,63,94,.1)',
          borderBottom: '1px solid rgba(244,63,94,.1)',
        }}>
          <div className="section-inner" style={{ maxWidth: '1060px', margin: '0 auto', padding: '64px 24px', width: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <div className="mn" style={{ fontSize: '11px', color: '#F43F5E', fontWeight: 600, letterSpacing: '.1em', marginBottom: '10px' }}>CAPABILITIES</div>
              <h2 className="hd" style={{ fontSize: '36px', fontWeight: 900, letterSpacing: '-.04em' }}>What Jamie Does</h2>
              <p className="bd" style={{ fontSize: '15px', color: '#6B6B6B', fontWeight: 500, marginTop: '8px' }}>A full SDR skill set, trained on your specific product.</p>
            </div>

            <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
              {CAPABILITIES.map((cap, i) => (
                <div key={cap.title} className="card-lift" style={{
                  padding: '24px', borderRadius: '16px', background: 'white',
                  border: '1px solid rgba(0,0,0,.06)',
                  boxShadow: '0 1px 3px rgba(0,0,0,.03)',
                  cursor: 'default',
                }}>
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '12px',
                    background: i % 2 === 0 ? 'linear-gradient(135deg, #F3F0FF, #EDE9FE)' : 'linear-gradient(135deg, #FFF1F2, #FFE4E6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '20px', marginBottom: '14px',
                    border: i % 2 === 0 ? '1px solid #E9E5FF' : '1px solid #FECDD3',
                  }}>{cap.icon}</div>
                  <h3 className="hd" style={{ fontSize: '16px', fontWeight: 800, marginBottom: '6px', letterSpacing: '-.02em' }}>{cap.title}</h3>
                  <p className="bd" style={{ fontSize: '13px', color: '#6B6B6B', lineHeight: 1.55, fontWeight: 500 }}>{cap.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================
            FOLD 3 -- HOW IT WORKS
           ============================ */}
        <section id="how-it-works" style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center',
          position: 'relative', zIndex: 1,
        }}>
          <div className="section-inner" style={{ maxWidth: '1060px', margin: '0 auto', padding: '64px 24px', width: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <div className="mn" style={{ fontSize: '11px', color: '#F43F5E', fontWeight: 600, letterSpacing: '.1em', marginBottom: '10px' }}>3 STEPS</div>
              <h2 className="hd" style={{ fontSize: '36px', fontWeight: 900, letterSpacing: '-.04em' }}>
                Ready in{' '}
                <span style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>10 minutes</span>
              </h2>
              <p className="bd" style={{ fontSize: '15px', color: '#6B6B6B', fontWeight: 500, marginTop: '8px' }}>No forms. No meetings. No ramp time.</p>
            </div>

            <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
              {STEPS.map((step, i) => (
                <div key={step.n} style={{
                  padding: '32px 28px', borderRadius: '20px', background: 'white',
                  border: '1px solid rgba(0,0,0,.06)',
                  boxShadow: '0 2px 8px rgba(0,0,0,.03)',
                  position: 'relative', overflow: 'hidden',
                }}>
                  {/* Top accent bar — alternating purple/rose */}
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
                    background: i === 1 ? '#F43F5E' : '#7C3AED',
                  }} />

                  <div className="hd" style={{
                    fontSize: '48px', fontWeight: 900, letterSpacing: '-.04em',
                    background: i === 1
                      ? 'linear-gradient(135deg, #FFE4E6, #FECDD3)'
                      : 'linear-gradient(135deg, #E9E5FF, #DDD6FE)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    lineHeight: 1, marginBottom: '16px',
                  }}>{step.n}</div>

                  <h3 className="hd" style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-.02em', marginBottom: '8px' }}>{step.title}</h3>
                  <p className="bd" style={{ fontSize: '14px', color: '#6B6B6B', lineHeight: 1.6, fontWeight: 500, marginBottom: '16px' }}>{step.desc}</p>

                  <span className="mn" style={{
                    fontSize: '11px', fontWeight: 600,
                    color: i === 1 ? '#F43F5E' : '#7C3AED',
                    padding: '4px 12px', borderRadius: '100px',
                    background: i === 1 ? '#FFF1F2' : '#F3F0FF',
                    border: i === 1 ? '1px solid #FECDD3' : '1px solid #E9E5FF',
                  }}>~{step.time}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================
            FOLD 4 -- CTA
           ============================ */}
        <section style={{
          minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', zIndex: 1,
          background: 'linear-gradient(180deg, #F8F7F4 0%, #F3F0FF 100%)',
          borderTop: '1px solid rgba(124,58,237,.08)',
        }}>
          <div style={{ maxWidth: '540px', padding: '64px 24px', textAlign: 'center' }}>
            <h2 className="hd" style={{ fontSize: '34px', fontWeight: 900, letterSpacing: '-.04em', marginBottom: '14px' }}>
              Stop doing SDR work yourself.
            </h2>
            <p className="bd" style={{ fontSize: '16px', color: '#6B6B6B', lineHeight: 1.6, fontWeight: 500, marginBottom: '32px' }}>
              Hire Jamie, teach her your pitch in 10 minutes, and let her fill your calendar with qualified meetings.
            </p>
            <Link href="/register" className="bd cta-primary" style={{
              display: 'inline-block', padding: '15px 36px', borderRadius: '14px',
              background: '#7C3AED', color: 'white',
              fontSize: '17px', fontWeight: 700, textDecoration: 'none',
              boxShadow: '0 4px 16px rgba(124,58,237,.25)',
            }}>Hire SDR Jamie — It&apos;s Free &rarr;</Link>
            <p className="bd" style={{ marginTop: '16px', fontSize: '13px', color: '#A3A3A3', fontWeight: 500 }}>No credit card required</p>
          </div>
        </section>

        {/* -- FOOTER -- */}
        <footer style={{ padding: '28px 0', borderTop: '1px solid rgba(0,0,0,.06)', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: '1060px', margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="mn" style={{ fontSize: '12px', color: '#A3A3A3' }}>© 2026 jamie@work</span>
            <span className="bd" style={{ fontSize: '12px', color: '#FDA4AF', fontWeight: 500 }}>AI digital employees for startups</span>
          </div>
        </footer>
      </div>
    </>
  )
}
