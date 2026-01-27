import express, { Request, Response } from "express";
import { ethers } from "ethers";
import path from "path";
import { StoryLedger } from "./storyLedger";
import { appendJsonl, ensureFile, hashCanonical, readJsonl } from "./utils";

const app = express();
app.use(express.json({ limit: "1mb" }));

const ledger = new StoryLedger();
const dataDir = path.join(process.cwd(), "backend", "database");
const identityLogPath = path.join(dataDir, "identity_events.jsonl");
const credentialLogPath = path.join(dataDir, "credential_events.jsonl");
ensureFile(identityLogPath);
ensureFile(credentialLogPath);

const rpcUrl = process.env.RPC_URL;
const privateKey = process.env.PRIVATE_KEY;
const identityRegistryAddress = process.env.IDENTITY_REGISTRY_ADDRESS;
const credentialRegistryAddress = process.env.CREDENTIAL_REGISTRY_ADDRESS;

const provider = rpcUrl ? new ethers.JsonRpcProvider(rpcUrl) : null;
const signer = provider && privateKey ? new ethers.Wallet(privateKey, provider) : null;
const identityAbi = [
  "function verifyIdentity(address wallet, bytes32 identityHash) external",
  "function revokeIdentity(address wallet, bytes32 reasonHash) external",
  "function suspendIdentity(address wallet, bytes32 reasonHash) external",
];
const credentialAbi = [
  "function issueCredential(address wallet, bytes32 role, bytes32 credentialHash, uint64 validFrom, uint64 validTo) external",
  "function revokeCredential(address wallet, bytes32 role, bytes32 reasonHash) external",
  "function isCredentialActive(address wallet, bytes32 role) external view returns (bool)",
];

const identityContract =
  signer && identityRegistryAddress
    ? new ethers.Contract(identityRegistryAddress, identityAbi, signer)
    : null;
const credentialContract =
  signer && credentialRegistryAddress
    ? new ethers.Contract(credentialRegistryAddress, credentialAbi, signer)
    : null;

function normalizeRole(roleInput: string): string {
  if (!roleInput) {
    throw new Error("role required");
  }
  if (roleInput.startsWith("0x") && roleInput.length === 66) {
    return roleInput.toLowerCase();
  }
  return ethers.keccak256(ethers.toUtf8Bytes(roleInput.toUpperCase()));
}

async function maybeVerifyOnChain(wallet: string, identityHash: string, dryRun?: boolean) {
  if (!identityContract || dryRun) {
    return null;
  }
  const tx = await identityContract.verifyIdentity(wallet, identityHash);
  const receipt = await tx.wait();
  return receipt?.hash ?? tx.hash;
}

async function maybeRevokeIdentityOnChain(wallet: string, reasonHash: string, dryRun?: boolean) {
  if (!identityContract || dryRun) {
    return null;
  }
  const tx = await identityContract.revokeIdentity(wallet, reasonHash);
  const receipt = await tx.wait();
  return receipt?.hash ?? tx.hash;
}

async function maybeIssueCredentialOnChain(
  wallet: string,
  role: string,
  credentialHash: string,
  validFrom: bigint,
  validTo: bigint,
  dryRun?: boolean
) {
  if (!credentialContract || dryRun) {
    return null;
  }
  const tx = await credentialContract.issueCredential(wallet, role, credentialHash, validFrom, validTo);
  const receipt = await tx.wait();
  return receipt?.hash ?? tx.hash;
}

async function maybeRevokeCredentialOnChain(
  wallet: string,
  role: string,
  reasonHash: string,
  dryRun?: boolean
) {
  if (!credentialContract || dryRun) {
    return null;
  }
  const tx = await credentialContract.revokeCredential(wallet, role, reasonHash);
  const receipt = await tx.wait();
  return receipt?.hash ?? tx.hash;
}

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    onChain: Boolean(identityContract || credentialContract),
    identityRegistryAddress,
    credentialRegistryAddress,
  });
});

