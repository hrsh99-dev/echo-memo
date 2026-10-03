/**
 * Note detail page — view, edit, and delete a single note.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit3, Trash2, Save, X, Sparkles } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import api, { type NoteResponse } from '../api/client';

export default function NoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [note, setNote] = useState<NoteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editTags, setEditTags] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadNote();
  }, [id]);

  const loadNote = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api.getNote(id);
      setNote(data);
      setEditTitle(data.title);
      setEditBody(data.body);
      setEditTags(data.tags.join(', '));
    } catch (err) {
      showToast('Note not found', 'error');
      navigate('/notes');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const tags = editTags.split(',').map(t => t.trim()).filter(Boolean);
      const updated = await api.updateNote(id, {
        title: editTitle,
        body: editBody,
        tags,
      });
      setNote(updated);
      setEditing(false);
      showToast('Note updated', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await api.deleteNote(id);
      showToast('Note deleted', 'success');
      navigate('/notes');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete', 'error');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-text" style={{ width: '80%' }} />
        <div className="skeleton skeleton-text" style={{ width: '90%' }} />
        <div className="skeleton skeleton-text" style={{ width: '70%' }} />
      </div>
    );
  }

  if (!note) return null;

  return (
    <div>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
        <button className="btn btn-ghost" onClick={() => navigate('/notes')}>
          <ArrowLeft size={16} /> Back
        </button>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {editing ? (
            <>
              <button className="btn btn-ghost" onClick={() => setEditing(false)}>
                <X size={16} /> Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                <Save size={16} /> {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          ) : (
            <>
              <button
                className="btn btn-secondary"
                onClick={() => navigate(`/inbox/${note?.id}`)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                title="Review AI suggestions and extract tasks"
              >
                <Sparkles size={16} color="var(--color-primary)" /> Smart Inbox
              </button>
              <button className="btn btn-secondary" onClick={() => setEditing(true)}>
                <Edit3 size={16} /> Edit
              </button>
              <button className="btn btn-ghost" onClick={() => setShowDeleteConfirm(true)} style={{ color: 'var(--color-destructive)' }}>
                <Trash2 size={16} /> Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Note content */}
      <div className="card">
        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label htmlFor="edit-title" className="form-label">Title</label>
              <input
                id="edit-title"
                className="form-input"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="edit-body" className="form-label">Content</label>
              <textarea
                id="edit-body"
                className="form-textarea"
                value={editBody}
                onChange={e => setEditBody(e.target.value)}
                rows={12}
              />
            </div>
            <div className="form-group">
              <label htmlFor="edit-tags" className="form-label">Tags (comma-separated)</label>
              <input
                id="edit-tags"
                className="form-input"
                value={editTags}
                onChange={e => setEditTags(e.target.value)}
                placeholder="project, idea, reminder"
              />
            </div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-3)' }}>
                {note.title}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                <span className={`badge ${note.capture_type === 'voice' ? 'badge-voice' : 'badge-text'}`}>
                  {note.capture_type === 'voice' ? 'Voice' : 'Text'}
                </span>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                  Created {new Date(note.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
                {note.updated_at !== note.created_at && (
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                    · Updated {new Date(note.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </div>

            <div style={{
              fontSize: 'var(--font-size-base)',
              lineHeight: 'var(--line-height-relaxed)',
              color: 'var(--color-text-primary)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {note.body}
            </div>

            {note.tags.length > 0 && (
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-6)', flexWrap: 'wrap' }}>
                {note.tags.map(tag => (
                  <span key={tag} className="badge badge-tag">{tag}</span>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Delete this note?</h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
              This will permanently delete "{note.title}" and its associated data. This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button className="btn btn-destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete Note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
