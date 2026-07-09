import { expect } from "chai";
import fs from "fs";
import os from "os";
import path from "path";
import { AddressInfo } from "net";

describe("CLOCKCHAIN_UI_COPILOT", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "clockchain-ui-copilot-"));
  const dataDir = path.join(tempDir, "backend-db");
  const narrativePath = path.join(tempDir, "narrative_ledger.jsonl");
  const artifactsRoot = path.join(process.cwd(), "artifacts", "gui", "cases");

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

    const caseScreenshotsDir = path.join(artifactsRoot, created.id, "screenshots");
    fs.mkdirSync(caseScreenshotsDir, { recursive: true });
    for (const screenshot of ["dashboard", "operator", "ui-lab", "settings"]) {
      fs.writeFileSync(path.join(caseScreenshotsDir, `${screenshot}.png`), "");
    }

    const report = await getJson<any>(`/ai/ui/cases/${created.id}/report`);
    expect(report.traceId).to.equal("GUI-001");
    expect(report.zkRefs).to.include("ZK-GUI-001");
    expect(report.screenshots).to.deep.equal([
      `artifacts/gui/cases/${created.id}/screenshots/dashboard.png`,
      `artifacts/gui/cases/${created.id}/screenshots/operator.png`,
      `artifacts/gui/cases/${created.id}/screenshots/ui-lab.png`,
      `artifacts/gui/cases/${created.id}/screenshots/settings.png`,
    ]);
    expect(report.artifactManifestPath).to.equal(`artifacts/gui/cases/${created.id}/manifest.json`);
    expect(report.evidenceRefs).to.include(`artifacts/gui/cases/${created.id}/report.md`);
    expect(report.evidenceRefs).to.include(`artifacts/gui/cases/${created.id}/report.json`);
    expect(report.evidenceRefs).to.include(`artifacts/gui/cases/${created.id}/summary.md`);
    expect(report.evidenceRefs).to.include(`artifacts/gui/cases/${created.id}/manifest.json`);
    expect(report.regressions).to.deep.equal([]);

    const narrativeEntries = fs
      .readFileSync(narrativePath, "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Record<string, unknown>);
    const reportEntry = narrativeEntries.find((entry) => entry.actor === "ui_copilot" && entry.caseId === created.id);
    expect(reportEntry).to.not.equal(undefined);
    expect(reportEntry?.action).to.equal(`ui_report caseId=${created.id} surface=dashboard`);
    expect(reportEntry?.status).to.equal("reviewed");

    const manifestPath = path.join(process.cwd(), report.artifactManifestPath);
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    fs.writeFileSync(
      manifestPath,
      JSON.stringify({
        schemaVersion: 1,
        uiCaseId: created.id,
        traceId: report.traceId,
        zkRefs: report.zkRefs,
        generatedAt: "9999-12-31T23:59:59.000Z",
        captureMode: "backend_coupled",
      }, null, 2),
      "utf8"
    );

    const readiness = await getJson<any>("/ai/release/readiness?domain=GUI");
    expect(readiness.latestGuiEvidence.uiCaseId).to.equal(created.id);
    expect(readiness.latestGuiEvidence.manifestPath).to.equal(report.artifactManifestPath);
    expect(readiness.latestGuiEvidence.captureMode).to.equal("backend_coupled");

    fs.rmSync(path.join(artifactsRoot, created.id), { recursive: true, force: true });
  });

  it("keeps report generation explicit when screenshots are missing and records regressions instead of failing silently", async () => {
    const created = await postJson<any>(
      "/ai/ui/cases",
      {
        requester: "design-ops",
        surface: "settings",
        intent: "a11y_audit",
        summary: "Audit the settings surface without pre-captured screenshots",
      },
      201
    );

    await postJson<any>(`/ai/ui/cases/${created.id}/plan`, {});
    const report = await getJson<any>(`/ai/ui/cases/${created.id}/report`);

    expect(report.caseId).to.equal(created.id);
    expect(report.regressions).to.include("Missing screenshot artifact for dashboard.");
    expect(report.regressions).to.include("Missing screenshot artifact for operator.");
    expect(report.regressions).to.include("Missing screenshot artifact for ui-lab.");
    expect(report.regressions).to.include("Missing screenshot artifact for settings.");
    expect(report.artifactManifestPath).to.equal(`artifacts/gui/cases/${created.id}/manifest.json`);

    fs.rmSync(path.join(artifactsRoot, created.id), { recursive: true, force: true });
  });
});
