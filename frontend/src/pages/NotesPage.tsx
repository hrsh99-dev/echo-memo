/**
 * My Notes page — searchable list with filters and pagination.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Filter, FileText, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import api, { type NoteResponse } from '../api/client';

export default function NotesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();

  const [notes, setNotes] = useState<NoteResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [filterType, setFilterType] = useState<string>(searchParams.get('type') || '');
  const pageSize = 20;

  useEffect(() => {
    loadNotes();
  }, [page, filterType]);

  const loadNotes = async (query?: string) => {
    setLoading(true);
    try {
      const q = query !== undefined ? query : searchQuery;
      const data = await api.getNotes(page, pageSize, q || undefined, filterType || undefined);
      setNotes(data.notes);
      setTotal(data.total);
    } catch (err) {
      showToast('Failed to load notes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadNotes(searchQuery);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Notes</h1>
          <p className="page-subtitle">{total} {total === 1 ? 'note' : 'notes'}</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          <Plus size={16} /> New Note
        </button>
      </div>

      {/* Search + Filter */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
        <form onSubmit={handleSearch} style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }}
            />
            <input
              type="text"
              className="form-input"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '36px' }}
            />
          </div>
        </form>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            className={`btn ${filterType === '' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => { setFilterType(''); setPage(1); }}
          >
            All
          </button>
          <button
            className={`btn ${filterType === 'voice' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => { setFilterType('voice'); setPage(1); }}
          >
            Voice
          </button>
          <button
            className={`btn ${filterType === 'text' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => { setFilterType('text'); setPage(1); }}
          >
            Text
          </button>
        </div>
      </div>

      {/* Notes List */}
      {loading ? (
        <div className="note-list">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="skeleton skeleton-card" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="empty-state">
          <FileText className="empty-state-icon" />
          <h3>{searchQuery ? 'No matching notes' : 'No notes yet'}</h3>
          <p>{searchQuery ? 'Try a different search term.' : 'Record a thought or write a note to get started.'}</p>
          {!searchQuery && (
            <button className="btn btn-primary" onClick={() => navigate('/')}>
              <Plus size={16} /> Create your first note
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="note-list">
            {notes.map(note => (
              <div
                key={note.id}
                className="note-item"
                onClick={() => navigate(`/notes/${note.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && navigate(`/notes/${note.id}`)}
              >
                <div className="note-item-header">
                  <span className="note-item-title">{note.title}</span>
                  <span className={`badge ${note.capture_type === 'voice' ? 'badge-voice' : 'badge-text'}`}>
                    {note.capture_type === 'voice' ? 'Voice' : 'Text'}
                  </span>
                </div>
                <p className="note-item-excerpt">{note.body}</p>
                <div className="note-item-footer">
                  <span className="note-item-meta">
                    {new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  {note.tags.map(tag => (
                    <span key={tag} className="badge badge-tag">{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
              <button
                className="btn btn-ghost btn-sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                Page {page} of {totalPages}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
