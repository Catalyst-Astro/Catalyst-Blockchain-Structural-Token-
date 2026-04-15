import { expect } from "chai";
import { ethers } from "ethers";

import { buildEventPacket, canonicalizeEvent, computeEID, computeVID } from "../backend/src/events/canonical";

describe("EVENT_CANONICAL_IDS", () => {
  it("keeps VID stable for semantically equivalent object evidence", () => {
    const evidenceA = {
      artifactType: "permit",
      issuer: { country: "MX", code: "SEDUVI" },
      pages: [1, 2],
    };
    const evidenceB = {
      pages: [1, 2],
      issuer: { code: "SEDUVI", country: "MX" },
      artifactType: "permit",
    };

    expect(computeVID(evidenceA)).to.equal(computeVID(evidenceB));
  });

  it("preserves legacy VID derivation for plain string evidence", () => {
    const input = "permit.pdf";
    expect(computeVID(input)).to.equal(ethers.keccak256(ethers.toUtf8Bytes(input)));
  });

  it("keeps EID stable when VID inputs differ only by object key order", () => {
    const eventBase = {
      eventType: "CONSTRUCTION_PERMIT",
      actorWallet: "0xabc",
      timestamp: "2026-03-31T12:00:00Z",
      payloadHash: "0x1234",
      jurisdiction: "MX-CMX",
      nonce: "evt-001",
      traceId: "TRACE-EVT-VID-001",
      reqId: "REQ-EVT-VID-001",
      ctrId: "CTR-EVT-VID-001",
      zkRefs: ["ZK-EVT-VID-001"],
      evidenceRefs: ["permit.pdf"],
    };

    const packetA = buildEventPacket({
      ...eventBase,
      vids: [
        computeVID({
          artifactType: "permit",
          metadata: { chapter: 2, country: "MX" },
        }),
      ],
    }) as Record<string, any>;
    const packetB = buildEventPacket({
      ...eventBase,
      vids: [
        computeVID({
          metadata: { country: "MX", chapter: 2 },
          artifactType: "permit",
        }),
      ],
    }) as Record<string, any>;

    expect(computeEID(canonicalizeEvent(packetA))).to.equal(computeEID(canonicalizeEvent(packetB)));
  });
});
