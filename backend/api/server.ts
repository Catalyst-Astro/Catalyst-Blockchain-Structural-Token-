import express, { Request, Response } from "express";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { StoryLedger, StoryLedgerContext } from "./storyLedger";
import { ClockchainOperatorAI } from "./ai/controlPlane";
import { registerClockchainOperatorRoutes } from "./ai/routes";
import { ClockchainUiCopilot } from "./ai/uiCopilot";
import { registerClockchainUiCopilotRoutes } from "./ai/uiRoutes";
import { buildEventReadModel, findRelatedEventIdsByVid } from "./eventReadModel";
import { appendJsonl, ensureFile, hashCanonical, readJsonl } from "./utils";
import { buildEventPacket, canonicalizeEvent, computeEID, computeVID } from "../src/events/canonical";

const app = express();
app.use(express.json({ limit: "1mb" }));

const ledger = new StoryLedger();
const apiKey = process.env.CLOCKCHAIN_API_KEY;

if (apiKey) {
  app.use((req, res, next) => {
    if (req.method === "GET" || req.method === "HEAD") {
      return next();
    }
    const candidate = req.header("x-api-key") ?? (typeof req.query.apiKey === "string" ? req.query.apiKey : undefined);
    if (candidate !== apiKey) {
      ledger.logAction("security", `blocked request ${req.method} ${req.path}`, { status: "blocked" });
      return res.status(401).json({ error: "unauthorized" });
    }
    return next();
  });
}

const dataDir = process.env.CATALYST_DATA_DIR
  ? path.resolve(process.env.CATALYST_DATA_DIR)
  : path.join(process.cwd(), "backend", "database");
const identityLogPath = path.join(dataDir, "identity_events.jsonl");
const credentialLogPath = path.join(dataDir, "credential_events.jsonl");
const eventLogPath = path.join(dataDir, "events_log.jsonl");
const evidenceLogPath = path.join(dataDir, "evidence_log.jsonl");
const amlLogPath = path.join(dataDir, "aml_scoring_log.jsonl");
const rampLogPath = path.join(dataDir, "ramps_log.jsonl");
ensureFile(identityLogPath);
ensureFile(credentialLogPath);
ensureFile(eventLogPath);
ensureFile(evidenceLogPath);
ensureFile(amlLogPath);
ensureFile(rampLogPath);

const operatorAI = new ClockchainOperatorAI();
const uiCopilot = new ClockchainUiCopilot();

const rpcUrl = process.env.RPC_URL;
const privateKey = process.env.PRIVATE_KEY;
const identityRegistryAddress = process.env.IDENTITY_REGISTRY_ADDRESS;
const credentialRegistryAddress = process.env.CREDENTIAL_REGISTRY_ADDRESS;
const eventRegistryAddress = process.env.EVENT_REGISTRY_ADDRESS;
const evidenceAnchorAddress = process.env.EVIDENCE_ANCHOR_ADDRESS;
const batchRegistryAddress = process.env.BATCH_REGISTRY_ADDRESS;
const amlRegistryAddress = process.env.AML_REGISTRY_ADDRESS;
const rampVaultAddress = process.env.RAMP_VAULT_ADDRESS;
const paymentRefRegistryAddress = process.env.PAYMENT_REF_REGISTRY_ADDRESS;

