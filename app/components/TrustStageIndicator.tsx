'use client';

import React, { useState, useEffect, useRef } from 'react';

interface TrustStageIndicatorProps {
  currentStage: number;
  approvedCount: number;
  draftApprovedCount: number;
  replyRate: number;
  compact?: boolean;
}

const STAGES = [
  { number: 1, label: 'Observe', icon: '\u{1F440}', description: 'Jamie watches and learns' },
  { number: 2, label: 'Draft', icon: '\u{270D}\u{FE0F}', description: 'Jamie drafts for your review' },
  { number: 3, label: 'Send', icon: '\u{1F4E4}', description: 'Jamie sends with approval' },
  { number: 4, label: 'Converse', icon: '\u{1F4AC}', description: 'Jamie handles replies' },
  { number: 5, label: 'Autopilot', icon: '\u{1F680}', description: 'Jamie runs fully autonomous' },
];

function getProgressToNext(
  currentStage: number,
  approvedCount: number,
  draftApprovedCount: number,
  replyRate: number
): { progress: number; label: string } {
  switch (currentStage) {
    case 1:
      return {
        progress: Math.min((approvedCount / 10) * 100, 100),
        label: `${approvedCount}/10 approved to unlock Draft`,
      };
    case 2:
      return {
        progress: Math.min((draftApprovedCount / 20) * 100, 100),
        label: `${draftApprovedCount}/20 drafts approved to unlock Send`,
      };
    case 3:
      return {
        progress: Math.min((replyRate / 50) * 100, 100),
        label: `${replyRate}%/50% reply rate to unlock Converse`,
      };
    case 4:
      return {
        progress: 0,
        label: 'Autopilot requires manual activation',
      };
    case 5:
      return {
        progress: 100,
        label: 'Full autopilot enabled',
      };
    default:
      return { progress: 0, label: '' };
  }
}

