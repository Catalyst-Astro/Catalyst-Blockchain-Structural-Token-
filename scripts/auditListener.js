const { ethers } = require('ethers');
const fs = require('fs');

/**
 * Simple listener that connects to an Ethereum node and stores relevant events
 * in a structured database. For this example we simply append to a JSON file.
 */
async function main() {
  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL || 'http://localhost:8545');

  const auditManagerAbi = [
    'event AuditEventRecorded(uint256 indexed id, address indexed wallet, string eventType)'
  ];

  const auditManager = new ethers.Contract(process.env.AUDIT_MANAGER, auditManagerAbi, provider);

  auditManager.on('AuditEventRecorded', (id, wallet, type) => {
    const record = { id: id.toNumber(), wallet, type, timestamp: Date.now() };
    const file = 'backend/database/events.json';
    const data = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : [];
    data.push(record);
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    console.log('Recorded event', record);
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
