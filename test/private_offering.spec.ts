import { expect } from "chai";
import { ethers, network } from "hardhat";

describe("OFERTA_PRIVADA_VALORES", () => {
  it("enforces eligibility, jurisdiction, and lockup for private offering transfers", async () => {
    const [deployer, alice, bob, charlie] = await ethers.getSigners();

    const PrivateOfferingRegistry = await ethers.getContractFactory("PrivateOfferingRegistry");
    const offeringRegistry = await PrivateOfferingRegistry.deploy(deployer.address);
    await offeringRegistry.waitForDeployment();

    const InvestorEligibilityRegistry = await ethers.getContractFactory("InvestorEligibilityRegistry");
    const eligibilityRegistry = await InvestorEligibilityRegistry.deploy(deployer.address);
    await eligibilityRegistry.waitForDeployment();

    const TransferRestrictionPolicy = await ethers.getContractFactory("TransferRestrictionPolicy");
    const policy = await TransferRestrictionPolicy.deploy(deployer.address);
    await policy.waitForDeployment();

    const FractalToken = await ethers.getContractFactory("FractalToken");
    const token = await FractalToken.deploy(ethers.parseUnits("1000000", 18));
    await token.waitForDeployment();

    const offeringId = ethers.keccak256(ethers.toUtf8Bytes("OFFERING-1"));
    const exemptionType = ethers.keccak256(ethers.toUtf8Bytes("REG_D"));
    const ppmHash = ethers.keccak256(ethers.toUtf8Bytes("PPM-V1"));
    const subscriptionHash = ethers.keccak256(ethers.toUtf8Bytes("SUBSCRIPTION-V1"));
    const jurisdictionMX = ethers.keccak256(ethers.toUtf8Bytes("MX"));
    const accredited = ethers.keccak256(ethers.toUtf8Bytes("ACCREDITED"));

    await offeringRegistry.createOffering(offeringId, exemptionType, ppmHash, subscriptionHash);
    await offeringRegistry.setJurisdictionAllowed(offeringId, jurisdictionMX, true);

    await eligibilityRegistry.approveInvestor(deployer.address, accredited, jurisdictionMX);
    await eligibilityRegistry.approveInvestor(alice.address, accredited, jurisdictionMX);
    await eligibilityRegistry.approveInvestor(bob.address, accredited, jurisdictionMX);

    await policy.updatePolicy(true, true, true, 0, ethers.keccak256(ethers.toUtf8Bytes("POLICY-V1")));

    await token.setPrivateOfferingRegistry(await offeringRegistry.getAddress());
    await token.setInvestorEligibilityRegistry(await eligibilityRegistry.getAddress());
    await token.setTransferRestrictionPolicy(await policy.getAddress());
    await token.setOfferingId(offeringId);
    await token.setPrivateOfferingEnabled(true);

    await token.transfer(alice.address, ethers.parseUnits("1000", 18));

    await expect(token.transfer(charlie.address, ethers.parseUnits("1", 18))).to.be.revertedWith(
      "investor not eligible"
    );

    const now = (await ethers.provider.getBlock("latest"))?.timestamp ?? 0;
    await policy.setLockup(alice.address, BigInt(now + 3600));

    await expect(
      token.connect(alice).transfer(bob.address, ethers.parseUnits("10", 18))
    ).to.be.revertedWith("lockup active");

    await network.provider.send("evm_increaseTime", [3601]);
    await network.provider.send("evm_mine");

    await token.connect(alice).transfer(bob.address, ethers.parseUnits("10", 18));
    expect(await token.balanceOf(bob.address)).to.equal(ethers.parseUnits("10", 18));
  });
});
