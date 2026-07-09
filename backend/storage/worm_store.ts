import fs from "fs";
import path from "path";
import { ethers } from "ethers";
import { ensureFile, canonicalJson } from "../api/utils";

const rootDir = path.join(process.cwd(), "backend", "storage", "worm");
if (!fs.existsSync(rootDir)) fs.mkdirSync(rootDir, { recursive: true });

export function storeArtifact(buffer: Buffer, metadata: any) {
  const vid = ethers.keccak256(buffer);
  const dir = rootDir;
  const filePath = path.join(dir, vid);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, buffer);
  }
  const manifest = {
    vid,
    metadata,
    createdAt: new Date().toISOString(),
  };
  const manifestPath = path.join(dir, `${vid}.json`);
  ensureFile(manifestPath);
  fs.writeFileSync(manifestPath, canonicalJson(manifest));
  return { vid, path: filePath, manifest: manifestPath };
}
