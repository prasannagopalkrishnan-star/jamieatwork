'use client';

import React, { useState } from 'react';
import TrustStageIndicator from '../components/TrustStageIndicator';

const DEMO_ACTIVITY_LOG = [
  { id: 1, timestamp: '2026-03-19 14:32', action: 'Found prospect: Sarah Chen, VP Engineering at Dataflow', stage: 2, category: 'prospect' },
  { id: 2, timestamp: '2026-03-19 14:28', action: 'Draft created for outreach to Mike Torres at ScaleUp', stage: 2, category: 'draft' },
  { id: 3, timestamp: '2026-03-19 13:55', action: 'Message sent to Lisa Park at CloudNative (approved)', stage: 2, category: 'sent' },
  { id: 4, timestamp: '2026-03-19 13:40', action: 'Reply handled from James Wright at DevStack', stage: 2, category: 'reply' },
  { id: 5, timestamp: '2026-03-19 12:15', action: 'Meeting booked: Demo with Priya Sharma, CTO at FinFlow', stage: 2, category: 'meeting' },
  { id: 6, timestamp: '2026-03-19 11:50', action: 'Found prospect: Alex Rivera, Head of Growth at MarketPulse', stage: 2, category: 'prospect' },
  { id: 7, timestamp: '2026-03-19 11:22', action: 'Draft created for follow-up to Rachel Kim at BuildFast', stage: 2, category: 'draft' },
  { id: 8, timestamp: '2026-03-19 10:45', action: 'Message sent to David Chen at InfraCore (approved)', stage: 2, category: 'sent' },
  { id: 9, timestamp: '2026-03-19 09:30', action: 'Found prospect: Emma Watson, Director of Ops at LogiTech', stage: 2, category: 'prospect' },
  { id: 10, timestamp: '2026-03-18 16:42', action: 'Reply handled from Tom Bradley at SyncWorks', stage: 2, category: 'reply' },
  { id: 11, timestamp: '2026-03-18 15:18', action: 'Meeting booked: Intro call with Nina Patel at RevOps', stage: 2, category: 'meeting' },
  { id: 12, timestamp: '2026-03-18 14:55', action: 'Draft created for cold outreach to Ben Miller at AeroData', stage: 2, category: 'draft' },
  { id: 13, timestamp: '2026-03-18 13:30', action: 'Found prospect: Carla Ruiz, VP Sales at PipelineHQ', stage: 2, category: 'prospect' },
  { id: 14, timestamp: '2026-03-18 12:10', action: 'Message sent to Yuki Tanaka at CloudBridge (approved)', stage: 2, category: 'sent' },
  { id: 15, timestamp: '2026-03-18 11:00', action: 'Reply handled from Olivia Foster at NextStep AI', stage: 2, category: 'reply' },
  { id: 16, timestamp: '2026-03-18 10:20', action: 'Found prospect: Marcus Johnson, CEO at LaunchPad', stage: 2, category: 'prospect' },
  { id: 17, timestamp: '2026-03-18 09:15', action: 'Draft created for outreach to Anika Gupta at GrowthLoop', stage: 2, category: 'draft' },
  { id: 18, timestamp: '2026-03-17 17:05', action: 'Meeting booked: Strategy call with Kevin Lee at Amplify', stage: 2, category: 'meeting' },
];

const CATEGORY_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  prospect: { icon: '\u{1F50D}', label: 'Prospect Found', color: '#7C3AED' },
  draft: { icon: '\u{270D}\u{FE0F}', label: 'Draft Created', color: '#F59E0B' },
  sent: { icon: '\u{1F4E4}', label: 'Message Sent', color: '#3B82F6' },
  reply: { icon: '\u{1F4AC}', label: 'Reply Handled', color: '#10B981' },
  meeting: { icon: '\u{1F4C5}', label: 'Meeting Booked', color: '#F43F5E' },
};

