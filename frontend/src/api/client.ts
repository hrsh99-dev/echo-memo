/**
 * API client for EchoMemo backend.
 * All API calls go through this module — no direct fetch calls elsewhere.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function parseApiError(errorData: unknown): string {
  if (!errorData) return 'An unexpected error occurred';
  if (typeof errorData === 'string') {
    return errorData.replace(/^Value error,\s*/i, '');
  }

  if (typeof errorData === 'object' && errorData !== null) {
    const data = errorData as Record<string, unknown>;

    // 1. FastAPI `detail` field
    if (typeof data.detail === 'string') {
      return data.detail.replace(/^Value error,\s*/i, '');
    }

    if (Array.isArray(data.detail)) {
      const messages = data.detail
        .map((item: unknown) => {
          if (typeof item === 'string') return item.replace(/^Value error,\s*/i, '');
          if (typeof item === 'object' && item !== null) {
            const errObj = item as Record<string, unknown>;
            const msg = typeof errObj.msg === 'string'
              ? errObj.msg
              : (typeof errObj.message === 'string' ? errObj.message : '');
            return msg.replace(/^Value error,\s*/i, '');
          }
          return '';
        })
        .filter(Boolean);

      if (messages.length > 0) {
        return messages.join('. ');
      }
    }

    // 2. Standard `message` or `error` field
    if (typeof data.message === 'string') {
      return data.message.replace(/^Value error,\s*/i, '');
    }
    if (typeof data.error === 'string') {
      return data.error.replace(/^Value error,\s*/i, '');
    }
  }

  return 'An error occurred. Please try again.';
}

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private onAuthError: (() => void) | null = null;

  constructor() {
    this.accessToken = sessionStorage.getItem('access_token');
    this.refreshToken = sessionStorage.getItem('refresh_token');
  }

  setAuthErrorHandler(handler: () => void) {
    this.onAuthError = handler;
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    sessionStorage.setItem('access_token', accessToken);
    sessionStorage.setItem('refresh_token', refreshToken);
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
    skipAuth = false
  ): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };

    if (!skipAuth && this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    // Don't set Content-Type for FormData (browser sets it with boundary)
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    let response: Response;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        signal: controller.signal,
      });
    } catch (networkErr) {
      if ((networkErr as Error).name === 'AbortError') {
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      // fetch() itself failed — network down, backend unreachable, CORS blocked
      throw new Error(
        'Unable to reach the server. Please check your internet connection and try again.'
      );
    } finally {
      clearTimeout(timeoutId);
    }

    // Try to refresh token on 401
    if (response.status === 401 && this.refreshToken && !skipAuth) {
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
        try {
          const retryResponse = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers,
          });
          if (retryResponse.ok) {
            if (retryResponse.status === 204) return null as T;
            return retryResponse.json();
          }
        } catch {
          throw new Error('Unable to reach the server after re-authentication.');
        }
      }
      this.clearTokens();
      this.onAuthError?.();
      throw new Error('Session expired. Please log in again.');
    }

    if (!response.ok) {
      let errorMessage = 'An error occurred';
      try {
        const errorData = await response.json();
        errorMessage = parseApiError(errorData);
      } catch {
        // Fallback for non-JSON errors (502, 503 from proxy, etc.)
        if (response.status >= 500) {
          errorMessage = 'Server is temporarily unavailable. Please try again in a moment.';
        } else if (response.status === 429) {
          errorMessage = 'Too many requests. Please wait a moment and try again.';
        } else if (response.status === 404) {
          errorMessage = 'The requested resource was not found.';
        } else if (response.status === 403) {
          errorMessage = 'You do not have permission to perform this action.';
        } else if (response.status === 401) {
          errorMessage = 'Authentication required. Please sign in.';
        }
      }
      throw new Error(errorMessage);
    }

    if (response.status === 204) return null as T;
    
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('audio/')) {
      return response.blob() as unknown as T;
    }
    
    return response.json();
  }

  private async tryRefresh(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });
      if (response.ok) {
        const data = await response.json();
        this.setTokens(data.access_token, data.refresh_token);
        return true;
      }
    } catch {
      // Refresh failed
    }
    return false;
  }

  // ===== Auth =====
  async register(email: string, password: string, name: string) {
    const data = await this.request<{access_token: string; refresh_token: string}>(
      '/api/v1/auth/register',
      { method: 'POST', body: JSON.stringify({ email, password, name }) },
      true
    );
    this.setTokens(data.access_token, data.refresh_token);
    return data;
  }

  async login(email: string, password: string) {
    const data = await this.request<{access_token: string; refresh_token: string}>(
      '/api/v1/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
      true
    );
    this.setTokens(data.access_token, data.refresh_token);
    return data;
  }

  async logout() {
    try {
      await this.request('/api/v1/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });
    } finally {
      this.clearTokens();
    }
  }

  async getMe() {
    return this.request<{id: string; email: string; name: string; created_at: string; settings: Record<string, unknown>}>('/api/v1/auth/me');
  }

  async forgotPassword(email: string) {
    return this.request<{message: string}>(
      '/api/v1/auth/forgot-password',
      { method: 'POST', body: JSON.stringify({ email }) },
      true
    );
  }

  // ===== Notes =====
  async getNotes(page = 1, pageSize = 20, q?: string, captureType?: string) {
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    if (q) params.set('q', q);
    if (captureType) params.set('capture_type', captureType);
    return this.request<{
      notes: NoteResponse[];
      total: number;
      page: number;
      page_size: number;
      has_more: boolean;
    }>(`/api/v1/notes?${params}`);
  }

  async getNote(id: string) {
    return this.request<NoteResponse>(`/api/v1/notes/${id}`);
  }

  async createNote(title: string, body: string, tags: string[] = []) {
    return this.request<NoteResponse>('/api/v1/notes', {
      method: 'POST',
      body: JSON.stringify({ title, body, tags, capture_type: 'text' }),
    });
  }

  async updateNote(id: string, data: { title?: string; body?: string; tags?: string[] }) {
    return this.request<NoteResponse>(`/api/v1/notes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteNote(id: string) {
    return this.request<null>(`/api/v1/notes/${id}`, { method: 'DELETE' });
  }

  async exportNotes() {
    return this.request<{notes: unknown[]; count: number}>('/api/v1/notes/export/all');
  }

  // ===== Capture =====
  async transcribeAudio(audioBlob: Blob, title?: string) {
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    if (title) formData.append('title', title);
    return this.request<{transcript: string; success: boolean; message: string}>(
      '/api/v1/capture/transcribe',
      { method: 'POST', body: formData }
    );
  }

  async saveVoiceNote(title: string, body: string) {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('body', body);
    return this.request<NoteResponse>(
      '/api/v1/capture/save-voice-note',
      { method: 'POST', body: formData }
    );
  }

  // ===== Ask Echo =====
  async askQuestion(question: string) {
    return this.request<{
      answer: string;
      sources: SourceReference[];
      disclaimer: string;
    }>('/api/v1/ask', {
      method: 'POST',
      body: JSON.stringify({ question }),
    });
  }

  async searchNotes(query: string) {
    return this.request<{
      results: SourceReference[];
      count: number;
    }>('/api/v1/search', {
      method: 'POST',
      body: JSON.stringify({ question: query }),
    });
  }

  // ===== Speech =====
  async textToSpeech(text: string): Promise<Blob> {
    return this.request<Blob>('/api/v1/speech', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  async getSpeechStatus() {
    return this.request<{available: boolean; message: string}>('/api/v1/speech/status');
  }

  // ===== Account =====
  async deleteAccount() {
    return this.request<{message: string}>('/api/v1/account', { method: 'DELETE' });
  }

  // ===== Smart Inbox =====
  async listInboxItems(params?: {
    page?: number;
    page_size?: number;
    category?: string;
    processing_status?: string;
    q?: string;
  }): Promise<InboxListResponse> {
    const sp = new URLSearchParams();
    if (params?.page) sp.set('page', params.page.toString());
    if (params?.page_size) sp.set('page_size', params.page_size.toString());
    if (params?.category) sp.set('category', params.category);
    if (params?.processing_status) sp.set('processing_status', params.processing_status);
    if (params?.q) sp.set('q', params.q);
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    return this.request<InboxListResponse>(`/api/v1/inbox${qs}`);
  }

  async getInboxItem(noteId: string): Promise<InboxItemResponse> {
    return this.request<InboxItemResponse>(`/api/v1/inbox/${noteId}`);
  }

  async processNote(noteId: string, force = false): Promise<ProcessingResultResponse> {
    return this.request<ProcessingResultResponse>(`/api/v1/inbox/${noteId}/process`, {
      method: 'POST',
      body: JSON.stringify({ force }),
    });
  }

  async acceptSuggestions(
    noteId: string,
    itemIndices: number[],
    edits?: Record<number, Partial<ExtractedItem>>
  ): Promise<AcceptResultResponse> {
    return this.request<AcceptResultResponse>(`/api/v1/inbox/${noteId}/accept`, {
      method: 'POST',
      body: JSON.stringify({ item_indices: itemIndices, edits }),
    });
  }

  async rejectSuggestions(
    noteId: string,
    itemIndices: number[]
  ): Promise<{ rejected_count: number; message: string }> {
    return this.request<{ rejected_count: number; message: string }>(`/api/v1/inbox/${noteId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ item_indices: itemIndices }),
    });
  }

  // ===== Tasks =====
  async getTaskStats(): Promise<TaskStatsResponse> {
    return this.request<TaskStatsResponse>('/api/v1/tasks/stats');
  }

  async listTasks(params?: {
    page?: number;
    page_size?: number;
    status?: string;
    priority?: string;
    view?: string;
    q?: string;
    sort_by?: string;
    sort_order?: string;
  }): Promise<TaskListResponse> {
    const sp = new URLSearchParams();
    if (params?.page) sp.set('page', params.page.toString());
    if (params?.page_size) sp.set('page_size', params.page_size.toString());
    if (params?.status) sp.set('status', params.status);
    if (params?.priority) sp.set('priority', params.priority);
    if (params?.view) sp.set('view', params.view);
    if (params?.q) sp.set('q', params.q);
    if (params?.sort_by) sp.set('sort_by', params.sort_by);
    if (params?.sort_order) sp.set('sort_order', params.sort_order);
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    return this.request<TaskListResponse>(`/api/v1/tasks${qs}`);
  }

  async createTask(data: CreateTaskData): Promise<TaskResponse> {
    return this.request<TaskResponse>('/api/v1/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getTask(taskId: string): Promise<TaskResponse> {
    return this.request<TaskResponse>(`/api/v1/tasks/${taskId}`);
  }

  async updateTask(taskId: string, data: UpdateTaskData): Promise<TaskResponse> {
    return this.request<TaskResponse>(`/api/v1/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async completeTask(taskId: string): Promise<TaskResponse> {
    return this.request<TaskResponse>(`/api/v1/tasks/${taskId}/complete`, {
      method: 'POST',
    });
  }

  async reopenTask(taskId: string): Promise<TaskResponse> {
    return this.request<TaskResponse>(`/api/v1/tasks/${taskId}/reopen`, {
      method: 'POST',
    });
  }

  async deleteTask(taskId: string): Promise<void> {
    return this.request<void>(`/api/v1/tasks/${taskId}`, {
      method: 'DELETE',
    });
  }
}

// Types
export interface NoteResponse {
  id: string;
  title: string;
  body: string;
  capture_type: string;
  tags: string[];
  processing_status: string;
  created_at: string;
  updated_at: string;
  has_audio: boolean;
}

export interface SourceReference {
  note_id: string;
  title: string;
  excerpt: string;
  relevance_score: number;
}

export interface ExtractedItem {
  type: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  priority: string;
  confidence: number;
  date_ambiguous: boolean;
  status: string;
}

export interface InboxMetadata {
  ai_title?: string | null;
  summary?: string | null;
  classification?: string | null;
  suggested_tags: string[];
  extracted_items: ExtractedItem[];
  processing_status: string;
  review_status: string;
  processed_at?: string | null;
  error_message?: string | null;
}

export interface InboxItemResponse {
  id: string;
  title: string;
  body: string;
  capture_type: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  has_audio: boolean;
  inbox_metadata?: InboxMetadata | null;
}

export interface InboxListResponse {
  items: InboxItemResponse[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export interface ProcessingResultResponse {
  note_id: string;
  processing_status: string;
  metadata?: InboxMetadata | null;
  message: string;
}

export interface AcceptResultResponse {
  accepted_count: number;
  tasks_created: string[];
  message: string;
}

export interface TaskResponse {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  due_date?: string | null;
  tags: string[];
  category?: string | null;
  source_note_id?: string | null;
  source_note_title?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
}

export interface TaskListResponse {
  tasks: TaskResponse[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export interface TaskStatsResponse {
  total_active: number;
  due_today: number;
  overdue: number;
  completed: number;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  due_date?: string;
  priority?: string;
  tags?: string[];
  category?: string;
  source_note_id?: string;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  due_date?: string;
  priority?: string;
  tags?: string[];
  category?: string;
}

// Singleton
export const api = new ApiClient();
export default api;
