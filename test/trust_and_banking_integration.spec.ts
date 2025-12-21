import { expect } from "chai";
import { ethers } from "hardhat";

describe("TRUST_AND_BANKING_INTEGRATION", () => {
  it("authorizes distributions only with fiduciary revenue and no holds", async () => {
    const [deployer] = await ethers.getSigners();

    const TrustRegistry = await ethers.getContractFactory("TrustRegistry");
    const trustRegistry = await TrustRegistry.deploy(deployer.address);
    await trustRegistry.waitForDeployment();

    const trustId = ethers.keccak256(ethers.toUtf8Bytes("TRUST-001"));
    await trustRegistry.createTrust(
      trustId,
      "MX",
      "FIDUCIARY-1",
      ethers.keccak256(ethers.toUtf8Bytes("TERMS-V1")),
      0
    );

    const FiduciaryOracle = await ethers.getContractFactory("FiduciaryOracle");
    const oracle = await FiduciaryOracle.deploy(deployer.address, await trustRegistry.getAddress());
    await oracle.waitForDeployment();

    const DistributionAuthorization = await ethers.getContractFactory("DistributionAuthorization");
    const authorization = await DistributionAuthorization.deploy(
      deployer.address,
      await trustRegistry.getAddress(),
      await oracle.getAddress()
    );
    await authorization.waitForDeployment();

    const distributionRole = await oracle.DISTRIBUTION_AUTHORIZER();
    await oracle.grantRole(distributionRole, await authorization.getAddress());

    await oracle.reportRevenue(
      trustId,
      1000,
      ethers.keccak256(ethers.toUtf8Bytes("REV-1"))
    );

    const ok = await authorization.authorizeDistribution.staticCall(trustId, 600);
    expect(ok).to.equal(true);
    await authorization.authorizeDistribution(trustId, 600);

    const blocked = await authorization.authorizeDistribution.staticCall(trustId, 500);
    expect(blocked).to.equal(false);

    await oracle.reportLegalEvent(
      trustId,
      await oracle.LEGAL_HOLD(),
      ethers.keccak256(ethers.toUtf8Bytes("LEGAL-HOLD-1"))
    );

    const holdBlocked = await authorization.authorizeDistribution.staticCall(trustId, 100);
    expect(holdBlocked).to.equal(false);

    await oracle.reportLegalEvent(
      trustId,
      await oracle.LEGAL_RELEASE(),
      ethers.keccak256(ethers.toUtf8Bytes("LEGAL-RELEASE-1"))
    );

    await oracle.reportRevenue(
      trustId,
      200,
      ethers.keccak256(ethers.toUtf8Bytes("REV-2"))
    );
    const okAfterRelease = await authorization.authorizeDistribution.staticCall(trustId, 200);
    expect(okAfterRelease).to.equal(true);
  });

  it("blocks distributions when a series is frozen", async () => {
    const [deployer] = await ethers.getSigners();

    const TrustRegistry = await ethers.getContractFactory("TrustRegistry");
    const trustRegistry = await TrustRegistry.deploy(deployer.address);
    await trustRegistry.waitForDeployment();

    const trustId = ethers.keccak256(ethers.toUtf8Bytes("TRUST-002"));
    await trustRegistry.createTrust(
      trustId,
      "US",
      "FIDUCIARY-2",
      ethers.keccak256(ethers.toUtf8Bytes("TERMS-V2")),
      0
    );

    const FiduciaryOracle = await ethers.getContractFactory("FiduciaryOracle");
    const oracle = await FiduciaryOracle.deploy(deployer.address, await trustRegistry.getAddress());
    await oracle.waitForDeployment();

    const DistributionAuthorization = await ethers.getContractFactory("DistributionAuthorization");
    const authorization = await DistributionAuthorization.deploy(
      deployer.address,
      await trustRegistry.getAddress(),
      await oracle.getAddress()
    );
    await authorization.waitForDeployment();

    const distributionRole = await oracle.DISTRIBUTION_AUTHORIZER();
    await oracle.grantRole(distributionRole, await authorization.getAddress());

    const FreezePolicyRegistry = await ethers.getContractFactory("FreezePolicyRegistry");
    const freezePolicy = await FreezePolicyRegistry.deploy(deployer.address);
    await freezePolicy.waitForDeployment();

    const EmergencyMode = await ethers.getContractFactory("EmergencyMode");
    const emergencyMode = await EmergencyMode.deploy(deployer.address, 86400);
    await emergencyMode.waitForDeployment();

    const FreezeRegistry = await ethers.getContractFactory("FreezeRegistry");
    const freezeRegistry = await FreezeRegistry.deploy(
      deployer.address,
      await freezePolicy.getAddress(),
      await emergencyMode.getAddress()
    );
    await freezeRegistry.waitForDeployment();

    const policyVersion = await freezePolicy.publishPolicy.staticCall(
      ethers.keccak256(ethers.toUtf8Bytes("FREEZE-POLICY-V1"))
    );
    await freezePolicy.publishPolicy(ethers.keccak256(ethers.toUtf8Bytes("FREEZE-POLICY-V1")));
    await freezePolicy.activatePolicy(policyVersion);
    await freezePolicy.setFreezeTypePolicy(policyVersion, 1, 0, false, true, false);

    await authorization.setFreezeRegistry(await freezeRegistry.getAddress());

    const seriesId = ethers.keccak256(ethers.toUtf8Bytes("SERIES-TRUST-002"));
    await authorization.setTrustSeries(trustId, seriesId);

    await oracle.reportRevenue(
      trustId,
      500,
      ethers.keccak256(ethers.toUtf8Bytes("REV-3"))
    );

    const caseId = ethers.keccak256(ethers.toUtf8Bytes("CASE-FREEZE-1"));
    const justification = ethers.keccak256(ethers.toUtf8Bytes("JUSTIFICATION-1"));
    await freezeRegistry.freezeSeries(seriesId, caseId, justification, 1);

    const blocked = await authorization.authorizeDistribution.staticCall(trustId, 100);
    expect(blocked).to.equal(false);
  });
});
