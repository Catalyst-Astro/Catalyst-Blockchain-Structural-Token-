import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

enum IdentityStatus {
  UNVERIFIED,
  VERIFIED,
  SUSPENDED,
  REVOKED,
}

enum CredentialStatus {
  ACTIVE,
  EXPIRED,
  REVOKED,
}

async function deployIdentityAndCredentials() {
  const [admin, notary, alice] = await ethers.getSigners();

  const RoleAuthority = await ethers.getContractFactory("RoleAuthority");
  const roleAuthority = await RoleAuthority.deploy(admin.address);
  await roleAuthority.waitForDeployment();

  await roleAuthority.grantRole(await roleAuthority.NOTARY(), notary.address);
  await roleAuthority.grantRole(await roleAuthority.DAO_COUNCIL(), admin.address);

  const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
  const identityRegistry = await IdentityRegistry.deploy(await roleAuthority.getAddress());
  await identityRegistry.waitForDeployment();

  const CredentialRegistry = await ethers.getContractFactory("CredentialRegistry");
  const credentialRegistry = await CredentialRegistry.deploy(await roleAuthority.getAddress());
  await credentialRegistry.waitForDeployment();

  const AMLScoringRegistry = await ethers.getContractFactory("AMLScoringRegistry");
  const scoringRegistry = await AMLScoringRegistry.deploy(admin.address);
  await scoringRegistry.waitForDeployment();

  const ComplianceGate = await ethers.getContractFactory("ComplianceGate");
  const requiredRole = await roleAuthority.NOTARY();
  const complianceGate = await ComplianceGate.deploy(
    await roleAuthority.getAddress(),
    await identityRegistry.getAddress(),
    await scoringRegistry.getAddress(),
    await credentialRegistry.getAddress(),
    requiredRole,
    ethers.ZeroAddress
  );
  await complianceGate.waitForDeployment();

  return {
    admin,
    notary,
    alice,
    roleAuthority,
    identityRegistry,
    credentialRegistry,
    scoringRegistry,
    complianceGate,
    requiredRole,
  };
}

