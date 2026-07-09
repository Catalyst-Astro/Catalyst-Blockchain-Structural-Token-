import fs from "fs";
import path from "path";
import { ethers } from "ethers";
import { ensureFile, appendJsonl, canonicalJson } from "../api/utils";

const findingsPath = path.join(process.cwd(), "auditor", "findings.jsonl");
ensureFile(findingsPath);

export function recordFinding(finding: any) {
  const canonical = canonicalJson(finding);
  const fid = ethers.keccak256(ethers.toUtf8Bytes(canonical));
  appendJsonl(findingsPath, { fid, ...finding, canonical });
  return fid;
}

if (require.main === module) {
  const sample = {
    eid: "0x01",
    wallet: "0xabc",
    ruleId: "risk_mismatch",
    severity: "HIGH",
    description: "Risk score above threshold",
    evidenceVIDs: [],
    createdAt: new Date().toISOString(),
  };
  const fid = recordFinding(sample);
  console.log(`Recorded finding ${fid}`);
}
