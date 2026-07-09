# MOC-RISK

Mapa de riesgos del rollout.

- Fragmentacion entre capas humanas y maquina si las notas ZK divergen del NTX.
- Metadata de traza mal normalizada que cambie `EID` legacy cuando no debe.
- Cobertura documental sin evidencia runtime real.
- Causalidad parcial en `IDC` y `RMP` si el backend no persiste refs en JSONL y ledger.
- Decisiones de live execution sin degradacion taxonomica cuando la continuidad radial esta rota.
- Drift entre el contrato de la GUI y el bridge Electron si preload, main y renderer divergen.

Notas clave:

- [ZK-EVT-001](notes/ZK-EVT-001.md)
- [ZK-IDC-001](notes/ZK-IDC-001.md)
- [ZK-RMP-001](notes/ZK-RMP-001.md)
- [ZK-KRN-001](notes/ZK-KRN-001.md)
- [ZK-GUI-001](notes/ZK-GUI-001.md)
