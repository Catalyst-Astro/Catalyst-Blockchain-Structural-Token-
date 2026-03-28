import React from 'react';
import { render, screen } from '@testing-library/react';

import Dashboard from '@/pages/Dashboard';
import OperatorInbox from '@/pages/OperatorInbox';
import SettingsPanel from '@/pages/SettingsPanel';
import UiLab from '@/pages/UiLab';

describe('GUI_SURFACE_STATES', () => {
  it('renders dashboard error state', () => {
    render(
      <Dashboard
        viewState="error"
        onRetry={() => undefined}
        search=""
        status="all"
        onSearch={() => undefined}
        onStatus={() => undefined}
        operations={[]}
        onCreateOperation={() => undefined}
      />
    );

    expect(screen.getByText('Unable to load operational ledger.')).toBeInTheDocument();
  });

  it('renders operator empty state', () => {
    render(
      <OperatorInbox
        viewState="empty"
        cases={[]}
        readiness={null}
        report={null}
        onSelectCase={() => undefined}
        onRefresh={() => undefined}
        onCreateCase={() => undefined}
        onPlanCase={() => undefined}
        onApproveCase={() => undefined}
        onExecuteCase={() => undefined}
      />
    );

    expect(screen.getByText('No operator cases yet.')).toBeInTheDocument();
  });

  it('renders settings panel with activation commands', () => {
    render(
      <SettingsPanel
        theme="light"
        notifications={{ emailEnabled: true, slackEnabled: false, slackWebhookUrl: '' }}
        apiBaseUrl="http://127.0.0.1:4000"
        activationCommands={['npm run gui:install', 'npm run gui:doctor']}
        onToggleTheme={() => undefined}
        onUpdateNotifications={() => undefined}
      />
    );

    expect(screen.getByText('Activation')).toBeInTheDocument();
    expect(screen.getByText('npm run gui:doctor')).toBeInTheDocument();
  });

  it('renders ui lab error state', () => {
    render(
      <UiLab
        viewState="error"
        cases={[]}
        report={null}
        onSelectCase={() => undefined}
        onRefresh={() => undefined}
        onCreateCase={() => undefined}
        onPlanCase={() => undefined}
        onReportCase={() => undefined}
      />
    );

    expect(screen.getByText('Unable to reach the UI copilot backend.')).toBeInTheDocument();
  });

  it('renders forge board in ui lab ready state', () => {
    render(
      <UiLab
        viewState="ready"
        cases={[
          {
            id: 'ui-case-1',
            requester: 'design-ops',
            surface: 'dashboard',
            intent: 'surface_review',
            summary: 'Review the dashboard shell',
            status: 'planned',
            traceId: 'GUI-001',
            zkRefs: ['ZK-GUI-001'],
            createdAt: new Date('2026-03-20T10:00:00Z').toISOString(),
            updatedAt: new Date('2026-03-20T10:00:00Z').toISOString(),
            proposal: {
              tokens: ['--primary'],
              layoutChanges: ['Keep KPI band grouped.'],
              componentChanges: ['Preserve the activity rail.'],
              a11yChecks: ['Keep label coverage intact.'],
              acceptanceCriteria: ['No horizontal scroll.'],
            },
          },
        ]}
        report={{
          id: 'ui-report-1',
          caseId: 'ui-case-1',
          generatedAt: new Date('2026-03-20T10:05:00Z').toISOString(),
          summary: 'Governed review report',
          recommendations: ['Review before merge.'],
          regressions: [],
          screenshots: ['artifacts/gui/screenshots/ui-lab.png'],
          evidenceRefs: ['backend/database/ui_reviews.jsonl'],
          zkRefs: ['ZK-GUI-001'],
          traceId: 'GUI-001',
          proposal: {
            tokens: ['--primary'],
            layoutChanges: ['Keep KPI band grouped.'],
            componentChanges: ['Preserve the activity rail.'],
            a11yChecks: ['Keep label coverage intact.'],
            acceptanceCriteria: ['No horizontal scroll.'],
          },
        }}
        onSelectCase={() => undefined}
        onRefresh={() => undefined}
        onCreateCase={() => undefined}
        onPlanCase={() => undefined}
        onReportCase={() => undefined}
      />
    );

    expect(screen.getByText('Web 4.0 Forge')).toBeInTheDocument();
    expect(screen.getByText('Terminal GUI preview')).toBeInTheDocument();
    expect(screen.getByText('Seed governed UI case')).toBeInTheDocument();
  });
});
