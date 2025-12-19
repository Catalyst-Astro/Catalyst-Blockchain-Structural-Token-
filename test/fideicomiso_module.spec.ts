import { expect } from "chai";
import { ethers } from "hardhat";

const toHash = (value: string) => ethers.keccak256(ethers.toUtf8Bytes(value));

describe("FIDEICOMISO_PATRIMONIAL_BASE", () => {
  it("creates a trust", async () => {
    const [admin] = await ethers.getSigners();
    const TrustRegistry = await ethers.getContractFactory("TrustRegistry");
    const trustRegistry = await TrustRegistry.deploy(admin.address);
    await trustRegistry.waitForDeployment();

    const trustId = ethers.encodeBytes32String("TRUST-001");
    const termsHash = toHash("terms-v1");
    const effectiveDate = 1700000000;

    await trustRegistry.createTrust(
      trustId,
      "MX",
      "Banco Fiduciario",
      termsHash,
      effectiveDate
    );

    const trust = await trustRegistry.getTrust(trustId);
    expect(trust.trustId).to.equal(trustId);
    expect(trust.status).to.equal(1);
    expect(trust.termsHash).to.equal(termsHash);
  });

  it("adds an asset", async () => {
    const [admin, oracle] = await ethers.getSigners();
    const TrustRegistry = await ethers.getContractFactory("TrustRegistry");
    const trustRegistry = await TrustRegistry.deploy(admin.address);
    await trustRegistry.waitForDeployment();

    const trustId = ethers.encodeBytes32String("TRUST-002");
    await trustRegistry.createTrust(trustId, "MX", "Banco Fiduciario", toHash("terms"), 1700000000);

    const oracleRole = await trustRegistry.ORACLE_OPERATOR_ROLE();
    await trustRegistry.grantRole(oracleRole, oracle.address);

    const assetId = ethers.encodeBytes32String("ASSET-001");
    await trustRegistry
      .connect(oracle)
      .addAsset(assetId, trustId, "CABIN", "BCS-LA-PAZ", toHash("deed"), toHash("appraisal"));

    const asset = await trustRegistry.getAsset(assetId);
    expect(asset.assetId).to.equal(assetId);
    expect(asset.trustId).to.equal(trustId);
    expect(asset.status).to.equal(1);
  });

  it("updates trust document hash", async () => {
    const [admin, auditor] = await ethers.getSigners();
    const TrustRegistry = await ethers.getContractFactory("TrustRegistry");
    const trustRegistry = await TrustRegistry.deploy(admin.address);
    await trustRegistry.waitForDeployment();

    const trustId = ethers.encodeBytes32String("TRUST-003");
    await trustRegistry.createTrust(trustId, "MX", "Banco Fiduciario", toHash("terms"), 1700000000);

    const auditorRole = await trustRegistry.LEGAL_AUDITOR_ROLE();
    await trustRegistry.grantRole(auditorRole, auditor.address);

    const newHash = toHash("terms-v2");
    await trustRegistry.connect(auditor).updateTrustDocumentsHash(trustId, newHash, "TERM_SHEET_V2");

    const trust = await trustRegistry.getTrust(trustId);
    expect(trust.documentsHash).to.equal(newHash);
  });

  it("records a distribution period", async () => {
    const [admin, oracle] = await ethers.getSigners();
    const TrustRegistry = await ethers.getContractFactory("TrustRegistry");
    const trustRegistry = await TrustRegistry.deploy(admin.address);
    await trustRegistry.waitForDeployment();

    const trustId = ethers.encodeBytes32String("TRUST-004");
    await trustRegistry.createTrust(trustId, "MX", "Banco Fiduciario", toHash("terms"), 1700000000);

    const DistributionRegistry = await ethers.getContractFactory("DistributionRegistry");
    const distributionRegistry = await DistributionRegistry.deploy(
      admin.address,
      await trustRegistry.getAddress()
    );
    await distributionRegistry.waitForDeployment();

    const oracleRole = await distributionRegistry.ORACLE_OPERATOR_ROLE();
    await distributionRegistry.grantRole(oracleRole, oracle.address);

    const seriesId = ethers.encodeBytes32String("FRA-CAB-001");
    const periodId = await distributionRegistry.computePeriodId(trustId, seriesId, 2025, 9);

    await distributionRegistry.openPeriod(trustId, seriesId, 2025, 9);
    await distributionRegistry.closePeriod(periodId);
    await distributionRegistry
      .connect(oracle)
      .recordDistribution(periodId, 5000, toHash("waterfall"), toHash("calc-v1"));

    const period = await distributionRegistry.getPeriod(periodId);
    expect(period.distributableUSDC).to.equal(5000);
    expect(period.status).to.equal(3);
  });

  it("reverts when roles are missing", async () => {
    const [admin, outsider] = await ethers.getSigners();
    const TrustRegistry = await ethers.getContractFactory("TrustRegistry");
    const trustRegistry = await TrustRegistry.deploy(admin.address);
    await trustRegistry.waitForDeployment();

    const trustId = ethers.encodeBytes32String("TRUST-005");
    const termsHash = toHash("terms");
    const trustAdminRole = await trustRegistry.TRUST_ADMIN_ROLE();

    await expect(
      trustRegistry.connect(outsider).createTrust(trustId, "MX", "Banco Fiduciario", termsHash, 1700000000)
    ).to.be.revertedWith(
      `AccessControl: account ${outsider.address.toLowerCase()} is missing role ${trustAdminRole}`
    );

    await trustRegistry.createTrust(trustId, "MX", "Banco Fiduciario", termsHash, 1700000000);

    const assetId = ethers.encodeBytes32String("ASSET-002");
    await expect(
      trustRegistry
        .connect(outsider)
        .addAsset(assetId, trustId, "CABIN", "BCS-LOS-CABOS", toHash("deed"), toHash("appraisal"))
    ).to.be.revertedWith("missing admin or oracle role");

    const DistributionRegistry = await ethers.getContractFactory("DistributionRegistry");
    const distributionRegistry = await DistributionRegistry.deploy(
      admin.address,
      await trustRegistry.getAddress()
    );
    await distributionRegistry.waitForDeployment();

    const seriesId = ethers.encodeBytes32String("FRA-CAB-002");
    await expect(
      distributionRegistry.connect(outsider).openPeriod(trustId, seriesId, 2025, 10)
    ).to.be.revertedWith("missing admin or council role");

    const periodId = await distributionRegistry.computePeriodId(trustId, seriesId, 2025, 10);
    await distributionRegistry.openPeriod(trustId, seriesId, 2025, 10);
    await distributionRegistry.closePeriod(periodId);

    await expect(
      distributionRegistry
        .connect(outsider)
        .recordDistribution(periodId, 100, toHash("waterfall"), toHash("calc-v2"))
    ).to.be.revertedWith("missing admin or oracle role");
  });
});
