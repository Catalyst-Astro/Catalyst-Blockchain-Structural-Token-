const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'reports.json');

function load() {
  if (!fs.existsSync(DB_FILE)) {
    return [];
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function save(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function addReport(report) {
  const db = load();
  db.push({ ...report, timestamp: Date.now() });
  save(db);
}

function queryReports(projectId) {
  const db = load();
  return db.filter(r => r.projectId === projectId);
}

module.exports = { addReport, queryReports };
