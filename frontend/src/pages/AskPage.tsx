/**
 * Ask Echo page — conversational retrieval over user's notes.
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Send, Volume2, Loader2, FileText, MessageCircle, VolumeX, Mic } from 'lucide-react';
import VoiceInput from '../components/VoiceInput';
import { useToast } from '../context/ToastContext';
import api, { type SourceReference } from '../api/client';

interface ConversationItem {
  type: 'question' | 'answer';
  text: string;
  sources?: SourceReference[];
  disclaimer?: string;
}

export default function AskPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const [question, setQuestion] = useState(searchParams.get('q') || '');
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [speechAvailable, setSpeechAvailable] = useState(false);
  const [voiceState, setVoiceState] = useState<'idle' | 'recording' | 'transcribing'>('idle');
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkSpeechStatus();
    // Auto-ask if query param exists
    const q = searchParams.get('q');
    if (q) {
      handleAsk(q);
    }
  }, []);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  // Cancel speech if user navigates away
  useEffect(() => {
    return () => { window.speechSynthesis?.cancel(); };
  }, []);

  // Use browser-native Web Speech API — no API key or backend needed
  const checkSpeechStatus = () => {
    setSpeechAvailable('speechSynthesis' in window);
  };

  const handleAsk = async (q?: string) => {
    const queryText = q || question;
    if (!queryText.trim()) return;

    setConversation(prev => [...prev, { type: 'question', text: queryText }]);
    setQuestion('');
    setLoading(true);

    try {
      const result = await api.askQuestion(queryText);
      setConversation(prev => [
        ...prev,
        {
          type: 'answer',
          text: result.answer,
          sources: result.sources,
          disclaimer: result.disclaimer,
        },
      ]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to get answer', 'error');
      setConversation(prev => [
        ...prev,
        {
          type: 'answer',
          text: 'Sorry, I couldn\'t generate an answer right now. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAsk();
  };

  const handleSpeak = (text: string) => {
    if (!('speechSynthesis' in window)) return;

    // Stop any ongoing speech
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    // Pick a natural-sounding English voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Premium'))
    ) || voices.find((v) => v.lang.startsWith('en'));
    if (preferred) utterance.voice = preferred;

    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => {
      setSpeaking(false);
      showToast('Speech playback failed', 'error');
    };

    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--topbar-height) - var(--space-16))' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 className="page-title">Ask Echo</h1>
        <p className="page-subtitle">Ask questions grounded in your saved notes</p>
      </div>

      {/* Conversation area */}
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: 'var(--space-4)' }}>
        {conversation.length === 0 && !loading && (
          <div className="empty-state" style={{ paddingTop: 'var(--space-12)' }}>
            <MessageCircle className="empty-state-icon" />
            <h3>Ask your notes anything</h3>
            <p>EchoMemo will find relevant notes and generate an answer grounded in your saved content.</p>
          </div>
        )}

        {conversation.map((item, index) => (
          <div key={index} style={{ marginBottom: 'var(--space-6)' }}>
            {item.type === 'question' ? (
              <div style={{
                background: 'var(--color-primary-light)',
                padding: 'var(--space-4) var(--space-5)',
                borderRadius: 'var(--radius-lg)',
                maxWidth: '85%',
                marginLeft: 'auto',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--font-size-base)',
              }}>
                {item.text}
              </div>
            ) : (
              <div className="ask-answer">
                <p className="ask-answer-text">{item.text}</p>

                {/* Read aloud button */}
                {speechAvailable && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleSpeak(item.text)}
                    style={{ marginBottom: 'var(--space-3)' }}
                  >
                    {speaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    {speaking ? 'Stop' : 'Read aloud'}
                  </button>
                )}

                {/* Sources */}
                {item.sources && item.sources.length > 0 && (
                  <div className="ask-sources">
                    <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>
                      Sources
                    </p>
                    {item.sources.map((source, si) => (
                      <div
                        key={si}
                        className="ask-source-item"
                        onClick={() => navigate(`/notes/${source.note_id}`)}
                        role="button"
                        tabIndex={0}
                      >
                        <FileText size={14} style={{ color: 'var(--color-primary)', marginTop: '2px', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-primary)' }}>
                            {source.title}
                          </div>
                          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>
                            {source.excerpt.substring(0, 150)}...
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {item.disclaimer && (
                  <p className="ask-disclaimer">{item.disclaimer}</p>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-4)', color: 'var(--color-text-secondary)' }}>
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            Searching your notes and generating answer...
          </div>
        )}

        <div ref={conversationEndRef} />
      </div>

      {/* Voice status banner */}
      {voiceState !== 'idle' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          padding: 'var(--space-3) var(--space-4)',
          marginBottom: 'var(--space-3)',
          background: voiceState === 'recording'
            ? 'rgba(239,68,68,0.07)'
            : 'var(--color-primary-light)',
          border: `1px solid ${voiceState === 'recording' ? 'rgba(239,68,68,0.25)' : 'rgba(79,70,229,0.2)'}`,
          borderRadius: 'var(--radius-xl)',
          fontSize: 'var(--font-size-sm)',
          color: voiceState === 'recording' ? '#dc2626' : 'var(--color-primary)',
          fontWeight: 'var(--font-weight-medium)',
          animation: 'fadeSlideIn 0.2s ease',
        }}>
          {voiceState === 'recording' ? (
            <>
              {/* Pulsing red dot */}
              <span style={{ position: 'relative', width: 10, height: 10, flexShrink: 0 }}>
                <span style={{
                  position: 'absolute', inset: 0,
                  borderRadius: '50%', background: '#ef4444',
                  animation: 'recPulse 1.2s ease-out infinite',
                }} />
                <span style={{
                  position: 'absolute', inset: 0,
                  borderRadius: '50%', background: '#ef4444',
                }} />
              </span>
              <Mic size={14} />
              Listening… speak your question, then click the mic to stop
            </>
          ) : (
            <>
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
              Transcribing your voice…
            </>
          )}
        </div>
      )}

      {/* Question input */}
      <form onSubmit={handleSubmit} className="ask-input-wrapper" style={{ borderTop: '1px solid var(--color-border-light)', paddingTop: 'var(--space-4)' }}>
        <input
          type="text"
          className="form-input ask-input"
          placeholder="Ask a question or tap the mic to speak…"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          disabled={loading}
        />
        <VoiceInput
          onTranscript={(text) => setQuestion(prev => prev ? `${prev} ${text}` : text)}
          onStateChange={setVoiceState}
          disabled={loading}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || !question.trim()}
          aria-label="Send question"
        >
          <Send size={16} />
        </button>
      </form>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes recPulse {
          0%   { transform: scale(1);   opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
