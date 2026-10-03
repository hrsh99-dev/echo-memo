/**
 * OnboardingModal — shown once to first-time users after login.
 * Dismissed via localStorage flag so it never shows again.
 */

import { useState } from 'react';
import { Mic, Inbox, ListTodo, MessageCircle, ArrowRight, X, Sparkles } from 'lucide-react';

const STEPS = [
  {
    icon: <Mic size={32} color="#4F46E5" />,
    title: 'Capture anything, instantly',
    description:
      'Tap the mic on the Home page to record a voice note — a lecture, a meeting, a random idea. Or type it. EchoMemo saves it and makes it searchable.',
    tip: 'Try saying: "I need to finish the OS assignment by Friday and also buy groceries."',
  },
  {
    icon: <Sparkles size={32} color="#D97706" />,
    title: 'AI turns chaos into clarity',
    description:
      'Open any note and click "Process with AI." EchoMemo reads it, writes a summary, classifies it, and pulls out every action item — all automatically.',
    tip: 'Your Smart Inbox shows all AI-processed notes with extracted tasks ready to accept.',
  },
  {
    icon: <ListTodo size={32} color="#059669" />,
    title: 'Tasks, organised for you',
    description:
      'Accept AI suggestions or create tasks manually. Every task links back to the note it came from so you never lose context.',
    tip: 'Tasks are sorted by priority and due date — high priority items bubble to the top.',
  },
  {
    icon: <MessageCircle size={32} color="#7C3AED" />,
    title: 'Ask your notes anything',
    description:
      'Head to "Ask Echo" and ask a question like "What did I say about the EV project?" — Echo searches your notes and answers with sources cited.',
    tip: 'You can also speak your question using the mic button in the chat bar.',
  },
];

export const ONBOARDING_KEY = 'echomemo_onboarding_done';

interface OnboardingModalProps {
  onClose: () => void;
}

export default function OnboardingModal({ onClose }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      localStorage.setItem(ONBOARDING_KEY, '1');
      onClose();
    } else {
      setStep(s => s + 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem(ONBOARDING_KEY, '1');
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'var(--space-4)',
      backdropFilter: 'blur(4px)',
      animation: 'fadeIn 0.2s ease',
    }}>
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-2xl, 20px)',
        boxShadow: 'var(--shadow-xl)',
        width: '100%',
        maxWidth: '480px',
        overflow: 'hidden',
        animation: 'slideUp 0.25s ease',
      }}>
        {/* Header */}
        <div style={{
          background: 'var(--color-primary-light)',
          padding: 'var(--space-6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--color-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span style={{
              fontSize: 'var(--font-size-xs)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-primary)',
              background: 'white',
              padding: '2px 10px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid rgba(79,70,229,0.2)',
            }}>
              {step + 1} / {STEPS.length}
            </span>
            <span style={{
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-primary)',
            }}>
              Welcome to EchoMemo 👋
            </span>
          </div>
          <button
            onClick={handleSkip}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-text-tertiary)', display: 'flex',
              padding: 4, borderRadius: 'var(--radius-sm)',
            }}
            aria-label="Skip onboarding"
          >
            <X size={16} />
          </button>
        </div>

        {/* Step content */}
        <div style={{ padding: 'var(--space-8)', minHeight: 220 }} key={step}>
          <div style={{
            width: 64, height: 64,
            background: 'var(--color-bg)',
            borderRadius: 'var(--radius-xl)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 'var(--space-5)',
            border: '1px solid var(--color-border)',
          }}>
            {current.icon}
          </div>

          <h2 style={{
            fontSize: 'var(--font-size-xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--space-3)',
            lineHeight: 'var(--line-height-tight)',
          }}>
            {current.title}
          </h2>

          <p style={{
            fontSize: 'var(--font-size-base)',
            color: 'var(--color-text-secondary)',
            lineHeight: 'var(--line-height-relaxed)',
            marginBottom: 'var(--space-4)',
          }}>
            {current.description}
          </p>

          <div style={{
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderLeft: '3px solid var(--color-primary)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-3) var(--space-4)',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
            fontStyle: 'italic',
          }}>
            💡 {current.tip}
          </div>
        </div>

        {/* Step dots + actions */}
        <div style={{
          padding: 'var(--space-4) var(--space-6) var(--space-6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid var(--color-border-light)',
        }}>
          {/* Dot indicators */}
          <div style={{ display: 'flex', gap: 6 }}>
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                style={{
                  width: i === step ? 20 : 8,
                  height: 8,
                  borderRadius: 'var(--radius-full)',
                  background: i === step ? 'var(--color-primary)' : 'var(--color-border)',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'all 0.25s ease',
                }}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {!isLast && (
              <button onClick={handleSkip} className="btn btn-ghost" style={{ fontSize: 'var(--font-size-sm)' }}>
                Skip
              </button>
            )}
            <button onClick={handleNext} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {isLast ? 'Get started' : 'Next'}
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>
    </div>
  );
}
