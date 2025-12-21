import { expect } from "chai";
import { ethers } from "hardhat";

describe("SIMULATION_AND_SYSTEMIC_STABILITY", () => {
  it("publishes and activates simulation snapshots", async () => {
    const [deployer] = await ethers.getSigners();

    const SimulationOracle = await ethers.getContractFactory("SimulationOracle");
    const oracle = await SimulationOracle.deploy(deployer.address);
    await oracle.waitForDeployment();

    const version = await oracle.publishSnapshot.staticCall(
      ethers.parseEther("0.82"),
      ethers.parseEther("0.61"),
      ethers.parseEther("0.35"),
      ethers.parseEther("0.28"),
      180,
      ethers.keccak256(ethers.toUtf8Bytes("SIM-REPORT-V1"))
    );

    await oracle.publishSnapshot(
      ethers.parseEther("0.82"),
      ethers.parseEther("0.61"),
      ethers.parseEther("0.35"),
      ethers.parseEther("0.28"),
      180,
      ethers.keccak256(ethers.toUtf8Bytes("SIM-REPORT-V1"))
    );

    await oracle.activateSnapshot(version);

    const active = await oracle.activeSnapshot();
    expect(active.reportHash).to.equal(ethers.keccak256(ethers.toUtf8Bytes("SIM-REPORT-V1")));
    expect(await oracle.activeSnapshotVersion()).to.equal(version);
  });
});