const provider = rpcUrl ? new ethers.JsonRpcProvider(rpcUrl) : null;
const signer = provider && privateKey ? new ethers.Wallet(privateKey, provider) : null;
const runner = signer ?? provider;
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
const eventAbi = [
  "function createEvent(bytes32 eid, bytes32 eventType, bytes32 payloadHash, bytes32[] calldata vids) external",
  "function attestEvent(bytes32 eid) external",
  "function verifyEvent(bytes32 eid) external",
  "function rejectEvent(bytes32 eid, bytes32 reasonHash) external",
  "function statusOf(bytes32 eid) external view returns (uint8)",
  "function getEvent(bytes32 eid) external view returns (tuple(bytes32 eid, bytes32 eventType, uint64 createdAt, address creator, uint8 status, bytes32 payloadHash, bytes32[] vids, uint32 attestCount, uint32 verifyCount))",
];
const evidenceAbi = [
  "function exists(bytes32 hash) external view returns (bool)",
  "function getAnchor(bytes32 hash) external view returns (tuple(bytes32 hash,uint8 aType,bytes32 refId,address actor,uint64 anchoredAt))",
  "function anchorHash(bytes32 hash, uint8 aType, bytes32 refId) external",
];
const batchRegistryAbi = [
  "function getBatch(bytes32 batchId) external view returns (tuple(bytes32 root, bytes32 batchId, uint64 anchoredAt, address actor))",
];
const amlAbi = [
  "function assignRisk(address wallet, uint8 level) external",
  "function updateRisk(address wallet, uint8 level) external",
];
const rampVaultAbi = [
  "function requestCashIn(bytes32 eid, uint256 amount, bytes32 paymentRefHash) external",
  "function requestCashOut(bytes32 eid, uint256 amount, bytes32 payoutRefHash) external",
  "function confirmCashIn(bytes32 eid, bytes32 confirmationVID) external",
  "function confirmCashOut(bytes32 eid, bytes32 confirmationVID) external",
  "function settle(bytes32 eid) external",
  "function getOperation(bytes32 eid) external view returns (tuple(address wallet,uint256 amount,uint8 direction,uint8 status,bytes32 paymentRefHash,bytes32 confirmationVID,address confirmedBy,uint64 requestedAt,uint64 settledAt))",
];
const paymentRefAbi = [
  "function registerRef(bytes32 refHash, bytes32 eid) external",
  "function getEid(bytes32 refHash) external view returns (bytes32)",
];

const identityContract =
  signer && identityRegistryAddress
    ? new ethers.Contract(identityRegistryAddress, identityAbi, signer)
    : null;
const credentialContract =
  signer && credentialRegistryAddress
    ? new ethers.Contract(credentialRegistryAddress, credentialAbi, signer)
    : null;
const eventContract =
  signer && eventRegistryAddress ? new ethers.Contract(eventRegistryAddress, eventAbi, signer) : null;
const eventViewContract =
  runner && eventRegistryAddress ? new ethers.Contract(eventRegistryAddress, eventAbi, runner) : null;
const evidenceAnchorContract =
  signer && evidenceAnchorAddress ? new ethers.Contract(evidenceAnchorAddress, evidenceAbi, signer) : null;
const evidenceAnchorView =
  runner && evidenceAnchorAddress ? new ethers.Contract(evidenceAnchorAddress, evidenceAbi, runner) : null;
const batchRegistryView =
  runner && batchRegistryAddress ? new ethers.Contract(batchRegistryAddress, batchRegistryAbi, runner) : null;
const amlContract =
  signer && amlRegistryAddress ? new ethers.Contract(amlRegistryAddress, amlAbi, signer) : null;
const rampVaultContract =
  signer && rampVaultAddress ? new ethers.Contract(rampVaultAddress, rampVaultAbi, signer) : null;
const paymentRefRegistry =
  signer && paymentRefRegistryAddress ? new ethers.Contract(paymentRefRegistryAddress, paymentRefAbi, signer) : null;

type TraceContext = Omit<StoryLedgerContext, "caseId" | "eid" | "vids" | "status">;

function normalizeTraceRefs(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.filter((entry): entry is string => typeof entry === "string").map((entry) => entry.trim()).filter(Boolean))].sort();
}

function extractTraceContext(payload: Record<string, unknown>): TraceContext {
  return {
    traceId: typeof payload.traceId === "string" && payload.traceId.trim() ? payload.traceId.trim() : undefined,
    reqId: typeof payload.reqId === "string" && payload.reqId.trim() ? payload.reqId.trim() : undefined,
    ctrId: typeof payload.ctrId === "string" && payload.ctrId.trim() ? payload.ctrId.trim() : undefined,
    zkRefs: normalizeTraceRefs(payload.zkRefs),
    evidenceRefs: normalizeTraceRefs(payload.evidenceRefs),
  };
}

