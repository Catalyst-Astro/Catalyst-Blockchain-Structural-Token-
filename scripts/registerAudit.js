require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");

/**
 * Submit the hash of an audit report to the AuditManager contract and optionally anchor it.
 */
async function register(hash, timestamp) {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "http://localhost:8545");
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  const auditManagerAbi = ["function registerAuditReport(bytes32,uint256)"];
  const auditManager = new ethers.Contract(process.env.AUDIT_MANAGER, auditManagerAbi, signer);
  const tx = await auditManager.registerAuditReport(hash, timestamp);
  await tx.wait();
  console.log("Audit report registered:", tx.hash);

  if (process.env.EVIDENCE_ANCHOR) {
    const anchorAbi = ["function anchorHash(bytes32,uint8,bytes32)"];
    const anchor = new ethers.Contract(process.env.EVIDENCE_ANCHOR, anchorAbi, signer);
    const anchorTx = await anchor.anchorHash(hash, 2, hash); // AnchorType.REPORT = 2
    await anchorTx.wait();
    console.log("Anchored in EvidenceAnchor:", anchorTx.hash);
  }
}

if (require.main === module) {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: node registerAudit.js <signedReportFile>");
    process.exit(1);
  }
  const data = fs.readFileSync(file);
  const hash = ethers.keccak256(data);
  const timestamp = Math.floor(Date.now() / 1000);
  register(hash, timestamp).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
