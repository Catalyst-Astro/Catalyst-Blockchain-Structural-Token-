# Ejecución Automatizada en FractalDAO

Este documento describe la lógica y controles de seguridad implementados en el contrato `FractalDAO.sol` para auditores legales y cooperativos.

## Propuestas con Script de Ejecución

Cada propuesta puede incluir un `executionScript` compuesto por:

- `target`: contrato destino a invocar.
- `selector`: selector de función (`bytes4`).
- `data`: argumentos codificados.

Los scripts se almacenan junto al recuento de votos y solo se ejecutan una vez que la propuesta cumple quórum y mayoría.

## Finalización y Ejecución

La función `finalizeProposal` verifica:

1. Que la votación haya terminado y la propuesta no se haya ejecutado previamente.
2. Que se alcance el quórum definido y exista mayoría de votos a favor.
3. En caso de tener un `executionScript`, se valida en el `ExecutionRegistry` que la función esté en la lista blanca y se ejecuta mediante `ExecutionController` usando una `low-level call` con un límite de gas fijo.

Se emite un evento `ProposalExecuted` tras la ejecución.

## Controles de Seguridad

- **Ejecución única**: el campo `executed` impide que una propuesta se ejecute más de una vez.
- **Lista blanca de funciones**: `ExecutionRegistry` solo permite llamadas a contratos y funciones previamente autorizadas por el propietario.
- **Protección contra reentradas**: se emplea `ReentrancyGuard` para evitar ataques de reentrada durante la ejecución.
- **Límite de gas**: la llamada de ejecución se realiza con un máximo de 200&nbsp;000 unidades de gas para reducir riesgos.

Opcionalmente el sistema puede integrarse con un multisig de validación operativa para firmar las ejecuciones antes de su envío on‑chain.
