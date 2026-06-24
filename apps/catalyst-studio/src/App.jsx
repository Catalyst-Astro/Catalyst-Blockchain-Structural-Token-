import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ClientPanel from './pages/ClientPanel';
import AdminPanel from './pages/AdminPanel';
import MonitorPanel from './pages/MonitorPanel';
import PentetraktysPanel from './pages/PentetraktysPanel';
import Cobrar from './pages/Cobrar';
import Tarjetas from './pages/Tarjetas';
import SpeiRetiro from './pages/SpeiRetiro';
import Buzon from './pages/Buzon';
import Cheques from './pages/Cheques';
import * as api from './api';
import * as auth from './auth';

function Sidebar({ system }) {
  const links = [
    { to: '/', label: '🏠 Dashboard', end: true },
    { to: '/client', label: '👤 Client Portal', end: false },
    { to: '/admin', label: '⚙️ Admin Panel', end: false },
    { to: '/monitor', label: '📡 Monitor', end: false },
    { to: '/pentetraktys', label: '🔺 Pentetraktys 4D', end: false },
    { to: '/cobrar', label: '💳 Cobrar SPEI', end: false },
    { to: '/tarjetas', label: '💳 Tarjetas + QR MX', end: false },
    { to: '/spei', label: '🏧 SPEI + OXXO', end: false },
    { to: '/buzon', label: '📬 Buzon Regulatorio', end: false },
    { to: '/cheques', label: '✈ Pan Am Cheques', end: false },
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
        <span>{system?.app_env || system?.network || '...'}</span>
        <span className="sidebar-env" style={{fontSize: '8px', display: 'block', color: '#64748b'}}>
          {system?.chain_id === 8453 ? '⚡ Base Mainnet' : system?.chain_id === 31337 ? '🏠 Localhost' : system?.mode === 'production' ? '🔐 PROD' : '🧪 Sandbox'}
        </span>
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
      case location.pathname.startsWith('/cobrar'): return 'Cobrar SPEI';
      case location.pathname.startsWith('/tarjetas'): return 'Tarjetas de Credito + QR Mexico';
      case location.pathname.startsWith('/spei'): return 'SPEI + OXXO Retiro';
      case location.pathname.startsWith('/buzon'): return 'Buzon Regulatorio';
      case location.pathname.startsWith('/cheques'): return 'Cheques Certificados';
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
            <Route path="/cobrar" element={<Cobrar />} />
            <Route path="/tarjetas" element={<Tarjetas />} />
            <Route path="/spei" element={<SpeiRetiro />} />
            <Route path="/buzon" element={<Buzon />} />
            <Route path="/cheques" element={<Cheques />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
