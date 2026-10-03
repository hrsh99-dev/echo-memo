/**
 * Smart Inbox Page: Intelligent inbox that classifies notes, generates summaries,
 * and extracts actionable items with Gemini AI.
 *
 * Only shows notes that have been AI-processed (completed or failed).
 * Raw notes that haven't been touched by AI live in the Notes page.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Inbox,
  Sparkles,
  RefreshCw,
  Search,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Tag,
  ChevronLeft,
  ChevronRight,
  ListTodo,
  X,
  AlertTriangle,
  CheckCheck,
  Zap,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import api, { type InboxItemResponse } from '../api/client';

const CATEGORIES = [
  { id: '', label: 'All' },
  { id: 'task', label: 'Tasks' },
  { id: 'idea', label: 'Ideas' },
  { id: 'reminder', label: 'Reminders' },
  { id: 'journal', label: 'Journal' },
  { id: 'meeting', label: 'Meetings' },
  { id: 'reference', label: 'Reference' },
];

const STATUS_FILTERS = [
  { id: '', label: 'All statuses' },
  { id: 'completed', label: 'Processed' },
  { id: 'failed', label: 'Failed' },
];

/** Returns a color for the left border based on note category */
const getCategoryBorderColor = (cat?: string | null): string => {
  switch (cat) {
    case 'task':     return '#4F46E5';
    case 'idea':     return '#D97706';
    case 'reminder': return '#DB2777';
    case 'journal':  return '#3730A3';
    case 'meeting':  return '#059669';
    default:         return '#9CA3AF';
  }
};

