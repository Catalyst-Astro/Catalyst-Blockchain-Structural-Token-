import React, { useEffect, useMemo, useState } from 'react';
import Shell from './components/layout/Shell';
import HeaderBar from './components/layout/HeaderBar';
import Dashboard, { ViewState } from './pages/Dashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/Card';
import { Button } from './components/ui/Button';
import WalletConnectCard from './components/ethereum/WalletConnectCard';

import type { NavKey } from './components/layout/Sidebar';

const usePreferredTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const App: React.FC = () => {
  const [nav, setNav] = useState<NavKey>('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>(usePreferredTheme());
  const [viewState, setViewState] = useState<ViewState>('ready');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [toast, setToast] = useState<{ show: boolean; message: string }>({ show: false, message: '' });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const sectionTitle = useMemo(() => {
    switch (nav) {
      case 'projects':
        return 'Projects';
      case 'settings':
        return 'Settings';
      default:
        return 'Dashboard';
    }
  }, [nav]);

  const handleRefresh = async () => {
    setViewState('loading');
    try {
      if (window.catalyst?.refresh) await window.catalyst.refresh();
      setTimeout(() => {
        setViewState('ready');
        setToast({ show: true, message: 'View refreshed' });
        setTimeout(() => setToast({ show: false, message: '' }), 1800);
      }, 450);
    } catch (e) {
      setViewState('error');
    }
  };

  const renderSection = () => {
    if (nav === 'projects') {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
            <CardDescription>High-level overview of ongoing Catalyst engagements.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted">Connect Fractal milestones to auto-generate events and ramp releases.</p>
            <Button variant="primary" size="sm">Link a project</Button>
          </CardContent>
        </Card>
      );
    }
    if (nav === 'settings') {
      return (
        <div className="grid gap-4 lg:grid-cols-2">
          <WalletConnectCard />
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
              <CardDescription>Theme, notifications, and operator preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Theme</p>
                  <p className="text-sm text-muted">Switch between light and dark for the control room.</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
                  {theme === 'light' ? 'Dark mode' : 'Light mode'}
                </Button>
              </div>
              <div>
                <p className="font-semibold">Notifications</p>
                <p className="text-sm text-muted">Alerts for attestations, AML escalations, and settlement steps.</p>
                <div className="mt-2 flex gap-2">
                  <Button variant="primary" size="sm">Enable email</Button>
                  <Button variant="ghost" size="sm">Slack webhook</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <Dashboard
        viewState={viewState}
        onStateChange={setViewState}
        onRetry={() => setViewState('ready')}
        search={search}
        status={status}
        onSearch={setSearch}
        onStatus={setStatus}
        toastMessage={toast.message}
        showToast={toast.show}
      />
    );
  };

  return (
    <Shell active={nav} onChange={setNav}>
      <HeaderBar
        title={sectionTitle}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        onRefresh={handleRefresh}
      />
      {renderSection()}
    </Shell>
  );
};

export default App;
