/**
 * Minimal Editorial Landing Page
 * Clean, cardless design inspired by modern SaaS hero typography.
 * Includes inline seamless Login/Signup toggle and quick-demo access.
 */

import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Logo from '../components/Logo';

export default function LandingPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login, register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) return 'Password must be at least 8 characters long';
    if (!/[A-Z]/.test(pwd)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(pwd)) return 'Password must contain at least one lowercase letter';
    if (!/\d/.test(pwd)) return 'Password must contain at least one digit';
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'register') {
      if (!name.trim()) {
        const msg = 'Name is required';
        setError(msg);
        showToast(msg, 'error');
        return;
      }
      const pwdErr = validatePassword(password);
      if (pwdErr) {
        setError(pwdErr);
        showToast(pwdErr, 'error');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
        navigate('/');
      } else {
        await register(email.trim(), password, name.trim());
        showToast('Account created successfully! Welcome to EchoMemo.', 'success');
        navigate('/');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = async () => {
    setError(null);
    setEmail('arjun.sharma@iitb.ac.in');
    setPassword('Demo@1234');
    setLoading(true);
    try {
      await login('arjun.sharma@iitb.ac.in', 'Demo@1234');
      navigate('/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Demo login failed';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-wrapper">
      {/* Top Navbar */}
      <nav className="landing-nav-bar">
        <Link to="/" className="landing-logo">
          <Logo size={30} showText />
        </Link>

        <div className="landing-nav-actions">
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: 'var(--font-size-sm)', padding: '6px 14px' }}
            onClick={() => setMode('login')}
          >
            Sign In
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={{ borderRadius: 'var(--radius-full)', fontSize: 'var(--font-size-sm)', padding: '7px 18px' }}
            onClick={() => setMode('register')}
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="landing-hero-section">
        {/* Subtle pill tag */}
        <div className="landing-badge">
          <span className="landing-badge-dot" />
          <span>Voice-First Second Brain · For Minds That Move Fast</span>
        </div>

        {/* Big Editorial Headline */}
        <h1 className="landing-heading">
          Capture thoughts in seconds.<br />
          Find them when it <em>matters.</em>
        </h1>

        {/* Minimal Subtitle */}
        <p className="landing-subheading">
          The personal memory assistant built for students and builders. Speak your thoughts freely—EchoMemo transcribes them, extracts actionable tasks into an intelligent inbox, and answers your questions with cited notes.
        </p>

        {/* Seamless Flat Auth Section (No Cards) */}
        <div className="landing-auth-wrapper">
          {/* Sign In / Sign Up Pills */}
          <div className="landing-auth-toggle">
            <button
              type="button"
              className={`landing-toggle-btn ${mode === 'login' ? 'active' : ''}`}
              onClick={() => { setMode('login'); setError(null); }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`landing-toggle-btn ${mode === 'register' ? 'active' : ''}`}
              onClick={() => { setMode('register'); setError(null); }}
            >
              Create Account
            </button>
          </div>

          {/* Inline error banner */}
          {error && (
            <div className="auth-error-banner" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form className="landing-form" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div>
                <input
                  type="text"
                  className={`form-input${error ? ' form-input-error' : ''}`}
                  placeholder="Your Full Name"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(null); }}
                  required
                />
              </div>
            )}

            <div>
              <input
                type="email"
                className={`form-input${error ? ' form-input-error' : ''}`}
                placeholder="name@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <input
                type="password"
                className={`form-input${error ? ' form-input-error' : ''}`}
                placeholder="Password (min 8 chars, uppercase, lowercase, digit)"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                required
                minLength={8}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            <button
              type="submit"
              className="landing-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="spin" />
                  <span>{mode === 'login' ? 'Signing In…' : 'Creating Account…'}</span>
                </>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Sign In to EchoMemo' : 'Get Started Free'}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* 1-Click Demo Account Quick Action */}
          <button
            type="button"
            className="landing-demo-pill"
            onClick={handleFillDemo}
            disabled={loading}
            title="Log in immediately with pre-seeded student demo account"
          >
            <Sparkles size={14} />
            <span>One-Click Demo Login (Arjun · IIT Bombay)</span>
          </button>

          {mode === 'login' && (
            <div style={{ marginTop: 'var(--space-3)', textAlign: 'center' }}>
              <Link to="/forgot-password" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                Forgot password?
              </Link>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', marginBottom: 'var(--space-2)' }}>
          <Link to="/privacy" style={{ color: 'inherit' }}>Privacy</Link>
          <span style={{ opacity: 0.3 }}>·</span>
          <Link to="/terms" style={{ color: 'inherit' }}>Terms</Link>
        </div>
        <p>EchoMemo · Built for Hacktoberfest 2026 · Powered by ElevenLabs, Gemini, & MongoDB</p>
      </footer>
    </div>
  );
}
