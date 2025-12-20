import { expect } from "chai";
import { ethers } from "hardhat";

describe("TRAVEL_RULE_COMPLIANCE", () => {
  it("enforces evidence based on thresholds and policy mode", async () => {
    const [deployer, alice] = await ethers.getSigners();

    const TravelRuleConfigRegistry = await ethers.getContractFactory("TravelRuleConfigRegistry");
    const configRegistry = await TravelRuleConfigRegistry.deploy(deployer.address);
    await configRegistry.waitForDeployment();

    const TravelRuleEvidenceRegistry = await ethers.getContractFactory("TravelRuleEvidenceRegistry");
    const evidenceRegistry = await TravelRuleEvidenceRegistry.deploy(deployer.address);
    await evidenceRegistry.waitForDeployment();

    const TravelRuleGate = await ethers.getContractFactory("TravelRuleGate");
    const gate = await TravelRuleGate.deploy(
      deployer.address,
      await configRegistry.getAddress(),
      await evidenceRegistry.getAddress()
    );
    await gate.waitForDeployment();

    const FractalToken = await ethers.getContractFactory("FractalToken");
    const token = await FractalToken.deploy(ethers.parseUnits("1000000", 18));
    await token.waitForDeployment();

    await token.setTravelRuleGate(await gate.getAddress());
    await token.setTravelRuleEnabled(true);

    const amountThreshold = ethers.parseUnits("100", 18);
    const policyHash = ethers.keccak256(ethers.toUtf8Bytes("TRAVEL-POLICY-V1"));

    const version = await configRegistry.publishConfig.staticCall(
      amountThreshold,
      0,
      false,
      2,
      policyHash
    );
    await configRegistry.publishConfig(amountThreshold, 0, false, 2, policyHash);
    await configRegistry.activateConfig(version);

    await token.transfer(alice.address, ethers.parseUnits("10", 18));
    expect(await token.balanceOf(alice.address)).to.equal(ethers.parseUnits("10", 18));

    await expect(token.transfer(alice.address, amountThreshold)).to.be.revertedWith(
      "travel evidence required"
    );

    const evidenceId = ethers.keccak256(ethers.toUtf8Bytes("EVIDENCE-1"));
    await evidenceRegistry.recordEvidence(
      evidenceId,
      ethers.keccak256(ethers.toUtf8Bytes("REF-1")),
      ethers.ZeroHash,
      ethers.keccak256(ethers.toUtf8Bytes("PACKAGE-1")),
      3
    );

    await token.transferWithTravelRule(alice.address, amountThreshold, evidenceId);
    expect(await token.balanceOf(alice.address)).to.equal(ethers.parseUnits("110", 18));

    const version2 = await configRegistry.publishConfig.staticCall(
      ethers.parseUnits("1000", 18),
      0,
      false,
      0,
      ethers.keccak256(ethers.toUtf8Bytes("TRAVEL-POLICY-V2"))
    );
    await configRegistry.publishConfig(
      ethers.parseUnits("1000", 18),
      0,
      false,
      0,
      ethers.keccak256(ethers.toUtf8Bytes("TRAVEL-POLICY-V2"))
    );
    await configRegistry.activateConfig(version2);

    await token.transfer(alice.address, amountThreshold);
    expect(await token.balanceOf(alice.address)).to.equal(ethers.parseUnits("210", 18));
  });
});
