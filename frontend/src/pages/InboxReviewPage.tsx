/**
 * Inbox Review Page: Review AI suggestions side-by-side with original transcript/text,
 * edit titles/due dates/priorities, and accept/reject them as tasks.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Tag,
  Check,
  X,
  ExternalLink,
  RefreshCw,
  ListTodo,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import api, { type InboxItemResponse, type ExtractedItem } from '../api/client';

export default function InboxReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [item, setItem] = useState<InboxItemResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Local state for extracted items so user can edit them before accepting
  const [suggestions, setSuggestions] = useState<ExtractedItem[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  useEffect(() => {
    if (id) {
      loadItem(id);
    }
  }, [id]);

  const loadItem = async (noteId: string) => {
    setLoading(true);
    try {
      const data = await api.getInboxItem(noteId);
      setItem(data);
      const items = data.inbox_metadata?.extracted_items || [];
      setSuggestions(items);
      // Auto-select pending items
      const pendingIndices = items
        .map((it, idx) => (it.status === 'pending' ? idx : -1))
        .filter((idx) => idx !== -1);
      setSelectedIndices(pendingIndices);
    } catch (err: any) {
      showToast(err.message || 'Failed to load inbox item', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async () => {
    if (!id) return;
    setProcessing(true);
    try {
      const res = await api.processNote(id, true);
      showToast('AI analysis completed!', 'success');
      await loadItem(id);
    } catch (err: any) {
      showToast(err.message || 'Processing failed', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleItemChange = (
    index: number,
    field: keyof ExtractedItem,
    value: any
  ) => {
    setSuggestions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const toggleSelectIndex = (index: number) => {
    setSelectedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleSelectAll = () => {
    const pendingIndices = suggestions
      .map((it, idx) => (it.status === 'pending' ? idx : -1))
      .filter((idx) => idx !== -1);
    if (selectedIndices.length === pendingIndices.length) {
      setSelectedIndices([]);
    } else {
      setSelectedIndices(pendingIndices);
    }
  };

  const handleAcceptSelected = async () => {
    if (!id || selectedIndices.length === 0) return;
    setSubmitting(true);
    try {
      // Build edits dict
      const edits: Record<number, Partial<ExtractedItem>> = {};
      selectedIndices.forEach((idx) => {
        edits[idx] = {
          title: suggestions[idx].title,
          description: suggestions[idx].description,
          due_date: suggestions[idx].due_date,
          priority: suggestions[idx].priority,
        };
      });

      const res = await api.acceptSuggestions(id, selectedIndices, edits);
      showToast(
        `Created ${res.tasks_created.length} task${res.tasks_created.length === 1 ? '' : 's'} successfully!`,
        'success'
      );
      // Reload updated states
      await loadItem(id);
    } catch (err: any) {
      showToast(err.message || 'Failed to accept items', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectSelected = async () => {
    if (!id || selectedIndices.length === 0) return;
    setSubmitting(true);
    try {
      await api.rejectSuggestions(id, selectedIndices);
      showToast('Selected suggestions dismissed.', 'info');
      await loadItem(id);
    } catch (err: any) {
      showToast(err.message || 'Failed to reject items', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptSingle = async (index: number) => {
    if (!id) return;
    setSubmitting(true);
    try {
      const edits = {
        [index]: {
          title: suggestions[index].title,
          description: suggestions[index].description,
          due_date: suggestions[index].due_date,
          priority: suggestions[index].priority,
        },
      };
      const res = await api.acceptSuggestions(id, [index], edits);
      showToast('Task created successfully!', 'success');
      await loadItem(id);
    } catch (err: any) {
      showToast(err.message || 'Failed to accept suggestion', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectSingle = async (index: number) => {
    if (!id) return;
    setSubmitting(true);
    try {
      await api.rejectSuggestions(id, [index]);
      showToast('Suggestion dismissed', 'info');
      await loadItem(id);
    } catch (err: any) {
      showToast(err.message || 'Failed to dismiss suggestion', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-16)' }}>
        <RefreshCw size={32} className="spin" style={{ color: 'var(--color-primary)', margin: '0 auto var(--space-4)' }} />
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading note and suggestions...</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="empty-state">
        <h3>Note not found</h3>
        <button className="btn btn-secondary" onClick={() => navigate('/inbox')}>
          <ArrowLeft size={16} /> Back to Inbox
        </button>
      </div>
    );
  }

  const meta = item.inbox_metadata;
  const isProcessed = meta?.processing_status === 'completed';
  const pendingCount = suggestions.filter((s) => s.status === 'pending').length;

  return (
    <div className="review-container">
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/inbox')}>
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <h1 className="page-title" style={{ fontSize: 'var(--font-size-xl)' }}>
              {meta?.ai_title || item.title}
            </h1>
            <p className="page-subtitle" style={{ fontSize: 'var(--font-size-xs)' }}>
              Captured on {new Date(item.created_at).toLocaleString()} • {item.capture_type}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-secondary"
            onClick={handleProcess}
            disabled={processing}
          >
            <Sparkles size={16} className={processing ? 'spin' : ''} />
            {processing ? 'Processing...' : isProcessed ? 'Re-run AI' : 'Process with AI'}
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => navigate(`/notes/${item.id}`)}
          >
            <ExternalLink size={16} /> Open Note
          </button>
        </div>
      </div>

      {/* Split layout: Source note on left, suggestions on right */}
      <div className="review-split">
        {/* Left Column: Original Note & AI Summary */}
        <div className="review-source-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={16} color="var(--color-primary)" /> Source Transcript / Text
            </span>
            {meta?.classification && (
              <span className={`badge-category cat-${meta.classification.toLowerCase()}`}>
                {meta.classification}
              </span>
            )}
          </div>

          {/* AI Summary Box */}
          {meta?.summary && (
            <div className="inbox-item-summary">
              <strong style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)', marginBottom: '4px' }}>
                AI Executive Summary
              </strong>
              {meta.summary}
            </div>
          )}

          {/* Full Note Body / Transcript */}
          <div>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>
              Raw Content:
            </span>
            <div className="review-transcript-body">
              {item.body || '(Empty content)'}
            </div>
          </div>

          {/* Tags */}
          {meta?.suggested_tags && meta.suggested_tags.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <Tag size={14} color="var(--color-text-muted)" />
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>Tags:</span>
              {meta.suggested_tags.map((t, i) => (
                <span key={i} className="tag-chip">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Extracted Items & Suggestions */}
        <div className="review-suggestions-panel">
          <div className="suggestions-header-bar">
            {/* Row 1: Title + count */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                  Actionable Suggestions ({suggestions.length})
                </span>
                {pendingCount > 0 && (
                  <span className="status-badge status-pending" style={{ fontSize: '11px' }}>
                    {pendingCount} Pending
                  </span>
                )}
              </div>
              {pendingCount > 0 && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: 'var(--font-size-xs)', padding: '2px 8px' }}
                  onClick={handleSelectAll}
                >
                  {selectedIndices.length === pendingCount ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            {/* Row 2: Bulk action buttons — only when items are selected */}
            {pendingCount > 0 && selectedIndices.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--color-border-light)' }}>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginRight: 'auto' }}>
                  {selectedIndices.length} selected
                </span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: 'var(--font-size-xs)', padding: '4px 12px' }}
                  onClick={handleRejectSelected}
                  disabled={submitting}
                >
                  <X size={12} /> Reject
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ fontSize: 'var(--font-size-xs)', padding: '4px 14px' }}
                  onClick={handleAcceptSelected}
                  disabled={submitting}
                >
                  <Check size={12} /> Accept as Tasks
                </button>
              </div>
            )}
          </div>

          {!isProcessed ? (
            <div className="empty-state" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
              <Sparkles size={40} style={{ color: 'var(--color-primary)', marginBottom: 'var(--space-3)' }} />
              <h3>Note Not Yet Processed</h3>
              <p>Click "Process with AI" to extract tasks, dates, and intelligent tags from this note.</p>
              <button className="btn btn-primary" onClick={handleProcess} disabled={processing} style={{ marginTop: 'var(--space-4)' }}>
                <Sparkles size={16} /> Process Now
              </button>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="empty-state" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
              <CheckCircle2 size={40} style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }} />
              <h3>No Actionable Items Detected</h3>
              <p>The AI categorized this note as <strong>{meta?.classification || 'journal'}</strong> without specific pending tasks.</p>
            </div>
          ) : (
            suggestions.map((sug, idx) => {
              const isPending = sug.status === 'pending';
              const isAccepted = sug.status === 'accepted';
              const isRejected = sug.status === 'rejected';
              const isSelected = selectedIndices.includes(idx);
              const confidencePercent = Math.round((sug.confidence || 0) * 100);
              const confidenceColor =
                confidencePercent >= 75 ? '#059669' :
                confidencePercent >= 45 ? '#D97706' : '#DC2626';

              return (
                <div
                  key={idx}
                  className={`suggestion-card ${isAccepted ? 'accepted' : isRejected ? 'rejected' : ''}`}
                >
                  <div className="suggestion-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isPending && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectIndex(idx)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                      )}
                      <span className={`badge-category cat-${sug.type.toLowerCase()}`}>
                        {sug.type}
                      </span>
                      {isAccepted && (
                        <span className="status-badge status-completed">
                          <CheckCircle2 size={12} /> Accepted as Task
                        </span>
                      )}
                      {isRejected && (
                        <span className="status-badge status-failed">
                          <XCircle size={12} /> Dismissed
                        </span>
                      )}
                    </div>

                    <div className="confidence-indicator" title={`AI Confidence: ${confidencePercent}%`}>
                      <span>Confidence</span>
                      <div className="confidence-bar-bg">
                        <div
                          className="confidence-bar-fill"
                          style={{ width: `${confidencePercent}%`, background: confidenceColor }}
                        />
                      </div>
                      <span style={{ fontWeight: 600, color: confidenceColor }}>{confidencePercent}%</span>
                    </div>
                  </div>

                  {/* Ambiguous date banner */}
                  {sug.date_ambiguous && isPending && (
                    <div className="suggestion-alert-banner">
                      <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                      <span>
                        Due date was inferred from relative words (e.g., "tomorrow", "next week"). Please confirm or pick the exact date below.
                      </span>
                    </div>
                  )}

                  {/* Editable Title */}
                  <div>
                    <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Task Title:
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={sug.title}
                      disabled={!isPending}
                      onChange={(e) => handleItemChange(idx, 'title', e.target.value)}
                    />
                  </div>

                  {/* Editable Description */}
                  {(sug.description || isPending) && (
                    <div>
                      <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                        Notes / Context:
                      </label>
                      <textarea
                        className="form-textarea"
                        rows={2}
                        value={sug.description || ''}
                        disabled={!isPending}
                        placeholder="Add optional context…"
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value || null)}
                      />
                    </div>
                  )}

                  {/* Editable Due Date & Priority */}
                  <div className="suggestion-edit-fields">
                    <div>
                      <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                        Due Date:
                      </label>
                      <input
                        type="date"
                        className="form-input"
                        value={sug.due_date ? sug.due_date.slice(0, 10) : ''}
                        disabled={!isPending}
                        onChange={(e) =>
                          handleItemChange(idx, 'due_date', e.target.value || null)
                        }
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                        Priority:
                      </label>
                      <select
                        className="form-input"
                        value={sug.priority}
                        disabled={!isPending}
                        onChange={(e) => handleItemChange(idx, 'priority', e.target.value)}
                      >
                        <option value="low">Low Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="high">High Priority</option>
                      </select>
                    </div>
                  </div>

                  {/* Card Action Buttons */}
                  {isPending && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: 'var(--space-2)' }}>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ fontSize: 'var(--font-size-xs)' }}
                        onClick={() => handleRejectSingle(idx)}
                        disabled={submitting}
                      >
                        <X size={14} /> Dismiss
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ fontSize: 'var(--font-size-xs)' }}
                        onClick={() => handleAcceptSingle(idx)}
                        disabled={submitting}
                      >
                        <Check size={14} /> Create Task
                      </button>
                    </div>
                  )}

                  {isAccepted && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-1)' }}>
                      <button
                        className="btn btn-ghost"
                        style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => navigate('/tasks')}
                      >
                        <ListTodo size={13} /> View in Task Manager <ArrowRight size={13} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
