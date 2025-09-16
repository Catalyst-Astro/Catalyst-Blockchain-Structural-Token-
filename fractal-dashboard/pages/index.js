import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ethers } from 'ethers';
import BlockNode from '../components/BlockNode';
import EventModal from '../components/EventModal';
import SidebarFilter from '../components/SidebarFilter';
import useSymbolicEvents from '../hooks/useSymbolicEvents';
import '../index.css';

function Dashboard() {
  const [filters, setFilters] = useState({});
  const [selected, setSelected] = useState(null);
  const [provider, setProvider] = useState(null);

  async function connect() {
    if (window.ethereum) {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      setProvider(new ethers.BrowserProvider(window.ethereum));
    }
  }

  const events = useSymbolicEvents(provider);

  const filtered = events.filter(ev => {
    if (filters.dao && ev.dao !== filters.dao) return false;
    if (filters.principio && ev.principio !== filters.principio) return false;
    if (filters.tipo && ev.tipo !== filters.tipo) return false;
    return true;
  });

  return (
    <div className="min-h-screen flex dark:bg-gray-800 dark:text-white">
      <SidebarFilter filters={filters} setFilters={setFilters} />
      <main className="flex-1 p-4 space-y-4">
        {!provider && <button className="px-4 py-2 bg-indigo-500 text-white rounded" onClick={connect}>Conectar Web3</button>}
        <div className="grid grid-cols-4 gap-4">
          {filtered.map((block, idx) => (
            <BlockNode key={idx} block={block} onClick={setSelected} />
          ))}
        </div>
      </main>
      <EventModal block={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Dashboard />);
}
