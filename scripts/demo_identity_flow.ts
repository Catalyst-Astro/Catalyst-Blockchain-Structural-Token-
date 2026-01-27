import { ethers } from "hardhat";

async function main() {
  const [admin, user] = await ethers.getSigners();
  console.log("Admin:", admin.address);
  console.log("User :", user.address);

  const RoleAuthority = await ethers.getContractFactory("RoleAuthority");
  const roleAuthority = await RoleAuthority.deploy(admin.address);
  await roleAuthority.waitForDeployment();

  const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
  const identityRegistry = await IdentityRegistry.deploy(await roleAuthority.getAddress());
  await identityRegistry.waitForDeployment();

  const CredentialRegistry = await ethers.getContractFactory("CredentialRegistry");
  const credentialRegistry = await CredentialRegistry.deploy(await roleAuthority.getAddress());
  await credentialRegistry.waitForDeployment();

  const AMLScoringRegistry = await ethers.getContractFactory("AMLScoringRegistry");
  const scoringRegistry = await AMLScoringRegistry.deploy(admin.address);
  await scoringRegistry.waitForDeployment();

  const requiredRole = await roleAuthority.NOTARY();
  await roleAuthority.grantRole(requiredRole, admin.address);

  const ComplianceGate = await ethers.getContractFactory("ComplianceGate");
  const complianceGate = await ComplianceGate.deploy(
    await roleAuthority.getAddress(),
    await identityRegistry.getAddress(),
    await scoringRegistry.getAddress(),
    await credentialRegistry.getAddress(),
    requiredRole,
    ethers.ZeroAddress
  );
  await complianceGate.waitForDeployment();

  console.log("RoleAuthority     :", await roleAuthority.getAddress());
  console.log("IdentityRegistry  :", await identityRegistry.getAddress());
  console.log("CredentialRegistry:", await credentialRegistry.getAddress());
  console.log("AMLScoringRegistry:", await scoringRegistry.getAddress());
  console.log("ComplianceGate    :", await complianceGate.getAddress());

  console.log("\n1) Attempt validate before KYC (expect revert)");
  try {
    await complianceGate.validate(user.address);
  } catch (err) {
    console.log("   Rejected as expected:", (err as Error).message.split("\n")[0]);
  }

  const identityHash = ethers.keccak256(ethers.toUtf8Bytes(`IDENTITY-${user.address}`));
  await identityRegistry.verifyIdentity(user.address, identityHash);
  await scoringRegistry.assignRisk(user.address, 0); // LOW risk

  const now = BigInt(Math.floor(Date.now() / 1000));
  const credentialHash = ethers.keccak256(ethers.toUtf8Bytes("NOTARY-CRED-DEMO"));
  const validTo = now + BigInt(3600);
  await credentialRegistry.issueCredential(user.address, requiredRole, credentialHash, now, validTo);

  console.log("\n2) Validate after KYC + credential (should pass)");
  await complianceGate.validate(user.address);
  console.log("   Validation passed.");

  console.log("\n3) Revoke credential and validate (expect revert)");
  const reason = ethers.keccak256(ethers.toUtf8Bytes("demo-revoke"));
  await credentialRegistry.revokeCredential(user.address, requiredRole, reason);
  try {
    await complianceGate.validate(user.address);
  } catch (err) {
    console.log("   Rejected as expected:", (err as Error).message.split("\n")[0]);
  }

  console.log("\n4) Re-issue credential and revoke identity (expect revert)");
  const newHash = ethers.keccak256(ethers.toUtf8Bytes("NOTARY-CRED-REISSUE"));
  await credentialRegistry.issueCredential(user.address, requiredRole, newHash, now + BigInt(10), validTo + BigInt(7200));
  await identityRegistry.revokeIdentity(
    user.address,
    ethers.keccak256(ethers.toUtf8Bytes("demo-revoke-identity"))
  );
  try {
    await complianceGate.validate(user.address);
  } catch (err) {
    console.log("   Rejected as expected:", (err as Error).message.split("\n")[0]);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
