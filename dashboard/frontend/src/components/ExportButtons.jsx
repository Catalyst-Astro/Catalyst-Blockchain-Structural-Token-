import React from 'react';

export default function ExportButtons() {
  const exportCsv = () => {
    // Placeholder
    alert('Export CSV');
  };

  const exportPdf = () => {
    alert('Export PDF');
  };

  return (
    <div>
      <button onClick={exportCsv}>Exportar CSV</button>
      <button onClick={exportPdf}>Exportar PDF</button>
    </div>
  );
}
