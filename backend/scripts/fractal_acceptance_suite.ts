import fs from "fs";
import path from "path";
import { ethers } from "ethers";
import { canonicalJson } from "../api/utils";

const scenarios = ["ZONING_PERMIT", "MILESTONE_25", "YIELD_DISTRIBUTION"];

const manifest = {
  scenarios,
  executedAt: new Date().toISOString(),
  status: "NOT_EXECUTED",
};

const atid = ethers.keccak256(ethers.toUtf8Bytes(canonicalJson(manifest)));
const outDir = path.join(process.cwd(), "acceptance_runs");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, `${atid}.json`), canonicalJson({ ...manifest, atid }), "utf8");
console.log(`ATID generated ${atid}`);
