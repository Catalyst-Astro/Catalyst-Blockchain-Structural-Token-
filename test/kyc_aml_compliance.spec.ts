import { expect } from "chai";
import { ethers } from "hardhat";

describe("KYC_AML_COMPLIANCE", () => {
  it("blocks unverified wallets and high-risk/suspended wallets", async () => {
    const [deployer, alice, bob, notary] = await ethers.getSigners();

    const RoleAuthority = await ethers.getContractFactory("RoleAuthority");
    const roleAuthority = await RoleAuthority.deploy(deployer.address);
    await roleAuthority.waitForDeployment();

    const notaryRole = await roleAuthority.NOTARY();
    await roleAuthority.grantRole(notaryRole, notary.address);

    const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
    const identity = await IdentityRegistry.deploy(await roleAuthority.getAddress());
    await identity.waitForDeployment();

    const CredentialRegistry = await ethers.getContractFactory("CredentialRegistry");
    const credentialRegistry = await CredentialRegistry.deploy(await roleAuthority.getAddress());
    await credentialRegistry.waitForDeployment();

    const AMLScoringRegistry = await ethers.getContractFactory("AMLScoringRegistry");
    const scoring = await AMLScoringRegistry.deploy(deployer.address);
    await scoring.waitForDeployment();

    const ComplianceGate = await ethers.getContractFactory("ComplianceGate");
    const gate = await ComplianceGate.deploy(
      await roleAuthority.getAddress(),
      await identity.getAddress(),
      await scoring.getAddress(),
      await credentialRegistry.getAddress(),
      ethers.ZeroHash
    );
    await gate.waitForDeployment();

    const FractalToken = await ethers.getContractFactory("FractalToken");
    const token = await FractalToken.deploy(ethers.parseUnits("1000", 18));
    await token.waitForDeployment();

    await token.setComplianceGate(await gate.getAddress());
    await token.setComplianceEnabled(true);

    await expect(token.transfer(alice.address, ethers.parseUnits("1", 18))).to.be.revertedWith(
      "KYC not verified"
    );

    const idHash = ethers.keccak256(ethers.toUtf8Bytes("ID-ALICE"));
    await identity.connect(notary).verifyIdentity(alice.address, idHash);
    const deployerHash = ethers.keccak256(ethers.toUtf8Bytes("ID-DEPLOYER"));
    await identity.connect(notary).verifyIdentity(deployer.address, deployerHash);
    const bobHash = ethers.keccak256(ethers.toUtf8Bytes("ID-BOB"));
    await identity.connect(notary).verifyIdentity(bob.address, bobHash);
    await scoring.assignRisk(alice.address, 1);

    await token.transfer(alice.address, ethers.parseUnits("1", 18));
    expect(await token.balanceOf(alice.address)).to.equal(ethers.parseUnits("1", 18));

    await scoring.updateRisk(alice.address, 2);
    await expect(
      token.connect(alice).transfer(bob.address, ethers.parseUnits("1", 18))
    ).to.be.revertedWith("AML risk too high");

    const investigationReason = ethers.keccak256(ethers.toUtf8Bytes("investigation"));
    await identity.suspendIdentity(alice.address, investigationReason);
    await expect(
      token.connect(alice).transfer(bob.address, ethers.parseUnits("1", 18))
    ).to.be.revertedWith("KYC not verified");
  });
});
