import fs from "fs";
import path from "path";
import { ethers } from "ethers";
import { canonicalJson } from "../api/utils";

const policyPath = path.join(process.cwd(), "policies", "current_policy.json");
if (!fs.existsSync(policyPath)) {
  console.error("policies/current_policy.json not found");
  process.exit(1);
}

const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
const policyJson = canonicalJson(policy);
const policyHash = ethers.keccak256(ethers.toUtf8Bytes(policyJson));
const activeFrom = Math.floor(Date.now() / 1000);
const pid = ethers.keccak256(ethers.concat([ethers.getBytes(policyHash), ethers.toBeArray(BigInt(activeFrom))]));

const manifestDir = path.join(process.cwd(), "policies", "published");
fs.mkdirSync(manifestDir, { recursive: true });
fs.writeFileSync(path.join(manifestDir, `${pid}.json`), canonicalJson({ pid, policyHash, activeFrom, policy }), "utf8");

console.log(`pid=${pid}`);

const rpc = process.env.RPC_URL;
const pk = process.env.PRIVATE_KEY;
const registryAddr = process.env.POLICY_REGISTRY_ADDRESS;
if (rpc && pk && registryAddr) {
  const provider = new ethers.JsonRpcProvider(rpc);
  const signer = new ethers.Wallet(pk, provider);
  const abi = ["function registerPolicy(bytes32,bytes32,uint64) external", "function activatePolicy(bytes32) external"];
  const reg = new ethers.Contract(registryAddr, abi, signer);
  (async () => {
    const tx1 = await reg.registerPolicy(pid, policyHash, activeFrom);
    await tx1.wait();
    const tx2 = await reg.activatePolicy(pid);
    await tx2.wait();
    console.log(`policy registered+activated tx2=${tx2.hash}`);
  })().catch((err: any) => console.error(err));
} else {
  console.log("On-chain publish skipped (missing env)");
}
