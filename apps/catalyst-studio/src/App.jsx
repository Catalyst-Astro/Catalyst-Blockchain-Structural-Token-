import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ClientPanel from './pages/ClientPanel';
import AdminPanel from './pages/AdminPanel';
import MonitorPanel from './pages/MonitorPanel';
import PentetraktysPanel from './pages/PentetraktysPanel';
import * as api from './api';
import * as auth from './auth';

function Sidebar({ system }) {
  const links = [
    { to: '/', label: '🏠 Dashboard', end: true },
    { to: '/client', label: '👤 Client Portal', end: false },
    { to: '/admin', label: '⚙️ Admin Panel', end: false },
    { to: '/monitor', label: '📡 Monitor', end: false },
    { to: '/pentetraktys', label: '🔺 Pentetraktys 4D', end: false },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-icon">◆</span>
        <span className="brand-text">Catalyst<br/>Studio</span>
      </div>
      <nav className="sidebar-nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `nav-link${isActive ? ' active' : ''}`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-status">
        <div className="status-dot" data-status={system?.status || 'unknown'} />
        <span>{system?.status || '...'}</span>
        <span className="sidebar-env">{system?.app_env || ''}</span>
      </div>
    </aside>
  );
}

export default function App() {
  const [system, setSystem] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [user, setUser] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const location = useLocation();

  const refresh = useCallback(async () => {
    try {
      const data = await api.getSystemStatus();
      setSystem(data);
      setLastUpdate(new Date());
    } catch {
      setSystem({ status: 'offline', app_env: 'unknown' });
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10_000);
    return () => clearInterval(interval);
  }, [refresh]);

  // Check existing session on mount
  useEffect(() => {
    auth.checkSession().then((u) => u && setUser(u)).catch(() => {});
  }, []);

  const handleLogin = async () => {
    setLoginLoading(true);
    try {
      const result = await auth.login();
      setUser({ role: result.role, address: result.address });
    } catch (err) {
      console.error('Login failed:', err);
    }
    setLoginLoading(false);
  };

  const handleLogout = async () => {
    await auth.logout();
    setUser(null);
  };

  const pageTitle = (() => {
    switch (true) {
      case location.pathname.startsWith('/client'): return 'Client Portal';
      case location.pathname.startsWith('/admin'): return 'Admin Panel';
      case location.pathname.startsWith('/monitor'): return 'Node Monitor';
      case location.pathname.startsWith('/pentetraktys'): return 'Pentetraktys 4D';
      default: return 'Command Center';
    }
  })();

  return (
    <div className="app-shell">
      <Sidebar system={system} />
      <main className="main-area">
        <header className="topbar">
          <h1 className="topbar-title">{pageTitle}</h1>
          <div className="topbar-right">
            {user ? (
              <>
                <span className="topbar-update" style={{color:'var(--green)',fontWeight:600}}>
                  {user.role === 'admin' ? '🔑 Admin' : '👤 Client'}
                </span>
                <code className="topbar-update" style={{fontSize:10}}>
                  {user.address?.slice(0, 6)}...{user.address?.slice(-4)}
                </code>
                <button className="btn btn-warning" style={{fontSize:11,padding:'4px 10px'}} onClick={handleLogout}>
                  Logout
                </button>
              </>
            ) : (
              <button className="btn btn-primary" style={{fontSize:12}} onClick={handleLogin} disabled={loginLoading}>
                {loginLoading ? '...' : 'Sign in with Ethereum'}
              </button>
            )}
            <span className={`badge badge-${(system?.status || 'unknown').toLowerCase()}`}>
              {system?.status || '...'}
            </span>
          </div>
        </header>
        <div className="content">
          <Routes>
            <Route path="/" element={<Dashboard system={system} />} />
            <Route path="/client/*" element={<ClientPanel />} />
            <Route path="/admin/*" element={<AdminPanel />} />
            <Route path="/monitor/*" element={<MonitorPanel />} />
            <Route path="/pentetraktys" element={<PentetraktysPanel />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
