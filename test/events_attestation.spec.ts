import { expect } from "chai";
import { ethers } from "hardhat";

enum EventStatus {
  NONE,
  CREATED,
  ATTESTED,
  VERIFIED,
  REJECTED,
}

describe("EVENTS_ATTESTATION", () => {
  it("enforces attest -> verify lifecycle with thresholds and rejection rules", async () => {
    const [admin, notary1, notary2, auditor] = await ethers.getSigners();

    const EventRegistry = await ethers.getContractFactory("EventRegistry");
    const registry = await EventRegistry.deploy(admin.address, 2, 1);
    await registry.waitForDeployment();

    const NOTARY = await registry.NOTARY();
    const AUDITOR = await registry.AUDITOR();
    const COMPLIANCE_ADMIN = await registry.COMPLIANCE_ADMIN();

    await registry.grantRole(NOTARY, notary1.address);
    await registry.grantRole(NOTARY, notary2.address);
    await registry.grantRole(AUDITOR, auditor.address);

    const eid = ethers.keccak256(ethers.toUtf8Bytes("EID-1"));
    const payloadHash = ethers.keccak256(ethers.toUtf8Bytes("PAYLOAD-1"));
    await registry.createEvent(eid, ethers.keccak256(ethers.toUtf8Bytes("CONSTRUCTION_PERMIT")), payloadHash, []);

    const created = await registry["getEvent(bytes32)"](eid);
    expect(created.status).to.equal(EventStatus.CREATED);

    await registry.connect(notary1).attestEvent(eid);
    let record = await registry["getEvent(bytes32)"](eid);
    expect(record.status).to.equal(EventStatus.ATTESTED);
    expect(record.attestCount).to.equal(1);

    await expect(registry.connect(notary1).attestEvent(eid)).to.be.revertedWith("already attested");

    await expect(registry.connect(auditor).verifyEvent(eid)).to.be.revertedWith("not enough attestations");

    await registry.connect(notary2).attestEvent(eid);
    record = await registry["getEvent(bytes32)"](eid);
    expect(record.attestCount).to.equal(2);
    expect(record.status).to.equal(EventStatus.ATTESTED);

    await registry.connect(auditor).verifyEvent(eid);
    record = await registry["getEvent(bytes32)"](eid);
    expect(record.status).to.equal(EventStatus.VERIFIED);
    expect(record.verifyCount).to.equal(1);

    await expect(registry.connect(auditor).rejectEvent(eid, ethers.keccak256(ethers.toUtf8Bytes("late")))).to.be
      .reverted;

    const eid2 = ethers.keccak256(ethers.toUtf8Bytes("EID-2"));
    await registry.createEvent(eid2, ethers.keccak256(ethers.toUtf8Bytes("MILESTONE")), payloadHash, []);
    await registry.connect(notary1).attestEvent(eid2);
    await expect(
      registry.connect(auditor).rejectEvent(eid2, ethers.keccak256(ethers.toUtf8Bytes("bad-evidence")))
    ).to.emit(registry, "EventRejected");
    const rejected = await registry["getEvent(bytes32)"](eid2);
    expect(rejected.status).to.equal(EventStatus.REJECTED);
    await expect(registry.connect(notary2).attestEvent(eid2)).to.be.revertedWith("invalid status");
  });
});
