import { expect } from "chai";
import { ethers } from "hardhat";

describe("KYC_AML_COMPLIANCE", () => {
  it("blocks unverified wallets and high-risk/suspended wallets", async () => {
    const [deployer, alice, bob] = await ethers.getSigners();

    const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
    const identity = await IdentityRegistry.deploy(deployer.address);
    await identity.waitForDeployment();

    const AMLScoringRegistry = await ethers.getContractFactory("AMLScoringRegistry");
    const scoring = await AMLScoringRegistry.deploy(deployer.address);
    await scoring.waitForDeployment();

    const ComplianceGate = await ethers.getContractFactory("ComplianceGate");
    const gate = await ComplianceGate.deploy(
      deployer.address,
      await identity.getAddress(),
      await scoring.getAddress()
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
    await identity.verifyIdentity(alice.address, idHash, 0);
    await scoring.assignRisk(alice.address, 1);

    await token.transfer(alice.address, ethers.parseUnits("1", 18));
    expect(await token.balanceOf(alice.address)).to.equal(ethers.parseUnits("1", 18));

    await scoring.updateRisk(alice.address, 2);
    await expect(
      token.connect(alice).transfer(bob.address, ethers.parseUnits("1", 18))
    ).to.be.revertedWith("AML risk too high");

    await identity.suspendIdentity(alice.address);
    await expect(
      token.connect(alice).transfer(bob.address, ethers.parseUnits("1", 18))
    ).to.be.revertedWith("KYC not verified");
  });
});
