import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("ConsensusEvidence", () => {
  it("allows only authorized roles and records once", async () => {
    const [admin, auditor, other] = await ethers.getSigners();
    const ConsensusEvidence = await ethers.getContractFactory("ConsensusEvidence");
    const registry = await ConsensusEvidence.deploy(admin.address);
    await registry.waitForDeployment();

    await registry.grantRole(await registry.AUDITOR(), auditor.address);

    const subjectId = ethers.keccak256(ethers.toUtf8Bytes("SUBJ"));
    const quorumHash = ethers.keccak256(ethers.toUtf8Bytes("quorum"));
    const signersHash = ethers.keccak256(ethers.toUtf8Bytes("signers"));

    await expect(
      registry.connect(other).recordEvidence(subjectId, 1, quorumHash, signersHash)
    ).to.be.revertedWith("not authorized");

    await expect(registry.connect(auditor).recordEvidence(subjectId, 1, quorumHash, signersHash))
      .to.emit(registry, "ConsensusEvidenceRecorded")
      .withArgs(subjectId, 1, quorumHash, signersHash, auditor.address, anyValue);

    const stored = await registry.getEvidence(subjectId);
    expect(stored.quorumHash).to.equal(quorumHash);

    await expect(registry.connect(auditor).recordEvidence(subjectId, 1, quorumHash, signersHash)).to.be.revertedWith(
      "already recorded"
    );
  });
});