export default function SettingsPage() {
  const [trustStage, setTrustStage] = useState(2);
  const [autopilotEnabled, setAutopilotEnabled] = useState(false);
  const [showLowerWarning, setShowLowerWarning] = useState(false);
  const [emailEachAction, setEmailEachAction] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(false);

  // Demo metrics
  const approvedCount = 14;
  const draftApprovedCount = 8;
  const replyRate = 32;

  const handleStageChange = (newStage: number) => {
    if (newStage < trustStage) {
      setShowLowerWarning(true);
      setTimeout(() => setShowLowerWarning(false), 4000);
    }
    setTrustStage(newStage);
    if (newStage < 5) setAutopilotEnabled(false);
  };

  return (
    <>
      {/* Fonts loaded via layout.tsx */}

      <div style={{ minHeight: '100vh', background: '#F8F7F4', fontFamily: "'DM Sans', sans-serif" }}>
        {/* Nav */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 32px',
            borderBottom: '1px solid rgba(0,0,0,.06)',
            background: '#fff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #7C3AED, #F43F5E)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 800,
                fontSize: 16,
                fontFamily: "'Cabinet Grotesk', sans-serif",
              }}
            >
              J
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace",
                color: '#7C3AED',
                background: '#F3F0FF',
                padding: '3px 10px',
                borderRadius: 6,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              Settings
            </span>
          </div>
          <a
            href="/dashboard"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#7C3AED',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={{ fontSize: 16 }}>&larr;</span> Back to Dashboard
          </a>
        </nav>

        <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
          {/* Page Title */}
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              fontFamily: "'Cabinet Grotesk', sans-serif",
              color: '#1A1A1A',
              marginBottom: 8,
              letterSpacing: '-0.02em',
            }}
          >
            Trust & Settings
          </h1>
          <p style={{ fontSize: 14, color: '#6B6B6B', marginBottom: 32 }}>
            Control how much autonomy Jamie has and manage your notification preferences.
          </p>

          {/* Trust Settings Card */}
          <div
            style={{
              background: '#fff',
              border: '1px solid rgba(0,0,0,.06)',
              borderRadius: 16,
              padding: 28,
              marginBottom: 24,
            }}
          >
            <h2
              style={{
                fontSize: 18,
                fontWeight: 800,
                fontFamily: "'Cabinet Grotesk', sans-serif",
                color: '#1A1A1A',
                marginBottom: 4,
              }}
            >
              Trust Stage
            </h2>
            <p style={{ fontSize: 13, color: '#6B6B6B', marginBottom: 24 }}>
              Jamie earns more autonomy as trust builds. Each stage unlocks new capabilities.
            </p>

            <TrustStageIndicator
              currentStage={trustStage}
              approvedCount={approvedCount}
              draftApprovedCount={draftApprovedCount}
              replyRate={replyRate}
            />

            <div style={{ marginTop: 28, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              {/* Manual Override */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#6B6B6B',
                    marginBottom: 6,
                    fontFamily: "'JetBrains Mono', monospace",
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Manual Override
                </label>
                <select
                  value={trustStage}
                  onChange={(e) => handleStageChange(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid rgba(0,0,0,.1)',
                    background: '#FAFAFA',
                    fontSize: 14,
                    fontWeight: 500,
                    fontFamily: "'DM Sans', sans-serif",
                    color: '#1A1A1A',
                    cursor: 'pointer',
                    outline: 'none',
                    appearance: 'auto' as React.CSSProperties['appearance'],
                  }}
                >
                  <option value={1}>Stage 1 &mdash; Observe</option>
                  <option value={2}>Stage 2 &mdash; Draft</option>
                  <option value={3}>Stage 3 &mdash; Send</option>
                  <option value={4}>Stage 4 &mdash; Converse</option>
                  <option value={5}>Stage 5 &mdash; Autopilot</option>
                </select>
              </div>

              {/* Autopilot Toggle */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#6B6B6B',
                    marginBottom: 6,
                    fontFamily: "'JetBrains Mono', monospace",
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Full Autopilot
                </label>
                <button
                  onClick={() => {
                    if (trustStage === 5) setAutopilotEnabled(!autopilotEnabled);
                  }}
                  disabled={trustStage !== 5}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid rgba(0,0,0,.1)',
                    background: autopilotEnabled
                      ? 'linear-gradient(135deg, #7C3AED, #F43F5E)'
                      : '#FAFAFA',
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: "'DM Sans', sans-serif",
                    color: autopilotEnabled ? '#fff' : trustStage === 5 ? '#1A1A1A' : '#A0A0A0',
                    cursor: trustStage === 5 ? 'pointer' : 'not-allowed',
                    opacity: trustStage === 5 ? 1 : 0.5,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {autopilotEnabled ? 'Autopilot ON' : 'Enable Autopilot'}
                </button>
              </div>
            </div>

            {/* Lower Warning */}
            {showLowerWarning && (
              <div
                style={{
                  marginTop: 16,
                  padding: '10px 16px',
                  borderRadius: 10,
                  background: '#FEF3C7',
                  border: '1px solid #F59E0B',
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#92400E',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 16 }}>{'\u{26A0}\u{FE0F}'}</span>
                Lowering the trust stage will restrict Jamie&apos;s current capabilities. Actions already in progress will complete, but new actions will require your approval.
              </div>
            )}
          </div>

          {/* Activity Log Card */}
          <div
            style={{
              background: '#fff',
              border: '1px solid rgba(0,0,0,.06)',
              borderRadius: 16,
              padding: 28,
              marginBottom: 24,
            }}
          >
            <h2
              style={{
                fontSize: 18,
                fontWeight: 800,
                fontFamily: "'Cabinet Grotesk', sans-serif",
                color: '#1A1A1A',
                marginBottom: 4,
              }}
            >
              Activity Log
            </h2>
            <p style={{ fontSize: 13, color: '#6B6B6B', marginBottom: 20 }}>
              Jamie&apos;s recent actions across all categories.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {DEMO_ACTIVITY_LOG.map((entry, idx) => {
                const cat = CATEGORY_CONFIG[entry.category];
                return (
                  <div
                    key={entry.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 0',
                      borderBottom:
                        idx < DEMO_ACTIVITY_LOG.length - 1 ? '1px solid rgba(0,0,0,.04)' : 'none',
                    }}
                  >
                    {/* Category Icon */}
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 9,
                        background: `${cat.color}12`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 15,
                        flexShrink: 0,
                      }}
                    >
                      {cat.icon}
                    </div>

                    {/* Action */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: '#1A1A1A',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {entry.action}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: '#A0A0A0',
                          fontFamily: "'JetBrains Mono', monospace",
                          marginTop: 2,
                        }}
                      >
                        {entry.timestamp}
                      </div>
                    </div>

                    {/* Category Label */}
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: cat.color,
                        background: `${cat.color}10`,
                        padding: '3px 8px',
                        borderRadius: 6,
                        whiteSpace: 'nowrap',
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {cat.label}
                    </span>

                    {/* Stage Badge */}
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: '#7C3AED',
                        background: '#F3F0FF',
                        padding: '2px 7px',
                        borderRadius: 5,
                        fontFamily: "'JetBrains Mono', monospace",
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      S{entry.stage}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notification Preferences Card */}
          <div
            style={{
              background: '#fff',
              border: '1px solid rgba(0,0,0,.06)',
              borderRadius: 16,
              padding: 28,
              marginBottom: 48,
            }}
          >
            <h2
              style={{
                fontSize: 18,
                fontWeight: 800,
                fontFamily: "'Cabinet Grotesk', sans-serif",
                color: '#1A1A1A',
                marginBottom: 4,
              }}
            >
              Notification Preferences
            </h2>
            <p style={{ fontSize: 13, color: '#6B6B6B', marginBottom: 20 }}>
              Choose how and when Jamie keeps you in the loop.
            </p>

            {[
              {
                label: 'Email me for each action',
                description: 'Get notified every time Jamie takes an action',
                value: emailEachAction,
                setter: setEmailEachAction,
              },
              {
                label: 'Daily digest',
                description: 'Receive a summary of all actions once per day',
                value: dailyDigest,
                setter: setDailyDigest,
              },
              {
                label: 'Weekly summary only',
                description: 'Just the highlights, sent every Monday morning',
                value: weeklySummary,
                setter: setWeeklySummary,
              },
            ].map((pref, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 0',
                  borderBottom: idx < 2 ? '1px solid rgba(0,0,0,.04)' : 'none',
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>{pref.label}</div>
                  <div style={{ fontSize: 12, color: '#6B6B6B', marginTop: 2 }}>{pref.description}</div>
                </div>
                <button
                  onClick={() => pref.setter(!pref.value)}
                  style={{
                    width: 48,
                    height: 26,
                    borderRadius: 13,
                    border: 'none',
                    background: pref.value
                      ? 'linear-gradient(135deg, #7C3AED, #F43F5E)'
                      : '#E0E0E0',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease',
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: '#fff',
                      position: 'absolute',
                      top: 3,
                      left: pref.value ? 25 : 3,
                      transition: 'left 0.2s ease',
                      boxShadow: '0 1px 3px rgba(0,0,0,.15)',
                    }}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
