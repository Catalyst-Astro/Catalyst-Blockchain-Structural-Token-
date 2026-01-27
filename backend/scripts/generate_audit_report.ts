import fs from "fs";
import path from "path";
import { ethers } from "ethers";
import { canonicalJson } from "../api/utils";

const findingsPath = path.join(process.cwd(), "auditor", "findings.jsonl");
const reportsDir = path.join(process.cwd(), "reports");

interface Finding {
  fid: string;
  ruleId: string;
  severity: string;
  description: string;
  eid?: string;
  wallet?: string;
  evidenceVIDs?: string[];
  createdAt: string;
}

function readFindings(): Finding[] {
  if (!fs.existsSync(findingsPath)) return [];
  return fs
    .readFileSync(findingsPath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

function toCsv(findings: Finding[]) {
  const header = "fid,ruleId,severity,eid,wallet,description,createdAt";
  const rows = findings.map((f) =>
    [f.fid, f.ruleId, f.severity, f.eid ?? "", f.wallet ?? "", f.description, f.createdAt]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  return [header, ...rows].join("\n");
}

async function main() {
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
  const findings = readFindings();
  if (findings.length === 0) {
    console.log("No findings to report");
    return;
  }

  const csv = toCsv(findings);
  const reportHash = ethers.keccak256(ethers.toUtf8Bytes(csv));
  const periodHash = ethers.keccak256(ethers.toUtf8Bytes("period-aggregate"));
  const batchId = ethers.ZeroHash;
  const rid = ethers.keccak256(ethers.concat([ethers.getBytes(reportHash), ethers.getBytes(periodHash), ethers.getBytes(batchId)]));

  const csvPath = path.join(reportsDir, `${rid}.csv`);
  fs.writeFileSync(csvPath, csv, "utf8");

  // pseudo-signature: hash of hash for demo purposes
  const signature = ethers.keccak256(ethers.getBytes(reportHash));
  fs.writeFileSync(path.join(reportsDir, `${rid}.sig`), signature);
  fs.writeFileSync(
    path.join(reportsDir, `${rid}.json`),
    JSON.stringify({ rid, reportHash, periodHash, batchId, signature, createdAt: new Date().toISOString() }, null, 2)
  );

  console.log(`Report generated rid=${rid} hash=${reportHash}`);

  const rpc = process.env.RPC_URL;
  const pk = process.env.PRIVATE_KEY;
  const registryAddr = process.env.AUDIT_REPORT_REGISTRY;
  if (rpc && pk && registryAddr) {
    const provider = new ethers.JsonRpcProvider(rpc);
    const signer = new ethers.Wallet(pk, provider);
    const abi = ["function registerReport(bytes32,bytes32,bytes32,bytes32) external"];
    const registry = new ethers.Contract(registryAddr, abi, signer);
    const tx = await registry.registerReport(rid, reportHash, periodHash, batchId);
    await tx.wait();
    console.log(`Report registered on-chain tx=${tx.hash}`);
  } else {
    console.log("On-chain registration skipped (missing env)");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
