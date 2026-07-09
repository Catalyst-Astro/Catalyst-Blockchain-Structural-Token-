import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("RampVault", () => {
  async function deployRamp() {
    const [admin, notary, auditor, operator, user] = await ethers.getSigners();

    const RoleAuthority = await ethers.getContractFactory("RoleAuthority");
    const roleAuthority = await RoleAuthority.deploy(admin.address);
    await roleAuthority.waitForDeployment();
    await roleAuthority.grantRole(await roleAuthority.NOTARY(), notary.address);
    await roleAuthority.grantRole(await roleAuthority.AUDITOR(), auditor.address);
    await roleAuthority.grantRole(await roleAuthority.DAO_COUNCIL(), admin.address);

    const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
    const idReg = await IdentityRegistry.deploy(await roleAuthority.getAddress());
    await idReg.waitForDeployment();

    const AMLScoringRegistry = await ethers.getContractFactory("AMLScoringRegistry");
    const aml = await AMLScoringRegistry.deploy(admin.address);
    await aml.waitForDeployment();

    const CredentialRegistry = await ethers.getContractFactory("CredentialRegistry");
    const cred = await CredentialRegistry.deploy(await roleAuthority.getAddress());
    await cred.waitForDeployment();

    const EventRegistry = await ethers.getContractFactory("EventRegistry");
    const eventReg = await EventRegistry.deploy(admin.address, 1, 1);
    await eventReg.waitForDeployment();
    await eventReg.grantRole(await eventReg.NOTARY(), notary.address);
    await eventReg.grantRole(await eventReg.AUDITOR(), auditor.address);

    const ComplianceGate = await ethers.getContractFactory("ComplianceGate");
    const gate = await ComplianceGate.deploy(
      await roleAuthority.getAddress(),
      await idReg.getAddress(),
      await aml.getAddress(),
      await cred.getAddress(),
      ethers.ZeroHash,
      await eventReg.getAddress()
    );
    await gate.waitForDeployment();

    const Token = await ethers.getContractFactory("TestToken");
    const settlement = await Token.deploy();
    await settlement.waitForDeployment();
    await settlement.mint(admin.address, ethers.parseUnits("100000", 18));
    await settlement.mint(user.address, ethers.parseUnits("1000", 18));

    const RampVault = await ethers.getContractFactory("RampVault");
    const vault = await RampVault.deploy(
      admin.address,
      settlement,
      gate,
      eventReg,
      ethers.parseUnits("10000", 18),
      ethers.parseUnits("20000", 18),
      0,
      1
    );
    await vault.waitForDeployment();
    await vault.grantRole(await vault.RAMP_OPERATOR(), operator.address);

    // fund vault for payouts
    await settlement.connect(admin).transfer(await vault.getAddress(), ethers.parseUnits("10000", 18));

    const eid = ethers.keccak256(ethers.toUtf8Bytes("EID-CASHIN"));
    const eventType = ethers.keccak256(ethers.toUtf8Bytes("RAMP"));
    const payloadHash = ethers.keccak256(ethers.toUtf8Bytes("PAYLOAD"));

    await eventReg.createEvent(eid, eventType, payloadHash, []);
    await eventReg.connect(notary).attestEvent(eid);
    await eventReg.connect(auditor).verifyEvent(eid);

    const idHash = ethers.keccak256(ethers.toUtf8Bytes("KYC-USER"));
    await idReg.connect(notary).verifyIdentity(user.address, idHash);
    await aml.assignRisk(user.address, 0);

    return { admin, notary, auditor, operator, user, settlement, vault, eid, eventReg, idReg, aml };
  }

  it("blocks cash-in without verified event", async () => {
    const { vault, user } = await deployRamp();
    const badEid = ethers.keccak256(ethers.toUtf8Bytes("BAD"));
    await expect(vault.connect(user).requestCashIn(badEid, 1, ethers.ZeroHash)).to.be.reverted;
  });

  it("runs cash-in flow end-to-end", async () => {
    const { vault, user, operator, settlement, eid } = await deployRamp();
    const amount = ethers.parseUnits("100", 18);

    await expect(vault.connect(user).requestCashIn(eid, amount, ethers.ZeroHash))
      .to.emit(vault, "CashInRequested")
      .withArgs(eid, user.address, amount, ethers.ZeroHash);

    await expect(vault.connect(operator).confirmCashIn(eid, ethers.keccak256(ethers.toUtf8Bytes("VID"))))
      .to.emit(vault, "CashInConfirmed")
      .withArgs(eid, anyValue, operator.address);

    const userBalanceBefore = await settlement.balanceOf(user.address);
    await expect(vault.settle(eid)).to.emit(vault, "Settled").withArgs(eid, amount, 1); // Direction.CASH_IN=1
    const userBalanceAfter = await settlement.balanceOf(user.address);
    expect(userBalanceAfter - userBalanceBefore).to.equal(amount);
  });

  it("escrows and settles cash-out", async () => {
    const { vault, user, operator, settlement, eid } = await deployRamp();
    const amount = ethers.parseUnits("50", 18);
    await settlement.connect(user).approve(await vault.getAddress(), amount);

    await vault.connect(user).requestCashOut(eid, amount, ethers.ZeroHash);
    await vault.connect(operator).confirmCashOut(eid, ethers.keccak256(ethers.toUtf8Bytes("VID-2")));

    const vaultBalBefore = await settlement.balanceOf(await vault.getAddress());
    await expect(vault.settle(eid)).to.emit(vault, "Settled").withArgs(eid, amount, 2); // Direction.CASH_OUT=2
    const vaultBalAfter = await settlement.balanceOf(await vault.getAddress());
    expect(vaultBalBefore - vaultBalAfter).to.equal(amount);
  });

  it("enforces maxPerTx", async () => {
    const { vault, user, eid } = await deployRamp();
    const tooMuch = ethers.parseUnits("20000", 18);
    await expect(vault.connect(user).requestCashIn(eid, tooMuch, ethers.ZeroHash)).to.be.revertedWith("over maxPerTx");
  });
});
