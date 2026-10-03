/**
 * VoiceInput - microphone button that records audio and returns transcript.
 * Uses the existing /api/v1/capture/transcribe endpoint.
 */

import { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import api from '../api/client';

type VoiceState = 'idle' | 'recording' | 'transcribing';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onStateChange?: (state: VoiceState) => void;
  disabled?: boolean;
}

export default function VoiceInput({ onTranscript, onStateChange, disabled }: VoiceInputProps) {
  const { showToast } = useToast();
  const [state, setState] = useState<VoiceState>('idle');

  const changeState = (s: VoiceState) => {
    setState(s);
    onStateChange?.(s);
  };
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
        .find(t => MediaRecorder.isTypeSupported(t)) ?? '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        if (blob.size < 500) {
          showToast('Recording too short - please speak longer', 'error');
          setState('idle');
          return;
        }
        changeState('transcribing');
        try {
          const result = await api.transcribeAudio(blob);
          if (result.transcript) {
            onTranscript(result.transcript);
          } else {
            showToast('Could not understand audio', 'error');
          }
        } catch (err) {
          showToast(err instanceof Error ? err.message : 'Transcription failed', 'error');
        } finally {
          changeState('idle');
        }
      };

      recorder.start(250);
      changeState('recording');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        showToast('Microphone permission denied', 'error');
      } else {
        showToast('Could not access microphone', 'error');
      }
    }
  }, [onTranscript, showToast]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  const handleClick = () => {
    if (state === 'recording') stopRecording();
    else if (state === 'idle') startRecording();
  };

  const isRecording = state === 'recording';
  const isTranscribing = state === 'transcribing';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isTranscribing}
      aria-label={isRecording ? 'Stop recording' : isTranscribing ? 'Transcribing' : 'Start voice input'}
      title={isRecording ? 'Stop recording' : isTranscribing ? 'Transcribing...' : 'Speak your question'}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '42px',
        height: '42px',
        borderRadius: 'var(--radius-full)',
        border: isRecording ? '2px solid #ef4444' : '2px solid var(--color-border)',
        background: isRecording ? 'rgba(239,68,68,0.12)' : 'var(--color-surface)',
        color: isRecording ? '#ef4444' : isTranscribing ? 'var(--color-primary)' : 'var(--color-text-secondary)',
        cursor: isTranscribing ? 'wait' : 'pointer',
        transition: 'all 0.2s ease',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {isRecording && (
        <span style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'var(--radius-full)',
          border: '2px solid #ef4444',
          animation: 'voice-pulse 1.2s ease-out infinite',
          opacity: 0.5,
        }} />
      )}
      {isTranscribing ? (
        <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
      ) : isRecording ? (
        <MicOff size={18} />
      ) : (
        <Mic size={18} />
      )}
      <style>{`
        @keyframes voice-pulse {
          0%   { transform: scale(1);   opacity: 0.6; }
          100% { transform: scale(1.7); opacity: 0;   }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
}