import { expect } from "chai";
import { ethers, network } from "hardhat";

describe("SELECTIVE_FREEZE_AND_LEGAL_ORDERS", () => {
  it("freezes wallets, series, and functions with policy limits and emergency mode", async () => {
    const [deployer, alice] = await ethers.getSigners();

    const FreezePolicyRegistry = await ethers.getContractFactory("FreezePolicyRegistry");
    const policyRegistry = await FreezePolicyRegistry.deploy(deployer.address);
    await policyRegistry.waitForDeployment();

    const EmergencyMode = await ethers.getContractFactory("EmergencyMode");
    const emergencyMode = await EmergencyMode.deploy(deployer.address, 86400);
    await emergencyMode.waitForDeployment();

    const FreezeRegistry = await ethers.getContractFactory("FreezeRegistry");
    const freezeRegistry = await FreezeRegistry.deploy(
      deployer.address,
      await policyRegistry.getAddress(),
      await emergencyMode.getAddress()
    );
    await freezeRegistry.waitForDeployment();
    await freezeRegistry.renounceRole(await freezeRegistry.ORACLE_OPERATOR(), deployer.address);

    const policyVersion = await policyRegistry.publishPolicy.staticCall(
      ethers.keccak256(ethers.toUtf8Bytes("FREEZE-POLICY-V1"))
    );
    await policyRegistry.publishPolicy(ethers.keccak256(ethers.toUtf8Bytes("FREEZE-POLICY-V1")));
    await policyRegistry.activatePolicy(policyVersion);

    await policyRegistry.setFreezeTypePolicy(policyVersion, 1, 0, false, true, false);
    await policyRegistry.setFreezeTypePolicy(policyVersion, 2, 0, true, false, false);
    await policyRegistry.setFreezeTypePolicy(policyVersion, 3, 3600, false, false, true);

    const FractalToken = await ethers.getContractFactory("FractalToken");
    const token = await FractalToken.deploy(ethers.parseUnits("1000000", 18));
    await token.waitForDeployment();

    await token.setFreezeRegistry(await freezeRegistry.getAddress());
    await token.setFreezeEnforcementEnabled(true);

    const caseId = ethers.keccak256(ethers.toUtf8Bytes("CASE-1"));
    const justification = ethers.keccak256(ethers.toUtf8Bytes("JUSTIFICATION-1"));

    await freezeRegistry.freezeWallet(alice.address, caseId, justification, 1);
    await expect(token.transfer(alice.address, ethers.parseUnits("1", 18))).to.be.revertedWith("wallet frozen");

    await freezeRegistry.unfreezeWallet(alice.address, ethers.keccak256(ethers.toUtf8Bytes("RESOLUTION")));
    await token.transfer(alice.address, ethers.parseUnits("1", 18));

    const seriesId = ethers.keccak256(ethers.toUtf8Bytes("FRA-CAB-009"));
    await token.transferWithSeries(alice.address, ethers.parseUnits("1", 18), seriesId);

    await freezeRegistry.freezeSeries(seriesId, caseId, justification, 1);
    await expect(
      token.transferWithSeries(alice.address, ethers.parseUnits("1", 18), seriesId)
    ).to.be.revertedWith("series frozen");

    await freezeRegistry.unfreezeSeries(seriesId, ethers.keccak256(ethers.toUtf8Bytes("RESOLUTION-2")));
    await token.transferWithSeries(alice.address, ethers.parseUnits("1", 18), seriesId);

    const selector = token.interface.getFunction("transferWithSeries").selector;
    await freezeRegistry.freezeFunction(selector, caseId, justification, 1);
    await expect(
      token.transferWithSeries(alice.address, ethers.parseUnits("1", 18), seriesId)
    ).to.be.revertedWith("function frozen");

    await freezeRegistry.unfreezeFunction(selector, ethers.keccak256(ethers.toUtf8Bytes("RESOLUTION-3")));
    await token.transferWithSeries(alice.address, ethers.parseUnits("1", 18), seriesId);

    await expect(
      freezeRegistry.freezeWallet(alice.address, caseId, justification, 3)
    ).to.be.revertedWith("emergency required");

    await emergencyMode.activateEmergency(3600, ethers.keccak256(ethers.toUtf8Bytes("EMERGENCY")));
    await freezeRegistry.freezeWallet(alice.address, caseId, justification, 3);
    await expect(token.transfer(alice.address, ethers.parseUnits("1", 18))).to.be.revertedWith("wallet frozen");

    await emergencyMode.deactivateEmergency();
    await freezeRegistry.unfreezeWallet(alice.address, ethers.keccak256(ethers.toUtf8Bytes("RESOLUTION-4")));

    await freezeRegistry.freezeWallet(alice.address, caseId, justification, 2);
    await expect(
      freezeRegistry
        .connect(alice)
        .unfreezeWallet(alice.address, ethers.keccak256(ethers.toUtf8Bytes("RESOLUTION-5")))
    ).to.be.revertedWith("dao required");
  });
});
