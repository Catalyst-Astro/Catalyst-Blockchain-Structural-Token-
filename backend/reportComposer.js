// Compose a simple self evaluation report
const fs = require('fs');

function composeReport(report) {
  const md = `# Informe de Autoevaluacion\n\n` +
    `Ciclo: ${report.cycle}\n` +
    `Salud: ${report.health}\n` +
    `Resonancia: ${report.resonance}\n` +
    `Fractura: ${report.fracture}\n` +
    `Sugerencias: ${report.suggestions}\n`;
  fs.writeFileSync('autoevaluacion.md', md);
  console.log('Report generated');
}

const json = fs.readFileSync('report.json');
const report = JSON.parse(json);
composeReport(report);
