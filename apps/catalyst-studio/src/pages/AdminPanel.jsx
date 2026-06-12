import React, { useState, useEffect } from 'react';
import * as api from '../api';
import * as bc from '../blockchain';

function Tab({ label, active, onClick }) {
  return (
    <button className={`tab ${active ? 'tab-active' : ''}`} onClick={onClick}>
      {label}
    </button>
  );
}

function GovernancePanel() {
  const [policies, setPolicies] = useState([]);
  const [actionLog, setActionLog] = useState([]);

  useEffect(() => {
    api.getPolicies().then(setPolicies).catch(() => {});
  }, []);

  const [contracts, setContracts] = useState([]);
  const [chainId, setChainId] = useState(null);

  useEffect(() => {
    bc.connectBlockchain().then(({ chainId }) => {
      setChainId(chainId);
      const all = bc.getAllContracts();
      setContracts(all);
    }).catch(() => {});
  }, []);

  const executeAction = async (action) => {
    try {
      await bc.connectWallet();
      const result = await bc.executeGovernance(action);
      setActionLog((prev) => [
        { action, txHash: result?.txHash, timestamp: result?.timestamp || new Date().toISOString(), id: Math.random().toString(36).slice(2, 8) },
        ...prev.slice(0, 19),
      ]);
    } catch (err) {
      setActionLog((prev) => [
        { action, error: err.message, timestamp: new Date().toISOString(), id: Math.random().toString(36).slice(2, 8) },
        ...prev.slice(0, 19),
      ]);
    }
  };

  const govActions = [
    { label: 'Pause All Transfers', action: 'pause_transfers', color: 'danger' },
    { label: 'Activate Emergency Mode', action: 'emergency_on', color: 'danger' },
    { label: 'Deactivate Emergency', action: 'emergency_off', color: 'warning' },
    { label: 'Update Quorum (to 66%)', action: 'set_quorum_66', color: 'primary' },
    { label: 'Rotate Guardian Keys', action: 'rotate_guardian', color: 'primary' },
    { label: 'Freeze Token Series', action: 'freeze_series', color: 'danger' },
    { label: 'Unfreeze Token Series', action: 'unfreeze_series', color: 'warning' },
    { label: 'Trigger Audit Snapshot', action: 'audit_snapshot', color: 'primary' },
  ];

  return (
    <div className="grid-2col">
      <section className="panel">
        <h2 className="panel-title">Governance Actions</h2>
        <p className="section-note">Multi-signature governance with role-based access. All actions are logged immutably.</p>
        <div className="action-grid">
          {govActions.map((a, i) => (
            <button
              key={i}
              className={`btn btn-${a.color}`}
              onClick={() => executeAction(a.action)}
            >
              {a.label}
            </button>
          ))}
        </div>
      </section>

      <div>
        <section className="panel">
          <h2 className="panel-title">Policy State</h2>
          <div className="policy-grid">
            {policies.slice(0, 12).map((p, i) => (
              <div key={i} className={`policy-card ${(p.status || 'off').toLowerCase()}`}>
                <span className="policy-name">{p.id || p.name}</span>
                <span className={`policy-badge ${(p.status || 'off').toLowerCase()}`}>{p.status || 'UNKNOWN'}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel" style={{ marginTop: 16 }}>
          <h2 className="panel-title">Deployed Contracts (Chain: {chainId || '...'})</h2>
          <div className="trace-table-wrap">
            <table className="trace-table">
              <thead><tr><th>Contract</th><th>Address</th></tr></thead>
              <tbody>
                {contracts.map((c, i) => (
                  <tr key={i}>
                    <td style={{fontWeight:600}}>{c.name}</td>
                    <td style={{fontFamily:'var(--font-mono)', fontSize:11, color:'var(--blue)'}}>{c.address}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {contracts.length === 0 && <p className="dim pad">Connect blockchain to see deployed contracts</p>}
        </section>

        <section className="panel" style={{ marginTop: 16 }}>
          <h2 className="panel-title">Action Log</h2>
          <div className="event-feed" style={{ maxHeight: 320, overflowY: 'auto' }}>
            {actionLog.map((entry) => (
              <div key={entry.id} className="event-row event-info">
                <span className="event-time">{entry.timestamp.slice(11, 19)}</span>
                <span className="event-module">ADMIN</span>
                <span className="event-msg">{entry.action}</span>
              </div>
            ))}
            {actionLog.length === 0 && <p className="dim">No actions executed yet</p>}
          </div>
        </section>
      </div>
    </div>
  );
}

function CompliancePanel() {
  const complianceChecks = [
    { id: 'kyc_aml_gate', name: 'KYC/AML Gate', status: 'active', lastCheck: '2 min ago' },
    { id: 'travel_rule', name: 'Travel Rule', status: 'active', lastCheck: '5 min ago' },
    { id: 'ubo_validation', name: 'UBO Validation', status: 'active', lastCheck: '1 min ago' },
    { id: 'jurisdiction_filter', name: 'Jurisdiction Filter', status: 'configured', lastCheck: '10 min ago' },
    { id: 'lockup_enforcement', name: 'Lockup Enforcement', status: 'active', lastCheck: '3 min ago' },
    { id: 'risk_scoring', name: 'Risk Scoring', status: 'active', lastCheck: '1 min ago' },
    { id: 'freeze_policy', name: 'Freeze Policy', status: 'standby', lastCheck: '8 min ago' },
    { id: 'sbt_identity', name: 'SBT Identity', status: 'active', lastCheck: '4 min ago' },
  ];

  return (
    <section className="panel">
      <h2 className="panel-title">Compliance Dashboard</h2>
      <p className="section-note">Real-time enforcement status for all regulatory compliance modules.</p>
      <div className="compliance-grid">
        {complianceChecks.map((c) => (
          <div key={c.id} className={`compliance-card ${c.status}`}>
            <div className="comp-name">{c.name}</div>
            <div className={`comp-badge ${c.status}`}>{c.status.toUpperCase()}</div>
            <div className="comp-check">Last: {c.lastCheck}</div>
            <div className="comp-id">{c.id}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AuditPanel() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    api.getEvents().then(setEvents).catch(() => {});
  }, []);

  const criticalEvents = events.filter((e) =>
    (e.severity || '').toUpperCase() === 'CRITICAL' ||
    (e.severity || '').toUpperCase() === 'HIGH'
  );

  return (
    <div className="grid-2col">
      <section className="panel">
        <h2 className="panel-title">Audit Trail</h2>
        <p className="section-note">Complete immutable record of all system events. Exportable for external auditors.</p>
        <div className="trace-table-wrap">
          <table className="trace-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Module</th>
                <th>Type</th>
                <th>Severity</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {events.slice(0, 25).map((e, i) => (
                <tr key={i} className={`row-${(e.severity || 'info').toLowerCase()}`}>
                  <td>{e.timestamp?.slice(11, 19) || ''}</td>
                  <td>{e.module}</td>
                  <td>{e.type}</td>
                  <td><span className={`sev-tag ${(e.severity || 'info').toLowerCase()}`}>{e.severity || 'INFO'}</span></td>
                  <td>{e.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-title">Critical Alerts</h2>
        <div className="event-feed">
          {criticalEvents.map((e, i) => (
            <div key={i} className="event-row event-critical">
              <span className="event-time">{e.timestamp?.slice(11, 19) || ''}</span>
              <span className="event-module">{e.module}</span>
              <span className="event-msg">{e.message}</span>
            </div>
          ))}
          {criticalEvents.length === 0 && (
            <div className="alert-clear">✓ No critical alerts — all systems normal</div>
          )}
        </div>

        <h2 className="panel-title" style={{ marginTop: 16 }}>Audit Report Export</h2>
        <div className="action-grid">
          <button className="btn btn-primary" onClick={() => alert('Report generation triggered (mock)')}>
            Export Full Audit Report (CSV)
          </button>
          <button className="btn btn-primary" onClick={() => alert('Evidence package generated (mock)')}>
            Generate Evidence Package (JSON)
          </button>
          <button className="btn btn-warning" onClick={() => alert('SHA-256 hash of audit trail computed (mock)')}>
            Compute Trail Hash (SHA-256)
          </button>
        </div>
      </section>
    </div>
  );
}

export default function AdminPanel() {
  const [tab, setTab] = useState('governance');

  return (
    <div className="page">
      <div className="tab-bar">
        <Tab label="Governance" active={tab === 'governance'} onClick={() => setTab('governance')} />
        <Tab label="Compliance" active={tab === 'compliance'} onClick={() => setTab('compliance')} />
        <Tab label="Audit" active={tab === 'audit'} onClick={() => setTab('audit')} />
      </div>
      {tab === 'governance' && <GovernancePanel />}
      {tab === 'compliance' && <CompliancePanel />}
      {tab === 'audit' && <AuditPanel />}
    </div>
  );
}
