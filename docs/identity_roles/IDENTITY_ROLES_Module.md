# Módulo de Identidad y Roles (KYC/KYB + Autoridades + Revocación)

## Flujo resumido
```
Off-chain KYC/KYB packet
  -> keccak256(canonical_json) = identityHash (VID)
  -> POST /identity/verify
      - escribe identity_events.jsonl (EID)
      - StoryLedger.log_action(...)
      - IdentityRegistry.verifyIdentity(identityHash)

Rol/credencial (Notario/Auditor/Compliance/Oracle)
  -> keccak256(canonical_json) = credentialHash (VID)
  -> POST /credential/issue
      - escribe credential_events.jsonl (EID)
      - StoryLedger.log_action(...)
      - CredentialRegistry.issueCredential(...)

Transfer / acción gated
  -> ComplianceGate.validate(wallet)
       * isVerified(wallet) == true
       * AMLScoringRegistry.riskOf <= maxAllowedRisk
       * credentialRegistry.isCredentialActive(wallet, requiredRole) cuando se configura
```

## Qué se guarda (sin PII on-chain)
- **IdentityRegistry**: `identityHash`, `status` (UNVERIFIED/VERIFIED/SUSPENDED/REVOKED), `issuer`, `updatedAt`, `reasonHash` (solo suspensión/revocación). No PII, solo hash del JSON canónico off-chain.
- **CredentialRegistry**: `credentialHash`, `role` (`keccak256("NOTARY")` etc.), `validFrom/validTo`, `status` (ACTIVE/EXPIRED/REVOKED), `issuer`, `revocationReason`.
- **ComplianceGate**: aplica políticas sobre identidades + AML + credenciales opcionales. SUSPENDED o REVOKED cuentan como “no verificado”.
- **StoryLedger** (`narrative_memory/narrative_ledger.jsonl`): línea por acción crítica (`verify_identity`, `issue_credential`, `revoke_credential`) con marca de tiempo.
- **JSONL off-chain**: `backend/database/identity_events.jsonl` y `backend/database/credential_events.jsonl` (append-only) con `eid`, `vid`, `txHash` opcional. No se persiste el payload con PII.

## Ejemplos de payloads y hashes
- Canonicalización: ordenar claves alfabéticamente y serializar sin espacios.
- Identidad (off-chain, no se guarda en cadena):
```json
{
  "country": "MX",
  "document": "INE-ABC123",
  "fullName": "Ana Doe",
  "kycProvider": "Fractal"
}
```
`identityHash = keccak256(utf8(canonical_json))`

- Evento canónico para EID (se almacena en JSONL):
```json
{
  "type": "identity.verify",
  "wallet": "0xabc...",
  "identityHash": "0x9b71...",
  "issuer": "0xissuer",
  "vid": "0x9b71...",
  "timestamp": "2026-01-27T00:00:00Z"
}
```
`eid = keccak256(utf8(canonical_event_json))`

- Credencial (ej. notario):
```json
{
  "role": "NOTARY",
  "licenseId": "NOT-4481",
  "jurisdiction": "MX-CMX",
  "issuedBy": "Colegio Notarial CDMX"
}
```
`credentialHash = keccak256(utf8(canonical_json))`

## Roles y autoridad
- `RoleAuthority`: fuente única de roles `DEFAULT_ADMIN`, `COMPLIANCE_ADMIN`, `NOTARY`, `AUDITOR`, `ORACLE_OPERATOR`, `DAO_COUNCIL`.
- Sólo `COMPLIANCE_ADMIN` o `NOTARY` pueden `verifyIdentity`.
- Sólo `COMPLIANCE_ADMIN` puede `updateIdentity` y `revokeIdentity` (razón hash obligatoria).
- `COMPLIANCE_ADMIN` emite/rota credenciales; `COMPLIANCE_ADMIN` o `DAO_COUNCIL` pueden revocar credenciales.
- `ComplianceGate.setPolicy` solo `DAO_COUNCIL`; `setRegistries` solo `COMPLIANCE_ADMIN`.

## API mínima (backend/api/server.ts)
- `POST /identity/verify`  
  Body: `{ wallet, identityPacket, issuer?, dryRun? }`  
  Devuelve: `{ eid, vid, identityHash, txHash?, onChain }`
- `POST /identity/revoke`  
  Body: `{ wallet, reason, dryRun? }`
- `POST /credential/issue`  
  Body: `{ wallet, role: "NOTARY" | bytes32, credentialPacket, validTo, validFrom?, dryRun? }`
- `POST /credential/revoke`  
  Body: `{ wallet, role, reason, dryRun? }`
- `GET /identity/:wallet`, `GET /credential/:wallet?role=NOTARY`

Notas:
- `dryRun=true` evita llamar contratos (solo deja trazabilidad off-chain).
- Roles en texto se convierten a `keccak256(upper(role))` para `bytes32`.

## Pruebas y smoke
- `npx hardhat test` ejecuta `test/identity_roles.spec.ts` y `test/kyc_aml_compliance.spec.ts`.
- `npx hardhat run scripts/demo_identity_flow.ts` muestra flujo: validar falla sin KYC, verifica identidad + credencial, revoca credencial y revoca identidad.

## Decisiones de seguridad
- Hashes en lugar de PII on-chain; JSONL off-chain tampoco guarda PII, sólo hashes y metadatos.
- Razones de suspensión/revocación se hashéan (`reasonHash`) para auditar sin exponer texto libre.
- Expiración de credenciales se deriva de `validFrom/validTo`; expiradas o revocadas no pasan `ComplianceGate`.
