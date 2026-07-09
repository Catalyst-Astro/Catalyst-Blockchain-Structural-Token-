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

function TokenForm() {
  const [form, setForm] = useState({ name: '', symbol: '', supply: '', decimals: '18' });
  const [result, setResult] = useState(null);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    bc.connectBlockchain().then(() => bc.getTokenInfo()).then(setTokenInfo).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await bc.deployToken(form.name, form.symbol, form.supply, Number(form.decimals));
      setResult(res);
    } catch (err) {
      setResult({ error: err.message });
    }
    setLoading(false);
  };

  return (
    <section className="panel">
      <h2 className="panel-title">Tokenize Asset</h2>
      <p className="section-note">
        Deploy a new ERC-20 compatible token on the Catalyst network. Connected to chain ID:{' '}
        <code style={{color:'var(--green)'}}>31337</code> (Hardhat Local).
      </p>

      {/* Token actual info */}
      {tokenInfo && !tokenInfo.error && (
        <div className="result-card" style={{ marginBottom: 16 }}>
          <div className="result-title">Existing Token</div>
          <div className="result-row"><strong>Name:</strong> {tokenInfo.name}</div>
          <div className="result-row"><strong>Symbol:</strong> {tokenInfo.symbol}</div>
          <div className="result-row"><strong>Total Supply:</strong> {tokenInfo.totalSupply} {tokenInfo.symbol}</div>
        </div>
      )}

      <form className="token-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <label>Asset Name</label>
          <input type="text" placeholder="e.g. Project Alpha Shares" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="form-row">
          <label>Symbol</label>
          <input type="text" placeholder="e.g. ALPHA" maxLength={8} value={form.symbol}
            onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })} required />
        </div>
        <div className="form-row">
          <label>Initial Supply</label>
          <input type="number" placeholder="1000000" value={form.supply}
            onChange={(e) => setForm({ ...form, supply: e.target.value })} required />
        </div>
        <div className="form-row">
          <label>Decimals</label>
          <select value={form.decimals} onChange={(e) => setForm({ ...form, decimals: e.target.value })}>
            <option value="0">0 (Non-divisible)</option>
            <option value="6">6</option>
            <option value="18">18 (Standard)</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Deploying...' : 'Deploy Token'}
        </button>
      </form>

      {result && (
        <div className="result-card">
          {result.error ? (
            <>
              <div className="result-title" style={{color:'var(--red)'}}>Error</div>
              <div className="result-row">{result.error}</div>
            </>
          ) : (
            <>
              <div className="result-title">Token Deployed ✓</div>
              <div className="result-row"><strong>Name:</strong> {result.name}</div>
              <div className="result-row"><strong>Symbol:</strong> {result.symbol}</div>
              <div className="result-row"><strong>Supply:</strong> {result.supply}</div>
              <div className="result-row word-break"><strong>TX:</strong> {result.txHash}</div>
              <div className="result-row word-break"><strong>Address:</strong> {result.address}</div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function TracePanel() {
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    api.getEvents().then(setEvents).catch(() => {});
  }, []);

  const filtered = filter
    ? events.filter((e) =>
        e.module?.toLowerCase().includes(filter.toLowerCase()) ||
        e.message?.toLowerCase().includes(filter.toLowerCase()) ||
        e.type?.toLowerCase().includes(filter.toLowerCase())
      )
    : events.slice(0, 30);

  return (
    <section className="panel">
      <h2 className="panel-title">Traceability & Chain of Custody</h2>
      <p className="section-note">
        Every event is cryptographically anchored. On-chain evidence via{' '}
        <code style={{color:'var(--green)'}}>EventRegistry</code> at{' '}
        <code style={{fontSize:10,color:'var(--blue)'}}>0x4c58...3029</code>
      </p>
      <div className="form-row">
        <input type="text" placeholder="Filter by module, type, or message..."
          value={filter} onChange={(e) => setFilter(e.target.value)} className="search-input" />
      </div>
      <div className="trace-table-wrap">
        <table className="trace-table">
          <thead>
            <tr><th>Time</th><th>Module</th><th>Type</th><th>Severity</th><th>Message</th></tr>
          </thead>
          <tbody>
            {filtered.map((e, i) => (
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
        {filtered.length === 0 && <p className="dim pad">No matching events</p>}
      </div>
    </section>
  );
}

function WalletPanel() {
  const [address, setAddress] = useState('');
  const [balance, setBalance] = useState(null);
  const [tokenBalance, setTokenBalance] = useState(null);
  const [connected, setConnected] = useState(false);
  const [tokenInfo, setTokenInfo] = useState(null);

  useEffect(() => {
    bc.connectBlockchain().then(() => bc.getTokenInfo()).then(setTokenInfo).catch(() => {});
  }, []);

  const connectWallet = async () => {
    try {
      const wallet = await bc.connectWallet();
      setAddress(wallet.address);
      setBalance(wallet.balance);
      setConnected(true);

      // Obtener balance del token
      const tBal = await bc.getTokenBalance(wallet.address);
      setTokenBalance(tBal);
    } catch (err) {
      console.error('Wallet connection failed:', err);
    }
  };

  return (
    <section className="panel">
      <h2 className="panel-title">Wallet</h2>
      <p className="section-note">
        Connect to the local Hardhat node (chain ID 31337). Deployer account has ~10,000 ETH.
        {tokenInfo && !tokenInfo.error && (
          <span> Token: <strong style={{color:'var(--green)'}}>{tokenInfo.symbol}</strong> ({tokenInfo.name})</span>
        )}
      </p>
      {!connected ? (
        <button className="btn btn-primary" onClick={connectWallet}>
          Connect Wallet (Hardhat)
        </button>
      ) : (
        <div className="wallet-info">
          <div className="wallet-row">
            <span className="wallet-label">Address</span>
            <span className="wallet-addr">{address}</span>
          </div>
          <div className="wallet-row">
            <span className="wallet-label">ETH Balance</span>
            <span className="wallet-balance">{balance} ETH</span>
          </div>
          {tokenBalance && (
            <div className="wallet-row">
              <span className="wallet-label">Token Balance</span>
              <span className="wallet-balance">{tokenBalance} {tokenInfo?.symbol || 'CAT'}</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default function ClientPanel() {
  const [tab, setTab] = useState('tokenize');

  return (
    <div className="page">
      <div className="tab-bar">
        <Tab label="Tokenize Asset" active={tab === 'tokenize'} onClick={() => setTab('tokenize')} />
        <Tab label="Traceability" active={tab === 'trace'} onClick={() => setTab('trace')} />
        <Tab label="Wallet" active={tab === 'wallet'} onClick={() => setTab('wallet')} />
      </div>
      {tab === 'tokenize' && <TokenForm />}
      {tab === 'trace' && <TracePanel />}
      {tab === 'wallet' && <WalletPanel />}
    </div>
  );
}