function withTraceContext<T extends Record<string, unknown>>(record: T, traceContext: TraceContext): T & TraceContext {
  const enriched: Record<string, unknown> = { ...record };
  if (traceContext.traceId) enriched.traceId = traceContext.traceId;
  if (traceContext.reqId) enriched.reqId = traceContext.reqId;
  if (traceContext.ctrId) enriched.ctrId = traceContext.ctrId;
  if (traceContext.zkRefs && traceContext.zkRefs.length > 0) enriched.zkRefs = traceContext.zkRefs;
  if (traceContext.evidenceRefs && traceContext.evidenceRefs.length > 0) enriched.evidenceRefs = traceContext.evidenceRefs;
  return enriched as T & TraceContext;
}

function normalizeRole(roleInput: string): string {
  if (!roleInput) {
    throw new Error("role required");
  }
  if (roleInput.startsWith("0x") && roleInput.length === 66) {
    return roleInput.toLowerCase();
  }
  return ethers.keccak256(ethers.toUtf8Bytes(roleInput.toUpperCase()));
}

function normalizeEventType(eventType: string): string {
  if (!eventType) throw new Error("eventType required");
  if (eventType.startsWith("0x") && eventType.length === 66) {
    return eventType.toLowerCase();
  }
  return ethers.keccak256(ethers.toUtf8Bytes(eventType.toUpperCase()));
}

async function requireCredential(wallet: string, role: string) {
  if (!credentialContract) return true;
  const active = await credentialContract.isCredentialActive(wallet, role);
  if (!active) {
    throw new Error("credential not active");
  }
  return true;
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

async function maybeCreateEventOnChain(
  eid: string,
  eventType: string,
  payloadHash: string,
  vids: string[],
  dryRun?: boolean
) {
  if (!eventContract || dryRun) return null;
  const tx = await eventContract.createEvent(eid, eventType, payloadHash, vids);
  const receipt = await tx.wait();
  return receipt?.hash ?? tx.hash;
}

async function maybeAttestEventOnChain(eid: string, dryRun?: boolean) {
  if (!eventContract || dryRun) return null;
  const tx = await eventContract.attestEvent(eid);
  const receipt = await tx.wait();
  return receipt?.hash ?? tx.hash;
}

async function maybeVerifyEventOnChain(eid: string, dryRun?: boolean) {
  if (!eventContract || dryRun) return null;
  const tx = await eventContract.verifyEvent(eid);
  const receipt = await tx.wait();
  return receipt?.hash ?? tx.hash;
}

async function maybeRejectEventOnChain(eid: string, reasonHash: string, dryRun?: boolean) {
  if (!eventContract || dryRun) return null;
  const tx = await eventContract.rejectEvent(eid, reasonHash);
  const receipt = await tx.wait();
  return receipt?.hash ?? tx.hash;
}

async function readEventOnChain(eid: string) {
  if (!eventViewContract) return null;
  try {
    return await eventViewContract["getEvent(bytes32)"](eid);
  } catch {
    return null;
  }
}

async function maybeAnchorEvidence(
  hash: string,
  aType: number,
  refId: string,
  dryRun?: boolean,
  traceContext: TraceContext = {}
) {
  if (!evidenceAnchorContract || dryRun) return null;
  const tx = await evidenceAnchorContract.anchorHash(hash, aType, refId);
  const receipt = await tx.wait();
  appendJsonl(
    evidenceLogPath,
    withTraceContext(
      {
        hash,
        aType,
        refId,
        anchoredBy: signer?.address ?? "unknown",
        timestamp: new Date().toISOString(),
        traceId: traceContext.traceId ?? refId,
      },
      traceContext
    )
  );
  return receipt?.hash ?? tx.hash;
}

function loadBatchesContaining(hash: string) {
  const batchesDir = path.join(dataDir, "batches");
  if (!fs.existsSync(batchesDir)) return null;
  const files = fs.readdirSync(batchesDir).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const batch = JSON.parse(fs.readFileSync(path.join(batchesDir, file), "utf8"));
    if (Array.isArray(batch.leafHashes) && batch.leafHashes.includes(hash)) {
      return {
        batchId: batch.batchId,
        root: batch.root,
        proof: batch.proofs?.[hash] ?? [],
        createdAt: batch.createdAt,
      };
    }
  }
  return null;
}

