import React, { useEffect, useMemo, useState } from 'react';
import Shell from './components/layout/Shell';
import HeaderBar from './components/layout/HeaderBar';
import Dashboard, { ViewState } from './pages/Dashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/Card';
import { Button } from './components/ui/Button';
import WalletConnectCard from './components/ethereum/WalletConnectCard';
import type { OperationRecordProps } from './domain/operations/OperationRecord';
import type { NotificationSettings } from './domain/settings/NotificationSettings';
import { defaultNotificationSettings } from './domain/settings/NotificationSettings';
import { ControlRoomService } from './services/ControlRoomService';

import type { NavKey } from './components/layout/Sidebar';

const usePreferredTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const App: React.FC = () => {
  const controlRoomService = useMemo(() => new ControlRoomService(window.catalyst), []);
  const [nav, setNav] = useState<NavKey>('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>(usePreferredTheme());
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [operations, setOperations] = useState<OperationRecordProps[]>([]);
  const [notifications, setNotifications] = useState<NotificationSettings>(defaultNotificationSettings);
  const [toast, setToast] = useState<{ show: boolean; message: string }>({ show: false, message: '' });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const showToast = (message: string) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 2200);
  };

  const loadControlRoom = async (): Promise<boolean> => {
    try {
      const [loadedOperations, loadedNotifications] = await Promise.all([
        controlRoomService.listOperations(),
        controlRoomService.getNotifications()
      ]);
      setOperations(loadedOperations);
      setNotifications(loadedNotifications);
      setViewState('ready');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load control room';
      setViewState('error');
      showToast(message);
      return false;
    }
  };

  useEffect(() => {
    void loadControlRoom();
  }, []);

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
      const loaded = await loadControlRoom();
      if (loaded) {
        showToast('View refreshed');
      }
    } catch {
      setViewState('error');
      showToast('Refresh failed');
    }
  };

  const handleCreateOperation = async (message?: string, seed?: Partial<OperationRecordProps>) => {
    try {
      const nextOperations = await controlRoomService.createOperation(seed ?? {});
      setOperations(nextOperations);
      setNav('dashboard');
      setViewState('ready');
      showToast(message || 'Operation created');
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Operation creation failed';
      setViewState('error');
      showToast(text);
    }
  };

  const handleLinkProject = async () => {
    await handleCreateOperation('Project linked to operations ledger', {
      name: `Linked Project ${operations.length + 1}`,
      owner: 'Project Office',
      status: 'pending',
      risk: 'medium'
    });
  };

  const handleToggleEmail = async () => {
    try {
      const updated = await controlRoomService.updateNotifications({ emailEnabled: !notifications.emailEnabled });
      setNotifications(updated);
      showToast(updated.emailEnabled ? 'Email notifications enabled' : 'Email notifications disabled');
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Could not update email notifications';
      showToast(text);
    }
  };

  const handleSlackWebhook = async () => {
    if (notifications.slackEnabled) {
      try {
        const updated = await controlRoomService.updateNotifications({ slackEnabled: false });
        setNotifications(updated);
        showToast('Slack notifications disabled');
      } catch (error) {
        const text = error instanceof Error ? error.message : 'Could not disable Slack notifications';
        showToast(text);
      }
      return;
    }

    const enteredWebhook = window.prompt(
      'Enter Slack webhook URL',
      notifications.slackWebhookUrl || 'https://hooks.slack.com/services/...'
    );
    if (!enteredWebhook || enteredWebhook.trim().length === 0) {
      showToast('Slack webhook setup canceled');
      return;
    }

    try {
      const updated = await controlRoomService.updateNotifications({
        slackWebhookUrl: enteredWebhook.trim(),
        slackEnabled: true
      });
      setNotifications(updated);
      showToast('Slack notifications enabled');
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Could not enable Slack notifications';
      showToast(text);
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
            <Button variant="primary" size="sm" onClick={() => void handleLinkProject()}>
              Link a project
            </Button>
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
            <CardContent className="space-y-4">
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
                <p className="text-sm text-muted">Persisted locally via Electron IPC storage.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button variant="primary" size="sm" onClick={() => void handleToggleEmail()}>
                    {notifications.emailEnabled ? 'Disable email' : 'Enable email'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => void handleSlackWebhook()}>
                    {notifications.slackEnabled ? 'Disable Slack webhook' : 'Set Slack webhook'}
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted">
                  Email: {notifications.emailEnabled ? 'enabled' : 'disabled'} | Slack:{' '}
                  {notifications.slackEnabled ? 'enabled' : 'disabled'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <Dashboard
        viewState={viewState}
        onRetry={() => {
          setViewState('loading');
          void loadControlRoom();
        }}
        search={search}
        status={status}
        onSearch={setSearch}
        onStatus={setStatus}
        operations={operations}
        onCreateOperation={() => void handleCreateOperation()}
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
        onRefresh={() => void handleRefresh()}
      />
      {renderSection()}
    </Shell>
  );
};

export default App;
