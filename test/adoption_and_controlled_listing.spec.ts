import { expect } from "chai";
import { ethers, network } from "hardhat";

describe("ADOPTION_AND_CONTROLLED_LISTING", () => {
  it("blocks unapproved venues, enforces caps, and allows phase upgrades", async () => {
    const [deployer, venue, alice] = await ethers.getSigners();

    const ListingPolicyRegistry = await ethers.getContractFactory("ListingPolicyRegistry");
    const listing = await ListingPolicyRegistry.deploy(deployer.address);
    await listing.waitForDeployment();

    const policyVersion = await listing.publishPolicy.staticCall(
      2,
      ethers.parseUnits("100", 18),
      2,
      86400,
      ethers.keccak256(ethers.toUtf8Bytes("LISTING-POLICY-V1"))
    );
    await listing.publishPolicy(
      2,
      ethers.parseUnits("100", 18),
      2,
      86400,
      ethers.keccak256(ethers.toUtf8Bytes("LISTING-POLICY-V1"))
    );
    await listing.activatePolicy(policyVersion);

    await listing.setVenue(venue.address, true, 1 << 2, ethers.parseUnits("50", 18), 1, 86400);

    const TransferRestrictionEngine = await ethers.getContractFactory("TransferRestrictionEngine");
    const engine = await TransferRestrictionEngine.deploy(deployer.address);
    await engine.waitForDeployment();

    await engine.setListingPolicyRegistry(await listing.getAddress());

    const policyEngineVersion = await engine.publishPolicyWithListing.staticCall(
      0,
      false,
      false,
      false,
      false,
      false,
      0,
      false,
      false,
      true,
      ethers.ZeroHash,
      ethers.keccak256(ethers.toUtf8Bytes("ENGINE-LISTING-POLICY"))
    );
    await engine.publishPolicyWithListing(
      0,
      false,
      false,
      false,
      false,
      false,
      0,
      false,
      false,
      true,
      ethers.ZeroHash,
      ethers.keccak256(ethers.toUtf8Bytes("ENGINE-LISTING-POLICY"))
    );
    await engine.activatePolicy(policyEngineVersion);

    const enforcerRole = await listing.ENFORCER_ROLE();
    await listing.grantRole(enforcerRole, await engine.getAddress());

    const FractalToken = await ethers.getContractFactory("FractalToken");
    const token = await FractalToken.deploy(ethers.parseUnits("1000000", 18));
    await token.waitForDeployment();

    await token.setTransferRestrictionEngine(await engine.getAddress());
    await token.setAdvancedRestrictionsEnabled(true);

    await token.transferWithSeries(venue.address, ethers.parseUnits("10", 18), ethers.ZeroHash);

    await expect(
      token.transferWithSeries(venue.address, ethers.parseUnits("10", 18), ethers.ZeroHash)
    ).to.be.revertedWith("transfer restricted");

    await listing.setVenue(venue.address, false, 0, 0, 0, 0);
    await expect(
      token.transferWithSeries(venue.address, ethers.parseUnits("1", 18), ethers.ZeroHash)
    ).to.be.revertedWith("transfer restricted");

    const policyVersion2 = await listing.publishPolicy.staticCall(
      3,
      ethers.parseUnits("500", 18),
      5,
      86400,
      ethers.keccak256(ethers.toUtf8Bytes("LISTING-POLICY-V2"))
    );
    await listing.publishPolicy(
      3,
      ethers.parseUnits("500", 18),
      5,
      86400,
      ethers.keccak256(ethers.toUtf8Bytes("LISTING-POLICY-V2"))
    );
    await listing.activatePolicy(policyVersion2);

    await listing.setVenue(venue.address, true, (1 << 2) | (1 << 3), 0, 0, 0);
    await token.transferWithSeries(venue.address, ethers.parseUnits("10", 18), ethers.ZeroHash);

    await token.transfer(alice.address, ethers.parseUnits("1", 18));
    await expect(token.connect(alice).transfer(venue.address, ethers.parseUnits("1", 18))).to.be.revertedWith(
      "transfer restricted"
    );
  });
});
