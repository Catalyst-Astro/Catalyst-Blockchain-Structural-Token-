import React from 'react';

export default function SidebarFilter({ filters, setFilters }) {
  return (
    <aside className="w-60 p-4 space-y-4 bg-gray-100 dark:bg-gray-900">
      <div>
        <label className="block text-sm font-medium mb-1">DAO</label>
        <input
          className="w-full rounded border-gray-300 dark:bg-gray-700 dark:text-white"
          value={filters.dao || ''}
          onChange={e => setFilters(f => ({ ...f, dao: e.target.value }))}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Principio</label>
        <input
          className="w-full rounded border-gray-300 dark:bg-gray-700 dark:text-white"
          value={filters.principio || ''}
          onChange={e => setFilters(f => ({ ...f, principio: e.target.value }))}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Tipo de Evento</label>
        <input
          className="w-full rounded border-gray-300 dark:bg-gray-700 dark:text-white"
          value={filters.tipo || ''}
          onChange={e => setFilters(f => ({ ...f, tipo: e.target.value }))}
        />
      </div>
    </aside>
  );
}
