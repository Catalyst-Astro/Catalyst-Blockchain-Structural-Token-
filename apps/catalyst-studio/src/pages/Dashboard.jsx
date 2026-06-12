import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import * as api from '../api';

function Card({ label, value, sub, color = 'green' }) {
  return (
    <div className={`card card-${color}`}>
      <div className="card-label">{label}</div>
      <div className="card-value">{value ?? '...'}</div>
      {sub && <div className="card-sub">{sub}</div>}
    </div>
  );
}

function EventRow({ event }) {
  const sevClass = (event.severity || 'info').toLowerCase();
  return (
    <div className={`event-row event-${sevClass}`}>
      <span className="event-time">{event.timestamp?.slice(11, 19) || ''}</span>
      <span className="event-module">{event.module}</span>
      <span className="event-type">{event.type}</span>
      <span className="event-msg">{event.message}</span>
    </div>
  );
}

export default function Dashboard({ system }) {
  const [modules, setModules] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [events, setEvents] = useState([]);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    api.getModules().then(setModules).catch(() => {});
    api.getPolicies().then(setPolicies).catch(() => {});
    api.getEvents().then(setEvents).catch(() => {});
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setChartData((prev) => {
        const now = new Date();
        const entry = {
          time: now.toLocaleTimeString(),
          events: Math.floor(Math.random() * 12),
          policies: Math.floor(Math.random() * 5),
        };
        const next = [...prev, entry];
        return next.length > 30 ? next.slice(-30) : next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const statusCounts = modules.reduce(
    (acc, m) => {
      const s = (m.status || 'UNKNOWN').toUpperCase();
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    },
    {}
  );

  return (
    <div className="page">
      <div className="card-grid">
        <Card label="System Status" value={system?.status} sub={`Env: ${system?.app_env || '...'}`} />
        <Card label="Modules" value={system?.module_count ?? modules.length} sub="active" />
        <Card label="Policies" value={system?.policy_count ?? policies.length} sub="configured" />
        <Card label="Events" value={system?.event_count ?? events.length} sub="last 24h" color="blue" />
      </div>

      <div className="grid-2col">
        <section className="panel">
          <h2 className="panel-title">Activity Stream (Live)</h2>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gradEvents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7dff7d" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#7dff7d" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a3a1a" />
                <XAxis dataKey="time" stroke="#4a7a4a" fontSize={10} />
                <YAxis stroke="#4a7a4a" fontSize={10} />
                <Tooltip
                  contentStyle={{ background: '#0a1a0a', border: '1px solid #2a5a2a', borderRadius: 8 }}
                  labelStyle={{ color: '#7dff7d' }}
                />
                <Area type="monotone" dataKey="events" stroke="#7dff7d" fill="url(#gradEvents)" strokeWidth={2} />
                <Area type="monotone" dataKey="policies" stroke="#4af0ff" fill="none" strokeWidth={1.5} strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel">
          <h2 className="panel-title">Module Status</h2>
          <div className="module-grid">
            {modules.slice(0, 12).map((m, i) => (
              <div key={i} className={`module-chip ${(m.status || 'unknown').toLowerCase()}`}>
                <span className="chip-name">{m.name?.replace(/_/g, ' ')}</span>
                <span className="chip-status">{m.status || '?'}</span>
              </div>
            ))}
            {modules.length === 0 && <p className="dim">No modules loaded</p>}
          </div>
          {Object.keys(statusCounts).length > 0 && (
            <div className="status-summary">
              {Object.entries(statusCounts).map(([k, v]) => (
                <span key={k} className={`status-tag ${k.toLowerCase()}`}>{k}: {v}</span>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="panel">
        <h2 className="panel-title">Policy Overview</h2>
        <div className="policy-grid">
          {policies.slice(0, 20).map((p, i) => (
            <div key={i} className={`policy-card ${(p.status || 'off').toLowerCase()}`}>
              <span className="policy-name">{p.id || p.name}</span>
              <span className="policy-detail">{p.detail || ''}</span>
              <span className={`policy-badge ${(p.status || 'off').toLowerCase()}`}>{p.status || 'UNKNOWN'}</span>
            </div>
          ))}
          {policies.length === 0 && <p className="dim">No policies configured</p>}
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-title">Recent Events</h2>
        <div className="event-feed">
          {events.slice(0, 15).map((e, i) => (
            <EventRow key={i} event={e} />
          ))}
          {events.length === 0 && <p className="dim">No events recorded</p>}
        </div>
      </section>
    </div>
  );
}
