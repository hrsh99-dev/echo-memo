/**
 * Registration page.
 */

import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Logo from '../components/Logo';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(pwd)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/\d/.test(pwd)) {
      return 'Password must contain at least one digit';
    }
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      const msg = 'Please enter your full name';
      setError(msg);
      showToast(msg, 'error');
      return;
    }

    if (!email.trim()) {
      const msg = 'Please enter your email address';
      setError(msg);
      showToast(msg, 'error');
      return;
    }

    if (password !== confirmPassword) {
      const msg = 'Passwords do not match';
      setError(msg);
      showToast(msg, 'error');
      return;
    }

    const pwdError = validatePassword(password);
    if (pwdError) {
      setError(pwdError);
      showToast(pwdError, 'error');
      return;
    }

    setLoading(true);
    try {
      await register(email.trim(), password, name.trim());
      showToast('Account created successfully!', 'success');
      navigate('/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed. Please try again.';
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <Logo size={42} />
          </div>
          <h1>Create an account</h1>
          <p>Start capturing your thoughts with EchoMemo</p>
        </div>

        {/* Inline error banner */}
        {error && (
          <div className="auth-error-banner" role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name" className="form-label">Full Name</label>
            <input
              id="name"
              type="text"
              className={`form-input${error ? ' form-input-error' : ''}`}
              placeholder="Your name"
              value={name}
              onChange={e => { setName(e.target.value); setError(null); }}
              required
              autoComplete="name"
              disabled={loading}
            />
          </div>

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
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              id="password"
              type="password"
              className={`form-input${error ? ' form-input-error' : ''}`}
              placeholder="At least 8 characters"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(null); }}
              required
              minLength={8}
              autoComplete="new-password"
              disabled={loading}
            />
            <span className="form-hint">Must contain at least 8 characters, with uppercase, lowercase, and a number</span>
          </div>

          <div className="form-group">
            <label htmlFor="confirm-password" className="form-label">Confirm Password</label>
            <input
              id="confirm-password"
              type="password"
              className={`form-input${error ? ' form-input-error' : ''}`}
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); setError(null); }}
              required
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%' }}>
            {loading ? (
              <>
                <Loader2 size={16} className="spin" />
                <span>Creating account…</span>
              </>
            ) : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
