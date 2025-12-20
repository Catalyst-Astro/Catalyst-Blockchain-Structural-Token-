import { expect } from "chai";
import { ethers } from "hardhat";

describe("TRANSACTION_MONITORING_AND_ALERTS", () => {
  it("raises alerts, escalates risk, and enforces limits", async () => {
    const [deployer, alice, bob] = await ethers.getSigners();

    const RiskScoreRegistry = await ethers.getContractFactory("RiskScoreRegistry");
    const scoreRegistry = await RiskScoreRegistry.deploy(deployer.address);
    await scoreRegistry.waitForDeployment();

    const RiskPolicyRegistry = await ethers.getContractFactory("RiskPolicyRegistry");
    const policyRegistry = await RiskPolicyRegistry.deploy(deployer.address);
    await policyRegistry.waitForDeployment();

    const RiskEnforcement = await ethers.getContractFactory("RiskEnforcement");
    const enforcement = await RiskEnforcement.deploy(
      deployer.address,
      await scoreRegistry.getAddress(),
      await policyRegistry.getAddress()
    );
    await enforcement.waitForDeployment();

    const FractalToken = await ethers.getContractFactory("FractalToken");
    const token = await FractalToken.deploy(ethers.parseUnits("1000000", 18));
    await token.waitForDeployment();

    const enforcerRole = await enforcement.ENFORCER_ROLE();
    await enforcement.grantRole(enforcerRole, await token.getAddress());

    const actionReceive = await enforcement.ACTION_RECEIVE();
    const actionTransfer = await enforcement.ACTION_TRANSFER();
    const allowedBasic = actionReceive | actionTransfer;

    const lowVersion = await policyRegistry.publishPolicy.staticCall(
      0,
      0,
      0,
      0,
      allowedBasic,
      ethers.keccak256(ethers.toUtf8Bytes("POLICY-LOW"))
    );
    await policyRegistry.publishPolicy(
      0,
      0,
      0,
      0,
      allowedBasic,
      ethers.keccak256(ethers.toUtf8Bytes("POLICY-LOW"))
    );
    await policyRegistry.activatePolicy(0, lowVersion);

    const mediumVersion = await policyRegistry.publishPolicy.staticCall(
      1,
      ethers.parseUnits("1000", 18),
      1,
      86400,
      allowedBasic,
      ethers.keccak256(ethers.toUtf8Bytes("POLICY-MEDIUM"))
    );
    await policyRegistry.publishPolicy(
      1,
      ethers.parseUnits("1000", 18),
      1,
      86400,
      allowedBasic,
      ethers.keccak256(ethers.toUtf8Bytes("POLICY-MEDIUM"))
    );
    await policyRegistry.activatePolicy(1, mediumVersion);

    const highVersion = await policyRegistry.publishPolicy.staticCall(
      2,
      0,
      0,
      0,
      0,
      ethers.keccak256(ethers.toUtf8Bytes("POLICY-HIGH"))
    );
    await policyRegistry.publishPolicy(
      2,
      0,
      0,
      0,
      0,
      ethers.keccak256(ethers.toUtf8Bytes("POLICY-HIGH"))
    );
    await policyRegistry.activatePolicy(2, highVersion);

    await scoreRegistry.setWalletScore(
      deployer.address,
      0,
      1,
      0,
      0,
      ethers.keccak256(ethers.toUtf8Bytes("LOW-DEPLOYER"))
    );
    await scoreRegistry.setWalletScore(
      alice.address,
      0,
      1,
      0,
      0,
      ethers.keccak256(ethers.toUtf8Bytes("LOW-ALICE"))
    );
    await scoreRegistry.setWalletScore(
      bob.address,
      0,
      1,
      0,
      0,
      ethers.keccak256(ethers.toUtf8Bytes("LOW-BOB"))
    );

    await token.setRiskEnforcement(await enforcement.getAddress());
    await token.setRiskLimitsEnabled(true);

    const AutoActionPolicy = await ethers.getContractFactory("AutoActionPolicy");
    const actionPolicy = await AutoActionPolicy.deploy(deployer.address);
    await actionPolicy.waitForDeployment();

    const AlertRegistry = await ethers.getContractFactory("AlertRegistry");
    const alertRegistry = await AlertRegistry.deploy(deployer.address);
    await alertRegistry.waitForDeployment();

    const complianceRole = await scoreRegistry.COMPLIANCE_ADMIN();
    await scoreRegistry.grantRole(complianceRole, await alertRegistry.getAddress());

    await alertRegistry.setActionPolicy(await actionPolicy.getAddress());
    await alertRegistry.setRiskScoreRegistry(await scoreRegistry.getAddress());
    await alertRegistry.setAutoActionsEnabled(true);

    const infoVersion = await actionPolicy.publishPolicy.staticCall(
      0,
      0,
      0,
      0,
      ethers.keccak256(ethers.toUtf8Bytes("INFO-ACTION"))
    );
    await actionPolicy.publishPolicy(
      0,
      0,
      0,
      0,
      ethers.keccak256(ethers.toUtf8Bytes("INFO-ACTION"))
    );
    await actionPolicy.activatePolicy(0, infoVersion);

    const warningVersion = await actionPolicy.publishPolicy.staticCall(
      1,
      1,
      1,
      0,
      ethers.keccak256(ethers.toUtf8Bytes("WARN-ACTION"))
    );
    await actionPolicy.publishPolicy(
      1,
      1,
      1,
      0,
      ethers.keccak256(ethers.toUtf8Bytes("WARN-ACTION"))
    );
    await actionPolicy.activatePolicy(1, warningVersion);

    const criticalVersion = await actionPolicy.publishPolicy.staticCall(
      2,
      1,
      2,
      3600,
      ethers.keccak256(ethers.toUtf8Bytes("CRIT-ACTION"))
    );
    await actionPolicy.publishPolicy(
      2,
      1,
      2,
      3600,
      ethers.keccak256(ethers.toUtf8Bytes("CRIT-ACTION"))
    );
    await actionPolicy.activatePolicy(2, criticalVersion);

    const infoAlert = ethers.keccak256(ethers.toUtf8Bytes("ALERT-INFO"));
    await alertRegistry.raiseAlert(
      infoAlert,
      alice.address,
      ethers.ZeroHash,
      0,
      ethers.keccak256(ethers.toUtf8Bytes("RULE-INFO"))
    );

    const [infoLevel] = await scoreRegistry.scoreOfWallet(alice.address);
    expect(infoLevel).to.equal(0);

    const warnAlert = ethers.keccak256(ethers.toUtf8Bytes("ALERT-WARN"));
    await alertRegistry.raiseAlert(
      warnAlert,
      alice.address,
      ethers.ZeroHash,
      1,
      ethers.keccak256(ethers.toUtf8Bytes("RULE-WARN"))
    );

    const [warnLevel] = await scoreRegistry.scoreOfWallet(alice.address);
    expect(warnLevel).to.equal(1);

    await token.transfer(alice.address, ethers.parseUnits("10", 18));
    await expect(token.transfer(alice.address, ethers.parseUnits("5", 18))).to.be.revertedWith(
      "tx limit exceeded"
    );

    const criticalAlert = ethers.keccak256(ethers.toUtf8Bytes("ALERT-CRIT"));
    await alertRegistry.raiseAlert(
      criticalAlert,
      bob.address,
      ethers.ZeroHash,
      2,
      ethers.keccak256(ethers.toUtf8Bytes("RULE-CRIT"))
    );

    await expect(token.transfer(bob.address, ethers.parseUnits("1", 18))).to.be.revertedWith(
      "action not allowed"
    );

    await alertRegistry.closeAlert(
      criticalAlert,
      ethers.keccak256(ethers.toUtf8Bytes("RESOLVED"))
    );
    await scoreRegistry.setWalletScore(
      bob.address,
      0,
      2,
      0,
      0,
      ethers.keccak256(ethers.toUtf8Bytes("LOW-RESTORED"))
    );

    await token.transfer(bob.address, ethers.parseUnits("1", 18));
    expect(await token.balanceOf(bob.address)).to.equal(ethers.parseUnits("1", 18));
  });
});
