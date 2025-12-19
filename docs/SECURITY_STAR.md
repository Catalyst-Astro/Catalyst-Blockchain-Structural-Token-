# Security STAR Master Prompt and Repo Execution

## Prompt Maestro (STAR)

SITUATION
You are the security architect for a fractional tokenization stack on EVM (Solidity + Hardhat + React). The system includes ERC20-like token(s), governance/DAO modules, registries, bridges, and operational tooling. Threats include key compromise, social engineering, governance abuse, misconfiguration, and regulatory non-compliance. The goal is practical, testable security with clear operational controls.

TASK
1) Define the threat model and critical assets.
2) Propose technical and operational controls that reduce real-world risk.
3) Separate on-chain enforcement from off-chain compliance workflows.
4) Produce a prioritized implementation plan, with metrics and evidence.

ACTIONS
- Threat model: list adversaries, capabilities, and attack paths (keys, governance, deployment, frontend, supply chain).
- Key security: multisig for critical actions, hardware wallets/HSM, role separation, rotation policies.
- On-chain controls: whitelist/registry gating, pause/guardian, timelocks, rate limits, role-based access control.
- Off-chain controls: KYC/AML, audit logs, incident response, dual control approvals.
- Monitoring: event alerts, anomaly detection, runbooks, recovery steps.
- Testing/audits: automated tests, invariants, static analysis, external audits.

RESULTS
Deliver:
- Risk matrix with severity and mapped controls.
- Module checklist (token, registry, escrow, governance, bridge, frontend).
- Phased plan (MVP, pre-prod, production).
- Metrics (coverage, mean time to detect/respond, key custody compliance).
- Concrete changes in the current repo.

---

## Ejecucion en este repositorio (snapshot)

### Activos criticos
- Privadas de deploy/admin y llaves operativas (multisig/hardware).
- Roles con privilegios en contratos (owner/roles/guardians).
- Supply inicial y capacidad de mint/burn.
- Parametros de gobernanza (quorum, voting period).
- Integraciones de bridge/registry y tooling de scripts.

### Superficies de ataque
- Contratos en `contracts/` (token, DAO, bridges, registries).
- Scripts de deploy/operacion en `scripts/`.
- Frontends (FractalApp, dashboard) y configuraciones de RPC.
- Supply chain (dependencias npm, Hardhat plugins).

### Controles on-chain existentes (confirmados por codigo)
- `contracts/FractalToken.sol`: Ownable, Pausable, mint/burn, ERC20Permit.
- `contracts/FractalDAO.sol`: Ownable, ReentrancyGuard, voting basado en balance.

### Contratos clave a revisar e integrar (presentes en repo)
- `contracts/GuardianModule.sol`
- `contracts/MultisigCouncil.sol`
- `contracts/TrustRegistry.sol`
- `contracts/DistributionRegistry.sol`
- `contracts/BridgeVault.sol`
- `contracts/SidechainBridge.sol`
- `contracts/FRTAuditTrail.sol`

### Riesgos principales y acciones recomendadas

P0 (bloqueantes o alto impacto)
1) Custodia de llaves y privilegios
   - Usar multisig para owner/guardian y timelock para cambios criticos.
   - Prohibir llaves unicas en produccion.
2) Gobierno y cambios criticos
   - Definir flujo de aprobaciones (quorum, delays, veto/guardian).
   - Documentar y auditar procesos de upgrades o cambios de parametros.
3) Cumplimiento AML/KYC
   - KYC/AML fuera de cadena + registry on-chain para enforcement.
   - No almacenar PII en cadena; solo hashes y referencias auditables.

P1 (alto valor, no bloqueante)
1) Monitorizacion y respuesta
   - Alertas por eventos criticos (mint, pause, role changes).
   - Runbook para incidentes y plan de recuperacion.
2) Pruebas y auditorias
   - Tests de invariantes (supply, roles, pausas).
   - Analisis estatico y auditoria externa antes de mainnet.

P2 (mejora continua)
1) Documentacion operacional
   - Politicas de firma, rotacion de llaves y control de cambios.
2) Evaluacion periodica de riesgos
   - Revisiones trimestrales y simulaciones de ataque.

### Checklist tecnico por modulo
- Token
  - Mint/burn solo por rol.
  - Pausa de emergencia verificada.
  - Eventos para acciones criticas.
- DAO/Gobernanza
  - Quorum y tiempos documentados.
  - Proteccion contra reentrancy en ejecuciones.
  - Registro de decisiones y resultados.
- Registries/Whitelist
  - Integrar enforcement en el flujo de transferencia.
  - Validaciones off-chain con logs auditables.
- Bridges/Escrow
  - Roles separados para operadores y validadores.
  - Limites por transaccion y pausas.
- Frontend/Backend
  - Validacion de red/chainId.
  - Alertas por direcciones no confiables.

### Metricas sugeridas
- % de acciones criticas bajo multisig y timelock.
- Cobertura de tests para contratos criticos.
- MTTR (mean time to recover) en incidentes.
- Tiempo de deteccion de actividad anomala.

### Evidencia esperada
- Scripts y configs de despliegue reproducibles.
- Reporte de pruebas y auditorias.
- Politicas de seguridad documentadas (roles, llaves, procesos).
