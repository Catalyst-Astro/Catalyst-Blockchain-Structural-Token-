import { expect } from "chai";
import fs from "fs";
import os from "os";
import path from "path";
import { AddressInfo } from "net";

describe("CLOCKCHAIN_OPERATOR_AI", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "clockchain-operator-ai-"));
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
      throw new Error("Unable to resolve operator AI test server address");
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

  it("classifies a case, resolves trace context, and redacts sensitive fields in the model packet", async () => {
    const wallet = "0x00000000000000000000000000000000000000aa";
    const created = await postJson<any>("/ai/cases", {
      requester: "ops-desk",
      summary: `Verify investor identity for ${wallet} before issuing credential`,
      input: {
        wallet,
        identityPacket: { legalName: "Alice Example", country: "MX" },
      },
    }, 201);

    expect(created.domain).to.equal("IDC");
    expect(created.intent).to.equal("issue_credential");
    expect(created.traceContext.reqId).to.equal("REQ-IDC-001");
    expect(created.traceContext.ctrId).to.equal("CTR-IDC-001");
    expect(created.decisionKernel.zettelkastenRef).to.equal("ZK-KRN-001");
    expect(created.decisionKernel.ntxTraceRef).to.equal("TR#KRN-001");
    expect(created.decisionKernel.taxonomy.continuityState).to.equal("complete");
    expect(created.decisionKernel.radialVotes.some((vote: { center: string }) => vote.center === "EP")).to.equal(true);
    expect(created.modelPacket.summary).to.not.include(wallet);
    expect(created.modelPacket.input.wallet).to.match(/^\[REDACTED:/);
    expect(created.modelPacket.input.identityPacket).to.match(/^\[REDACTED:/);

    const planned = await postJson<any>(`/ai/cases/${created.id}/plan`, {});
    expect(planned.status).to.equal("planned");
    expect(planned.plan.kernelDirectives.length).to.be.greaterThan(0);
    expect(planned.plan.steps.some((step: { id: string }) => step.id === "dry_run")).to.equal(true);
  });

  it("enforces approval before irreversible execution and records a completed receipt after approval", async () => {
    const created = await postJson<any>("/ai/cases", {
      requester: "ops-desk",
      domain: "IDC",
      intent: "revoke_identity",
      summary: "Revoke investor identity after compliance exception",
      input: {
        wallet: "0x00000000000000000000000000000000000000bb",
        reason: "manual compliance review",
      },
    }, 201);

    const planned = await postJson<any>(`/ai/cases/${created.id}/plan`, {});
    expect(planned.status).to.equal("awaiting_approval");
    expect(planned.approvalState).to.equal("pending");

    await postJson(`/ai/cases/${created.id}/execute`, { mode: "live" }, 409);

    const approved = await postJson<any>(`/ai/cases/${created.id}/approve`, {
      decidedBy: "ops-approver",
      decision: "approved",
      reason: "Approved in test"
    });
    expect(approved.status).to.equal("approved");

    const executed = await postJson<any>(`/ai/cases/${created.id}/execute`, { mode: "live" });
    expect(executed.case.status).to.equal("completed");
    expect(executed.receipt.status).to.equal("completed");
    expect(executed.report.summary).to.include(created.id);
    expect(executed.report.decisionKernel.decision).to.equal("irreversible_execute");
    expect(executed.report.decisionKernel.restrictedRoutes.some((route: { id: string }) => route.id === "route-live-mutation")).to.equal(true);
  });

  it("returns release readiness with coverage and environment checks", async () => {
    const readiness = await getJson<any>("/ai/release/readiness");
    expect(readiness).to.have.property("releaseGate");
    expect(readiness.coverageByDomain).to.have.property("IDC");
    expect(readiness.coverageByDomain).to.have.property("KRN");
    expect(readiness.coverageByDomain).to.have.property("VAL");
    expect(readiness.envChecks).to.have.property("deployScriptPresent");
    expect(readiness.envChecks).to.have.property("hardhatConfigPresent");
  });
});
