/**
 * EchoMemo — Main application with routing.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import HomePage from './pages/HomePage';
import NotesPage from './pages/NotesPage';
import NoteDetailPage from './pages/NoteDetailPage';
import AskPage from './pages/AskPage';
import SettingsPage from './pages/SettingsPage';
import InboxPage from './pages/InboxPage';
import InboxReviewPage from './pages/InboxReviewPage';
import TasksPage from './pages/TasksPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import './index.css';

/** Route guard: redirect to login if not authenticated */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="skeleton" style={{ width: '120px', height: '20px' }} />
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

/** Route guard: redirect to home if already authenticated */
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="skeleton" style={{ width: '120px', height: '20px' }} />
      </div>
    );
  }

  return user ? <Navigate to="/" replace /> : <>{children}</>;
}

/** Root component that checks auth for the landing vs home page */
function RootPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="skeleton" style={{ width: '120px', height: '20px' }} />
      </div>
    );
  }

  // Authenticated users see the app layout, unauthenticated see landing
  return user ? (
    <ProtectedRoute>
      <Layout />
    </ProtectedRoute>
  ) : (
    <LandingPage />
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="skeleton" style={{ width: '120px', height: '20px' }} />
      </div>
    );
  }

  return (
    <Routes>
      {/* Root: Landing page for guests, App Home for authenticated users */}
      <Route
        path="/"
        element={
          user ? (
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          ) : (
            <LandingPage />
          )
        }
      >
        {user && <Route index element={<HomePage />} />}
      </Route>

      {/* Protected app pages — inside Layout */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="inbox" element={<InboxPage />} />
        <Route path="inbox/:id" element={<InboxReviewPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="notes" element={<NotesPage />} />
        <Route path="notes/:id" element={<NoteDetailPage />} />
        <Route path="ask" element={<AskPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Public auth pages */}
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
