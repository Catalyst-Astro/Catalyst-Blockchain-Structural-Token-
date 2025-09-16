# FRTAuditTrail

`FRTAuditTrail` es un módulo de trazabilidad diseñado para integrarse con `FractalToken`.
Su objetivo es registrar operaciones relevantes de manera compatible con las plataformas de análisis y con los requisitos regulatorios suizos.

## Evento `AuditTrail`

```solidity
event AuditTrail(
    address indexed from,
    address indexed to,
    uint256 amount,
    OperationType operationType,
    bytes32 indexed purposeHash,
    uint256 timestamp
);
```

- **from/to**: participantes de la operación. Direcciones cero indican mint o burn.
- **amount**: número de tokens transferidos.
- **operationType**: tipo de operación (`TRANSFER`, `MINT`, `BURN`, `REWARD`).
- **purposeHash**: hash SHA‐256 generado off‑chain de una estructura JSON que incluye proyecto, región, finalidad y responsable.
- **timestamp**: momento de la emisión del evento.

Los auditores pueden filtrar eventos por `purposeHash` para reconstruir el propósito de cada movimiento en combinación con la documentación externa.

## Uso con `FractalToken`

`FractalToken` puede enlazar un contrato `FRTAuditTrail` mediante `setAuditTrail`. Una vez configurado, cada transferencia, mint o burn emitirá automáticamente un evento.

También existen funciones extendidas (`transferWithPurpose`, `mintWithPurpose` y `burnWithPurpose`) que permiten adjuntar el `purposeHash` correspondiente.

Este esquema sigue el modelo de trazabilidad sugerido por **Tokeny** y **SIX Digital Exchange**, facilitando el análisis automático desde herramientas como Dune o exploradores regulatorios privados.
