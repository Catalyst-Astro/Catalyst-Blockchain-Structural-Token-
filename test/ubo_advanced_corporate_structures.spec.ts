import { expect } from "chai";
import { ethers } from "hardhat";

describe("UBO_ADVANCED_CORPORATE_STRUCTURES", () => {
  it("enforces UBO graph validity and high-risk policy for corporate wallets", async () => {
    const [deployer, alice] = await ethers.getSigners();

    const EntityRegistry = await ethers.getContractFactory("EntityRegistry");
    const entityRegistry = await EntityRegistry.deploy(deployer.address);
    await entityRegistry.waitForDeployment();

    const UBOGraphRegistry = await ethers.getContractFactory("UBOGraphRegistry");
    const graphRegistry = await UBOGraphRegistry.deploy(deployer.address);
    await graphRegistry.waitForDeployment();

    const UBOAttestationRegistry = await ethers.getContractFactory("UBOAttestationRegistry");
    const attestationRegistry = await UBOAttestationRegistry.deploy(deployer.address);
    await attestationRegistry.waitForDeployment();

    const UBOComplianceGate = await ethers.getContractFactory("UBOComplianceGate");
    const uboGate = await UBOComplianceGate.deploy(
      deployer.address,
      await entityRegistry.getAddress(),
      await graphRegistry.getAddress(),
      await attestationRegistry.getAddress()
    );
    await uboGate.waitForDeployment();

    const FractalToken = await ethers.getContractFactory("FractalToken");
    const token = await FractalToken.deploy(ethers.parseUnits("1000", 18));
    await token.waitForDeployment();

    const entityId = ethers.keccak256(ethers.toUtf8Bytes("ENTITY-1"));
    const jurisdiction = ethers.keccak256(ethers.toUtf8Bytes("MX"));
    const typeCode = ethers.keccak256(ethers.toUtf8Bytes("SA"));

    await entityRegistry.createEntity(entityId, jurisdiction, typeCode);
    await entityRegistry.linkWallet(entityId, alice.address);

    await token.setEntityRegistry(await entityRegistry.getAddress());
    await token.setUBOComplianceGate(await uboGate.getAddress());
    await token.setUBOComplianceEnabled(true);

    await expect(token.transfer(alice.address, ethers.parseUnits("1", 18))).to.be.revertedWith(
      "UBO not valid"
    );

    const now = (await ethers.provider.getBlock("latest"))?.timestamp ?? 0;
    const graphHashV1 = ethers.keccak256(ethers.toUtf8Bytes("UBO-GRAPH-V1"));
    await graphRegistry.submitGraph(entityId, graphHashV1, BigInt(now), 0);
    await graphRegistry.activateGraph(entityId, 1);
    await attestationRegistry.attestUBO(entityId, ethers.keccak256(ethers.toUtf8Bytes("ATTEST-1")));

    await token.transfer(alice.address, ethers.parseUnits("1", 18));

    await graphRegistry.expireGraph(entityId, 1);
    await expect(token.transfer(alice.address, ethers.parseUnits("1", 18))).to.be.revertedWith(
      "UBO not valid"
    );

    const graphHashV2 = ethers.keccak256(ethers.toUtf8Bytes("UBO-GRAPH-V2"));
    await graphRegistry.submitGraph(entityId, graphHashV2, BigInt(now), 0);
    await graphRegistry.activateGraph(entityId, 2);
    await attestationRegistry.attestUBO(entityId, ethers.keccak256(ethers.toUtf8Bytes("ATTEST-2")));

    await attestationRegistry.setHighRiskFlag(entityId, true);
    await expect(token.transfer(alice.address, ethers.parseUnits("1", 18))).to.be.revertedWith(
      "UBO not valid"
    );

    await attestationRegistry.setHighRiskFlag(entityId, false);
    await token.transfer(alice.address, ethers.parseUnits("1", 18));
  });
});
