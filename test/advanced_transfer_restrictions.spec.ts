import { expect } from "chai";
import { ethers } from "hardhat";

describe("ADVANCED_TRANSFER_RESTRICTIONS", () => {
  it("enforces lockup, jurisdiction, whitelist, risk, and policy changes per series", async () => {
    const [deployer, alice, bob] = await ethers.getSigners();

    const SeriesRegistry = await ethers.getContractFactory("SeriesRegistry");
    const seriesRegistry = await SeriesRegistry.deploy(deployer.address);
    await seriesRegistry.waitForDeployment();

    const LockupRegistry = await ethers.getContractFactory("LockupRegistry");
    const lockupRegistry = await LockupRegistry.deploy(deployer.address);
    await lockupRegistry.waitForDeployment();

    const JurisdictionRegistry = await ethers.getContractFactory("JurisdictionRegistry");
    const jurisdictionRegistry = await JurisdictionRegistry.deploy(deployer.address);
    await jurisdictionRegistry.waitForDeployment();

    const JurisdictionPolicyRegistry = await ethers.getContractFactory("JurisdictionPolicyRegistry");
    const jurisdictionPolicy = await JurisdictionPolicyRegistry.deploy(deployer.address);
    await jurisdictionPolicy.waitForDeployment();

    const WhitelistRegistry = await ethers.getContractFactory("WhitelistRegistry");
    const whitelistRegistry = await WhitelistRegistry.deploy(deployer.address);
    await whitelistRegistry.waitForDeployment();

    const RiskScoreRegistry = await ethers.getContractFactory("RiskScoreRegistry");
    const riskRegistry = await RiskScoreRegistry.deploy(deployer.address);
    await riskRegistry.waitForDeployment();

    const DisclosureRegistry = await ethers.getContractFactory("DisclosureRegistry");
    const disclosureRegistry = await DisclosureRegistry.deploy(deployer.address);
    await disclosureRegistry.waitForDeployment();

    const AcceptanceRegistry = await ethers.getContractFactory("AcceptanceRegistry");
    const acceptanceRegistry = await AcceptanceRegistry.deploy(await disclosureRegistry.getAddress());
    await acceptanceRegistry.waitForDeployment();

    const TransferRestrictionEngine = await ethers.getContractFactory("TransferRestrictionEngine");
    const engine = await TransferRestrictionEngine.deploy(deployer.address);
    await engine.waitForDeployment();

    await engine.setSeriesRegistry(await seriesRegistry.getAddress());
    await engine.setLockupRegistry(await lockupRegistry.getAddress());
    await engine.setJurisdictionRegistry(await jurisdictionRegistry.getAddress());
    await engine.setJurisdictionPolicyRegistry(await jurisdictionPolicy.getAddress());
    await engine.setWhitelistRegistry(await whitelistRegistry.getAddress());
    await engine.setRiskScoreRegistry(await riskRegistry.getAddress());
    await engine.setDisclosureRegistry(await disclosureRegistry.getAddress());
    await engine.setAcceptanceRegistry(await acceptanceRegistry.getAddress());

    const seriesId = ethers.keccak256(ethers.toUtf8Bytes("FRA-CAB-001"));
    await seriesRegistry.createSeries(seriesId, ethers.keccak256(ethers.toUtf8Bytes("SERIES-META")));

    const policyVersion = await engine.publishPolicy.staticCall(
      1,
      false,
      false,
      true,
      true,
      true,
      0,
      false,
      true,
      ethers.ZeroHash,
      ethers.keccak256(ethers.toUtf8Bytes("RESTRICT-POLICY-V1"))
    );
    await engine.publishPolicy(
      1,
      false,
      false,
      true,
      true,
      true,
      0,
      false,
      true,
      ethers.ZeroHash,
      ethers.keccak256(ethers.toUtf8Bytes("RESTRICT-POLICY-V1"))
    );
    await engine.activatePolicy(policyVersion);
    await seriesRegistry.setSeriesPolicy(seriesId, policyVersion);

    const jurisdictionPolicyVersion = await jurisdictionPolicy.publishPolicy.staticCall(
      ethers.keccak256(ethers.toUtf8Bytes("JURISDICTION-V1"))
    );
    await jurisdictionPolicy.publishPolicy(ethers.keccak256(ethers.toUtf8Bytes("JURISDICTION-V1")));
    await jurisdictionPolicy.activatePolicy(jurisdictionPolicyVersion);
    await jurisdictionPolicy.setAllowlist(
      jurisdictionPolicyVersion,
      seriesId,
      ethers.keccak256(ethers.toUtf8Bytes("MX")),
      true
    );

    await whitelistRegistry.approveWallet(deployer.address, policyVersion);
    await whitelistRegistry.approveWallet(alice.address, policyVersion);

    await jurisdictionRegistry.setJurisdiction(deployer.address, ethers.keccak256(ethers.toUtf8Bytes("MX")));
    await jurisdictionRegistry.setJurisdiction(alice.address, ethers.keccak256(ethers.toUtf8Bytes("MX")));
    await jurisdictionRegistry.setJurisdiction(bob.address, ethers.keccak256(ethers.toUtf8Bytes("MX")));

    await riskRegistry.setWalletScore(
      deployer.address,
      0,
      1,
      0,
      0,
      ethers.keccak256(ethers.toUtf8Bytes("LOW-DEPLOYER"))
    );
    await riskRegistry.setWalletScore(
      alice.address,
      0,
      1,
      0,
      0,
      ethers.keccak256(ethers.toUtf8Bytes("LOW-ALICE"))
    );
    await riskRegistry.setWalletScore(
      bob.address,
      2,
      1,
      0,
      0,
      ethers.keccak256(ethers.toUtf8Bytes("HIGH-BOB"))
    );

    const FractalToken = await ethers.getContractFactory("FractalToken");
    const token = await FractalToken.deploy(ethers.parseUnits("1000000", 18));
    await token.waitForDeployment();

    await token.setTransferRestrictionEngine(await engine.getAddress());
    await token.setAdvancedRestrictionsEnabled(true);

    await token.transferWithSeries(alice.address, ethers.parseUnits("10", 18), seriesId);
    expect(await token.balanceOf(alice.address)).to.equal(ethers.parseUnits("10", 18));

    await lockupRegistry.setSeriesLockup(seriesId, BigInt((await ethers.provider.getBlock("latest"))?.timestamp ?? 0) + 3600n);
    await expect(token.transferWithSeries(alice.address, ethers.parseUnits("1", 18), seriesId)).to.be.revertedWith(
      "transfer restricted"
    );
    await lockupRegistry.setSeriesLockup(seriesId, 0);

    await jurisdictionRegistry.updateJurisdiction(alice.address, ethers.keccak256(ethers.toUtf8Bytes("US")));
    await expect(token.transferWithSeries(alice.address, ethers.parseUnits("1", 18), seriesId)).to.be.revertedWith(
      "transfer restricted"
    );
    await jurisdictionRegistry.updateJurisdiction(alice.address, ethers.keccak256(ethers.toUtf8Bytes("MX")));

    await expect(token.transferWithSeries(bob.address, ethers.parseUnits("1", 18), seriesId)).to.be.revertedWith(
      "transfer restricted"
    );

    await whitelistRegistry.approveWallet(bob.address, policyVersion);
    await expect(token.transferWithSeries(bob.address, ethers.parseUnits("1", 18), seriesId)).to.be.revertedWith(
      "transfer restricted"
    );

    const disclosureId = await disclosureRegistry.publishDisclosure.staticCall(
      ethers.keccak256(ethers.toUtf8Bytes("DISCLOSURE-V1"))
    );
    await disclosureRegistry.publishDisclosure(ethers.keccak256(ethers.toUtf8Bytes("DISCLOSURE-V1")));
    await disclosureRegistry.activateDisclosure(disclosureId);

    const policyVersion2 = await engine.publishPolicy.staticCall(
      1,
      true,
      false,
      true,
      true,
      true,
      0,
      false,
      true,
      ethers.ZeroHash,
      ethers.keccak256(ethers.toUtf8Bytes("RESTRICT-POLICY-V2"))
    );
    await engine.publishPolicy(
      1,
      true,
      false,
      true,
      true,
      true,
      0,
      false,
      true,
      ethers.ZeroHash,
      ethers.keccak256(ethers.toUtf8Bytes("RESTRICT-POLICY-V2"))
    );
    await engine.activatePolicy(policyVersion2);
    await seriesRegistry.setSeriesPolicy(seriesId, policyVersion2);

    await expect(token.transferWithSeries(alice.address, ethers.parseUnits("1", 18), seriesId)).to.be.revertedWith(
      "transfer restricted"
    );

    await acceptanceRegistry.acceptActiveDisclosure();
    await acceptanceRegistry.connect(alice).acceptActiveDisclosure();

    await token.transferWithSeries(alice.address, ethers.parseUnits("1", 18), seriesId);
    expect(await token.balanceOf(alice.address)).to.equal(ethers.parseUnits("11", 18));
  });
});
