/**
 * Home page — quick capture, recent notes, and welcome area.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, PenLine, Square, Loader2, Clock, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api, { type NoteResponse } from '../api/client';
import OnboardingModal, { ONBOARDING_KEY } from '../components/OnboardingModal';

export default function HomePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Notes
  const [recentNotes, setRecentNotes] = useState<NoteResponse[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);

  // Capture tabs
  const [captureMode, setCaptureMode] = useState<'voice' | 'text'>('voice');

  // Voice capture
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [showTranscriptReview, setShowTranscriptReview] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // Text capture
  const [textTitle, setTextTitle] = useState('');
  const [textBody, setTextBody] = useState('');
  const [voiceTitle, setVoiceTitle] = useState('');

  // Saving
  const [saving, setSaving] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    loadRecentNotes();
    // Show onboarding once for new users
    if (!localStorage.getItem(ONBOARDING_KEY)) {
      // Small delay so the page renders first
      const t = setTimeout(() => setShowOnboarding(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  const loadRecentNotes = async () => {
    try {
      const data = await api.getNotes(1, 5);
      setRecentNotes(data.notes);
    } catch (err) {
      console.error('Failed to load notes', err);
    } finally {
      setLoadingNotes(false);
    }
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 180) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        showToast('Microphone access is needed to record voice notes. Please allow microphone access in your browser settings.', 'error');
      } else {
        showToast('Could not start recording. Please check your microphone.', 'error');
      }
    }
  };

  const stopRecording = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder || mediaRecorder.state === 'inactive') return;

    setIsRecording(false);
    setIsTranscribing(true);

    return new Promise<void>((resolve) => {
      mediaRecorder.onstop = async () => {
        mediaRecorder.stream.getTracks().forEach(track => track.stop());

        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });

        try {
          const result = await api.transcribeAudio(audioBlob);
          if (result.success) {
            setTranscript(result.transcript);
            setShowTranscriptReview(true);
            showToast('Transcription complete! Review your note below.', 'success');
          } else {
            showToast('Transcription failed. You can type your note instead.', 'error');
            setCaptureMode('text');
          }
        } catch (err) {
          showToast(err instanceof Error ? err.message : 'Transcription failed', 'error');
          setCaptureMode('text');
        } finally {
          setIsTranscribing(false);
          resolve();
        }
      };
      mediaRecorder.stop();
    });
  }, [showToast]);

  const saveVoiceNote = async () => {
    if (!transcript.trim()) {
      showToast('Note body cannot be empty', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.saveVoiceNote(voiceTitle || 'Voice Note', transcript);
      showToast('Voice note saved!', 'success');
      setTranscript('');
      setVoiceTitle('');
      setShowTranscriptReview(false);
      setRecordingTime(0);
      loadRecentNotes();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save note', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveTextNote = async () => {
    if (!textBody.trim()) {
      showToast('Note body cannot be empty', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.createNote(textTitle || 'Quick Note', textBody);
      showToast('Note saved!', 'success');
      setTextTitle('');
      setTextBody('');
      loadRecentNotes();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save note', 'error');
    } finally {
      setSaving(false);
    }
  };

  const discardRecording = () => {
    setTranscript('');
    setVoiceTitle('');
    setShowTranscriptReview(false);
    setRecordingTime(0);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/ask?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div>
      {/* Onboarding for first-time users */}
      {showOnboarding && <OnboardingModal onClose={() => setShowOnboarding(false)} />}
      {/* Welcome header */}
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h1 className="page-title">{greeting()}, {user?.name?.split(' ')[0] || 'there'}</h1>
        <p className="page-subtitle">Capture it now. Find it when it matters.</p>
      </div>

      {/* Search entry point */}
      <form onSubmit={handleSearch} style={{ marginBottom: 'var(--space-8)' }}>
        <div style={{ position: 'relative' }}>
          <Search
            size={18}
            style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }}
          />
          <input
            type="text"
            className="form-input"
            placeholder="Ask your notes a question..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '42px' }}
          />
        </div>
      </form>

      {/* Capture Panel */}
      <div className="capture-panel" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="capture-tabs">
          <button
            className={`capture-tab ${captureMode === 'voice' ? 'active' : ''}`}
            onClick={() => setCaptureMode('voice')}
          >
            <Mic size={16} /> Record a thought
          </button>
          <button
            className={`capture-tab ${captureMode === 'text' ? 'active' : ''}`}
            onClick={() => setCaptureMode('text')}
          >
            <PenLine size={16} /> Write a note
          </button>
        </div>

        {captureMode === 'voice' && !showTranscriptReview && (
          <div className="capture-controls">
            {isTranscribing ? (
              <>
                <Loader2 size={32} className="spinning" style={{ color: 'var(--color-primary)', animation: 'spin 1s linear infinite' }} />
                <p className="capture-status">Transcribing your recording...</p>
              </>
            ) : (
              <>
                <button
                  className={`record-btn ${isRecording ? 'recording' : ''}`}
                  onClick={isRecording ? stopRecording : startRecording}
                  aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                >
                  {isRecording ? <Square size={20} /> : <Mic size={24} />}
                </button>

                {isRecording ? (
                  <div style={{ textAlign: 'center' }}>
                    <div className="record-timer">{formatTime(recordingTime)}</div>
                    <p className="capture-status">Recording... tap to stop</p>
                  </div>
                ) : (
                  <p className="capture-status">
                    Tap to start recording. Recording begins only after you press this button.
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {captureMode === 'voice' && showTranscriptReview && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label htmlFor="voice-title" className="form-label">Title (optional)</label>
              <input
                id="voice-title"
                className="form-input"
                placeholder="Give your note a title"
                value={voiceTitle}
                onChange={e => setVoiceTitle(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="voice-transcript" className="form-label">Transcript — review and edit before saving</label>
              <textarea
                id="voice-transcript"
                className="form-textarea"
                value={transcript}
                onChange={e => setTranscript(e.target.value)}
                rows={6}
              />
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={discardRecording}>Discard</button>
              <button className="btn btn-primary" onClick={saveVoiceNote} disabled={saving}>
                {saving ? 'Saving...' : 'Save Note'}
              </button>
            </div>
          </div>
        )}

        {captureMode === 'text' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label htmlFor="text-title" className="form-label">Title</label>
              <input
                id="text-title"
                className="form-input"
                placeholder="Note title"
                value={textTitle}
                onChange={e => setTextTitle(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="text-body" className="form-label">Note</label>
              <textarea
                id="text-body"
                className="form-textarea"
                placeholder="What's on your mind?"
                value={textBody}
                onChange={e => setTextBody(e.target.value)}
                rows={5}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={saveTextNote} disabled={saving || !textBody.trim()}>
                {saving ? 'Saving...' : 'Save Note'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Recent Notes */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)' }}>
            Recent Notes
          </h2>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/notes')}>
            View All
          </button>
        </div>

        {loadingNotes ? (
          <div className="note-list">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton skeleton-card" />
            ))}
          </div>
        ) : recentNotes.length === 0 ? (
          <div className="empty-state">
            <Clock className="empty-state-icon" />
            <h3>No notes yet</h3>
            <p>Record a thought or write a note to get started.</p>
          </div>
        ) : (
          <div className="note-list">
            {recentNotes.map(note => (
              <div
                key={note.id}
                className="note-item"
                onClick={() => navigate(`/notes/${note.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && navigate(`/notes/${note.id}`)}
              >
                <div className="note-item-header">
                  <span className="note-item-title">{note.title}</span>
                  <span className={`badge ${note.capture_type === 'voice' ? 'badge-voice' : 'badge-text'}`}>
                    {note.capture_type === 'voice' ? '🎤 Voice' : '✏️ Text'}
                  </span>
                </div>
                <p className="note-item-excerpt">{note.body}</p>
                <span className="note-item-meta">
                  {new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
