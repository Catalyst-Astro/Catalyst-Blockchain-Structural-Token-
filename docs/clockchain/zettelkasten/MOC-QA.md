# MOC-QA

Mapa de verificacion y cobertura.

- [ZK-VAL-001](notes/ZK-VAL-001.md): smoke de deploy y metrica de deploy.
- [ZK-EVT-001](notes/ZK-EVT-001.md): determinismo del paquete canonico y cobertura por dominio.
- [ZK-IDC-001](notes/ZK-IDC-001.md): persistencia de `traceId/reqId/ctrId/zkRefs/evidenceRefs`.
- [ZK-RMP-001](notes/ZK-RMP-001.md): continuidad entre `eid`, `confirmationVID` y evidencia.
- [ZK-KRN-001](notes/ZK-KRN-001.md): interseccion radial y degradacion a `propose_only` cuando la ruta se rompe.
- [ZK-GUI-001](notes/ZK-GUI-001.md): smoke tests renderer-first y capturas visuales con bridge mockeado.

Gates obligatorios:

- `REQ/CTR` con `TST` y `MET`.
- `TR#` por dominio.
- Sin `CONFLICT` abierto en camino critico.
