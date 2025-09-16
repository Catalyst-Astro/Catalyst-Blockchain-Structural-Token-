const fs = require('fs');
const { spawnSync } = require('child_process');
const path = require('path');

/**
 * Convert stored events to CSV and sign with PGP.
 * Requires `gpg` installed and a configured key.
 */
function generateReport() {
  const data = JSON.parse(fs.readFileSync('backend/database/events.json'));
  const csvLines = ['id,wallet,type,timestamp'];
  for (const ev of data) {
    csvLines.push(`${ev.id},${ev.wallet},${ev.type},${ev.timestamp}`);
  }
  const csv = csvLines.join('\n');
  const file = path.join('backend', 'database', 'audit_report.csv');
  fs.writeFileSync(file, csv);

  // Sign file using gpg
  spawnSync('gpg', ['--yes', '--output', file + '.asc', '--sign', file], { stdio: 'inherit' });
  console.log('Report generated at', file);
}

generateReport();
