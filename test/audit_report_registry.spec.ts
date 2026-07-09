import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("AuditReportRegistry", () => {
  it("restricts registration to auditor and anchors report hash", async () => {
    const [admin, auditor, other] = await ethers.getSigners();

    const EvidenceAnchor = await ethers.getContractFactory("EvidenceAnchor");
    const anchor = await EvidenceAnchor.deploy(admin.address);
    await anchor.waitForDeployment();
    const anchorAuditor = await anchor.AUDITOR();
    await anchor.grantRole(anchorAuditor, auditor.address);

    const AuditReportRegistry = await ethers.getContractFactory("AuditReportRegistry");
    const registry = await AuditReportRegistry.deploy(admin.address);
    await registry.waitForDeployment();
    await registry.connect(admin).setEvidenceAnchor(await anchor.getAddress());
    await anchor.grantRole(anchorAuditor, await registry.getAddress());
    await registry.grantRole(await registry.AUDITOR(), auditor.address);

    const rid = ethers.keccak256(ethers.toUtf8Bytes("RID1"));
    const reportHash = ethers.keccak256(ethers.toUtf8Bytes("REPORT1"));
    const periodHash = ethers.keccak256(ethers.toUtf8Bytes("PERIOD"));

    await expect(registry.connect(other).registerReport(rid, reportHash, periodHash, ethers.ZeroHash)).to.be.reverted;

    await expect(registry.connect(auditor).registerReport(rid, reportHash, periodHash, ethers.ZeroHash))
      .to.emit(registry, "ReportRegistered")
      .withArgs(rid, reportHash, periodHash, ethers.ZeroHash, auditor.address);

    const stored = await registry.getReport(rid);
    expect(stored.reportHash).to.equal(reportHash);
    expect(stored.active).to.equal(true);

    // anchor should store the hash
    const anchorRecord = await anchor.getAnchor(reportHash);
    expect(anchorRecord.hash).to.equal(reportHash);

    await expect(registry.connect(admin).deprecateReport(rid, rid)).to.emit(registry, "ReportDeprecated").withArgs(rid, rid);
    const after = await registry.getReport(rid);
    expect(after.active).to.equal(false);
  });
});