export default function InboxPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [items, setItems] = useState<InboxItemResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const loadInbox = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listInboxItems({
        page,
        page_size: pageSize,
        category: selectedCategory || undefined,
        processing_status: selectedStatus || undefined,
        q: searchQuery || undefined,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch (err: any) {
      showToast(err.message || 'Failed to load inbox items', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, selectedCategory, selectedStatus, searchQuery]);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  const handleClearSearch = () => {
    setSearchQuery('');
    setPage(1);
  };

  const handleProcessNote = async (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProcessingId(noteId);
    try {
      await api.processNote(noteId, true);
      showToast('Note re-processed by AI!', 'success');
      await loadInbox();
    } catch (err: any) {
      showToast(err.message || 'AI processing failed', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const totalPages = Math.ceil(total / pageSize);
  const hasActiveFilters = selectedCategory || selectedStatus || searchQuery;

  // Per-page stats
  const pendingReviewCount = items.filter(
    (i) =>
      i.inbox_metadata?.processing_status === 'completed' &&
      i.inbox_metadata?.review_status === 'pending'
  ).length;
  const failedCount = items.filter(
    (i) => i.inbox_metadata?.processing_status === 'failed'
  ).length;
  const totalTaskSuggestions = items.reduce(
    (acc, i) =>
      acc + (i.inbox_metadata?.extracted_items?.filter((e) => e.status === 'pending').length ?? 0),
    0
  );

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'completed':
        return <span className="status-badge status-completed"><CheckCircle2 size={11} /> Processed</span>;
      case 'processing':
        return <span className="status-badge status-processing"><RefreshCw size={11} className="spin" /> Processing</span>;
      case 'failed':
        return <span className="status-badge status-failed"><AlertCircle size={11} /> Failed</span>;
      default:
        return <span className="status-badge status-pending"><Clock size={11} /> Unprocessed</span>;
    }
  };

  const getCategoryClass = (cat?: string | null) =>
    cat ? `cat-${cat.toLowerCase()}` : 'cat-reference';

  return (
    <div className="inbox-container">
      {/* Page Header */}
      <div className="inbox-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Inbox size={26} color="var(--color-primary)" /> Smart Inbox
          </h1>
          <p className="page-subtitle">
            AI-processed notes with extracted tasks, priorities &amp; summaries.{' '}
            <span
              style={{ color: 'var(--color-primary)', cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => navigate('/notes')}
            >
              Process new notes →
            </span>
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => loadInbox()}
          title="Refresh inbox"
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {/* Stats Bar */}
      {!loading && total > 0 && (
        <div className="inbox-stats-bar">
          <div className="inbox-stat-card">
            <div className="inbox-stat-icon" style={{ background: '#EEF2FF', color: '#4F46E5' }}>
              <CheckCheck size={17} />
            </div>
            <div>
              <div className="inbox-stat-value">{total}</div>
              <div className="inbox-stat-label">Total Processed</div>
            </div>
          </div>
          <div className="inbox-stat-card">
            <div className="inbox-stat-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>
              <Clock size={17} />
            </div>
            <div>
              <div className="inbox-stat-value">{pendingReviewCount}</div>
              <div className="inbox-stat-label">Needs Review</div>
            </div>
          </div>
          <div className="inbox-stat-card">
            <div className="inbox-stat-icon" style={{ background: '#D1FAE5', color: '#059669' }}>
              <Zap size={17} />
            </div>
            <div>
              <div className="inbox-stat-value">{totalTaskSuggestions}</div>
              <div className="inbox-stat-label">Pending Tasks</div>
            </div>
          </div>
          {failedCount > 0 && (
            <div className="inbox-stat-card" style={{ borderColor: '#FCA5A5' }}>
              <div className="inbox-stat-icon" style={{ background: '#FEE2E2', color: '#DC2626' }}>
                <AlertTriangle size={17} />
              </div>
              <div>
                <div className="inbox-stat-value" style={{ color: '#DC2626' }}>{failedCount}</div>
                <div className="inbox-stat-label">Failed</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="filter-bar" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 'var(--space-3)' }}>
        {/* Row 1: Search + Status */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <div className="filter-search-wrap" style={{ flex: 1 }}>
            <Search size={15} />
            <input
              type="text"
              className="filter-search-input"
              style={{ paddingRight: searchQuery ? '34px' : undefined }}
              placeholder="Search notes, summaries, tags…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                style={{
                  position: 'absolute', right: 10, top: '50%',
                  transform: 'translateY(-50%)', background: 'none',
                  border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)',
                  display: 'flex', alignItems: 'center', padding: 0,
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="filter-divider" />

          <div className="filter-group">
            <span className="filter-label">Status</span>
            <select
              className="filter-select"
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Category pills */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => { setSelectedCategory(cat.id); setPage(1); }}
              style={{
                padding: '4px 14px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid',
                borderColor: selectedCategory === cat.id ? 'var(--color-primary)' : 'var(--color-border)',
                background: selectedCategory === cat.id ? 'var(--color-primary-light)' : 'transparent',
                color: selectedCategory === cat.id ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                fontSize: 'var(--font-size-xs)',
                fontWeight: selectedCategory === cat.id ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
                fontFamily: 'var(--font-family)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                whiteSpace: 'nowrap',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Item List */}
      {loading && items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <RefreshCw
            size={28} className="spin"
            style={{ color: 'var(--color-primary)', margin: '0 auto var(--space-3)', display: 'block' }}
          />
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Loading smart inbox…
          </p>
        </div>
      ) : items.length === 0 ? (
        <div
          className="empty-state"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}
        >
          <Inbox size={48} style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }} />
          <h3>{hasActiveFilters ? 'No matching notes' : 'Inbox is empty'}</h3>
          <p>
            {hasActiveFilters
              ? 'Try adjusting your filters or search query.'
              : 'Open a note in the Notes page and click "Process with AI" to populate your Smart Inbox.'}
          </p>
          {!hasActiveFilters && (
            <button
              className="btn btn-primary"
              onClick={() => navigate('/notes')}
              style={{ marginTop: 'var(--space-4)' }}
            >
              <FileText size={15} /> Go to Notes
            </button>
          )}
          {hasActiveFilters && (
            <button
              className="btn btn-secondary"
              onClick={() => { setSelectedCategory(''); setSelectedStatus(''); handleClearSearch(); }}
              style={{ marginTop: 'var(--space-4)' }}
            >
              <X size={14} /> Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="inbox-list">
          {items.map((item) => {
            const meta = item.inbox_metadata;
            const procStatus = meta?.processing_status || 'pending';
            const classification = meta?.classification;
            const extractedItems = meta?.extracted_items || [];
            const pendingSuggestions = extractedItems.filter((i) => i.status === 'pending');
            const acceptedSuggestions = extractedItems.filter((i) => i.status === 'accepted');
            const displayTitle = meta?.ai_title || item.title;
            const isProcessingThis = processingId === item.id;
            const isFailed = procStatus === 'failed';

            return (
              <div
                key={item.id}
                className="inbox-item-card"
                style={{ borderLeft: `3px solid ${getCategoryBorderColor(classification)}` }}
              >
                {/* Top: Title + Status + Action */}
                <div className="inbox-item-top">
                  <div className="inbox-item-title-group">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span
                        className="inbox-item-title"
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/inbox/${item.id}`)}
                      >
                        {displayTitle}
                      </span>
                      {classification && (
                        <span className={`badge-category ${getCategoryClass(classification)}`}>
                          {classification}
                        </span>
                      )}
                      {getStatusBadge(procStatus)}
                    </div>
                    {meta?.ai_title && meta.ai_title !== item.title && (
                      <span className="inbox-item-original-title">
                        Original: {item.title}
                      </span>
                    )}
                  </div>

                  <div className="inbox-item-actions">
                    {isFailed ? (
                      <button
                        className="btn btn-ghost"
                        style={{
                          padding: '5px 10px', fontSize: 'var(--font-size-xs)',
                          color: 'var(--color-destructive)', border: '1px solid var(--color-destructive)',
                        }}
                        onClick={(e) => handleProcessNote(item.id, e)}
                        disabled={isProcessingThis}
                      >
                        <Sparkles size={13} className={isProcessingThis ? 'spin' : ''} />
                        {isProcessingThis ? 'Retrying…' : 'Retry AI'}
                      </button>
                    ) : (
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '5px 12px', fontSize: 'var(--font-size-xs)', display: 'flex', alignItems: 'center', gap: '5px' }}
                        onClick={() => navigate(`/inbox/${item.id}`)}
                      >
                        Review <ArrowRight size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Summary or Error */}
                {isFailed && meta?.error_message ? (
                  <div style={{
                    fontSize: 'var(--font-size-xs)', color: 'var(--color-destructive)',
                    background: 'var(--color-destructive-light)', padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '6px',
                  }}>
                    <AlertCircle size={13} /> {meta.error_message}
                  </div>
                ) : meta?.summary ? (
                  <div className="inbox-item-summary">{meta.summary}</div>
                ) : (
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                    {item.body.slice(0, 160)}{item.body.length > 160 ? '…' : ''}
                  </div>
                )}

                {/* Task Suggestion Pills */}
                {extractedItems.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {pendingSuggestions.length > 0 && (
                      <div
                        className="inbox-task-pill inbox-task-pill--pending"
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/inbox/${item.id}`)}
                      >
                        <ListTodo size={12} />
                        {pendingSuggestions.length} pending suggestion{pendingSuggestions.length !== 1 ? 's' : ''}
                      </div>
                    )}
                    {acceptedSuggestions.length > 0 && (
                      <div className="inbox-task-pill inbox-task-pill--accepted">
                        <CheckCircle2 size={12} />
                        {acceptedSuggestions.length} task{acceptedSuggestions.length !== 1 ? 's' : ''} created
                      </div>
                    )}
                    {pendingSuggestions.slice(0, 2).map((sug, idx) => (
                      <span key={idx} className="inbox-preview-chip">
                        {sug.title.length > 38 ? `${sug.title.slice(0, 38)}…` : sug.title}
                      </span>
                    ))}
                    {pendingSuggestions.length > 2 && (
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        +{pendingSuggestions.length - 2} more
                      </span>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="inbox-item-footer">
                  <div className="inbox-item-meta">
                    <span>
                      {new Date(item.created_at).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </span>
                    <span>•</span>
                    <span style={{ textTransform: 'capitalize' }}>{item.capture_type}</span>
                    {meta?.suggested_tags && meta.suggested_tags.length > 0 && (
                      <>
                        <span>•</span>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <Tag size={11} color="var(--color-text-muted)" />
                          {meta.suggested_tags.slice(0, 3).map((t, i) => (
                            <span key={i} className="tag-chip">#{t}</span>
                          ))}
                          {meta.suggested_tags.length > 3 && (
                            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                              +{meta.suggested_tags.length - 3}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: 'var(--font-size-xs)', padding: '2px 8px' }}
                    onClick={() => navigate(`/notes/${item.id}`)}
                  >
                    <FileText size={12} /> Source Note
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: 'var(--space-4)' }}>
          <button
            className="btn btn-secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft size={15} /> Prev
          </button>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            Page {page} of {totalPages} &nbsp;•&nbsp; {total} notes
          </span>
          <button
            className="btn btn-secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
