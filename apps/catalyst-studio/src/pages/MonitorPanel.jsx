import React, { useState, useEffect, useCallback } from 'react';

function MetricCard({ label, value, unit, trend }) {
  return (
    <div className="card card-blue">
      <div className="card-label">{label}</div>
      <div className="card-value">{value ?? '...'}<span className="card-unit">{unit}</span></div>
      {trend && <div className={`card-trend ${trend > 0 ? 'up' : 'down'}`}>{trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%</div>}
    </div>
  );
}

export default function MonitorPanel() {
  const [gethBlock, setGethBlock] = useState(null);
  const [gethPeers, setGethPeers] = useState(null);
  const [gethSyncing, setGethSyncing] = useState(null);
  const [lhSyncing, setLhSyncing] = useState(null);
  const [diskUsed, setDiskUsed] = useState(null);
  const [ramUsed, setRamUsed] = useState(null);
  const [errors, setErrors] = useState([]);

  const refresh = useCallback(async () => {
    // Geth RPC
    try {
      const blockResp = await fetch('http://127.0.0.1:8545', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
      });
      const blockData = await blockResp.json();
      if (blockData.result) {
        setGethBlock(parseInt(blockData.result, 16));
      }
    } catch (e) {
      setErrors((prev) => [...prev.slice(-4), { msg: 'Geth RPC unreachable', time: new Date().toLocaleTimeString() }]);
    }

    try {
      const peerResp = await fetch('http://127.0.0.1:8545', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'net_peerCount', params: [], id: 1 }),
      });
      const peerData = await peerResp.json();
      if (peerData.result) {
        setGethPeers(parseInt(peerData.result, 16));
      }
    } catch {}

    try {
      const syncResp = await fetch('http://127.0.0.1:8545', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_syncing', params: [], id: 1 }),
      });
      const syncData = await syncResp.json();
      setGethSyncing(syncData.result);
    } catch {}

    // Lighthouse API
    try {
      const lhResp = await fetch('http://127.0.0.1:5052/eth/v1/node/syncing');
      const lhData = await lhResp.json();
      setLhSyncing(lhData.data);
    } catch {}

    // Catalyst API
    try {
      const healthResp = await fetch('/health');
      const healthData = await healthResp.json();
      setRamUsed(healthData);
    } catch {}
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  const gethProgress = gethSyncing && gethSyncing !== false
    ? {
        current: parseInt(gethSyncing.currentBlock, 16),
        highest: parseInt(gethSyncing.highestBlock, 16),
        pct: ((parseInt(gethSyncing.currentBlock, 16) / parseInt(gethSyncing.highestBlock, 16)) * 100).toFixed(2),
      }
    : null;

  return (
    <div className="page">
      <div className="card-grid">
        <MetricCard label="Geth Block" value={gethBlock?.toLocaleString()} unit="" />
        <MetricCard label="Geth Peers" value={gethPeers} unit="" />
        <MetricCard
          label="Geth Sync"
          value={gethSyncing === false ? 'Synced' : gethProgress ? `${gethProgress.pct}%` : '...'}
          unit=""
        />
        <MetricCard
          label="Lighthouse"
          value={lhSyncing ? (lhSyncing.is_syncing ? 'Syncing' : 'Synced') : '...'}
          unit=""
        />
      </div>

      {gethProgress && (
        <section className="panel">
          <h2 className="panel-title">Geth Sync Progress</h2>
          <div className="progress-bar-wrap">
            <div className="progress-bar" style={{ width: `${Math.min(100, parseFloat(gethProgress.pct))}%` }}>
              {gethProgress.pct}%
            </div>
          </div>
          <div className="progress-detail">
            Block {gethProgress.current.toLocaleString()} / {gethProgress.highest.toLocaleString()}
          </div>
        </section>
      )}

      <div className="grid-2col">
        <section className="panel">
          <h2 className="panel-title">Lighthouse Sync Detail</h2>
          {lhSyncing ? (
            <div className="sync-detail">
              <div className="sync-row">
                <span>Syncing</span>
                <span className={lhSyncing.is_syncing ? 'text-warning' : 'text-success'}>
                  {lhSyncing.is_syncing ? 'Active' : 'Complete'}
                </span>
              </div>
              {lhSyncing.head_slot && (
                <div className="sync-row">
                  <span>Head Slot</span>
                  <span>{lhSyncing.head_slot.toLocaleString()}</span>
                </div>
              )}
              {lhSyncing.sync_distance && (
                <div className="sync-row">
                  <span>Distance</span>
                  <span>{lhSyncing.sync_distance.toLocaleString()} slots</span>
                </div>
              )}
            </div>
          ) : (
            <p className="dim">Lighthouse API not accessible — is the consensus client running?</p>
          )}
        </section>

        <section className="panel">
          <h2 className="panel-title">System Alerts</h2>
          <div className="event-feed" style={{ maxHeight: 200, overflowY: 'auto' }}>
            {errors.map((e, i) => (
              <div key={i} className="event-row event-critical">
                <span className="event-time">{e.time}</span>
                <span className="event-msg">{e.msg}</span>
              </div>
            ))}
            {errors.length === 0 && <div className="alert-clear">✓ All connections healthy</div>}
          </div>
        </section>
      </div>

      <section className="panel">
        <h2 className="panel-title">Node Endpoints</h2>
        <div className="endpoint-grid">
          {[
            { name: 'Geth RPC', url: 'http://127.0.0.1:8545' },
            { name: 'Geth WebSocket', url: 'ws://127.0.0.1:8546' },
            { name: 'Lighthouse API', url: 'http://127.0.0.1:5052' },
            { name: 'Catalyst API', url: 'http://127.0.0.1:8000' },
            { name: 'Geth Metrics', url: 'http://127.0.0.1:6060/debug/metrics' },
            { name: 'LH Metrics', url: 'http://127.0.0.1:5054/metrics' },
          ].map((ep) => (
            <div key={ep.name} className="endpoint-card">
              <div className="endpoint-name">{ep.name}</div>
              <code className="endpoint-url">{ep.url}</code>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
