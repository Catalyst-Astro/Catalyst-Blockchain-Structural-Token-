import fs from "fs";
import path from "path";
import { ethers } from "ethers";

export function ensureFile(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "");
  }
}

export function appendJsonl(filePath: string, data: unknown) {
  ensureFile(filePath);
  fs.appendFileSync(filePath, JSON.stringify(data) + "\n", { encoding: "utf8" });
}

export function readJsonl<T = any>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/).filter(Boolean);
  return lines.map((line) => JSON.parse(line) as T);
}

function canonicalize(value: any): any {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === "object" && !Buffer.isBuffer(value)) {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, any>>((acc, key) => {
        acc[key] = canonicalize(value[key]);
        return acc;
      }, {});
  }
  return value;
}

export function canonicalJson(value: any): string {
  return JSON.stringify(canonicalize(value));
}

export function hashCanonical(value: any): string {
  return ethers.keccak256(ethers.toUtf8Bytes(canonicalJson(value)));
}
