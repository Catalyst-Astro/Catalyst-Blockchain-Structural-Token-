import { expect } from "chai";
import { ethers } from "hardhat";

describe("WALLET_WHITELIST_ENFORCEMENT", () => {
  it("enforces whitelist status and policy updates", async () => {
    const [deployer, alice, bob] = await ethers.getSigners();

    const WhitelistRegistry = await ethers.getContractFactory("WhitelistRegistry");
    const whitelistRegistry = await WhitelistRegistry.deploy(deployer.address);
    await whitelistRegistry.waitForDeployment();

    const WhitelistPolicy = await ethers.getContractFactory("WhitelistPolicy");
    const whitelistPolicy = await WhitelistPolicy.deploy(deployer.address);
    await whitelistPolicy.waitForDeployment();

    const DisclosureRegistry = await ethers.getContractFactory("DisclosureRegistry");
    const disclosureRegistry = await DisclosureRegistry.deploy(deployer.address);
    await disclosureRegistry.waitForDeployment();

    const AcceptanceRegistry = await ethers.getContractFactory("AcceptanceRegistry");
    const acceptanceRegistry = await AcceptanceRegistry.deploy(await disclosureRegistry.getAddress());
    await acceptanceRegistry.waitForDeployment();

    await whitelistPolicy.setDisclosureRegistry(await disclosureRegistry.getAddress());
    await whitelistPolicy.setAcceptanceRegistry(await acceptanceRegistry.getAddress());

    const policyV1 = await whitelistPolicy.publishPolicy.staticCall(
      false,
      false,
      false,
      0,
      false,
      false,
      ethers.ZeroHash,
      ethers.keccak256(ethers.toUtf8Bytes("WHITELIST-POLICY-V1"))
    );
    await whitelistPolicy.publishPolicy(
      false,
      false,
      false,
      0,
      false,
      false,
      ethers.ZeroHash,
      ethers.keccak256(ethers.toUtf8Bytes("WHITELIST-POLICY-V1"))
    );
    await whitelistPolicy.activatePolicy(policyV1);

    await whitelistRegistry.approveWallet(deployer.address, policyV1);
    await whitelistRegistry.approveWallet(alice.address, policyV1);

    const FractalToken = await ethers.getContractFactory("FractalToken");
    const token = await FractalToken.deploy(ethers.parseUnits("1000000", 18));
    await token.waitForDeployment();

    await token.setWhitelistRegistry(await whitelistRegistry.getAddress());
    await token.setWhitelistPolicy(await whitelistPolicy.getAddress());
    await token.setWhitelistPolicyEnabled(true);

    await token.transfer(alice.address, ethers.parseUnits("10", 18));
    expect(await token.balanceOf(alice.address)).to.equal(ethers.parseUnits("10", 18));

    await expect(token.transfer(bob.address, ethers.parseUnits("1", 18))).to.be.revertedWith(
      "not whitelisted"
    );

    await whitelistRegistry.suspendWallet(alice.address, ethers.keccak256(ethers.toUtf8Bytes("RISK")));
    await expect(token.transfer(alice.address, ethers.parseUnits("1", 18))).to.be.revertedWith(
      "not whitelisted"
    );

    await whitelistRegistry.reactivateWallet(alice.address, policyV1);
    await token.transfer(alice.address, ethers.parseUnits("1", 18));

    const disclosureId = await disclosureRegistry.publishDisclosure.staticCall(
      ethers.keccak256(ethers.toUtf8Bytes("DISCLOSURE-V1"))
    );
    await disclosureRegistry.publishDisclosure(
      ethers.keccak256(ethers.toUtf8Bytes("DISCLOSURE-V1"))
    );
    await disclosureRegistry.activateDisclosure(disclosureId);

    const policyV2 = await whitelistPolicy.publishPolicy.staticCall(
      true,
      false,
      false,
      0,
      false,
      false,
      ethers.ZeroHash,
      ethers.keccak256(ethers.toUtf8Bytes("WHITELIST-POLICY-V2"))
    );
    await whitelistPolicy.publishPolicy(
      true,
      false,
      false,
      0,
      false,
      false,
      ethers.ZeroHash,
      ethers.keccak256(ethers.toUtf8Bytes("WHITELIST-POLICY-V2"))
    );
    await whitelistPolicy.activatePolicy(policyV2);

    await expect(token.transfer(alice.address, ethers.parseUnits("1", 18))).to.be.revertedWith(
      "disclosure not accepted"
    );

    await acceptanceRegistry.acceptActiveDisclosure();
    await acceptanceRegistry.connect(alice).acceptActiveDisclosure();

    await token.transfer(alice.address, ethers.parseUnits("1", 18));
    expect(await token.balanceOf(alice.address)).to.equal(ethers.parseUnits("12", 18));
  });
});
