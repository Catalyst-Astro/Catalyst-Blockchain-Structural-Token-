import { expect } from "chai";
import { ethers } from "hardhat";

describe("PolicyRegistry", () => {
  it("registers and activates policy with anchoring", async () => {
    const [admin, council] = await ethers.getSigners();
    const EvidenceAnchor = await ethers.getContractFactory("EvidenceAnchor");
    const anchor = await EvidenceAnchor.deploy(admin.address);
    await anchor.waitForDeployment();

    const PolicyRegistry = await ethers.getContractFactory("PolicyRegistry");
    const registry = await PolicyRegistry.deploy(admin.address) as any;
    await registry.waitForDeployment();
    await registry.setEvidenceAnchor(await anchor.getAddress());
    await anchor.grantRole(await anchor.AUDITOR(), await registry.getAddress());
    await registry.grantRole(await registry.DAO_COUNCIL(), council.address);

    const policyHash = ethers.keccak256(ethers.toUtf8Bytes("POLICY"));
    const pid = ethers.keccak256(ethers.concat([ethers.getBytes(policyHash), ethers.toBeArray(1n)]));

    await expect(registry.connect(council).registerPolicy(pid, policyHash, 1)).to.emit(registry, "PolicyRegistered");
    const stored = await registry.getPolicy(pid);
    expect(stored.policyHash).to.equal(policyHash);

    // anchor should exist
    const anchorRec = await anchor.getAnchor(policyHash);
    expect(anchorRec.hash).to.equal(policyHash);

    await expect(registry.connect(council).activatePolicy(pid)).to.emit(registry, "PolicyActivated");
    const active = await registry.getActivePolicy();
    expect(active.pid).to.equal(pid);
  });
});