app.post("/identity/verify", async (req: Request, res: Response) => {
  try {
    const { wallet, identityPacket, issuer, dryRun } = req.body;
    if (!wallet || !identityPacket) {
      return res.status(400).json({ error: "wallet and identityPacket are required" });
    }
    const identityHash = hashCanonical(identityPacket);
    const timestamp = new Date().toISOString();
    const actor = issuer ?? signer?.address ?? "unknown";

    const eventPayload = {
      type: "identity.verify",
      wallet,
      identityHash,
      issuer: actor,
      vid: identityHash,
      timestamp,
    };
    const eid = hashCanonical(eventPayload);
    const record = { ...eventPayload, eid };
    appendJsonl(identityLogPath, record);
    ledger.logAction("identity", `verify_identity wallet=${wallet} hash=${identityHash} issuer=${actor}`);

    const txHash = await maybeVerifyOnChain(wallet, identityHash, dryRun);
    return res.json({ ...record, txHash, onChain: Boolean(txHash) && !dryRun });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/credential/issue", async (req: Request, res: Response) => {
  try {
    const { wallet, role, credentialPacket, validFrom, validTo, issuer, dryRun } = req.body;
    if (!wallet || !role || !credentialPacket || !validTo) {
      return res
        .status(400)
        .json({ error: "wallet, role, credentialPacket, validTo are required" });
    }
    const normalizedRole = normalizeRole(role);
    const credentialHash = hashCanonical(credentialPacket);
    const start = validFrom ? BigInt(validFrom) : BigInt(Math.floor(Date.now() / 1000));
    const end = BigInt(validTo);
    if (end <= start) {
      return res.status(400).json({ error: "validTo must be greater than validFrom" });
    }

    const timestamp = new Date().toISOString();
    const actor = issuer ?? signer?.address ?? "unknown";
    const eventPayload = {
      type: "credential.issue",
      wallet,
      role: normalizedRole,
      credentialHash,
      validFrom: start.toString(),
      validTo: end.toString(),
      issuer: actor,
      vid: credentialHash,
      timestamp,
    };
    const eid = hashCanonical(eventPayload);
    const record = { ...eventPayload, eid };
    appendJsonl(credentialLogPath, record);
    ledger.logAction(
      "credential",
      `issue_credential wallet=${wallet} role=${normalizedRole} validTo=${end}`
    );

    const txHash = await maybeIssueCredentialOnChain(wallet, normalizedRole, credentialHash, start, end, dryRun);
    return res.json({ ...record, txHash, onChain: Boolean(txHash) && !dryRun });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/credential/revoke", async (req: Request, res: Response) => {
  try {
    const { wallet, role, reason, dryRun } = req.body;
    if (!wallet || !role || !reason) {
      return res.status(400).json({ error: "wallet, role, reason are required" });
    }
    const normalizedRole = normalizeRole(role);
    const reasonHash = ethers.keccak256(ethers.toUtf8Bytes(reason));
    const timestamp = new Date().toISOString();
    const actor = signer?.address ?? "unknown";
    const eventPayload = {
      type: "credential.revoke",
      wallet,
      role: normalizedRole,
      reasonHash,
      issuer: actor,
      timestamp,
    };
    const eid = hashCanonical(eventPayload);
    const record = { ...eventPayload, eid };
    appendJsonl(credentialLogPath, record);
    ledger.logAction("credential", `revoke_credential wallet=${wallet} reasonHash=${reasonHash}`);

    const txHash = await maybeRevokeCredentialOnChain(wallet, normalizedRole, reasonHash, dryRun);
    return res.json({ ...record, txHash, onChain: Boolean(txHash) && !dryRun });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/identity/revoke", async (req: Request, res: Response) => {
  try {
    const { wallet, reason, dryRun } = req.body;
    if (!wallet || !reason) {
      return res.status(400).json({ error: "wallet and reason are required" });
    }
    const reasonHash = ethers.keccak256(ethers.toUtf8Bytes(reason));
    const timestamp = new Date().toISOString();
    const actor = signer?.address ?? "unknown";
    const eventPayload = {
      type: "identity.revoke",
      wallet,
      reasonHash,
      issuer: actor,
      timestamp,
    };
    const eid = hashCanonical(eventPayload);
    const record = { ...eventPayload, eid };
    appendJsonl(identityLogPath, record);
    ledger.logAction("identity", `revoke_identity wallet=${wallet} reasonHash=${reasonHash}`);

    const txHash = await maybeRevokeIdentityOnChain(wallet, reasonHash, dryRun);
    return res.json({ ...record, txHash, onChain: Boolean(txHash) && !dryRun });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get("/identity/:wallet", (req: Request, res: Response) => {
  const { wallet } = req.params;
  const events = readJsonl(identityLogPath).filter((e) => e.wallet === wallet);
  const latest = events[events.length - 1] ?? null;
  return res.json({ wallet, latest, events });
});

app.get("/credential/:wallet", (req: Request, res: Response) => {
  const { wallet } = req.params;
  const { role } = req.query;
  const roleFilter = typeof role === "string" && role.length > 0 ? normalizeRole(role) : null;
  const events = readJsonl(credentialLogPath).filter((e) => {
    if (e.wallet !== wallet) return false;
    if (roleFilter && e.role !== roleFilter) return false;
    return true;
  });
  const latest = events[events.length - 1] ?? null;
  return res.json({ wallet, role: roleFilter, latest, events });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Identity & Roles API listening on port ${port} (on-chain=${Boolean(signer)})`);
});
