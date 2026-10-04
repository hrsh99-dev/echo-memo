/**
 * Forgot password page.
 */

import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send reset email';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Reset password</h1>
          <p>Enter your email and we'll send you a reset link</p>
        </div>

        {error && (
          <div className="auth-error-banner" role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ marginBottom: 'var(--space-6)', color: 'var(--color-text-secondary)' }}>
              If an account with that email exists, a password reset link has been sent. Check your inbox.
            </p>
            <Link to="/login" className="btn btn-primary">Back to Sign In</Link>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email" className="form-label">Email</label>
              <input
                id="email"
                type="email"
                className={`form-input${error ? ' form-input-error' : ''}`}
                placeholder="you@example.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(null); }}
                required
                disabled={loading}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%' }}>
              {loading ? (
                <>
                  <Loader2 size={16} className="spin" />
                  <span>Sending reset link…</span>
                </>
              ) : 'Send Reset Link'}
            </button>
          </form>
        )}

        <div className="auth-footer">
          <Link to="/login">Back to Sign In</Link>
        </div>
      </div>
    </div>
  );
}
