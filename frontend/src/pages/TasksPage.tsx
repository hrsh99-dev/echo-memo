/**
 * Personal Task Manager Page: Comprehensive task management with status views,
 * priority sorting, due date tracking, source note backlinks, and quick creation.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CheckSquare,
  Square,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Search,
  Calendar,
  Tag,
  ArrowRight,
  Edit2,
  Trash2,
  X,
  FileText,
  Filter,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Flame,
  Check,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import api, {
  type TaskResponse,
  type TaskStatsResponse,
  type CreateTaskData,
  type UpdateTaskData,
} from '../api/client';

const VIEWS = [
  { id: 'all', label: 'All Tasks' },
  { id: 'today', label: 'Due Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'completed', label: 'Completed' },
];

export default function TasksPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();

  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [stats, setStats] = useState<TaskStatsResponse>({
    total_active: 0,
    due_today: 0,
    overdue: 0,
    completed: 0,
  });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters & State
  const [currentView, setCurrentView] = useState(searchParams.get('view') || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sortBy, setSortBy] = useState('due_date');
  const [sortOrder, setSortOrder] = useState('asc');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Modal State (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskResponse | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    due_date: string;
    priority: string;
    category: string;
    tags: string;
  }>({
    title: '',
    description: '',
    due_date: '',
    priority: 'medium',
    category: '',
    tags: '',
  });

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    loadTasks();
  }, [page, currentView, priorityFilter, sortBy, sortOrder, searchQuery]);

  const loadStats = async () => {
    try {
      const s = await api.getTaskStats();
      setStats(s);
    } catch {
      // Ignore background stats load error
    }
  };

  const loadTasks = async (queryOverride?: string) => {
    setLoading(true);
    try {
      const q = queryOverride !== undefined ? queryOverride : searchQuery;
      let statusParam: string | undefined = undefined;
      let viewParam: string | undefined = undefined;

      if (currentView === 'completed') {
        statusParam = 'completed';
      } else if (currentView === 'today') {
        viewParam = 'today';
      } else if (currentView === 'upcoming') {
        viewParam = 'upcoming';
      } else if (currentView === 'overdue') {
        viewParam = 'overdue';
      }

      const res = await api.listTasks({
        page,
        page_size: pageSize,
        status: statusParam,
        view: viewParam,
        priority: priorityFilter || undefined,
        q: q || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      setTasks(res.tasks);
      setTotal(res.total);
    } catch (err: any) {
      showToast(err.message || 'Failed to load tasks', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async (task: TaskResponse) => {
    try {
      if (task.status === 'completed') {
        await api.reopenTask(task.id);
        showToast('Task marked as active', 'info');
      } else {
        await api.completeTask(task.id);
        showToast('Task completed! Great job! 🎉', 'success');
      }
      await Promise.all([loadTasks(), loadStats()]);
    } catch (err: any) {
      showToast(err.message || 'Failed to update task status', 'error');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.deleteTask(taskId);
      showToast('Task deleted', 'info');
      await Promise.all([loadTasks(), loadStats()]);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete task', 'error');
    }
  };

  const openCreateModal = () => {
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      due_date: new Date().toISOString().slice(0, 10),
      priority: 'medium',
      category: '',
      tags: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (task: TaskResponse) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      due_date: task.due_date ? task.due_date.slice(0, 10) : '',
      priority: task.priority,
      category: task.category || '',
      tags: task.tags ? task.tags.join(', ') : '',
    });
    setIsModalOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast('Title is required', 'error');
      return;
    }

    const tagList = formData.tags
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter((t) => t.length > 0);

    try {
      if (editingTask) {
        await api.updateTask(editingTask.id, {
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          due_date: formData.due_date || undefined,
          priority: formData.priority,
          category: formData.category.trim() || undefined,
          tags: tagList,
        });
        showToast('Task updated successfully!', 'success');
      } else {
        await api.createTask({
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          due_date: formData.due_date || undefined,
          priority: formData.priority,
          category: formData.category.trim() || undefined,
          tags: tagList,
        });
        showToast('Task created successfully!', 'success');
      }

      setIsModalOpen(false);
      await Promise.all([loadTasks(), loadStats()]);
    } catch (err: any) {
      showToast(err.message || 'Failed to save task', 'error');
    }
  };

  const formatDueDate = (dueStr?: string | null, status?: string) => {
    if (!dueStr) return null;
    const due = new Date(dueStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const dueDateOnly = new Date(due);
    dueDateOnly.setHours(0, 0, 0, 0);

    const diffDays = Math.round((dueDateOnly.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (status === 'completed') {
      return (
        <span className="due-badge completed">
          <Check size={12} /> {due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </span>
      );
    }

    if (diffDays < 0) {
      return (
        <span className="due-badge overdue">
          <AlertCircle size={12} /> Overdue by {Math.abs(diffDays)}d
        </span>
      );
    } else if (diffDays === 0) {
      return (
        <span className="due-badge today">
          <Clock size={12} /> Today
        </span>
      );
    } else if (diffDays === 1) {
      return (
        <span className="due-badge upcoming">
          <Calendar size={12} /> Tomorrow
        </span>
      );
    } else {
      return (
        <span className="due-badge upcoming">
          <Calendar size={12} /> {due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </span>
      );
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="tasks-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckSquare size={26} color="var(--color-primary)" /> Task Manager
          </h1>
          <p className="page-subtitle">
            Organize actions extracted from voice memos or created manually. Track deadlines and priorities.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={16} /> New Task
        </button>
      </div>

      {/* 4 Stats Cards */}
      <div className="task-stats-bar">
        <div className="task-stat-card" style={{ cursor: 'pointer' }} onClick={() => setCurrentView('all')}>
          <div className="task-stat-icon-wrapper active">
            <CheckSquare size={22} />
          </div>
          <div>
            <div className="task-stat-value">{stats.total_active}</div>
            <div className="task-stat-label">Total Active</div>
          </div>
        </div>

        <div className="task-stat-card" style={{ cursor: 'pointer' }} onClick={() => setCurrentView('today')}>
          <div className="task-stat-icon-wrapper today">
            <Clock size={22} />
          </div>
          <div>
            <div className="task-stat-value">{stats.due_today}</div>
            <div className="task-stat-label">Due Today</div>
          </div>
        </div>

        <div className="task-stat-card" style={{ cursor: 'pointer' }} onClick={() => setCurrentView('overdue')}>
          <div className="task-stat-icon-wrapper overdue">
            <AlertCircle size={22} />
          </div>
          <div>
            <div className="task-stat-value">{stats.overdue}</div>
            <div className="task-stat-label">Overdue</div>
          </div>
        </div>

        <div className="task-stat-card" style={{ cursor: 'pointer' }} onClick={() => setCurrentView('completed')}>
          <div className="task-stat-icon-wrapper completed">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="task-stat-value">{stats.completed}</div>
            <div className="task-stat-label">Completed</div>
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="task-views-nav">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            className={`task-view-tab ${currentView === v.id ? 'active' : ''}`}
            onClick={() => {
              setCurrentView(v.id);
              setPage(1);
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="filter-search-wrap">
          <Search size={15} />
          <input
            type="text"
            className="filter-search-input"
            placeholder="Search tasks…"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="filter-divider" />

        <div className="filter-group">
          <SlidersHorizontal size={13} style={{ color: 'var(--color-text-tertiary)' }} />
          <span className="filter-label">Priority</span>
          <select
            className="filter-select"
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="filter-divider" />

        <div className="filter-group">
          <span className="filter-label">Sort</span>
          <select
            className="filter-select"
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [by, ord] = e.target.value.split('-');
              setSortBy(by);
              setSortOrder(ord);
              setPage(1);
            }}
          >
            <option value="due_date-asc">Due (Earliest)</option>
            <option value="due_date-desc">Due (Latest)</option>
            <option value="priority-desc">Priority ↓</option>
            <option value="created_at-desc">Recently Added</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      {loading && tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <Clock size={28} className="spin" style={{ color: 'var(--color-primary)', margin: '0 auto var(--space-3)' }} />
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>Loading tasks...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="empty-state" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
          <CheckSquare size={48} style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }} />
          <h3>No tasks in this view</h3>
          <p>
            {currentView === 'today'
              ? 'You have no tasks due today. Enjoy your day or plan ahead!'
              : currentView === 'overdue'
              ? 'No overdue tasks. You are all caught up!'
              : currentView === 'completed'
              ? 'No completed tasks yet.'
              : currentView === 'upcoming'
              ? 'No upcoming tasks found matching your filters.'
              : priorityFilter || searchQuery
              ? 'No tasks match your current filter and search criteria.'
              : 'Add tasks manually with "+ New Task" or review suggestions in your Smart Inbox.'}
          </p>
          <button className="btn btn-primary" onClick={openCreateModal} style={{ marginTop: 'var(--space-4)' }}>
            <Plus size={16} /> Add Task
          </button>
        </div>
      ) : (
        <div className="task-list">
          {tasks.map((task) => {
            const isCompleted = task.status === 'completed';

            return (
              <div key={task.id} className={`task-card ${isCompleted ? 'completed' : ''}`}>
                {/* Completion Checkbox */}
                <button
                  type="button"
                  className={`task-checkbox-btn ${isCompleted ? 'checked' : ''}`}
                  onClick={() => handleToggleComplete(task)}
                  title={isCompleted ? 'Mark as pending' : 'Mark as complete'}
                >
                  {isCompleted ? <CheckSquare size={20} /> : <Square size={20} />}
                </button>

                {/* Task Details */}
                <div className="task-card-body">
                  <div className="task-card-title-row">
                    <span className={`task-title-text ${isCompleted ? 'completed' : ''}`}>
                      {task.title}
                    </span>

                    <div className="task-actions">
                      <button
                        className="btn btn-ghost"
                        style={{ padding: '4px' }}
                        title="Edit task"
                        onClick={() => openEditModal(task)}
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: '4px', color: 'var(--color-danger)' }}
                        title="Delete task"
                        onClick={() => handleDeleteTask(task.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {task.description && (
                    <div className="task-desc-text">
                      {task.description}
                    </div>
                  )}

                  <div className="task-meta-row">
                    {/* Priority badge */}
                    <span className={`priority-pill ${task.priority}`}>
                      {task.priority}
                    </span>

                    {/* Due date */}
                    {formatDueDate(task.due_date, task.status)}

                    {/* Category */}
                    {task.category && (
                      <span className="badge-category cat-task" style={{ fontSize: '11px' }}>
                        {task.category}
                      </span>
                    )}

                    {/* Source Note back-reference */}
                    {task.source_note_id && (
                      <button
                        type="button"
                        className="source-note-link"
                        onClick={() => navigate(`/notes/${task.source_note_id}`)}
                        title="View original voice memo / note"
                      >
                        <FileText size={12} /> From: {task.source_note_title || 'Voice Note'}
                      </button>
                    )}

                    {/* Tags */}
                    {task.tags && task.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        {task.tags.map((tg, i) => (
                          <span key={i} className="tag-chip">
                            #{tg}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
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
            <ChevronLeft size={16} /> Prev
          </button>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            Page {page} of {totalPages}
          </span>
          <button
            className="btn btn-secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Task Create / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="task-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="task-modal-header">
              <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>
                {editingTask ? 'Edit Task' : 'Create New Task'}
              </h2>
              <button
                className="btn btn-ghost"
                style={{ padding: '4px' }}
                onClick={() => setIsModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTask} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 500, marginBottom: '4px' }}>
                  Task Title *
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="What needs to be done?"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  autoFocus
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 500, marginBottom: '4px' }}>
                  Description / Notes
                </label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Add details, links, or context..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 500, marginBottom: '4px' }}>
                    Due Date
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 500, marginBottom: '4px' }}>
                    Priority
                  </label>
                  <select
                    className="form-input"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 500, marginBottom: '4px' }}>
                    Category
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Work, Personal, Bug"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 500, marginBottom: '4px' }}>
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="urgent, client, sprint1"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: 'var(--space-4)' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingTask ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
