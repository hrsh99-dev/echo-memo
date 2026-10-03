/**
 * Privacy policy page.
 */

import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: 'var(--space-8) var(--space-6)' }}>
      <Link to="/" className="btn btn-ghost" style={{ marginBottom: 'var(--space-6)' }}>
        <ArrowLeft size={16} /> Back
      </Link>

      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-6)' }}>
        Privacy Policy
      </h1>

      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 'var(--line-height-relaxed)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <p><strong>What we collect:</strong> Your email, name, and the notes you create (text or transcribed audio).</p>
        <p><strong>Transcription:</strong> Audio recordings are sent to ElevenLabs for speech-to-text processing. Raw audio is deleted after successful transcription by default.</p>
        <p><strong>Embeddings:</strong> Note text is processed by Google Gemini to create semantic embeddings, enabling natural-language search. Embeddings are stored in MongoDB Atlas alongside your notes.</p>
        <p><strong>AI Answers:</strong> When you use Ask Echo, relevant note excerpts are sent to Google Gemini to generate answers. Only relevant excerpts are sent — not your entire note collection.</p>
        <p><strong>Speech Synthesis:</strong> Answer text may be sent to ElevenLabs for text-to-speech, only when you explicitly request audio playback.</p>
        <p><strong>No training:</strong> Your content is not used to train models by this application. Third-party provider policies apply to data processed through their APIs.</p>
        <p><strong>Data controls:</strong> You can export all your notes, delete individual notes, or delete your entire account at any time from Settings.</p>
        <p><strong>No trackers:</strong> EchoMemo does not use advertising trackers or analytics that collect note content.</p>
      </div>
    </div>
  );
}
