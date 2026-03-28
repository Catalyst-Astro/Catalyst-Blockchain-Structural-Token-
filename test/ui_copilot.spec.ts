import { expect } from "chai";
import fs from "fs";
import os from "os";
import path from "path";
import { AddressInfo } from "net";

describe("CLOCKCHAIN_UI_COPILOT", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "clockchain-ui-copilot-"));
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
      throw new Error("Unable to resolve UI copilot test server address");
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

  it("creates, plans, and reports a governed ui case anchored to ZK-GUI-001", async () => {
    const created = await postJson<any>("/ai/ui/cases", {
      requester: "design-ops",
      summary: "Review the dashboard surface and preserve the critical scan path",
    }, 201);

    expect(created.surface).to.equal("dashboard");
    expect(created.intent).to.equal("surface_review");
    expect(created.traceId).to.equal("GUI-001");
    expect(created.zkRefs).to.include("ZK-GUI-001");

    const planned = await postJson<any>(`/ai/ui/cases/${created.id}/plan`, {});
    expect(planned.status).to.equal("planned");
    expect(planned.proposal.tokens.length).to.be.greaterThan(0);
    expect(planned.proposal.acceptanceCriteria.length).to.be.greaterThan(0);

    const report = await getJson<any>(`/ai/ui/cases/${created.id}/report`);
    expect(report.traceId).to.equal("GUI-001");
    expect(report.zkRefs).to.include("ZK-GUI-001");
    expect(report.screenshots[0]).to.include("dashboard.png");
    expect(report.evidenceRefs.some((entry: string) => entry.endsWith(".md"))).to.equal(true);
  });
});
