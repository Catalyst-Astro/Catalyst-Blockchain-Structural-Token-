import { expect } from "chai";
import { ethers, network } from "hardhat";

describe("SOULBOUND_IDENTITY_SBT", () => {
  it("mints SBT, blocks transfers, and enforces identity on token transfers", async () => {
    const [deployer, alice, bob] = await ethers.getSigners();

    const CatalystIdentitySBT = await ethers.getContractFactory("CatalystIdentitySBT");
    const identitySbt = await CatalystIdentitySBT.deploy(deployer.address);
    await identitySbt.waitForDeployment();

    const IdentityPolicyRegistry = await ethers.getContractFactory("IdentityPolicyRegistry");
    const policyRegistry = await IdentityPolicyRegistry.deploy(deployer.address);
    await policyRegistry.waitForDeployment();

    const policyVersion = await policyRegistry.publishPolicy.staticCall(
      1,
      1,
      0,
      0,
      0,
      ethers.keccak256(ethers.toUtf8Bytes("IDENTITY-POLICY-V1"))
    );
    await policyRegistry.publishPolicy(
      1,
      1,
      0,
      0,
      0,
      ethers.keccak256(ethers.toUtf8Bytes("IDENTITY-POLICY-V1"))
    );
    await policyRegistry.activatePolicy(policyVersion);

    await identitySbt.mintIdentity(
      deployer.address,
      0,
      1,
      0,
      ethers.keccak256(ethers.toUtf8Bytes("ATTEST-DEPLOYER"))
    );
    await identitySbt.mintIdentity(
      alice.address,
      0,
      1,
      0,
      ethers.keccak256(ethers.toUtf8Bytes("ATTEST-ALICE"))
    );

    await expect(
      identitySbt.transferFrom(deployer.address, alice.address, await identitySbt.tokenIdOf(deployer.address))
    ).to.be.revertedWith("soulbound");

    const FractalToken = await ethers.getContractFactory("FractalToken");
    const token = await FractalToken.deploy(ethers.parseUnits("1000000", 18));
    await token.waitForDeployment();

    await token.setIdentitySBT(await identitySbt.getAddress());
    await token.setIdentityPolicyRegistry(await policyRegistry.getAddress());
    await token.setIdentitySBTEnabled(true);

    await token.transfer(alice.address, ethers.parseUnits("10", 18));
    expect(await token.balanceOf(alice.address)).to.equal(ethers.parseUnits("10", 18));

    await expect(token.transfer(bob.address, ethers.parseUnits("1", 18))).to.be.revertedWith(
      "identity invalid"
    );

    await identitySbt.suspendIdentity(alice.address, ethers.keccak256(ethers.toUtf8Bytes("REVIEW")));
    await expect(token.transfer(alice.address, ethers.parseUnits("1", 18))).to.be.revertedWith(
      "identity invalid"
    );

    await identitySbt.renewIdentity(
      alice.address,
      0,
      ethers.keccak256(ethers.toUtf8Bytes("ATTEST-ALICE-NEW"))
    );
    await token.transfer(alice.address, ethers.parseUnits("1", 18));

    const now = (await ethers.provider.getBlock("latest"))?.timestamp ?? 0;
    await identitySbt.mintIdentity(
      bob.address,
      0,
      1,
      BigInt(now + 5),
      ethers.keccak256(ethers.toUtf8Bytes("ATTEST-BOB"))
    );

    await network.provider.send("evm_increaseTime", [6]);
    await network.provider.send("evm_mine");

    expect(await identitySbt.isIdentityValid(bob.address)).to.equal(false);
  });
});
