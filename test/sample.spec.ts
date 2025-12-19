import { expect } from "chai";
import { ethers } from "hardhat";

describe("Sample", () => {
  it("placeholder signer is a proper address", async () => {
    const [deployer] = await ethers.getSigners();
    expect(deployer.address).to.be.properAddress;
  });
});