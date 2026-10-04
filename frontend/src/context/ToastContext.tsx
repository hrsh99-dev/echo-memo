/**
 * Toast notification context for success/error messages.
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextType {
  showToast: (message: string | unknown, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

let toastId = 0;

const TOAST_ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string | unknown, type: 'success' | 'error' | 'info' = 'info') => {
    const id = ++toastId;
    let text = '';
    if (typeof message === 'string') {
      text = message;
    } else if (message instanceof Error) {
      text = message.message;
    } else if (typeof message === 'object' && message !== null) {
      const obj = message as Record<string, unknown>;
      if (typeof obj.message === 'string') text = obj.message;
      else if (typeof obj.detail === 'string') text = obj.detail;
      else text = 'An unexpected notification occurred';
    } else {
      text = String(message ?? '');
    }

    setToasts(prev => [...prev, { id, message: text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const dismiss = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container" role="region" aria-label="Notifications" aria-live="polite">
        {toasts.map(toast => {
          const Icon = TOAST_ICONS[toast.type];
          return (
            <div key={toast.id} className={`toast toast-${toast.type}`} role="alert">
              <Icon size={18} className="toast-icon" />
              <span className="toast-message">{toast.message}</span>
              <button
                type="button"
                className="toast-dismiss"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
                title="Dismiss"
              >
                <X size={14} strokeWidth={2.2} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
