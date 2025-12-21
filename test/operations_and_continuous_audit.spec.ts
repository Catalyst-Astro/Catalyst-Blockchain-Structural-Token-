import { expect } from "chai";
import { ethers } from "hardhat";

describe("OPERATIONS_AND_CONTINUOUS_AUDIT", () => {
  it("records audit checkpoints and updates operational status", async () => {
    const [deployer] = await ethers.getSigners();

    const OperationsRegistry = await ethers.getContractFactory("OperationsRegistry");
    const operations = await OperationsRegistry.deploy(deployer.address);
    await operations.waitForDeployment();

    const AuditCheckpoint = await ethers.getContractFactory("AuditCheckpoint");
    const audit = await AuditCheckpoint.deploy(deployer.address);
    await audit.waitForDeployment();

    await audit.setOperationsRegistry(await operations.getAddress());

    const auditRole = await operations.AUDIT_ADMIN();
    await operations.grantRole(auditRole, await audit.getAddress());

    await operations.setOperationalStatus(1, ethers.keccak256(ethers.toUtf8Bytes("DEGRADED")));
    expect(await operations.operationalStatus()).to.equal(1);

    await operations.setJurisdiction(ethers.keccak256(ethers.toUtf8Bytes("MX")), true);
    expect(await operations.isJurisdictionActive(ethers.keccak256(ethers.toUtf8Bytes("MX")))).to.equal(true);

    const checkpointId = await audit.recordCheckpoint.staticCall(
      ethers.keccak256(ethers.toUtf8Bytes("AML")),
      ethers.keccak256(ethers.toUtf8Bytes("EVIDENCE-1")),
      1,
      100
    );
    await audit.recordCheckpoint(
      ethers.keccak256(ethers.toUtf8Bytes("AML")),
      ethers.keccak256(ethers.toUtf8Bytes("EVIDENCE-1")),
      1,
      100
    );

    const checkpoint = await audit.checkpointOf(checkpointId);
    expect(checkpoint.scope).to.equal(ethers.keccak256(ethers.toUtf8Bytes("AML")));

    expect(await operations.lastAuditTimestamp()).to.not.equal(0);
  });
});
