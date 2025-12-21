import { expect } from "chai";
import { ethers } from "hardhat";

describe("DOCTRINE_AND_REPLICABLE_STANDARD", () => {
  it("anchors doctrine, publishes standards, and certifies implementations", async () => {
    const [deployer] = await ethers.getSigners();

    const DoctrineHash = await ethers.getContractFactory("DoctrineHash");
    const doctrine = await DoctrineHash.deploy(deployer.address);
    await doctrine.waitForDeployment();

    const doctrineVersion = await doctrine.publishDoctrine.staticCall(
      ethers.keccak256(ethers.toUtf8Bytes("DOCTRINE-V1")),
      ethers.keccak256(ethers.toUtf8Bytes("DOCTRINE-META"))
    );
    await doctrine.publishDoctrine(
      ethers.keccak256(ethers.toUtf8Bytes("DOCTRINE-V1")),
      ethers.keccak256(ethers.toUtf8Bytes("DOCTRINE-META"))
    );
    await doctrine.activateDoctrine(doctrineVersion);

    const CatalystStandardRegistry = await ethers.getContractFactory("CatalystStandardRegistry");
    const standard = await CatalystStandardRegistry.deploy(deployer.address);
    await standard.waitForDeployment();

    const standardVersion = await standard.publishStandard.staticCall(
      ethers.keccak256(ethers.toUtf8Bytes("DOCTRINE-HASH")),
      ethers.keccak256(ethers.toUtf8Bytes("SPEC-HASH")),
      ethers.keccak256(ethers.toUtf8Bytes("STANDARD-HASH"))
    );
    await standard.publishStandard(
      ethers.keccak256(ethers.toUtf8Bytes("DOCTRINE-HASH")),
      ethers.keccak256(ethers.toUtf8Bytes("SPEC-HASH")),
      ethers.keccak256(ethers.toUtf8Bytes("STANDARD-HASH"))
    );
    await standard.activateStandard(standardVersion);

    const ImplementationCertification = await ethers.getContractFactory("ImplementationCertification");
    const certification = await ImplementationCertification.deploy(deployer.address);
    await certification.waitForDeployment();

    await certification.setStandardRegistry(await standard.getAddress());
    await certification.certifyImplementation(
      ethers.keccak256(ethers.toUtf8Bytes("CATALYST-IMPLEMENTATION-1")),
      standardVersion,
      ethers.keccak256(ethers.toUtf8Bytes("AUDIT-HASH")),
      0
    );

    expect(await certification.isCertified(ethers.keccak256(ethers.toUtf8Bytes("CATALYST-IMPLEMENTATION-1")))).to.equal(
      true
    );
  });
});
