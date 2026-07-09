import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("EvidenceAnchor & BatchRootRegistry", () => {
  it("anchors hashes, blocks duplicates, and allows batching", async () => {
    const [admin, auditor, user] = await ethers.getSigners();
    const EvidenceAnchor = await ethers.getContractFactory("EvidenceAnchor");
    const anchor = await EvidenceAnchor.deploy(admin.address);
    await anchor.waitForDeployment();

    const AUDITOR = await anchor.AUDITOR();
    await anchor.grantRole(AUDITOR, auditor.address);

    const hash = ethers.keccak256(ethers.toUtf8Bytes("EID-1"));
    await expect(anchor.connect(user).anchorHash(hash, 0, hash)).to.be.revertedWith("not authorized");

    await expect(anchor.connect(auditor).anchorHash(hash, 0, hash))
      .to.emit(anchor, "HashAnchored")
      .withArgs(hash, 0, hash, auditor.address, anyValue);

    const record = await anchor.getAnchor(hash);
    expect(record.actor).to.equal(auditor.address);
    await expect(anchor.connect(auditor).anchorHash(hash, 0, hash)).to.be.revertedWith("already anchored");

    const batchHashes = [
      ethers.keccak256(ethers.toUtf8Bytes("VID-1")),
      ethers.keccak256(ethers.toUtf8Bytes("VID-2")),
    ];
    await expect(anchor.connect(admin).anchorBatch(batchHashes, 1, hash))
      .to.emit(anchor, "BatchAnchored")
      .withArgs(batchHashes.length, 1, hash, admin.address, anyValue);
  });

  it("stores batch roots with role control", async () => {
    const [admin, auditor, outsider] = await ethers.getSigners();
    const BatchRootRegistry = await ethers.getContractFactory("BatchRootRegistry");
    const registry = await BatchRootRegistry.deploy(admin.address);
    await registry.waitForDeployment();

    const AUDITOR = await registry.AUDITOR();
    await registry.grantRole(AUDITOR, auditor.address);

    const batchId = ethers.keccak256(ethers.toUtf8Bytes("batch-1"));
    const root = ethers.keccak256(ethers.toUtf8Bytes("root-1"));

    await expect(registry.connect(outsider).submitRoot(batchId, root)).to.be.revertedWith("not authorized");

    await expect(registry.connect(auditor).submitRoot(batchId, root))
      .to.emit(registry, "BatchRootSubmitted")
      .withArgs(batchId, root, auditor.address, anyValue);

    await expect(registry.connect(admin).submitRoot(batchId, root)).to.be.revertedWith("batch exists");

    const stored = await registry.getBatch(batchId);
    expect(stored.root).to.equal(root);
    expect(stored.actor).to.equal(auditor.address);
  });
});
