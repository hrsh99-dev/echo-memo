/**
 * Terms of service page.
 */

import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: 'var(--space-8) var(--space-6)' }}>
      <Link to="/" className="btn btn-ghost" style={{ marginBottom: 'var(--space-6)' }}>
        <ArrowLeft size={16} /> Back
      </Link>

      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-6)' }}>
        Terms of Service
      </h1>

      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 'var(--line-height-relaxed)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <p>EchoMemo is a personal note-taking tool built for the Hacktoberfest 2026 challenge. By using this service, you agree to the following:</p>
        <p><strong>Personal use:</strong> EchoMemo is designed for individual, personal note-taking. Do not use it for medical, legal, financial, or other high-stakes purposes.</p>
        <p><strong>AI-generated content:</strong> Answers from Ask Echo are generated from your saved notes and may be incomplete or inaccurate. They should not be treated as authoritative advice.</p>
        <p><strong>Your content:</strong> You retain ownership of all notes you create. EchoMemo processes your content only to provide the described features.</p>
        <p><strong>Acceptable use:</strong> Do not use EchoMemo to store or process illegal content, or to attempt to access other users' data.</p>
        <p><strong>Service availability:</strong> EchoMemo is provided as-is. Service may be interrupted for maintenance or updates.</p>
      </div>
    </div>
  );
}
