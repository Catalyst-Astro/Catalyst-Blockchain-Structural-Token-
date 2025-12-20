import { expect } from "chai";
import { ethers, network } from "hardhat";

describe("AML_RISK_SCORING_AND_LIMITS", () => {
  it("enforces risk-based limits, policy updates, and score expiry", async () => {
    const [deployer, alice, bob, charlie, dave] = await ethers.getSigners();

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
      ethers.keccak256(ethers.toUtf8Bytes("POLICY-LOW-V1"))
    );
    await policyRegistry.publishPolicy(
      0,
      0,
      0,
      0,
      allowedBasic,
      ethers.keccak256(ethers.toUtf8Bytes("POLICY-LOW-V1"))
    );
    await policyRegistry.activatePolicy(0, lowVersion);

    const mediumVersion = await policyRegistry.publishPolicy.staticCall(
      1,
      ethers.parseUnits("100", 18),
      2,
      86400,
      allowedBasic,
      ethers.keccak256(ethers.toUtf8Bytes("POLICY-MEDIUM-V1"))
    );
    await policyRegistry.publishPolicy(
      1,
      ethers.parseUnits("100", 18),
      2,
      86400,
      allowedBasic,
      ethers.keccak256(ethers.toUtf8Bytes("POLICY-MEDIUM-V1"))
    );
    await policyRegistry.activatePolicy(1, mediumVersion);

    const highVersion = await policyRegistry.publishPolicy.staticCall(
      2,
      0,
      0,
      0,
      0,
      ethers.keccak256(ethers.toUtf8Bytes("POLICY-HIGH-V1"))
    );
    await policyRegistry.publishPolicy(
      2,
      0,
      0,
      0,
      0,
      ethers.keccak256(ethers.toUtf8Bytes("POLICY-HIGH-V1"))
    );
    await policyRegistry.activatePolicy(2, highVersion);

    await scoreRegistry.setWalletScore(
      deployer.address,
      0,
      1,
      0,
      0,
      ethers.keccak256(ethers.toUtf8Bytes("LOW-V1"))
    );
    await scoreRegistry.setWalletScore(
      alice.address,
      1,
      1,
      0,
      0,
      ethers.keccak256(ethers.toUtf8Bytes("MEDIUM-V1"))
    );
    await scoreRegistry.setWalletScore(
      bob.address,
      2,
      1,
      0,
      0,
      ethers.keccak256(ethers.toUtf8Bytes("HIGH-V1"))
    );

    await token.setRiskEnforcement(await enforcement.getAddress());
    await token.setRiskLimitsEnabled(true);

    await token.transfer(alice.address, ethers.parseUnits("10", 18));
    await token.transfer(alice.address, ethers.parseUnits("10", 18));

    await expect(token.transfer(alice.address, ethers.parseUnits("1", 18))).to.be.revertedWith(
      "tx limit exceeded"
    );

    await expect(token.transfer(bob.address, ethers.parseUnits("1", 18))).to.be.revertedWith(
      "action not allowed"
    );

    const mediumVersion2 = await policyRegistry.publishPolicy.staticCall(
      1,
      ethers.parseUnits("15", 18),
      10,
      86400,
      allowedBasic,
      ethers.keccak256(ethers.toUtf8Bytes("POLICY-MEDIUM-V2"))
    );
    await policyRegistry.publishPolicy(
      1,
      ethers.parseUnits("15", 18),
      10,
      86400,
      allowedBasic,
      ethers.keccak256(ethers.toUtf8Bytes("POLICY-MEDIUM-V2"))
    );
    await policyRegistry.activatePolicy(1, mediumVersion2);

    await scoreRegistry.setWalletScore(
      charlie.address,
      1,
      2,
      0,
      0,
      ethers.keccak256(ethers.toUtf8Bytes("MEDIUM-V2"))
    );

    await token.transfer(charlie.address, ethers.parseUnits("10", 18));
    await expect(token.transfer(charlie.address, ethers.parseUnits("10", 18))).to.be.revertedWith(
      "amount limit exceeded"
    );

    const now = (await ethers.provider.getBlock("latest"))?.timestamp ?? 0;
    await scoreRegistry.setWalletScore(
      dave.address,
      1,
      3,
      BigInt(now),
      BigInt(now + 5),
      ethers.keccak256(ethers.toUtf8Bytes("MEDIUM-EXPIRY"))
    );

    await network.provider.send("evm_increaseTime", [6]);
    await network.provider.send("evm_mine");

    await expect(token.transfer(dave.address, ethers.parseUnits("1", 18))).to.be.revertedWith(
      "risk score inactive"
    );
  });
});
