/**
 * Settings page — profile, audio preferences, export, and account deletion.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Trash2, Shield, Volume2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api/client';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [exporting, setExporting] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await api.exportNotes();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'echomemo_export.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Exported ${data.count} notes`, 'success');
    } catch (err) {
      showToast('Failed to export notes', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setDeletingAccount(true);
    try {
      await api.deleteAccount();
      showToast('Account deleted', 'success');
      await logout();
      navigate('/login');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete account', 'error');
    } finally {
      setDeletingAccount(false);
      setShowDeleteAccount(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      {/* Profile */}
      <div className="settings-section">
        <h2>Profile</h2>
        <div className="card">
          <div className="settings-row">
            <div>
              <div className="settings-label">Name</div>
              <div className="settings-description">{user?.name}</div>
            </div>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">Email</div>
              <div className="settings-description">{user?.email}</div>
            </div>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">Member since</div>
              <div className="settings-description">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : ''}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data management */}
      <div className="settings-section">
        <h2>Data Management</h2>
        <div className="card">
          <div className="settings-row">
            <div>
              <div className="settings-label">Export Notes</div>
              <div className="settings-description">Download all your notes as a JSON file</div>
            </div>
            <button className="btn btn-secondary" onClick={handleExport} disabled={exporting}>
              <Download size={14} />
              {exporting ? 'Exporting...' : 'Export'}
            </button>
          </div>
        </div>
      </div>

      {/* Privacy */}
      <div className="settings-section">
        <h2>
          <Shield size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
          Privacy & AI
        </h2>
        <div className="card">
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 'var(--line-height-relaxed)' }}>
            <p style={{ marginBottom: 'var(--space-3)' }}>
              <strong>Transcription:</strong> Audio recordings are sent to ElevenLabs for speech-to-text processing. 
              By default, raw audio is deleted after transcription.
            </p>
            <p style={{ marginBottom: 'var(--space-3)' }}>
              <strong>Embeddings:</strong> Note text is sent to Google Gemini to generate semantic embeddings for search.
              Embeddings are stored in MongoDB Atlas.
            </p>
            <p style={{ marginBottom: 'var(--space-3)' }}>
              <strong>AI Answers:</strong> When you use "Ask Echo," relevant note excerpts are sent to Google Gemini 
              to generate answers. Answers are based only on your notes.
            </p>
            <p style={{ marginBottom: 'var(--space-3)' }}>
              <strong>Speech:</strong> Text-to-speech uses ElevenLabs. Only the answer text is sent — not your full notes.
            </p>
            <p>
              <strong>No training:</strong> Your content is not used to train any models by this application.
            </p>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="settings-section">
        <h2 style={{ color: 'var(--color-destructive)' }}>Danger Zone</h2>
        <div className="card" style={{ borderColor: 'var(--color-destructive)', borderStyle: 'dashed' }}>
          <div className="settings-row">
            <div>
              <div className="settings-label" style={{ color: 'var(--color-destructive)' }}>Delete Account</div>
              <div className="settings-description">
                Permanently delete your account, all notes, embeddings, and associated data. This cannot be undone.
              </div>
            </div>
            <button className="btn btn-destructive" onClick={() => setShowDeleteAccount(true)}>
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      </div>

      {/* Delete account modal */}
      {showDeleteAccount && (
        <div className="modal-overlay" onClick={() => setShowDeleteAccount(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title" style={{ color: 'var(--color-destructive)' }}>Delete Your Account</h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-4)' }}>
              This will permanently delete your account and all data including notes, embeddings, and audio.
              This action cannot be undone.
            </p>
            <div className="form-group">
              <label htmlFor="delete-confirm" className="form-label">
                Type <strong>DELETE</strong> to confirm
              </label>
              <input
                id="delete-confirm"
                className="form-input"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => { setShowDeleteAccount(false); setDeleteConfirmText(''); }}>
                Cancel
              </button>
              <button
                className="btn btn-destructive"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || deletingAccount}
              >
                {deletingAccount ? 'Deleting...' : 'Delete My Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
