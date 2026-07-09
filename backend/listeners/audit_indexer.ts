import fs from "fs";
import path from "path";
import { ethers } from "ethers";
import { ensureFile, appendJsonl } from "../api/utils";

const rpcUrl = process.env.RPC_URL;
const eventRegistryAddress = process.env.EVENT_REGISTRY_ADDRESS;
const evidenceAnchorAddress = process.env.EVIDENCE_ANCHOR_ADDRESS;
const auditReportRegistry = process.env.AUDIT_REPORT_REGISTRY;

const indexDir = path.join(process.cwd(), "backend", "database", "index");
const eventsPath = path.join(indexDir, "events.jsonl");
const anchorsPath = path.join(indexDir, "anchors.jsonl");
const reportsPath = path.join(indexDir, "reports.jsonl");
ensureFile(eventsPath);
ensureFile(anchorsPath);
ensureFile(reportsPath);

if (!rpcUrl) {
  console.error("RPC_URL missing; indexer idle");
  process.exit(0);
}

const provider = new ethers.WebSocketProvider(rpcUrl);

function writeWithBlock(pathOut: string, data: any) {
  appendJsonl(pathOut, data);
}

async function main() {
  if (eventRegistryAddress) {
    const abi = [
      "event EventCreated(bytes32 indexed eid, bytes32 indexed eventType, bytes32 payloadHash, address indexed creator)",
      "event EventVerified(bytes32 indexed eid, address indexed verifier)"
    ];
    const c = new ethers.Contract(eventRegistryAddress, abi, provider);
    c.on("EventCreated", (eid, eventType, payloadHash, creator, ev) => {
      writeWithBlock(eventsPath, { eid, eventType, payloadHash, creator, blockNumber: ev.blockNumber, txHash: ev.transactionHash, kind: "created" });
    });
    c.on("EventVerified", (eid, verifier, ev) => {
      writeWithBlock(eventsPath, { eid, verifier, blockNumber: ev.blockNumber, txHash: ev.transactionHash, kind: "verified" });
    });
  }

  if (evidenceAnchorAddress) {
    const abi = ["event HashAnchored(bytes32 indexed hash, uint8 indexed aType, bytes32 indexed refId, address actor, uint64 anchoredAt)"];
    const c = new ethers.Contract(evidenceAnchorAddress, abi, provider);
    c.on("HashAnchored", (hash, aType, refId, actor, anchoredAt, ev) => {
      writeWithBlock(anchorsPath, { hash, aType, refId, actor, anchoredAt, blockNumber: ev.blockNumber, txHash: ev.transactionHash });
    });
  }

  if (auditReportRegistry) {
    const abi = [
      "event ReportRegistered(bytes32 rid, bytes32 reportHash, bytes32 periodHash, bytes32 batchId, address issuer)",
      "event ReportDeprecated(bytes32 rid, bytes32 replacedByRid)"
    ];
    const c = new ethers.Contract(auditReportRegistry, abi, provider);
    c.on("ReportRegistered", (rid, reportHash, periodHash, batchId, issuer, ev) => {
      writeWithBlock(reportsPath, { rid, reportHash, periodHash, batchId, issuer, blockNumber: ev.blockNumber, txHash: ev.transactionHash, kind: "registered" });
    });
    c.on("ReportDeprecated", (rid, replacedByRid, ev) => {
      writeWithBlock(reportsPath, { rid, replacedByRid, blockNumber: ev.blockNumber, txHash: ev.transactionHash, kind: "deprecated" });
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
