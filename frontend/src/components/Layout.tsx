/**
 * App Layout with sidebar navigation.
 */

import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Home, Inbox, CheckSquare, FileText, MessageCircle, Settings, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

import Logo from './Logo';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/inbox', icon: Inbox, label: 'Smart Inbox' },
    { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
    { to: '/notes', icon: FileText, label: 'My Notes' },
    { to: '/ask', icon: MessageCircle, label: 'Ask Echo' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="app-layout">
      {/* Desktop sidebar */}
      <aside className={`app-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <Logo size={28} showText />
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-3)' }}>
            {user?.name || user?.email}
          </div>
          <button className="sidebar-link" onClick={handleLogout}>
            <LogOut />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="app-main">
        <header className="app-topbar">
          <button
            className="btn btn-ghost btn-icon mobile-menu-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
          >
            {sidebarOpen ? <X /> : <Menu />}
          </button>
        </header>

        <div className="app-content">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <nav className="mobile-nav">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <item.icon />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div
          className="modal-overlay"
          style={{ zIndex: 99 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
