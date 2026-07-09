import React, { useState, useEffect } from 'react';
import * as api from '../api';

/**
 * PentetraktysPanel — Zettelkasten 4D visualization for Catalyst tokens.
 *
 * Displays the 5-phase dialectical cycle (Tesis → Antítesis → Síntesis →
 * Conclusión → Hybrys) for each token: CAT, FRT, FLT, AIM.
 *
 * 4 Cognitive Pillars mapped:
 *   Pillar 1 (Top-Down/Cardinal): Base rate / supply cap
 *   Pillar 2 (Bottom-Up/Ordinal): Usage metrics / fees generated
 *   Pillar 3 (Forward): Projected value / liquidity trend
 *   Pillar 4 (Reward): Health score / volatility
 */

const PHASES = ['tesis', 'antitesis', 'sintesis', 'conclusion', 'hybrys'];
const PHASE_COLORS = {
  tesis:      '#ffd700',
  antitesis:  '#ff6b6b',
  sintesis:   '#4af0ff',
  conclusion: '#7dff7d',
  hybrys:     '#ff4444',
};
const PHASE_ICONS = {
  tesis:      '🔺',
  antitesis:  '🔻',
  sintesis:   '⚖️',
  conclusion: '🚀',
  hybrys:     '⚠️',
};

function PhaseBadge({ phase, active }) {
  return (
    <div
      className={`phase-badge ${active ? 'phase-active' : ''}`}
      style={{
        borderColor: PHASE_COLORS[phase],
        color: active ? PHASE_COLORS[phase] : '#555',
        opacity: active ? 1 : 0.4,
      }}
    >
      <span style={{ fontSize: 18 }}>{PHASE_ICONS[phase]}</span>
      <span style={{ textTransform: 'capitalize' }}>{phase}</span>
    </div>
  );
}

function PillarBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="pillar-row">
      <span className="pillar-label">{label}</span>
      <div className="pillar-track">
        <div
          className="pillar-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="pillar-value">{value}</span>
    </div>
  );
}

function TokenCard({ token }) {
  const phaseIdx = PHASES.indexOf(token.phase || 'tesis');

  return (
    <div className="pent-card" style={{ borderLeft: `3px solid ${PHASE_COLORS[token.phase] || '#555'}` }}>
      <div className="pent-card-header">
        <span className="pent-token-symbol" style={{ color: token.color }}>
          {token.symbol}
        </span>
        <span className="pent-token-name">{token.name}</span>
        <span
          className="pent-hybrys-badge"
          style={{
            background: token.hybrys ? '#ff444422' : 'transparent',
            color: token.hybrys ? '#ff4444' : 'transparent',
            border: token.hybrys ? '1px solid #ff4444' : '1px solid transparent',
          }}
        >
          {token.hybrys ? '⚡ HYBRYS' : ''}
        </span>
      </div>

      <div className="pent-phases">
        {PHASES.map((p, i) => (
          <PhaseBadge key={p} phase={p} active={i <= phaseIdx} />
        ))}
      </div>

      <div className="pent-pillars">
        <PillarBar label="Cardinal (T-D)" value={token.pillarCardinal} max={100} color="#ffd700" />
        <PillarBar label="Ordinal (B-U)"  value={token.pillarOrdinal}  max={100} color="#ff6b6b" />
        <PillarBar label="Forward"        value={token.pillarForward}  max={100} color="#7dff7d" />
        <PillarBar label="Reward"         value={token.pillarReward}   max={100} color="#4af0ff" />
      </div>

      <div className="pent-detail">
        <span className="pent-detail-item">
          Tesis: {token.tesis?.slice(0, 40)}...
        </span>
        <span className="pent-detail-item">
          Forward: {token.forwardSummary || '—'}
        </span>
      </div>
    </div>
  );
}