async function maybeUpdateRisk(wallet: string, level: number, dryRun?: boolean) {
  if (!amlContract || dryRun) return null;
  try {
    const tx = await amlContract.updateRisk(wallet, level);
    const receipt = await tx.wait();
    return receipt?.hash ?? tx.hash;
  } catch {
    const tx = await amlContract.assignRisk(wallet, level);
    const receipt = await tx.wait();
    return receipt?.hash ?? tx.hash;
  }
}

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    onChain: Boolean(identityContract || credentialContract || eventContract || evidenceAnchorContract),
    identityRegistryAddress,
    credentialRegistryAddress,
    eventRegistryAddress,
    evidenceAnchorAddress,
    batchRegistryAddress,
    amlRegistryAddress,
    rampVaultAddress,
    paymentRefRegistryAddress,
  });
});

registerClockchainOperatorRoutes(app, operatorAI);
registerClockchainUiCopilotRoutes(app, uiCopilot);

app.post("/identity/verify", async (req: Request, res: Response) => {
  try {
    const { wallet, identityPacket, issuer, dryRun } = req.body;
    const traceContext = extractTraceContext(req.body);
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
      ...withTraceContext({}, traceContext),
    };
    const eid = hashCanonical(eventPayload);
    const runtimeTrace = { ...traceContext, traceId: traceContext.traceId ?? eid };
    const record = withTraceContext({ ...eventPayload, eid }, runtimeTrace);
    appendJsonl(identityLogPath, record);
    ledger.logAction("identity", `verify_identity wallet=${wallet} hash=${identityHash} issuer=${actor}`, {
      ...runtimeTrace,
      eid,
      vids: [identityHash],
      status: "verified",
    });

    const txHash = await maybeVerifyOnChain(wallet, identityHash, dryRun);
    return res.json({ ...record, txHash, onChain: Boolean(txHash) && !dryRun });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/credential/issue", async (req: Request, res: Response) => {
  try {
    const { wallet, role, credentialPacket, validFrom, validTo, issuer, dryRun } = req.body;
    const traceContext = extractTraceContext(req.body);
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
      ...withTraceContext({}, traceContext),
    };
    const eid = hashCanonical(eventPayload);
    const runtimeTrace = { ...traceContext, traceId: traceContext.traceId ?? eid };
    const record = withTraceContext({ ...eventPayload, eid }, runtimeTrace);
    appendJsonl(credentialLogPath, record);
    ledger.logAction(
      "credential",
      `issue_credential wallet=${wallet} role=${normalizedRole} validTo=${end}`,
      {
        ...runtimeTrace,
        eid,
        vids: [credentialHash],
        status: "issued",
      }
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
    const traceContext = extractTraceContext(req.body);
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
      ...withTraceContext({}, traceContext),
    };
    const eid = hashCanonical(eventPayload);
    const runtimeTrace = { ...traceContext, traceId: traceContext.traceId ?? eid };
    const record = withTraceContext({ ...eventPayload, eid }, runtimeTrace);
    appendJsonl(credentialLogPath, record);
    ledger.logAction("credential", `revoke_credential wallet=${wallet} reasonHash=${reasonHash}`, {
      ...runtimeTrace,
      eid,
      status: "revoked",
    });

    const txHash = await maybeRevokeCredentialOnChain(wallet, normalizedRole, reasonHash, dryRun);
    return res.json({ ...record, txHash, onChain: Boolean(txHash) && !dryRun });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/identity/revoke", async (req: Request, res: Response) => {
  try {
    const { wallet, reason, dryRun } = req.body;
    const traceContext = extractTraceContext(req.body);
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
      ...withTraceContext({}, traceContext),
    };
    const eid = hashCanonical(eventPayload);
    const runtimeTrace = { ...traceContext, traceId: traceContext.traceId ?? eid };
    const record = withTraceContext({ ...eventPayload, eid }, runtimeTrace);
    appendJsonl(identityLogPath, record);
    ledger.logAction("identity", `revoke_identity wallet=${wallet} reasonHash=${reasonHash}`, {
      ...runtimeTrace,
      eid,
      status: "revoked",
    });

    const txHash = await maybeRevokeIdentityOnChain(wallet, reasonHash, dryRun);
    return res.json({ ...record, txHash, onChain: Boolean(txHash) && !dryRun });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/aml/score", async (req: Request, res: Response) => {
  try {
    const { wallet, level, scoringInput, dryRun } = req.body;
    const traceContext = extractTraceContext(req.body);
    if (wallet === undefined || level === undefined) {
      return res.status(400).json({ error: "wallet and level are required" });
    }
    const normalizedLevel = Number(level);
    if (Number.isNaN(normalizedLevel)) {
      return res.status(400).json({ error: "level must be a number" });
    }
    const provenanceHash = hashCanonical(scoringInput ?? {});
    const walletRef = ethers.keccak256(ethers.getBytes(ethers.getAddress(wallet)));
    const timestamp = new Date().toISOString();
    const runtimeTrace = { ...traceContext, traceId: traceContext.traceId ?? walletRef };
    const record = withTraceContext({ wallet, level: normalizedLevel, provenanceHash, timestamp }, runtimeTrace);
    appendJsonl(amlLogPath, record);
    ledger.logAction("aml", `aml_score wallet=${wallet} level=${normalizedLevel} provHash=${provenanceHash}`, {
      ...runtimeTrace,
      vids: [provenanceHash],
      status: "scored",
    });

    const anchorTx = await maybeAnchorEvidence(provenanceHash, 4, walletRef, dryRun, runtimeTrace);
    const txHash = await maybeUpdateRisk(wallet, normalizedLevel, dryRun);
    return res.json({ ...record, anchorTx, txHash, onChain: Boolean(txHash) && !dryRun });
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

app.post("/events", async (req: Request, res: Response) => {
  try {
    const { eventType, payload, vids, actorWallet, jurisdiction, nonce, dryRun } = req.body;
    const traceContext = extractTraceContext(req.body);
    if (!eventType || (!payload && !req.body.payloadHash)) {
      return res.status(400).json({ error: "eventType and payload/payloadHash required" });
    }
    const payloadHash = req.body.payloadHash
      ? req.body.payloadHash
      : hashCanonical(payload ?? {});
    const vidList: string[] = Array.isArray(vids)
      ? vids.map((v: any) => computeVID(v))
      : [];
    const packet = buildEventPacket({
      eventType,
      actorWallet: actorWallet ?? signer?.address ?? "unknown",
      payloadHash,
      vids: vidList,
      jurisdiction,
      nonce,
      ...traceContext,
    });
    const canonical = canonicalizeEvent(packet);
    const eid = computeEID(canonical);
    const evtTypeHash = normalizeEventType(eventType);
    const runtimeTrace = { ...traceContext, traceId: traceContext.traceId ?? eid };
    const record = withTraceContext({ eid, eventType: evtTypeHash, payloadHash, vids: vidList, packet }, runtimeTrace);
    appendJsonl(eventLogPath, record);
    ledger.logAction("event", `create_event eid=${eid} type=${evtTypeHash}`, {
      ...runtimeTrace,
      eid,
      vids: vidList,
      status: "created",
    });

    const txHash = await maybeCreateEventOnChain(eid, evtTypeHash, payloadHash, vidList, dryRun);
    return res.json({ eid, eventType: evtTypeHash, payloadHash, vids: vidList, txHash, onChain: !!txHash });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/events/:eid/attest", async (req: Request, res: Response) => {
  try {
    const { eid } = req.params;
    const traceContext = extractTraceContext(req.body);
    const actor = req.body.actorWallet ?? signer?.address;
    if (!actor) return res.status(400).json({ error: "actorWallet required" });
    const notaryRole = normalizeRole("NOTARY");
    await requireCredential(actor, notaryRole);
    const txHash = await maybeAttestEventOnChain(eid, req.body.dryRun);
    const runtimeTrace = { ...traceContext, traceId: traceContext.traceId ?? eid };
    ledger.logAction("event", `attest_event eid=${eid} actor=${actor}`, {
      ...runtimeTrace,
      eid,
      status: "attested",
    });
    return res.json(withTraceContext({ eid, actor, txHash, onChain: !!txHash }, runtimeTrace));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/events/:eid/verify", async (req: Request, res: Response) => {
  try {
    const { eid } = req.params;
    const traceContext = extractTraceContext(req.body);
    const actor = req.body.actorWallet ?? signer?.address;
    if (!actor) return res.status(400).json({ error: "actorWallet required" });
    const auditorRole = normalizeRole("AUDITOR");
    await requireCredential(actor, auditorRole);
    const txHash = await maybeVerifyEventOnChain(eid, req.body.dryRun);
    const runtimeTrace = { ...traceContext, traceId: traceContext.traceId ?? eid };
    ledger.logAction("event", `verify_event eid=${eid} actor=${actor}`, {
      ...runtimeTrace,
      eid,
      status: "verified",
    });
    return res.json(withTraceContext({ eid, actor, txHash, onChain: !!txHash }, runtimeTrace));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/events/:eid/reject", async (req: Request, res: Response) => {
  try {
    const { eid } = req.params;
    const { reason, actorWallet, dryRun } = req.body;
    const traceContext = extractTraceContext(req.body);
    if (!reason) return res.status(400).json({ error: "reason required" });
    const actor = actorWallet ?? signer?.address ?? "unknown";
    const reasonHash = ethers.keccak256(ethers.toUtf8Bytes(reason));
    const txHash = await maybeRejectEventOnChain(eid, reasonHash, dryRun);
    const runtimeTrace = { ...traceContext, traceId: traceContext.traceId ?? eid };
    ledger.logAction("event", `reject_event eid=${eid} reasonHash=${reasonHash}`, {
      ...runtimeTrace,
      eid,
      status: "rejected",
    });
    appendJsonl(
      eventLogPath,
      withTraceContext({ eid, action: "reject", reasonHash, actor, timestamp: new Date().toISOString() }, runtimeTrace)
    );
    return res.json(withTraceContext({ eid, reasonHash, actor, txHash, onChain: !!txHash }, runtimeTrace));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get("/events/:eid", async (req: Request, res: Response) => {
  const { eid } = req.params;
  const onChain = await readEventOnChain(eid);
  const readModel = buildEventReadModel({ eid, eventLogPath, onChain });
  res.json(readModel);
});

async function verifyHash(hash: string, includeEventStatus: boolean) {
  let anchor: any = null;
  let onChain = false;
  if (evidenceAnchorView) {
    try {
      anchor = await evidenceAnchorView.getAnchor(hash);
      onChain = Boolean(anchor && anchor.anchoredAt && anchor.anchoredAt > 0);
    } catch {
      onChain = false;
    }
  }

  const batch = loadBatchesContaining(hash);
  let batchOnChain: any = null;
  if (batch && batchRegistryView) {
    try {
      batchOnChain = await batchRegistryView.getBatch(batch.batchId);
    } catch {
      batchOnChain = null;
    }
  }
  let eventStatus: any = null;
  if (includeEventStatus && eventViewContract) {
    try {
      eventStatus = await eventViewContract.statusOf(hash);
    } catch {
      eventStatus = null;
    }
  }
  return {
    hash,
    anchored: Boolean(onChain || batch),
    onChain,
    anchor,
    batch,
    batchOnChain,
    eventStatus,
  };
}

app.get("/verify/eid/:eid", async (req: Request, res: Response) => {
  try {
    const { eid } = req.params;
    const result = await verifyHash(eid, true);
    const onChain = await readEventOnChain(eid);
    const readModel = buildEventReadModel({ eid, eventLogPath, onChain });
    const hasLocalCorrelation = readModel.logs.length > 0 || readModel.timeline.length > 0;
    return res.json({
      ...result,
      relatedEvent: hasLocalCorrelation
        ? {
            eid: readModel.eid,
            traceContext: readModel.traceContext,
            lifecycle: readModel.lifecycle,
          }
        : null,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get("/verify/vid/:vid", async (req: Request, res: Response) => {
  try {
    const { vid } = req.params;
    const result = await verifyHash(vid, false);
    const relatedEventIds = findRelatedEventIdsByVid(vid, eventLogPath);
    const relatedEvents = await Promise.all(
      relatedEventIds.map(async (eid) => {
        const onChain = await readEventOnChain(eid);
        const readModel = buildEventReadModel({ eid, eventLogPath, onChain });
        return {
          eid: readModel.eid,
          traceId: readModel.traceContext.traceId,
          reqId: readModel.traceContext.reqId,
          ctrId: readModel.traceContext.ctrId,
          payloadHash: readModel.lifecycle.payloadHash,
          status: readModel.lifecycle.status,
          lastTimestamp: readModel.lifecycle.lastTimestamp,
        };
      })
    );
    return res.json({ ...result, relatedEvents });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

function canonicalPaymentRef(ref: any) {
  return hashCanonical(ref ?? {});
}

app.post("/ramps/cash-in/request", async (req: Request, res: Response) => {
  try {
    const { wallet, amount, paymentRef, eventType, payload, vids, dryRun } = req.body;
    const traceContext = extractTraceContext(req.body);
    if (!wallet || !amount || !eventType) {
      return res.status(400).json({ error: "wallet, amount, eventType required" });
    }
    const payloadHash = req.body.payloadHash ? req.body.payloadHash : hashCanonical(payload ?? {});
    const paymentRefHash = canonicalPaymentRef(paymentRef);
    const evtType = normalizeEventType(eventType);
    const packet = buildEventPacket({
      eventType,
      actorWallet: wallet,
      payloadHash,
      vids: Array.isArray(vids) ? vids.map((v: any) => computeVID(v)) : [],
      ...traceContext,
    });
    const eid = computeEID(canonicalizeEvent(packet));
    const runtimeTrace = { ...traceContext, traceId: traceContext.traceId ?? eid };
    const packetVids = Array.isArray(packet.vids) ? (packet.vids as string[]) : [];

    appendJsonl(
      rampLogPath,
      withTraceContext(
        { eid, wallet, amount, paymentRefHash, action: "cash_in_request", timestamp: new Date().toISOString() },
        runtimeTrace
      )
    );
    ledger.logAction("ramp", `cash_in_request wallet=${wallet} eid=${eid} amount=${amount}`, {
      ...runtimeTrace,
      eid,
      vids: packetVids,
      status: "requested",
    });

    if (paymentRefRegistry && !dryRun) {
      await paymentRefRegistry.registerRef(paymentRefHash, eid);
    }
    if (eventContract && !dryRun) {
      await maybeCreateEventOnChain(eid, evtType, payloadHash, packetVids, dryRun);
    }
    if (rampVaultContract && !dryRun) {
      await rampVaultContract.requestCashIn(eid, amount, paymentRefHash);
    }
    return res.json(withTraceContext({ eid, paymentRefHash }, runtimeTrace));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/ramps/cash-in/confirm", async (req: Request, res: Response) => {
  try {
    const { eid, confirmation, dryRun } = req.body;
    const traceContext = extractTraceContext(req.body);
    if (!eid || !confirmation) return res.status(400).json({ error: "eid and confirmation required" });
    const confirmationVID = computeVID(confirmation);
    const runtimeTrace = { ...traceContext, traceId: traceContext.traceId ?? eid };
    ledger.logAction("ramp", `cash_in_confirm eid=${eid}`, {
      ...runtimeTrace,
      eid,
      vids: [confirmationVID],
      status: "confirmed",
    });
    if (rampVaultContract && !dryRun) {
      await rampVaultContract.confirmCashIn(eid, confirmationVID);
    }
    appendJsonl(
      rampLogPath,
      withTraceContext({ eid, confirmationVID, action: "cash_in_confirm", timestamp: new Date().toISOString() }, runtimeTrace)
    );
    if (evidenceAnchorContract && !dryRun) {
      await maybeAnchorEvidence(confirmationVID, 1, eid, dryRun, runtimeTrace); // AnchorType.EVIDENCE
    }
    return res.json(withTraceContext({ eid, confirmationVID }, runtimeTrace));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/ramps/cash-out/request", async (req: Request, res: Response) => {
  try {
    const { wallet, amount, payoutRef, eventType, payload, vids, dryRun } = req.body;
    const traceContext = extractTraceContext(req.body);
    if (!wallet || !amount || !eventType) {
      return res.status(400).json({ error: "wallet, amount, eventType required" });
    }
    const payloadHash = req.body.payloadHash ? req.body.payloadHash : hashCanonical(payload ?? {});
    const payoutRefHash = canonicalPaymentRef(payoutRef);
    const evtType = normalizeEventType(eventType);
    const packet = buildEventPacket({
      eventType,
      actorWallet: wallet,
      payloadHash,
      vids: Array.isArray(vids) ? vids.map((v: any) => computeVID(v)) : [],
      ...traceContext,
    });
    const eid = computeEID(canonicalizeEvent(packet));
    const runtimeTrace = { ...traceContext, traceId: traceContext.traceId ?? eid };
    const packetVids = Array.isArray(packet.vids) ? (packet.vids as string[]) : [];

    appendJsonl(
      rampLogPath,
      withTraceContext(
        { eid, wallet, amount, payoutRefHash, action: "cash_out_request", timestamp: new Date().toISOString() },
        runtimeTrace
      )
    );
    ledger.logAction("ramp", `cash_out_request wallet=${wallet} eid=${eid} amount=${amount}`, {
      ...runtimeTrace,
      eid,
      vids: packetVids,
      status: "requested",
    });

    if (paymentRefRegistry && !dryRun) {
      await paymentRefRegistry.registerRef(payoutRefHash, eid);
    }
    if (eventContract && !dryRun) {
      await maybeCreateEventOnChain(eid, evtType, payloadHash, packetVids, dryRun);
    }
    if (rampVaultContract && !dryRun) {
      await rampVaultContract.requestCashOut(eid, amount, payoutRefHash);
    }
    return res.json(withTraceContext({ eid, payoutRefHash }, runtimeTrace));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/ramps/cash-out/confirm", async (req: Request, res: Response) => {
  try {
    const { eid, confirmation, dryRun } = req.body;
    const traceContext = extractTraceContext(req.body);
    if (!eid || !confirmation) return res.status(400).json({ error: "eid and confirmation required" });
    const confirmationVID = computeVID(confirmation);
    const runtimeTrace = { ...traceContext, traceId: traceContext.traceId ?? eid };
    ledger.logAction("ramp", `cash_out_confirm eid=${eid}`, {
      ...runtimeTrace,
      eid,
      vids: [confirmationVID],
      status: "confirmed",
    });
    if (rampVaultContract && !dryRun) {
      await rampVaultContract.confirmCashOut(eid, confirmationVID);
    }
    appendJsonl(
      rampLogPath,
      withTraceContext({ eid, confirmationVID, action: "cash_out_confirm", timestamp: new Date().toISOString() }, runtimeTrace)
    );
    if (evidenceAnchorContract && !dryRun) {
      await maybeAnchorEvidence(confirmationVID, 1, eid, dryRun, runtimeTrace);
    }
    return res.json(withTraceContext({ eid, confirmationVID }, runtimeTrace));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get("/ramps/:eid", async (req: Request, res: Response) => {
  const { eid } = req.params;
  const logs = readJsonl(rampLogPath).filter((e) => e.eid === eid);
  let onChain: any = null;
  if (rampVaultContract) {
    try {
      onChain = await rampVaultContract.getOperation(eid);
    } catch {
      onChain = null;
    }
  }
  return res.json({ eid, logs, onChain });
});

function startServer(port = Number(process.env.PORT || 4000)) {
  const listener = app.listen(port, () => {
    const address = listener.address();
    const resolvedPort = typeof address === "object" && address ? address.port : port;
    process.env.CLOCKCHAIN_OPERATOR_API_URL = `http://127.0.0.1:${resolvedPort}`;
    console.log(`Identity & Roles API listening on port ${resolvedPort} (on-chain=${Boolean(signer)})`);
  });
  return listener;
}

if (require.main === module) {
  startServer();
}

export { app, startServer, operatorAI, uiCopilot };
