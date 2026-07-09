import { expect } from "chai";
import fs from "fs";
import os from "os";
import path from "path";

type ValidationSummary = {
  files: number;
  nodes: number;
  edges: number;
  traceCount: number;
  coverageByDomain: Record<string, { traceCount: number; reqCtrCovered: number; reqCtrTotal: number }>;
  errors: string[];
  warnings: string[];
  criticalFailures: string[];
};

const { runValidation } = require("../scripts/clockchain/validate-ntx.js") as {
  runValidation: (rootDir: string) => ValidationSummary;
};

function withFixture(files: Record<string, string>, callback: (rootDir: string) => void) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "clockchain-validator-"));

  try {
    for (const [fileName, content] of Object.entries(files)) {
      const filePath = path.join(rootDir, fileName);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content, "utf8");
    }
    callback(rootDir);
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
}

describe("CLOCKCHAIN_VALIDATOR", () => {
  it("produces structured coverage by domain for a valid fixture", () => {
    withFixture(
      {
        "00_nodes.ntx": `NT:N#REQ-VAL-001 [REQ] L=2 kappa=H lang=na :
  "Deploy value engine"
  ports{in:[config], out:[addresses]} meta{owner:core, ver:v0.1}
NT:N#CTR-VAL-001 [CTR] L=4 kappa=H lang=na :
  "Value engine contract"
  ports{in:[admin], out:[addresses]} meta{owner:core, ver:v0.1}
NT:N#CMP-VAL-001 [CMP] L=4 kappa=H lang=na :
  "Value engine component"
  ports{in:[config], out:[runtime]} meta{owner:core, ver:v0.1}
NT:N#ART-VAL-001 [ART] L=5 kappa=H lang=ts :
  "scripts/deploy.ts"
  ports{in:[config], out:[runtime]} meta{owner:core, ver:v0.1}
NT:N#TST-VAL-001 [TST] L=6 kappa=H lang=na :
  "Deploy test"
  ports{in:[rpc], out:[pass_fail]} meta{owner:qa, ver:v0.1}
NT:N#MET-VAL-001 [MET] L=7 kappa=H lang=na :
  "Deploy metric"
  ports{in:[logs], out:[slo]} meta{owner:ops, ver:v0.1}
NT:N#EVD-VAL-001 [EVD] L=7 kappa=H lang=na :
  "Deploy evidence"
  ports{in:[stdout], out:[audit]} meta{owner:ops, ver:v0.1}
`,
        "10_edges.ntx": `NT:S#S-001 (REQ-VAL-001 -TRACE[w=0.95]-> TST-VAL-001) why{req tested} evd{EVD#EVD-VAL-001} rev{allowed}
NT:S#S-002 (REQ-VAL-001 -TRACE[w=0.95]-> MET-VAL-001) why{req measured} evd{EVD#EVD-VAL-001} rev{allowed}
NT:S#S-003 (CTR-VAL-001 -TRACE[w=0.95]-> TST-VAL-001) why{ctr tested} evd{EVD#EVD-VAL-001} rev{allowed}
NT:S#S-004 (CTR-VAL-001 -TRACE[w=0.95]-> MET-VAL-001) why{ctr measured} evd{EVD#EVD-VAL-001} rev{allowed}
TR#VAL-001 := Req{REQ-VAL-001} TRACE Design{CTR-VAL-001,CMP-VAL-001} TRACE Code{ART-VAL-001} TRACE Test{TST-VAL-001} TRACE Telemetry{MET-VAL-001,EVD-VAL-001} /cov{TST=1,MET=1}
`,
      },
      (rootDir) => {
        const summary = runValidation(rootDir);
        expect(summary.files).to.equal(2);
        expect(summary.traceCount).to.equal(1);
        expect(summary.errors).to.deep.equal([]);
        expect(summary.criticalFailures).to.deep.equal([]);
        expect(summary.coverageByDomain.VAL.traceCount).to.equal(1);
        expect(summary.coverageByDomain.VAL.reqCtrCovered).to.equal(2);
        expect(summary.coverageByDomain.VAL.reqCtrTotal).to.equal(2);
      }
    );
  });

  it("flags duplicate nodes and missing targets", () => {
    withFixture(
      {
        "00_invalid.ntx": `NT:N#REQ-EVT-001 [REQ] L=2 kappa=H lang=na :
  "Event req"
  ports{in:[payload], out:[eid]} meta{owner:core, ver:v0.1}
NT:N#REQ-EVT-001 [REQ] L=2 kappa=H lang=na :
  "Duplicate event req"
  ports{in:[payload], out:[eid]} meta{owner:core, ver:v0.1}
NT:S#S-001 (REQ-EVT-001 -TRACE[w=0.95]-> TST-EVT-999) why{bad target} evd{EVD#EVD-EVT-001} rev{allowed}
`,
      },
      (rootDir) => {
        const summary = runValidation(rootDir);
        expect(summary.errors.some((error) => error.includes("Duplicate node REQ-EVT-001"))).to.equal(true);
        expect(summary.errors.some((error) => error.includes("Edge target TST-EVT-999 not found"))).to.equal(true);
      }
    );
  });

  it("flags missing trace inventory for a critical domain", () => {
    withFixture(
      {
        "00_missing_trace.ntx": `NT:N#REQ-IDC-001 [REQ] L=2 kappa=H lang=na :
  "Identity req"
  ports{in:[action], out:[record]} meta{owner:core, ver:v0.1}
NT:N#CTR-IDC-001 [CTR] L=4 kappa=H lang=na :
  "Identity contract"
  ports{in:[action], out:[record]} meta{owner:core, ver:v0.1}
NT:N#TST-IDC-001 [TST] L=6 kappa=H lang=na :
  "Identity test"
  ports{in:[action], out:[pass_fail]} meta{owner:qa, ver:v0.1}
NT:N#MET-IDC-001 [MET] L=7 kappa=H lang=na :
  "Identity metric"
  ports{in:[logs], out:[slo]} meta{owner:ops, ver:v0.1}
NT:S#S-001 (REQ-IDC-001 -TRACE[w=0.95]-> TST-IDC-001) why{req tested} evd{EVD#EVD-IDC-001} rev{allowed}
NT:S#S-002 (REQ-IDC-001 -TRACE[w=0.95]-> MET-IDC-001) why{req measured} evd{EVD#EVD-IDC-001} rev{allowed}
NT:S#S-003 (CTR-IDC-001 -TRACE[w=0.95]-> TST-IDC-001) why{ctr tested} evd{EVD#EVD-IDC-001} rev{allowed}
NT:S#S-004 (CTR-IDC-001 -TRACE[w=0.95]-> MET-IDC-001) why{ctr measured} evd{EVD#EVD-IDC-001} rev{allowed}
`,
      },
      (rootDir) => {
        const summary = runValidation(rootDir);
        expect(summary.errors.some((error) => error.includes("Missing TR# for domain IDC"))).to.equal(true);
      }
    );
  });

  it("flags open conflicts on critical paths", () => {
    withFixture(
      {
        "00_conflict.ntx": `NT:N#REQ-RMP-001 [REQ] L=2 kappa=H lang=na :
  "Ramp req"
  ports{in:[request], out:[trace]} meta{owner:ops, ver:v0.1}
NT:N#CTR-RMP-001 [CTR] L=4 kappa=H lang=na :
  "Ramp contract"
  ports{in:[request], out:[trace]} meta{owner:ops, ver:v0.1}
NT:S#S-001 (REQ-RMP-001 -CONFLICT[w=0.95]-> CTR-RMP-001) why{unresolved contradiction} evd{EVD#EVD-RMP-001} rev{allowed}
`,
      },
      (rootDir) => {
        const summary = runValidation(rootDir);
        expect(summary.criticalFailures.some((failure) => failure.includes("Open CONFLICT on critical path"))).to.equal(
          true
        );
      }
    );
  });
});
