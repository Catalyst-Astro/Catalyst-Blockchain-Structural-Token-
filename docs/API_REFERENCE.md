# Catalyst Blockchain — API Reference

**Base URL:** `http://127.0.0.1:8000`

**OpenAPI/Swagger:** `http://127.0.0.1:8000/docs`

---

## System

### `GET /health`

System health check.

**Response:**
```json
{
  "status": "ok",
  "app_env": "dev",
  "modules": 10,
  "policies": 26,
  "events": 0,
  "build": "catalyst-core"
}
```

### `GET /api/status`

Detailed system status with timestamps.

**Response:**
```json
{
  "status": "NORMAL",
  "updated_at": "2026-06-09T17:28:59Z",
  "module_count": 10,
  "policy_count": 26,
  "event_count": 20
}
```

---

## Modules

### `GET /api/modules`

List all loaded modules and their statuses.

**Response:**
```json
[
  {"name": "whitelist", "status": "NORMAL", "detail": "..."},
  {"name": "token_core", "status": "NORMAL", "detail": "..."}
]
```

---

## Policies

### `GET /api/policies`

Get all active compliance and governance policies.

**Response:**
```json
[
  {"id": "kyc_aml_gate", "status": "ON", "detail": "Transfers limited to verified participants."}
]
```

---

## Events

### `GET /api/events`

Recent system events (audit trail, compliance checks, etc.).

**Response:**
```json
[
  {
    "timestamp": "2026-06-09T17:28:59Z",
    "module": "compliance_dao",
    "type": "GOV",
    "severity": "INFO",
    "message": "Governance policy check completed."
  }
]
```

---

## Auth (SIWE)

### `POST /api/auth/challenge`

Get a sign-in challenge for an Ethereum address.

**Request:**
```json
{
  "address": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
}
```

**Response:**
```json
{
  "challenge": "catalyst-studio wants you to sign in...\nNonce: abc123...",
  "expires_at": 1781028824
}
```

### `POST /api/auth/verify`

Verify a signed challenge and get a session token.

**Request:**
```json
{
  "address": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "signature": "0x7c4e62feb2223e...",
  "challenge": "catalyst-studio wants you to sign in..."
}
```

**Response:**
```json
{
  "token": "a1b2c3d4...",
  "role": "admin",
  "address": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "expires_at": 1781032424
}
```

### `GET /api/auth/session`

Check current session status. Send `Authorization: Bearer <token>` header.

**Response:**
```json
{
  "authenticated": true,
  "address": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "role": "admin"
}
```

### `POST /api/auth/logout`

Invalidate session token. Send `Authorization: Bearer <token>` header.

---

## RPC Proxy

### `POST /api/rpc`

Proxy JSON-RPC calls to the local Geth/Hardhat node.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "eth_blockNumber",
  "params": [],
  "id": 1
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": "0x4b7"
}
```

Supported methods: `eth_blockNumber`, `eth_getBalance`, `eth_syncing`, `net_version`, `net_peerCount`, `eth_gasPrice`, `eth_accounts`, and all standard Ethereum JSON-RPC methods.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `APP_ENV` | `dev` | Environment: dev, staging, prod |
| `LOG_LEVEL` | `INFO` | Logging level |
| `DATA_BACKEND` | `memory` | Storage backend: memory, sqlite |
| `EVENTS_LIMIT` | `50` | Max events to return |
| `MODULES` | (all) | Comma-separated module list |
| `GETH_RPC_URL` | `http://127.0.0.1:8545` | Ethereum RPC endpoint |
| `CORS_ORIGINS` | `http://localhost:5173,...` | Allowed CORS origins |
| `ADMIN_ADDRESSES` | hardhat#0 | Comma-separated admin addresses |
| `SESSION_SECRET` | auto-generated | HMAC secret for sessions |

---

## Smart Contracts (Deployed)

| Contract | Address (Hardhat Local) | Purpose |
|---|---|---|
| `RoleAuthority` | `0xc3e5...3690` | Role-based access control |
| `EmergencyMode` | `0x84eA...7fEB` | Circuit breaker |
| `CatalystToken` | `0x9E54...3042` | ERC-20 with inflation |
| `InflationaryRewardToken` | `0xa82f...CFc9` | Staking rewards |
| `FractalToken` | `0x1613...78E8` | Compliant ERC-20 |
| `CatalystIdentitySBT` | `0x8513...891C` | Soulbound identity |
| `IdentityRegistry` | `0xf505...6f36` | Identity management |
| `WhitelistRegistry` | `0x9540...3778` | Address whitelist |
| `ComplianceDAO` | `0x998a...313E` | Compliance governance |
| `FreezeRegistry` | `0x70e0...FC49` | Asset freezing |
| `GovernanceDAO` | `0x4826...8528` | Token governance |
| `FractalDAO` | `0x99bb...4Acf` | DAO with quorum |
| `MultisigCouncil` | `0x0E80...58bF` | Multi-sig wallet |
| `Treasury` | `0x8f86...E4Cf` | Asset custody |
| `SettlementLog` | `0x9d44...1688` | Settlement records |
| `BridgeVault` | `0x5eb3...Fd00` | Cross-chain bridge |
| `OperationsRegistry` | `0x36C0...B570` | Operational state |
| `AuditManager` | `0x809d...AC3D` | Audit trail |
| `EventRegistry` | `0x4c58...3029` | Event attestation |
| `PolicyRegistry` | `0x1291...C274` | Policy management |
| `RiskPolicyRegistry` | `0x5f3f...9154` | Risk scoring |

*Full list at `apps/catalyst-studio/src/contracts.json`*