describe("Identity & Roles Module", () => {
  it("verifies, updates, suspends, and revokes identity", async () => {
    const { admin, notary, alice, identityRegistry } = await loadFixture(deployIdentityAndCredentials);

    const idHashV1 = ethers.keccak256(ethers.toUtf8Bytes("ALICE-ID-V1"));
    await identityRegistry.connect(notary).verifyIdentity(alice.address, idHashV1);
    expect(await identityRegistry.isVerified(alice.address)).to.equal(true);
    expect(await identityRegistry.statusOf(alice.address)).to.equal(IdentityStatus.VERIFIED);

    const idHashV2 = ethers.keccak256(ethers.toUtf8Bytes("ALICE-ID-V2"));
    await identityRegistry.updateIdentity(alice.address, idHashV2, IdentityStatus.VERIFIED);
    const recordAfterUpdate = await identityRegistry.getIdentity(alice.address);
    expect(recordAfterUpdate.identityHash).to.equal(idHashV2);
    expect(recordAfterUpdate.issuer).to.equal(admin.address);

    const suspendReason = ethers.keccak256(ethers.toUtf8Bytes("investigation"));
    await identityRegistry.suspendIdentity(alice.address, suspendReason);
    expect(await identityRegistry.statusOf(alice.address)).to.equal(IdentityStatus.SUSPENDED);
    expect(await identityRegistry.isVerified(alice.address)).to.equal(false);

    const idHashV3 = ethers.keccak256(ethers.toUtf8Bytes("ALICE-ID-V3"));
    await identityRegistry.connect(notary).verifyIdentity(alice.address, idHashV3);
    expect(await identityRegistry.isVerified(alice.address)).to.equal(true);

    const revokeReason = ethers.keccak256(ethers.toUtf8Bytes("revoked"));
    await identityRegistry.revokeIdentity(alice.address, revokeReason);
    expect(await identityRegistry.statusOf(alice.address)).to.equal(IdentityStatus.REVOKED);
    expect(await identityRegistry.isVerified(alice.address)).to.equal(false);
  });

  it("issues credentials with expiry, rotation, and revocation", async () => {
    const { admin, credentialRegistry, roleAuthority, alice } = await loadFixture(
      deployIdentityAndCredentials
    );

    const auditorRole = await roleAuthority.AUDITOR();
    const issuedAt = BigInt(await time.latest());
    const validTo = issuedAt + 3600n;
    const credentialHash = ethers.keccak256(ethers.toUtf8Bytes("AUDITOR-CRED-1"));

    await credentialRegistry.issueCredential(alice.address, auditorRole, credentialHash, issuedAt, validTo);
    expect(await credentialRegistry.isCredentialActive(alice.address, auditorRole)).to.equal(true);

    const rotatedHash = ethers.keccak256(ethers.toUtf8Bytes("AUDITOR-CRED-2"));
    const rotatedFrom = issuedAt + 1200n;
    const rotatedTo = issuedAt + 7200n;
    await credentialRegistry.rotateCredential(
      alice.address,
      auditorRole,
      rotatedHash,
      rotatedFrom,
      rotatedTo
    );

    const currentCredential = await credentialRegistry.credentialOf(alice.address, auditorRole);
    expect(currentCredential.credentialHash).to.equal(rotatedHash);
    expect(currentCredential.issuer).to.equal(admin.address);

    await time.increaseTo(rotatedTo + 1n);
    expect(await credentialRegistry.isCredentialActive(alice.address, auditorRole)).to.equal(false);
    expect(await credentialRegistry.statusOf(alice.address, auditorRole)).to.equal(CredentialStatus.EXPIRED);

    const freshHash = ethers.keccak256(ethers.toUtf8Bytes("AUDITOR-CRED-3"));
    const freshFrom = BigInt(await time.latest());
    const freshTo = freshFrom + 5000n;
    await credentialRegistry.issueCredential(alice.address, auditorRole, freshHash, freshFrom, freshTo);
    expect(await credentialRegistry.isCredentialActive(alice.address, auditorRole)).to.equal(true);

    const revokeReason = ethers.keccak256(ethers.toUtf8Bytes("fraud-found"));
    await credentialRegistry.revokeCredential(alice.address, auditorRole, revokeReason);
    expect(await credentialRegistry.statusOf(alice.address, auditorRole)).to.equal(CredentialStatus.REVOKED);
    expect(await credentialRegistry.isCredentialActive(alice.address, auditorRole)).to.equal(false);
  });

  it("enforces compliance gate with identity + credential + AML", async () => {
    const {
      admin,
      notary,
      alice,
      identityRegistry,
      credentialRegistry,
      scoringRegistry,
      complianceGate,
      requiredRole,
    } = await loadFixture(deployIdentityAndCredentials);

    const identityHash = ethers.keccak256(ethers.toUtf8Bytes("ALICE-IDENTITY"));
    await identityRegistry.connect(notary).verifyIdentity(alice.address, identityHash);
    await scoringRegistry.assignRisk(alice.address, 0); // LOW

    const now = BigInt(await time.latest());
    const validTo = now + 3600n;
    const credentialHash = ethers.keccak256(ethers.toUtf8Bytes("NOTARY-CRED-1"));
    await credentialRegistry.issueCredential(alice.address, requiredRole, credentialHash, now, validTo);

    await expect(complianceGate.validate(alice.address)).to.not.be.reverted;

    await credentialRegistry.revokeCredential(
      alice.address,
      requiredRole,
      ethers.keccak256(ethers.toUtf8Bytes("key-compromise"))
    );
    await expect(complianceGate.validate(alice.address)).to.be.revertedWith("credential not active");

    const reissueHash = ethers.keccak256(ethers.toUtf8Bytes("NOTARY-CRED-2"));
    const laterFrom = BigInt(await time.latest());
    const laterTo = laterFrom + 7200n;
    await credentialRegistry.issueCredential(alice.address, requiredRole, reissueHash, laterFrom, laterTo);
    await expect(complianceGate.validate(alice.address)).to.not.be.reverted;

    const revokeIdentityReason = ethers.keccak256(ethers.toUtf8Bytes("sanctions-hit"));
    await identityRegistry.revokeIdentity(alice.address, revokeIdentityReason);
    await expect(complianceGate.validate(alice.address)).to.be.revertedWith("KYC not verified");

    await scoringRegistry.updateRisk(alice.address, 2); // HIGH risk
    await identityRegistry.connect(notary).verifyIdentity(alice.address, identityHash);
    await expect(complianceGate.validate(alice.address)).to.be.revertedWith("AML risk too high");

    // DAO council can relax or tighten policy.
    await complianceGate
      .connect(admin)
      .setPolicy(true, 2, requiredRole); // allow HIGH risk = 2
    await expect(complianceGate.validate(alice.address)).to.not.be.reverted;
  });
});
