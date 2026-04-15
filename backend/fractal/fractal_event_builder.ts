import fs from "fs";
import path from "path";
import { ethers } from "ethers";
import { canonicalizeEvent, computeEID, computeVID, buildEventPacket } from "../src/events/canonical";
import { canonicalJson } from "../api/utils";

const templatesPath = path.join(process.cwd(), "docs", "fractal", "Fractal_Event_Templates.md");
const logPath = path.join(process.cwd(), "backend", "database", "fractal_events.jsonl");

const templates: Record<string, any> = {
  ZONING_PERMIT: { requiredVIDs: 1, riskClass: "MED" },
  MILESTONE_25: { requiredVIDs: 1, riskClass: "HIGH" },
  YIELD_DISTRIBUTION: { requiredVIDs: 1, riskClass: "HIGH" },
};

function appendJsonl(file: string, data: any) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify(data) + "\n", "utf8");
}

export function createFractalEvent(eventType: string, payload: any, artifacts: any[]) {
  const tmpl = templates[eventType];
  if (!tmpl) throw new Error("template not found");
  if ((artifacts?.length || 0) < (tmpl.requiredVIDs || 0)) throw new Error("insufficient VIDs");

  const vids = (artifacts || []).map((artifact) => computeVID(artifact));
  const payloadHash = ethers.keccak256(ethers.toUtf8Bytes(canonicalJson(payload)));
  const packet = buildEventPacket({ eventType, payloadHash, vids, actorWallet: payload.actorWallet || "0x0" });
  const canonical = canonicalizeEvent(packet);
  const eid = computeEID(canonical);
  appendJsonl(logPath, { eid, eventType, vids, payloadHash, riskClass: tmpl.riskClass, canonical });
  return { eid, vids, payloadHash, canonical, riskClass: tmpl.riskClass };
}

if (require.main === module) {
  const evt = createFractalEvent("ZONING_PERMIT", { actorWallet: "0xabc" }, ["permit.pdf"]);
  console.log(evt);
}
