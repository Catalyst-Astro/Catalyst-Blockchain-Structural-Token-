import { expect } from "chai";
import { ethers } from "hardhat";

describe("NATURALEZA_JURIDICA_TOKEN", () => {
  it("requires disclosure acceptance before transfer and after version changes", async () => {
    const [deployer, alice] = await ethers.getSigners();

    const DisclosureRegistry = await ethers.getContractFactory("DisclosureRegistry");
    const disclosure = await DisclosureRegistry.deploy(deployer.address);
    await disclosure.waitForDeployment();

    const v1Hash = ethers.keccak256(ethers.toUtf8Bytes("DISCLOSURE_V1"));
    await disclosure.publishDisclosure(v1Hash);
    await disclosure.activateDisclosure(1);

    const AcceptanceRegistry = await ethers.getContractFactory("AcceptanceRegistry");
    const acceptance = await AcceptanceRegistry.deploy(await disclosure.getAddress());
    await acceptance.waitForDeployment();

    const TokenUsePolicy = await ethers.getContractFactory("TokenUsePolicy");
    const policy = await TokenUsePolicy.deploy(deployer.address);
    await policy.waitForDeployment();

    const policyHash = ethers.keccak256(ethers.toUtf8Bytes("POLICY_V1"));
    await policy.updatePolicy(false, false, true, false, false, policyHash);

    const FractalToken = await ethers.getContractFactory("FractalToken");
    const token = await FractalToken.deploy(ethers.parseUnits("1000", 18));
    await token.waitForDeployment();

    await token.setDisclosureRegistry(await disclosure.getAddress());
    await token.setAcceptanceRegistry(await acceptance.getAddress());
    await token.setTokenUsePolicy(await policy.getAddress());
    await token.setEnforcementEnabled(true);

    await acceptance.connect(deployer).acceptActiveDisclosure();

    await expect(
      token.transfer(alice.address, ethers.parseUnits("1", 18))
    ).to.be.revertedWith("disclosure not accepted");

    await acceptance.connect(alice).acceptActiveDisclosure();
    await token.transfer(alice.address, ethers.parseUnits("1", 18));

    const v2Hash = ethers.keccak256(ethers.toUtf8Bytes("DISCLOSURE_V2"));
    await disclosure.publishDisclosure(v2Hash);
    await disclosure.activateDisclosure(2);

    await expect(
      token.transfer(alice.address, ethers.parseUnits("1", 18))
    ).to.be.revertedWith("disclosure not accepted");

    await acceptance.connect(deployer).acceptActiveDisclosure();
    await acceptance.connect(alice).acceptActiveDisclosure();
    await token.transfer(alice.address, ethers.parseUnits("1", 18));
  });
});