export default function PentetraktysPanel({ contracts }) {
  const [tokens, setTokens] = useState([
    {
      symbol: 'CAT',
      name: 'Catalyst Token',
      color: '#ffd700',
      phase: 'sintesis',
      hybrys: false,
      pillarCardinal: 80,
      pillarOrdinal: 45,
      pillarForward: 60,
      pillarReward: 70,
      tesis: 'Utility token para servicios platform. 1 CAT ≈ $0.10 USD ≈ $2.00 MXN.',
      forwardSummary: 'Sepolia pool Uniswap → Q3 2026',
    },
    {
      symbol: 'FRT',
      name: 'Fractal Reward Token',
      color: '#7dff7d',
      phase: 'tesis',
      hybrys: false,
      pillarCardinal: 60,
      pillarOrdinal: 20,
      pillarForward: 35,
      pillarReward: 45,
      tesis: 'Token de recompensa inflacionario. 25% de fees CAT → FRT pool.',
      forwardSummary: 'Staking activo, distribución pendiente a auditores',
    },
    {
      symbol: 'FLT',
      name: 'Fractal Token',
      color: '#4af0ff',
      phase: 'conclusion',
      hybrys: false,
      pillarCardinal: 90,
      pillarOrdinal: 70,
      pillarForward: 75,
      pillarReward: 85,
      tesis: 'Token regulado con compliance engines (Whitelist + KYC + Identity + Freeze).',
      forwardSummary: '4 motores activos. Risk Limits en siguiente fase.',
    },
    {
      symbol: 'AIM',
      name: 'AI Module Token',
      color: '#ff6b6b',
      phase: 'antitesis',
      hybrys: true,
      pillarCardinal: 50,
      pillarOrdinal: 30,
      pillarForward: 55,
      pillarReward: 25,
      tesis: 'AI compute token. 1 CAT = 10 AIM. 5 tiers de servicio.',
      forwardSummary: '⚠️ Pricing adaptativo activado. Demanda baja en AI Training.',
    },
  ]);

  const [selectedToken, setSelectedToken] = useState(0);
  const [cycleLog, setCycleLog] = useState([]);

  useEffect(() => {
    // Fetch on-chain Pentetraktys state from contracts if available
    if (contracts?.length > 0) {
      // In production: call getServicePentetraktys() on AIServiceMeter
      // and getValuationPentetraktys() on MXNPriceOracle
      setCycleLog((prev) => [
        ...prev.slice(-19),
        {
          time: new Date().toLocaleTimeString(),
          msg: 'Pentetraktys cycle polled from contracts',
        },
      ]);
    }
  }, [contracts]);

  const advancePhase = (idx) => {
    setTokens((prev) =>
      prev.map((t, i) => {
        if (i !== idx) return t;
        const currentIdx = PHASES.indexOf(t.phase);
        const nextIdx = (currentIdx + 1) % PHASES.length;
        const nextPhase = PHASES[nextIdx];
        const isHybrys = nextPhase === 'hybrys';
        return {
          ...t,
          phase: nextPhase,
          hybrys: isHybrys,
          pillarReward: isHybrys ? Math.max(5, t.pillarReward - 30) : t.pillarReward,
        };
      })
    );
    setCycleLog((prev) => [
      ...prev.slice(-19),
      {
        time: new Date().toLocaleTimeString(),
        msg: `${tokens[idx].symbol} → ${PHASES[(PHASES.indexOf(tokens[idx].phase) + 1) % PHASES.length]}`,
      },
    ]);
  };

  const resetCycle = (idx) => {
    setTokens((prev) =>
      prev.map((t, i) => {
        if (i !== idx) return t;
        return { ...t, phase: 'tesis', hybrys: false, pillarReward: 50 };
      })
    );
    setCycleLog((prev) => [
      ...prev.slice(-19),
      { time: new Date().toLocaleTimeString(), msg: `${tokens[idx].symbol} → RESET (Nueva Tesis desde Hybrys)` },
    ]);
  };

  return (
    <div className="page">
      <div className="pent-header">
        <h1 className="pent-title">🔺 Pentetraktys 4D — Visor Dialéctico</h1>
        <p className="pent-subtitle">
          Tesis → Antítesis → Síntesis → Conclusión → Hybrys
        </p>
      </div>

      <div className="pent-grid">
        {tokens.map((token, i) => (
          <div key={token.symbol} onClick={() => setSelectedToken(i)}>
            <TokenCard token={token} />
            <div className="pent-actions">
              <button
                className="btn btn-sm"
                onClick={(e) => { e.stopPropagation(); advancePhase(i); }}
                disabled={token.phase === 'hybrys'}
              >
                {token.phase === 'hybrys' ? '⚡ En Hybrys' : '▶ Avanzar fase'}
              </button>
              {token.phase === 'hybrys' && (
                <button
                  className="btn btn-sm btn-warn"
                  onClick={(e) => { e.stopPropagation(); resetCycle(i); }}
                >
                  🔄 Reset (Nueva Tesis)
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Detail view for selected token */}
      {tokens[selectedToken] && (
        <section className="panel" style={{ marginTop: 24 }}>
          <h2 className="panel-title">
            {tokens[selectedToken].symbol} — Ciclo Pentetraktys Detallado
          </h2>
          <div className="pent-cycle-detail">
            {PHASES.map((phase) => {
              const isActive = PHASES.indexOf(tokens[selectedToken].phase) >= PHASES.indexOf(phase);
              return (
                <div
                  key={phase}
                  className={`pent-phase-detail ${isActive ? 'active' : ''}`}
                  style={{
                    borderColor: PHASE_COLORS[phase],
                    opacity: isActive ? 1 : 0.3,
                  }}
                >
                  <div className="phase-icon" style={{ color: PHASE_COLORS[phase] }}>
                    {PHASE_ICONS[phase]}
                  </div>
                  <div className="phase-name" style={{ textTransform: 'capitalize' }}>{phase}</div>
                  <div className="phase-desc">
                    {phase === 'tesis' && 'Regla inicial / hipótesis cardinal'}
                    {phase === 'antitesis' && 'Dato contradictorio / error de predicción'}
                    {phase === 'sintesis' && 'Nueva verdad integrada'}
                    {phase === 'conclusion' && 'Acción ejecutable (Forward)'}
                    {phase === 'hybrys' && 'Exceso de confianza detectado'}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Cycle log */}
      <section className="panel" style={{ marginTop: 24 }}>
        <h2 className="panel-title">Registro de Ciclos</h2>
        <div className="event-feed">
          {cycleLog.length === 0 && <p className="dim">Sin eventos. Avanza una fase para iniciar el registro.</p>}
          {cycleLog.map((entry, i) => (
            <div key={i} className="event-row">
              <span className="event-time">{entry.time}</span>
              <span className="event-msg">{entry.msg}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
