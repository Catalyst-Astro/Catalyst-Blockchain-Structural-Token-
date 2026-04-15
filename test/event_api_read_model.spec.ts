import { expect } from "chai";
import { ethers } from "ethers";
import fs from "fs";
import os from "os";
import path from "path";
import { AddressInfo } from "net";

describe("EVENT_API_READ_MODEL", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "catalyst-event-read-model-"));
  const dataDir = path.join(tempDir, "backend-db");
  const narrativePath = path.join(tempDir, "narrative_ledger.jsonl");

  let baseUrl = "";
  let listener: {
    close: (callback: (err?: Error) => void) => void;
    address: () => AddressInfo | string | null;
    once: (event: string, callback: () => void) => void;
  };

  before(async () => {
    process.env.CATALYST_DATA_DIR = dataDir;
    process.env.CATALYST_NARRATIVE_LEDGER_PATH = narrativePath;

    const { startServer } = require("../backend/api/server") as {
      startServer: (port?: number) => {
        close: (callback: (err?: Error) => void) => void;
        address: () => AddressInfo | string | null;
        once: (event: string, callback: () => void) => void;
      };
    };

    listener = startServer(0);
    await new Promise<void>((resolve) => listener.once("listening", resolve));
    const address = listener.address();
    if (!address || typeof address === "string") {
      throw new Error("Unable to resolve event read model test server address");
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    await new Promise<void>((resolve, reject) => {
      listener.close((error?: Error) => {
        if (error) reject(error);
        else resolve();
      });
    });
    fs.rmSync(tempDir, { recursive: true, force: true });
    delete process.env.CATALYST_DATA_DIR;
    delete process.env.CATALYST_NARRATIVE_LEDGER_PATH;
    delete process.env.CLOCKCHAIN_OPERATOR_API_URL;
  });

  async function postJson<T>(pathname: string, body: Record<string, unknown>, expectedStatus = 200): Promise<T> {
    const response = await fetch(`${baseUrl}${pathname}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as T & { error?: string };
    expect(response.status).to.equal(expectedStatus, payload.error);
    return payload;
  }

  async function getJson<T>(pathname: string, expectedStatus = 200): Promise<T> {
    const response = await fetch(`${baseUrl}${pathname}`);
    const payload = (await response.json()) as T & { error?: string };
    expect(response.status).to.equal(expectedStatus, payload.error);
    return payload;
  }

  it("consolidates trace context, lifecycle, and timeline for EVT reads", async () => {
    const created = await postJson<any>("/events", {
      eventType: "CONSTRUCTION_PERMIT",
      actorWallet: "0x00000000000000000000000000000000000000aa",
      payload: { permitId: "MX-001", stage: "issued" },
      vids: ["doc-001", "doc-002"],
      traceId: "TRACE-EVT-READ-001",
      reqId: "REQ-EVT-READ-001",
      ctrId: "CTR-EVT-READ-001",
      zkRefs: ["ZK-EVT-002", "ZK-EVT-001", "ZK-EVT-001"],
      evidenceRefs: ["evidence-beta", "evidence-alpha", "evidence-alpha"],
    });

    const dossier = await getJson<any>(`/events/${created.eid}`);
    expect(dossier.eid).to.equal(created.eid);
    expect(dossier.packet.traceId).to.equal("TRACE-EVT-READ-001");
    expect(dossier.packet.reqId).to.equal("REQ-EVT-READ-001");
    expect(dossier.packet.ctrId).to.equal("CTR-EVT-READ-001");
    expect(dossier.packet.payloadHash).to.equal(created.payloadHash);
    expect(dossier.packet.vids).to.deep.equal(created.vids);
    expect(dossier.traceContext).to.deep.equal({
      traceId: "TRACE-EVT-READ-001",
      reqId: "REQ-EVT-READ-001",
      ctrId: "CTR-EVT-READ-001",
      zkRefs: ["ZK-EVT-001", "ZK-EVT-002"],
      evidenceRefs: ["evidence-alpha", "evidence-beta"],
    });
    expect(dossier.lifecycle.status).to.equal("created");
    expect(dossier.lifecycle.payloadHash).to.equal(created.payloadHash);
    expect(dossier.lifecycle.vids).to.deep.equal([...created.vids].sort());
    expect(dossier.timeline.some((entry: any) => entry.source === "events_log" && entry.action === "create")).to.equal(
      true
    );
    expect(
      dossier.timeline.some((entry: any) => entry.source === "story_ledger" && entry.action === "create")
    ).to.equal(true);
  });

  it("derives stable VIDs for semantically equal object evidence submitted through the API", async () => {
    const created = await postJson<any>("/events", {
      eventType: "DOCUMENT_PACKAGE",
      actorWallet: "0x00000000000000000000000000000000000000af",
      payload: { packageId: "PKG-001" },
      vids: [
        {
          artifactType: "permit",
          metadata: { chapter: 2, country: "MX" },
        },
        {
          metadata: { country: "MX", chapter: 2 },
          artifactType: "permit",
        },
      ],
      traceId: "TRACE-EVT-VID-API-001",
      reqId: "REQ-EVT-VID-API-001",
      ctrId: "CTR-EVT-VID-API-001",
    });

    expect(created.vids).to.have.length(2);
    expect(created.vids[0]).to.equal(created.vids[1]);
  });

  it("reflects reject mutations in the consolidated lifecycle and timeline", async () => {
    const created = await postJson<any>("/events", {
      eventType: "INSPECTION_ALERT",
      actorWallet: "0x00000000000000000000000000000000000000ab",
      payload: { permitId: "MX-REJECT-001" },
      traceId: "TRACE-EVT-REJECT-001",
      reqId: "REQ-EVT-REJECT-001",
      ctrId: "CTR-EVT-REJECT-001",
    });

    await postJson(`/events/${created.eid}/reject`, {
      actorWallet: "0x00000000000000000000000000000000000000ff",
      reason: "insufficient documentary evidence",
      traceId: "TRACE-EVT-REJECT-001",
      reqId: "REQ-EVT-REJECT-001",
      ctrId: "CTR-EVT-REJECT-001",
    });

    const dossier = await getJson<any>(`/events/${created.eid}`);
    expect(dossier.lifecycle.status).to.equal("rejected");
    expect(dossier.lifecycle.lastAction).to.equal("reject");
    expect(dossier.timeline.some((entry: any) => entry.action === "reject" && entry.status === "rejected")).to.equal(
      true
    );
  });

  it("hydrates story-ledger attest and verify actions into the dossier and verify endpoints", async () => {
    const created = await postJson<any>("/events", {
      eventType: "MILESTONE_APPROVAL",
      actorWallet: "0x00000000000000000000000000000000000000ac",
      payload: { milestone: "phase-2" },
      vids: ["milestone-report"],
      traceId: "TRACE-EVT-VERIFY-001",
      reqId: "REQ-EVT-VERIFY-001",
      ctrId: "CTR-EVT-VERIFY-001",
      zkRefs: ["ZK-EVT-VERIFY-001"],
      evidenceRefs: ["milestone-report-hash"],
    });

    await postJson(`/events/${created.eid}/attest`, {
      actorWallet: "0x00000000000000000000000000000000000000ad",
      traceId: "TRACE-EVT-VERIFY-001",
      reqId: "REQ-EVT-VERIFY-001",
      ctrId: "CTR-EVT-VERIFY-001",
      evidenceRefs: ["attestation-record"],
    });
    await postJson(`/events/${created.eid}/verify`, {
      actorWallet: "0x00000000000000000000000000000000000000ae",
      traceId: "TRACE-EVT-VERIFY-001",
      reqId: "REQ-EVT-VERIFY-001",
      ctrId: "CTR-EVT-VERIFY-001",
      zkRefs: ["ZK-EVT-VERIFY-002"],
    });

    const dossier = await getJson<any>(`/events/${created.eid}`);
    expect(dossier.lifecycle.status).to.equal("verified");
    expect(dossier.lifecycle.lastAction).to.equal("verify");
    expect(dossier.lifecycle.attestCount).to.equal(1);
    expect(dossier.lifecycle.verifyCount).to.equal(1);
    expect(
      dossier.timeline.some((entry: any) => entry.source === "story_ledger" && entry.action === "attest")
    ).to.equal(true);
    expect(
      dossier.timeline.some((entry: any) => entry.source === "story_ledger" && entry.action === "verify")
    ).to.equal(true);

    const verifyEid = await getJson<any>(`/verify/eid/${created.eid}`);
    expect(verifyEid.hash).to.equal(created.eid);
    expect(verifyEid.relatedEvent).to.not.equal(null);
    expect(verifyEid.relatedEvent.traceContext.traceId).to.equal("TRACE-EVT-VERIFY-001");
    expect(verifyEid.relatedEvent.lifecycle.status).to.equal("verified");

    const verifyVid = await getJson<any>(`/verify/vid/${created.vids[0]}`);
    expect(verifyVid.hash).to.equal(created.vids[0]);
    expect(
      verifyVid.relatedEvents.some(
        (entry: any) => entry.eid === created.eid && entry.traceId === "TRACE-EVT-VERIFY-001"
      )
    ).to.equal(true);
    expect(
      verifyVid.relatedEvents.some(
        (entry: any) => entry.payloadHash === created.payloadHash && entry.status === "verified"
      )
    ).to.equal(true);
  });

  it("keeps verify responses stable when there is no local EVT correlation", async () => {
    const missingEid = ethers.keccak256(ethers.toUtf8Bytes("missing-eid"));
    const missingVid = ethers.keccak256(ethers.toUtf8Bytes("missing-vid"));

    const verifyEid = await getJson<any>(`/verify/eid/${missingEid}`);
    expect(verifyEid.hash).to.equal(missingEid);
    expect(verifyEid.relatedEvent).to.equal(null);

    const verifyVid = await getJson<any>(`/verify/vid/${missingVid}`);
    expect(verifyVid.hash).to.equal(missingVid);
    expect(verifyVid.relatedEvents).to.deep.equal([]);
  });
});