export default function TrustStageIndicator({
  currentStage,
  approvedCount,
  draftApprovedCount,
  replyRate,
  compact = false,
}: TrustStageIndicatorProps) {
  const [justUnlocked, setJustUnlocked] = useState<number | null>(null);
  const prevStageRef = useRef(currentStage);

  useEffect(() => {
    if (currentStage > prevStageRef.current) {
      setJustUnlocked(currentStage);
      const timer = setTimeout(() => setJustUnlocked(null), 3000);
      return () => clearTimeout(timer);
    }
    prevStageRef.current = currentStage;
  }, [currentStage]);

  const { progress, label } = getProgressToNext(
    currentStage,
    approvedCount,
    draftApprovedCount,
    replyRate
  );

  const currentStageData = STAGES[currentStage - 1];

  if (compact) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 12px',
          borderRadius: 20,
          background: currentStage >= 5 ? 'linear-gradient(135deg, #7C3AED, #F43F5E)' : '#F3F0FF',
          color: currentStage >= 5 ? '#fff' : '#7C3AED',
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <span>{currentStageData.icon}</span>
        <span>{currentStageData.label}</span>
      </span>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <style>{`
        @keyframes confettiBurst {
          0% { transform: scale(0) rotate(0deg); opacity: 1; }
          50% { transform: scale(1.2) rotate(180deg); opacity: 0.8; }
          100% { transform: scale(0) rotate(360deg); opacity: 0; }
        }
        @keyframes stageGlow {
          0% { box-shadow: 0 0 0 0 rgba(124, 58, 237, 0.6); transform: scale(1); }
          50% { box-shadow: 0 0 20px 8px rgba(124, 58, 237, 0.3); transform: scale(1.3); }
          100% { box-shadow: 0 0 0 0 rgba(124, 58, 237, 0); transform: scale(1); }
        }
        @keyframes bannerFade {
          0% { opacity: 0; transform: translateY(8px); }
          15% { opacity: 1; transform: translateY(0); }
          85% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-8px); }
        }
        @keyframes confettiPiece {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) rotate(var(--tr)); opacity: 0; }
        }
      `}</style>

      {/* Unlock Banner */}
      {justUnlocked !== null && (
        <div
          style={{
            position: 'absolute',
            top: -40,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, #7C3AED, #F43F5E)',
            color: '#fff',
            padding: '6px 20px',
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 700,
            fontFamily: "'DM Sans', sans-serif",
            animation: 'bannerFade 3s ease forwards',
            whiteSpace: 'nowrap',
            zIndex: 10,
          }}
        >
          Stage Unlocked! {STAGES[justUnlocked - 1]?.icon} {STAGES[justUnlocked - 1]?.label}
        </div>
      )}

      {/* Confetti particles */}
      {justUnlocked !== null && (
        <div style={{ position: 'absolute', top: 0, left: '50%', pointerEvents: 'none', zIndex: 9 }}>
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * 360;
            const distance = 40 + Math.random() * 30;
            const tx = Math.cos((angle * Math.PI) / 180) * distance;
            const ty = Math.sin((angle * Math.PI) / 180) * distance;
            const colors = ['#7C3AED', '#F43F5E', '#FBBF24', '#34D399', '#60A5FA', '#F472B6'];
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  width: 6,
                  height: 6,
                  borderRadius: i % 2 === 0 ? '50%' : 1,
                  background: colors[i % colors.length],
                  // @ts-expect-error CSS custom properties
                  '--tx': `${tx}px`,
                  '--ty': `${ty}px`,
                  '--tr': `${Math.random() * 720}deg`,
                  animation: `confettiPiece 1s ease-out forwards`,
                  animationDelay: `${i * 0.05}s`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* Stage Dots + Progress Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, position: 'relative', marginBottom: 16 }}>
        {STAGES.map((stage, idx) => {
          const isCompleted = stage.number < currentStage;
          const isCurrent = stage.number === currentStage;
          const isFuture = stage.number > currentStage;
          const isUnlocking = stage.number === justUnlocked;

          return (
            <React.Fragment key={stage.number}>
              {/* Connector bar */}
              {idx > 0 && (
                <div
                  style={{
                    flex: 1,
                    height: 3,
                    background: isCompleted || isCurrent ? '#7C3AED' : '#E5E5E5',
                    transition: 'background 0.5s ease',
                  }}
                />
              )}
              {/* Stage dot */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                <div
                  style={{
                    width: isCurrent ? 44 : 36,
                    height: isCurrent ? 44 : 36,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: isCurrent ? 20 : 16,
                    background: isCompleted
                      ? '#7C3AED'
                      : isCurrent
                      ? '#F43F5E'
                      : '#F0F0F0',
                    color: isCompleted || isCurrent ? '#fff' : '#A0A0A0',
                    border: isCurrent ? '3px solid rgba(244, 63, 94, 0.3)' : 'none',
                    transition: 'all 0.4s ease',
                    cursor: 'default',
                    animation: isUnlocking ? 'stageGlow 1s ease' : 'none',
                    boxShadow: isCurrent ? '0 0 12px rgba(244, 63, 94, 0.25)' : 'none',
                  }}
                  title={`${stage.label}: ${stage.description}`}
                >
                  {stage.icon}
                </div>
                <span
                  style={{
                    marginTop: 6,
                    fontSize: 11,
                    fontWeight: isCurrent ? 700 : 500,
                    fontFamily: "'DM Sans', sans-serif",
                    color: isCompleted
                      ? '#7C3AED'
                      : isCurrent
                      ? '#F43F5E'
                      : '#A0A0A0',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {stage.label}
                </span>
                {isFuture && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -8,
                      right: -4,
                      fontSize: 9,
                      background: '#E5E5E5',
                      color: '#888',
                      borderRadius: 6,
                      padding: '1px 5px',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 600,
                    }}
                  >
                    {stage.number}
                  </span>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Progress to next stage */}
      {currentStage < 5 && (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 6,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                fontFamily: "'DM Sans', sans-serif",
                color: '#6B6B6B',
              }}
            >
              {label}
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
                color: '#7C3AED',
              }}
            >
              {Math.round(progress)}%
            </span>
          </div>
          <div
            style={{
              height: 6,
              borderRadius: 3,
              background: '#F0F0F0',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                borderRadius: 3,
                background: 'linear-gradient(90deg, #7C3AED, #F43F5E)',
                width: `${progress}%`,
                transition: 'width 0.6s ease',
              }}
            />
          </div>
        </div>
      )}

      {currentStage === 5 && (
        <div
          style={{
            textAlign: 'center',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "'DM Sans', sans-serif",
            color: '#7C3AED',
            padding: '4px 0',
          }}
        >
          Jamie is running on full autopilot
        </div>
      )}
    </div>
  );
}
