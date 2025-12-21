import { expect } from "chai";
import { ethers, network } from "hardhat";

describe("COMPLIANCE_DAO_GOVERNANCE", () => {
  it("handles quorum, approval, execution, and policy changes", async () => {
    const [deployer, alice] = await ethers.getSigners();

    const daoCouncilRole = ethers.keccak256(ethers.toUtf8Bytes("DAO_COUNCIL_MEMBER"));

    const ComplianceVotingPolicy = await ethers.getContractFactory("ComplianceVotingPolicy");
    const votingPolicy = await ComplianceVotingPolicy.deploy(deployer.address);
    await votingPolicy.waitForDeployment();

    const policyVersion = await votingPolicy.publishPolicy.staticCall(
      ethers.keccak256(ethers.toUtf8Bytes("VOTING-POLICY-V1"))
    );
    await votingPolicy.publishPolicy(ethers.keccak256(ethers.toUtf8Bytes("VOTING-POLICY-V1")));

    await votingPolicy.setPolicyForType(policyVersion, 1, 10000, 5000, 5, daoCouncilRole);
    await votingPolicy.setPolicyForType(policyVersion, 2, 10000, 5000, 5, daoCouncilRole);
    await votingPolicy.activatePolicy(policyVersion);

    const ComplianceDAO = await ethers.getContractFactory("ComplianceDAO");
    const dao = await ComplianceDAO.deploy(deployer.address, await votingPolicy.getAddress());
    await dao.waitForDeployment();

    await dao.grantRole(daoCouncilRole, alice.address);

    const ComplianceExecutionBridge = await ethers.getContractFactory("ComplianceExecutionBridge");
    const bridge = await ComplianceExecutionBridge.deploy(deployer.address, await dao.getAddress());
    await bridge.waitForDeployment();

    await dao.setExecutionBridge(await bridge.getAddress());

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

    const freezePolicyVersion = await freezePolicy.publishPolicy.staticCall(
      ethers.keccak256(ethers.toUtf8Bytes("FREEZE-POLICY-V1"))
    );
    await freezePolicy.publishPolicy(ethers.keccak256(ethers.toUtf8Bytes("FREEZE-POLICY-V1")));
    await freezePolicy.activatePolicy(freezePolicyVersion);
    await freezePolicy.setFreezeTypePolicy(freezePolicyVersion, 1, 0, false, true, false);

    const complianceRole = await freezeRegistry.COMPLIANCE_ADMIN();
    await freezeRegistry.grantRole(complianceRole, await bridge.getAddress());

    const freezeSelector = freezeRegistry.interface.getFunction("freezeWallet").selector;
    const unfreezeSelector = freezeRegistry.interface.getFunction("unfreezeWallet").selector;
    await bridge.setAllowedSelector(await freezeRegistry.getAddress(), freezeSelector, true);
    await bridge.setAllowedSelector(await freezeRegistry.getAddress(), unfreezeSelector, true);

    const caseId = ethers.keccak256(ethers.toUtf8Bytes("CASE-1"));
    const justification = ethers.keccak256(ethers.toUtf8Bytes("JUSTIFICATION-1"));
    const freezeData = freezeRegistry.interface.encodeFunctionData("freezeWallet", [
      alice.address,
      caseId,
      justification,
      1,
    ]);
    const freezeActionHash = ethers.keccak256(
      ethers.solidityPacked(["address", "bytes"], [await freezeRegistry.getAddress(), freezeData])
    );

    const proposalId = await dao.propose.staticCall(1, ethers.keccak256(ethers.toUtf8Bytes("DESC-1")), caseId, freezeActionHash);
    await dao.propose(1, ethers.keccak256(ethers.toUtf8Bytes("DESC-1")), caseId, freezeActionHash);
    await bridge.registerAction(proposalId, await freezeRegistry.getAddress(), freezeData);

    await dao.vote(proposalId, true);

    for (let i = 0; i < 6; i++) {
      await network.provider.send("evm_mine");
    }

    await dao.finalize(proposalId);
    const proposalInfo = await dao.proposalInfo(proposalId);
    expect(proposalInfo.status).to.equal(3);

    const caseId2 = ethers.keccak256(ethers.toUtf8Bytes("CASE-2"));
    const freezeData2 = freezeRegistry.interface.encodeFunctionData("freezeWallet", [
      alice.address,
      caseId2,
      justification,
      1,
    ]);
    const freezeActionHash2 = ethers.keccak256(
      ethers.solidityPacked(["address", "bytes"], [await freezeRegistry.getAddress(), freezeData2])
    );

    const proposalId2 = await dao.propose.staticCall(
      1,
      ethers.keccak256(ethers.toUtf8Bytes("DESC-2")),
      caseId2,
      freezeActionHash2
    );
    await dao.propose(1, ethers.keccak256(ethers.toUtf8Bytes("DESC-2")), caseId2, freezeActionHash2);
    await bridge.registerAction(proposalId2, await freezeRegistry.getAddress(), freezeData2);

    await dao.vote(proposalId2, true);
    await dao.connect(alice).vote(proposalId2, true);

    for (let i = 0; i < 6; i++) {
      await network.provider.send("evm_mine");
    }

    await dao.finalize(proposalId2);
    const proposalInfo2 = await dao.proposalInfo(proposalId2);
    expect(proposalInfo2.status).to.equal(1);

    await dao.execute(proposalId2);
    expect(await freezeRegistry.isFrozenWallet(alice.address)).to.equal(true);

    const unfreezeData = freezeRegistry.interface.encodeFunctionData("unfreezeWallet", [
      alice.address,
      ethers.keccak256(ethers.toUtf8Bytes("RESOLUTION-1")),
    ]);
    const unfreezeActionHash = ethers.keccak256(
      ethers.solidityPacked(["address", "bytes"], [await freezeRegistry.getAddress(), unfreezeData])
    );
    const proposalId3 = await dao.propose.staticCall(
      2,
      ethers.keccak256(ethers.toUtf8Bytes("DESC-3")),
      caseId2,
      unfreezeActionHash
    );
    await dao.propose(2, ethers.keccak256(ethers.toUtf8Bytes("DESC-3")), caseId2, unfreezeActionHash);
    await bridge.registerAction(proposalId3, await freezeRegistry.getAddress(), unfreezeData);

    await dao.vote(proposalId3, true);
    await dao.connect(alice).vote(proposalId3, true);

    for (let i = 0; i < 6; i++) {
      await network.provider.send("evm_mine");
    }

    await dao.finalize(proposalId3);
    await dao.execute(proposalId3);
    expect(await freezeRegistry.isFrozenWallet(alice.address)).to.equal(false);

    const policyVersion2 = await votingPolicy.publishPolicy.staticCall(
      ethers.keccak256(ethers.toUtf8Bytes("VOTING-POLICY-V2"))
    );
    await votingPolicy.publishPolicy(ethers.keccak256(ethers.toUtf8Bytes("VOTING-POLICY-V2")));
    await votingPolicy.setPolicyForType(policyVersion2, 1, 5000, 5000, 5, daoCouncilRole);
    await votingPolicy.activatePolicy(policyVersion2);

    const caseId3 = ethers.keccak256(ethers.toUtf8Bytes("CASE-3"));
    const freezeData3 = freezeRegistry.interface.encodeFunctionData("freezeWallet", [
      alice.address,
      caseId3,
      justification,
      1,
    ]);
    const freezeActionHash3 = ethers.keccak256(
      ethers.solidityPacked(["address", "bytes"], [await freezeRegistry.getAddress(), freezeData3])
    );

    const proposalId4 = await dao.propose.staticCall(
      1,
      ethers.keccak256(ethers.toUtf8Bytes("DESC-4")),
      caseId3,
      freezeActionHash3
    );
    await dao.propose(1, ethers.keccak256(ethers.toUtf8Bytes("DESC-4")), caseId3, freezeActionHash3);
    await bridge.registerAction(proposalId4, await freezeRegistry.getAddress(), freezeData3);

    await dao.vote(proposalId4, true);

    for (let i = 0; i < 6; i++) {
      await network.provider.send("evm_mine");
    }

    await dao.finalize(proposalId4);
    const proposalInfo4 = await dao.proposalInfo(proposalId4);
    expect(proposalInfo4.status).to.equal(1);
  });
});
