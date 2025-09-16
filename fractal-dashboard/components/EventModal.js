import React from 'react';

export default function EventModal({ block, onClose }) {
  if (!block) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">Detalle del Evento</h2>
        <ul className="space-y-2 text-sm">
          <li><strong>Timestamp:</strong> {block.timestamp}</li>
          <li><strong>Evento Simbólico:</strong> {block.evento}</li>
          <li><strong>Validador:</strong> {block.validador}</li>
          <li><strong>Hash:</strong> {block.hash_simb}</li>
          <li><strong>Firma:</strong> {block.firma}</li>
          {block.ipfs && (
            <li><a href={block.ipfs} className="text-blue-500 underline" target="_blank" rel="noreferrer">Ver en IPFS</a></li>
          )}
        </ul>
        <button className="mt-4 px-4 py-2 bg-indigo-500 text-white rounded" onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
}
