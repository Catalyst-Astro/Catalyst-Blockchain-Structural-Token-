import { expect } from "chai";
import fs from "fs";
import os from "os";
import path from "path";

import { StoryLedger } from "../backend/api/storyLedger";
import { buildEventPacket, canonicalizeEvent, computeEID } from "../backend/src/events/canonical";

describe("CLOCKCHAIN_TRACE_RUNTIME", () => {
  it("keeps legacy EID stable when trace metadata is absent and normalizes refs when present", () => {
    const legacyPacket = buildEventPacket({
      eventType: "CONSTRUCTION_PERMIT",
      actorWallet: "0xabc",
      timestamp: "2026-01-27T00:00:00Z",
      payloadHash: "0x1234",
      vids: ["0xaaa"],
      jurisdiction: "MX-CMX",
    }) as Record<string, unknown>;

    expect(legacyPacket).to.not.have.property("traceId");
    expect(legacyPacket).to.not.have.property("zkRefs");

    const legacyEid = computeEID(canonicalizeEvent(legacyPacket as Record<string, any>));
    const sameLegacyEid = computeEID(
      canonicalizeEvent(
        buildEventPacket({
          eventType: "CONSTRUCTION_PERMIT",
          actorWallet: "0xabc",
          timestamp: "2026-01-27T00:00:00Z",
          payloadHash: "0x1234",
          vids: ["0xaaa"],
          jurisdiction: "MX-CMX",
        }) as Record<string, any>
      )
    );
    expect(legacyEid).to.equal(sameLegacyEid);

    const tracedPacket = buildEventPacket({
      eventType: "CONSTRUCTION_PERMIT",
      actorWallet: "0xabc",
      timestamp: "2026-01-27T00:00:00Z",
      payloadHash: "0x1234",
      vids: ["0xaaa"],
      jurisdiction: "MX-CMX",
      traceId: "TRACE-EVT-001",
      reqId: "REQ-EVT-001",
      ctrId: "CTR-EVT-001",
      zkRefs: ["ZK-EVT-002", "ZK-EVT-001", "ZK-EVT-001"],
      evidenceRefs: ["permit_pdf_hash", "permit_pdf_hash", "oracle_sensor_hash"],
    }) as Record<string, unknown>;

    expect(tracedPacket.traceId).to.equal("TRACE-EVT-001");
    expect(tracedPacket.reqId).to.equal("REQ-EVT-001");
    expect(tracedPacket.ctrId).to.equal("CTR-EVT-001");
    expect(tracedPacket.zkRefs).to.deep.equal(["ZK-EVT-001", "ZK-EVT-002"]);
    expect(tracedPacket.evidenceRefs).to.deep.equal(["oracle_sensor_hash", "permit_pdf_hash"]);
    expect(computeEID(canonicalizeEvent(tracedPacket as Record<string, any>))).to.not.equal(legacyEid);
  });

  it("persists causal context into the narrative story ledger", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "catalyst-story-ledger-"));
    const ledgerPath = path.join(tempDir, "narrative_ledger.jsonl");

    try {
      const ledger = new StoryLedger(ledgerPath);
      ledger.logAction("event", "create_event eid=0xabc", {
        caseId: "ui-case-trace-1",
        traceId: "TRACE-EVT-001",
        reqId: "REQ-EVT-001",
        ctrId: "CTR-EVT-001",
        eid: "0xabc",
        vids: ["0xbbb", "0xaaa", "0xaaa"],
        zkRefs: ["ZK-EVT-001"],
        evidenceRefs: ["permit_pdf_hash", "oracle_sensor_hash"],
        status: "created",
      });

      const entry = JSON.parse(fs.readFileSync(ledgerPath, "utf8").trim()) as Record<string, unknown>;
      expect(entry.actor).to.equal("event");
      expect(entry.action).to.equal("create_event eid=0xabc");
      expect(entry.traceId).to.equal("TRACE-EVT-001");
      expect(entry.reqId).to.equal("REQ-EVT-001");
      expect(entry.ctrId).to.equal("CTR-EVT-001");
      expect(entry.caseId).to.equal("ui-case-trace-1");
      expect(entry.eid).to.equal("0xabc");
      expect(entry.status).to.equal("created");
      expect(entry.vids).to.deep.equal(["0xaaa", "0xbbb"]);
      expect(entry.zkRefs).to.deep.equal(["ZK-EVT-001"]);
      expect(entry.evidenceRefs).to.deep.equal(["oracle_sensor_hash", "permit_pdf_hash"]);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
