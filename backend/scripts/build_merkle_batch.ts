import fs from "fs";
import path from "path";
import { ethers } from "ethers";
import { readJsonl, ensureFile } from "../api/utils";

function arrayify(hex: string): Uint8Array {
  return ethers.getBytes(hex);
}

function hashPair(a: string, b: string): string {
  const [left, right] = a.toLowerCase() <= b.toLowerCase() ? [a, b] : [b, a];
  return ethers.keccak256(ethers.concat([arrayify(left), arrayify(right)]));
}

function buildMerkle(leaves: string[]) {
  if (leaves.length === 0) throw new Error("no leaves provided");
  let layer = leaves.map((l) => ethers.hexlify(l));
  const layers: string[][] = [layer];

  while (layer.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      if (i + 1 === layer.length) {
        next.push(layer[i]);
      } else {
        next.push(hashPair(layer[i], layer[i + 1]));
      }
    }
    layers.push(next);
    layer = next;
  }

  const root = layer[0];

  function proofFor(index: number): string[] {
    const proof: string[] = [];
    let idx = index;
    for (let d = 0; d < layers.length - 1; d++) {
      const layerNodes = layers[d];
      const isRight = idx % 2 === 1;
      const siblingIndex = isRight ? idx - 1 : idx + 1;
      if (siblingIndex < layerNodes.length) {
        proof.push(layerNodes[siblingIndex]);
      }
      idx = Math.floor(idx / 2);
    }
    return proof;
  }

  return { root, layers, proofFor };
}

function loadHashes(): string[] {
  const dataDir = path.join(process.cwd(), "backend", "database");
  const eventLog = path.join(dataDir, "events_log.jsonl");
  const evidenceLog = path.join(dataDir, "evidence_log.jsonl");
  const hashes: string[] = [];

  if (fs.existsSync(eventLog)) {
    const entries = readJsonl<any>(eventLog);
    for (const e of entries) {
      if (e.eid) hashes.push(e.eid);
      if (Array.isArray(e.vids)) {
        hashes.push(...e.vids);
      }
    }
  }

  if (fs.existsSync(evidenceLog)) {
    const entries = readJsonl<any>(evidenceLog);
    for (const e of entries) {
      if (e.hash) hashes.push(e.hash);
      if (e.eid) hashes.push(e.eid);
      if (e.vid) hashes.push(e.vid);
    }
  }

  const unique = Array.from(new Set(hashes));
  if (unique.length === 0) {
    throw new Error("no hashes found in logs");
  }
  return unique;
}

async function main() {
  const hashes = loadHashes();
  const { root, proofFor } = buildMerkle(hashes);
  const timestamp = Date.now();
  const batchId = ethers.keccak256(
    ethers.concat([
      ethers.getBytes(root),
      ethers.toBeArray(BigInt(timestamp)),
      ethers.toBeArray(BigInt(hashes.length)),
    ])
  );

  const proofs: Record<string, string[]> = {};
  hashes.forEach((h, idx) => {
    proofs[h] = proofFor(idx);
  });

  const batch = {
    batchId,
    root,
    leafHashes: hashes,
    proofs,
    createdAt: new Date(timestamp).toISOString(),
    count: hashes.length,
  };

  const outDir = path.join(process.cwd(), "backend", "database", "batches");
  const outPath = path.join(outDir, `${batchId}.json`);
  ensureFile(outPath);
  fs.writeFileSync(outPath, JSON.stringify(batch, null, 2));
  console.log(`Batch written to ${outPath}`);
  console.log(`root=${root} count=${hashes.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
