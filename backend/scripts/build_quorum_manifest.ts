import fs from "fs";
import path from "path";
import { ethers } from "ethers";
import { canonicalJson } from "../api/utils";

const subjectId = process.argv[2];
const mode = process.argv[3] || "POA";
const signers = process.argv.slice(4); // list of signer addresses

if (!subjectId) {
  console.error("Usage: ts-node build_quorum_manifest.ts <subjectId> [mode] [signer1 signer2 ...]");
  process.exit(1);
}

const dataDir = path.join(process.cwd(), "backend", "database", "quorum");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const manifest = {
  subjectId,
  mode,
  signers,
  timestamp: new Date().toISOString(),
};

const manifestJson = canonicalJson(manifest);
const signersHash = ethers.keccak256(ethers.toUtf8Bytes(canonicalJson(signers)));
const quorumHash = ethers.keccak256(ethers.toUtf8Bytes(canonicalJson({ mode, signersCount: signers.length })));

const filePath = path.join(dataDir, `${subjectId}.json`);
fs.writeFileSync(filePath, manifestJson);
console.log(`Manifest written ${filePath}`);
console.log(`quorumHash=${quorumHash}`);
console.log(`signersHash=${signersHash}`);

const rpc = process.env.RPC_URL;
const pk = process.env.PRIVATE_KEY;
const consensusAddr = process.env.CONSENSUS_EVIDENCE_ADDRESS;
if (rpc && pk && consensusAddr) {
  const provider = new ethers.JsonRpcProvider(rpc);
  const signer = new ethers.Wallet(pk, provider);
  const abi = ["function recordEvidence(bytes32,uint8,bytes32,bytes32) external"];
  const c = new ethers.Contract(consensusAddr, abi, signer);
  c.recordEvidence(subjectId, modeStringToEnum(mode), quorumHash, signersHash)
    .then((tx: any) => tx.wait())
    .then((rcpt: any) => console.log(`Recorded on-chain tx=${rcpt.transactionHash}`))
    .catch((err: any) => console.error(`On-chain record failed: ${err.message}`));
} else {
  console.log("On-chain call skipped (missing env)");
}

function modeStringToEnum(m: string): number {
  const up = m.toUpperCase();
  if (up === "POW") return 0;
  if (up === "POA") return 1;
  if (up === "BFT") return 2;
  return 3;
}
