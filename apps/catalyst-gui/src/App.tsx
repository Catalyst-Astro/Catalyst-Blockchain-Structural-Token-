import React, { useEffect, useMemo, useState } from 'react';

import Shell from './components/layout/Shell';
import HeaderBar from './components/layout/HeaderBar';
import Dashboard, { ViewState } from './pages/Dashboard';
import OperatorInbox from './pages/OperatorInbox';
import SettingsPanel from './pages/SettingsPanel';
import UiLab from './pages/UiLab';
import { ControlRoomService } from './services/ControlRoomService';
import { OperatorAiService } from './services/OperatorAiService';
import { UiCopilotService } from './services/UiCopilotService';
import type { NavKey } from './components/layout/Sidebar';
import type { OperationRecordProps } from './domain/operations/OperationRecord';
import type { NotificationSettings } from './domain/settings/NotificationSettings';

const usePreferredTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const activationCommands = [
  'npm run gui:install',
  'npm run api:identity',
  'npm run gui:doctor',
  'npm run gui:up',
  'npm run gui:build'
];

const App: React.FC = () => {
  const controlRoomService = useMemo(() => new ControlRoomService(window.catalyst), []);
  const operatorAiService = useMemo(() => new OperatorAiService(window.catalyst), []);
  const uiCopilotService = useMemo(() => new UiCopilotService(window.catalyst), []);

  const [nav, setNav] = useState<NavKey>('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>(usePreferredTheme());
  const [dashboardViewState, setDashboardViewState] = useState<ViewState>('loading');
  const [operatorViewState, setOperatorViewState] = useState<ViewState>('loading');
  const [uiViewState, setUiViewState] = useState<ViewState>('loading');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [operations, setOperations] = useState<OperationRecordProps[]>([]);
  const [notifications, setNotifications] = useState<NotificationSettings | null>(null);
  const [cases, setCases] = useState<OperatorCaseRecord[]>([]);
  const [readiness, setReadiness] = useState<ReleaseReadiness | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | undefined>();
  const [report, setReport] = useState<OperatorCaseRecord['report'] | null>(null);
  const [uiCases, setUiCases] = useState<UiCopilotCase[]>([]);
  const [selectedUiCaseId, setSelectedUiCaseId] = useState<string | undefined>();
  const [uiReport, setUiReport] = useState<UiReviewReport | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string }>({ show: false, message: '' });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const sectionTitle = useMemo(() => {
    switch (nav) {
      case 'operator':
        return 'Operator';
      case 'ui_lab':
        return 'UI Lab';
      case 'settings':
        return 'Settings';
      default:
        return 'Dashboard';
    }
  }, [nav]);

  const flashToast = (message: string) => {
    setToast({ show: true, message });
    window.setTimeout(() => setToast({ show: false, message: '' }), 1800);
  };

  const loadDashboard = async () => {
    setDashboardViewState('loading');
    try {
      const [nextOperations, nextNotifications] = await Promise.all([
        controlRoomService.listOperations().catch(() => []),
        controlRoomService.getNotifications().catch(() => null)
      ]);
      setOperations(nextOperations);
      setNotifications(nextNotifications);
      setDashboardViewState(nextOperations.length === 0 ? 'empty' : 'ready');
    } catch {
      setDashboardViewState('error');
    }
  };

  const loadOperator = async () => {
    setOperatorViewState('loading');
    try {
      const [nextCases, nextReadiness] = await Promise.all([
        operatorAiService.listCases(),
        operatorAiService.getReleaseReadiness()
      ]);
      setCases(nextCases);
      setReadiness(nextReadiness);
      setSelectedCaseId((current) => current ?? nextCases[0]?.id);
      setOperatorViewState(nextCases.length === 0 ? 'empty' : 'ready');
    } catch {
      setOperatorViewState('error');
    }
  };

  const loadUiLab = async () => {
    setUiViewState('loading');
    try {
      const nextCases = await uiCopilotService.listCases();
      setUiCases(nextCases);
      setSelectedUiCaseId((current) => current ?? nextCases[0]?.id);
      setUiViewState(nextCases.length === 0 ? 'empty' : 'ready');
    } catch {
      setUiViewState('error');
    }
  };

  const loadSelectedReport = async (caseId?: string) => {
    if (!caseId) {
      setReport(null);
      return;
    }
    try {
      const nextReport = await operatorAiService.getReport(caseId);
      setReport(nextReport ?? null);
    } catch {
      setReport(null);
    }
  };

  const refreshAll = async (message = 'View refreshed') => {
    await Promise.all([loadDashboard(), loadOperator(), loadUiLab()]);
    flashToast(message);
  };

  useEffect(() => {
    void refreshAll('Control room synced');
  }, []);

  useEffect(() => {
    void loadSelectedReport(selectedCaseId);
  }, [selectedCaseId]);

  useEffect(() => {
    const selectedUiCase = uiCases.find((entry) => entry.id === selectedUiCaseId) ?? uiCases[0] ?? null;
    setUiReport(selectedUiCase?.report ?? null);
  }, [uiCases, selectedUiCaseId]);

  const handleRefresh = async () => {
    await refreshAll();
  };

  const handleCreateOperation = async () => {
    try {
      const nextOperations = await controlRoomService.createOperation({
        name: 'Operator escalation',
        owner: 'Ops Desk',
        status: 'pending',
        risk: 'medium'
      });
      setOperations(nextOperations);
      setDashboardViewState('ready');
      flashToast('Operation added');
    } catch {
      setDashboardViewState('error');
    }
  };

  const handleCreateCase = async (input: { requester: string; domain: OperatorDomain; intent: string; summary: string }) => {
    try {
      const created = await operatorAiService.createCase({
        requester: input.requester,
        domain: input.domain,
        intent: input.intent,
        summary: input.summary,
        input: { action: input.intent }
      });
      setSelectedCaseId(created.id);
      await loadOperator();
      await loadSelectedReport(created.id);
      flashToast('Operator case created');
    } catch {
      setOperatorViewState('error');
    }
  };

  const handlePlanCase = async (caseId: string) => {
    try {
      await operatorAiService.planCase(caseId);
      await loadOperator();
      await loadSelectedReport(caseId);
      flashToast('Case planned');
    } catch {
      setOperatorViewState('error');
    }
  };

  const handleApproveCase = async (caseId: string) => {
    try {
      await operatorAiService.approveCase(caseId, {
        decidedBy: 'ops-approver',
        decision: 'approved',
        reason: 'Approved from Catalyst GUI'
      });
      await loadOperator();
      await loadSelectedReport(caseId);
      flashToast('Approval recorded');
    } catch {
      setOperatorViewState('error');
    }
  };

  const handleExecuteCase = async (caseId: string, mode: OperatorExecutionMode) => {
    try {
      const execution = await operatorAiService.executeCase(caseId, {
        mode,
        requestedBy: 'ops-desk'
      });
      setReport(execution.report ?? null);
      await loadOperator();
      flashToast(mode === 'live' ? 'Live execution completed' : 'Dry run completed');
    } catch {
      setOperatorViewState('error');
    }
  };

  const handleCreateUiCase = async (input: {
    requester: string;
    surface: UiSurface;
    intent: UiCopilotIntent;
    summary: string;
  }) => {
    try {
      const created = await uiCopilotService.createCase(input);
      setSelectedUiCaseId(created.id);
      await loadUiLab();
      setUiReport(null);
      flashToast('UI case created');
    } catch {
      setUiViewState('error');
    }
  };

  const handlePlanUiCase = async (caseId: string) => {
    try {
      await uiCopilotService.planCase(caseId);
      await loadUiLab();
      setUiReport(null);
      flashToast('UI proposal planned');
    } catch {
      setUiViewState('error');
    }
  };

  const handleReportUiCase = async (caseId: string) => {
    try {
      const nextReport = await uiCopilotService.getReport(caseId);
      setUiReport(nextReport);
      await loadUiLab();
      flashToast('UI report generated');
    } catch {
      setUiViewState('error');
    }
  };

  const updateNotifications = async (patch: Partial<NotificationSettings>) => {
    try {
      const next = await controlRoomService.updateNotifications(patch);
      setNotifications(next);
      flashToast('Notifications updated');
    } catch {
      flashToast('Notification update failed');
    }
  };

  const renderOutput = () => {
    if (nav === 'operator') {
      return (
        <OperatorInbox
          viewState={operatorViewState}
          cases={cases}
          readiness={readiness}
          report={report}
          selectedCaseId={selectedCaseId}
          onSelectCase={setSelectedCaseId}
          onRefresh={loadOperator}
          onCreateCase={handleCreateCase}
          onPlanCase={handlePlanCase}
          onApproveCase={handleApproveCase}
          onExecuteCase={handleExecuteCase}
        />
      );
    }

    if (nav === 'ui_lab') {
      return (
        <UiLab
          viewState={uiViewState}
          cases={uiCases}
          report={uiReport}
          selectedCaseId={selectedUiCaseId}
          onSelectCase={setSelectedUiCaseId}
          onRefresh={loadUiLab}
          onCreateCase={handleCreateUiCase}
          onPlanCase={handlePlanUiCase}
          onReportCase={handleReportUiCase}
        />
      );
    }

    if (nav === 'settings') {
      return (
        <SettingsPanel
          theme={theme}
          notifications={notifications}
          apiBaseUrl={'CATALYST_API_URL or http://127.0.0.1:4000'}
          activationCommands={activationCommands}
          onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          onUpdateNotifications={updateNotifications}
        />
      );
    }

    return (
      <Dashboard
        viewState={dashboardViewState}
        onRetry={loadDashboard}
        search={search}
        status={status}
        onSearch={setSearch}
        onStatus={setStatus}
        operations={operations}
        onCreateOperation={handleCreateOperation}
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
      {renderOutput()}
    </Shell>
  );
};

export default App;
