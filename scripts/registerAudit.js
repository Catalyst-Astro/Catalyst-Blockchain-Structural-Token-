const { ethers } = require('ethers');
const fs = require('fs');

/**
 * Submit the hash of an audit report to the AuditManager contract.
 */
async function register(hash, timestamp) {
  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL || 'http://localhost:8545');
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  const auditManagerAbi = ['function registerAuditReport(bytes32,uint256)'];
  const auditManager = new ethers.Contract(process.env.AUDIT_MANAGER, auditManagerAbi, signer);
  const tx = await auditManager.registerAuditReport(hash, timestamp);
  await tx.wait();
  console.log('Audit report registered:', tx.hash);
}

if (require.main === module) {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node registerAudit.js <signedReportFile>');
    process.exit(1);
  }
  const data = fs.readFileSync(file);
  const hash = ethers.utils.keccak256(data);
  const timestamp = Math.floor(Date.now() / 1000);
  register(hash, timestamp).catch(err => { console.error(err); process.exit(1); });
}
