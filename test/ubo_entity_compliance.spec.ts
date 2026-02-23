import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

enum RiskLevel {
  LOW,
  MEDIUM,
  HIGH,
}

enum IdentityStatus {
  UNVERIFIED,
  VERIFIED,
  SUSPENDED,
  REVOKED,
}

async function deployCompliance() {
  const [admin, notary, corporate, individual] = await ethers.getSigners();

  const RoleAuthority = await ethers.getContractFactory("RoleAuthority");
  const roleAuthority = await RoleAuthority.deploy(admin.address);
  await roleAuthority.waitForDeployment();
  await roleAuthority.grantRole(await roleAuthority.COMPLIANCE_ADMIN(), admin.address);
  await roleAuthority.grantRole(await roleAuthority.NOTARY(), notary.address);
  await roleAuthority.grantRole(await roleAuthority.DAO_COUNCIL(), admin.address);

  const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
  const identity = await IdentityRegistry.deploy(await roleAuthority.getAddress());
  await identity.waitForDeployment();

  const AMLScoringRegistry = await ethers.getContractFactory("AMLScoringRegistry");
  const scoring = await AMLScoringRegistry.deploy(admin.address);
  await scoring.waitForDeployment();

  const EntityRegistry = await ethers.getContractFactory("EntityRegistry");
  const entities = await EntityRegistry.deploy(admin.address);
  await entities.waitForDeployment();

  const UBORegistry = await ethers.getContractFactory("UBORegistry");
  const ubos = await UBORegistry.deploy(admin.address);
  await ubos.waitForDeployment();

  const ComplianceGate = await ethers.getContractFactory("ComplianceGate");
  const gate = await ComplianceGate.deploy(
    await roleAuthority.getAddress(),
    await identity.getAddress(),
    await scoring.getAddress(),
    ethers.ZeroAddress,
    ethers.ZeroHash,
    ethers.ZeroAddress
  );
  await gate.waitForDeployment();

  await gate.connect(admin).setEntityRegistry(await entities.getAddress());
  await gate.connect(admin).setUBORegistry(await ubos.getAddress());

  return { admin, notary, corporate, individual, identity, scoring, entities, ubos, gate };
}

describe("UBO compliance", () => {
  it("requires UBO for corporate wallets but not individuals", async () => {
    const { admin, notary, corporate, individual, identity, scoring, entities, ubos, gate } =
      await loadFixture(deployCompliance);

    const corpId = ethers.keccak256(ethers.toUtf8Bytes("CORP-KYB"));
    await identity.connect(notary).verifyIdentity(corporate.address, corpId);
    await scoring.assignRisk(corporate.address, RiskLevel.LOW);
    await entities.setEntityType(corporate.address, 2); // CORPORATE

    await expect(gate.validate(corporate.address)).to.be.revertedWith("UBO missing");

    const uboHash = ethers.keccak256(ethers.toUtf8Bytes("UBO-DECL"));
    await ubos.declareUBO(corporate.address, uboHash);
    await expect(gate.validate(corporate.address)).to.not.be.reverted;

    const individualHash = ethers.keccak256(ethers.toUtf8Bytes("IND-ID"));
    await identity.connect(notary).verifyIdentity(individual.address, individualHash);
    await scoring.assignRisk(individual.address, RiskLevel.LOW);
    await entities.setEntityType(individual.address, 1); // INDIVIDUAL

    await expect(gate.validate(individual.address)).to.not.be.reverted;

    await scoring.assignRisk(corporate.address, RiskLevel.HIGH);
    await expect(gate.validate(corporate.address)).to.be.revertedWith("AML risk too high");

    await gate.connect(admin).setPolicy(true, RiskLevel.HIGH, ethers.ZeroHash);
    await expect(gate.validate(corporate.address)).to.not.be.reverted;

    await identity.revokeIdentity(corporate.address, ethers.keccak256(ethers.toUtf8Bytes("ubo-breach")));
    await expect(gate.validate(corporate.address)).to.be.revertedWith("KYC not verified");
  });
});
