# MOC-ARCH

Mapa de arquitectura para rutas criticas fase 1.

- [ZK-VAL-001](notes/ZK-VAL-001.md): `ProjectRegistry -> ValuationLedger -> Treasury -> SettlementLog`.
- [ZK-EVT-001](notes/ZK-EVT-001.md): `buildEventPacket -> canonicalizeEvent -> computeEID/VID -> EventRegistry`.
- [ZK-IDC-001](notes/ZK-IDC-001.md): `identity/credential/aml endpoints -> JSONL -> StoryLedger`.
- [ZK-RMP-001](notes/ZK-RMP-001.md): `cash-in/out request -> confirm -> EvidenceAnchor -> query`.
- [ZK-KRN-001](notes/ZK-KRN-001.md): `decisionKernel -> controlPlane -> OperatorInbox`.
- [ZK-GUI-001](notes/ZK-GUI-001.md): `Electron preload -> App shell -> UI Lab -> uiCopilot`.
