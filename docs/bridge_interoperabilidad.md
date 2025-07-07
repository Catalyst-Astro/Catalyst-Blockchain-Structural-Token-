# Sistema de Interoperabilidad para Fractal Token (FRT)

Este documento describe la arquitectura del puente entre cadenas que permite bloquear `FRT` en una red origen y emitir `WrappedFRT` (wFRT) en una red secundaria. Incluye consideraciones para auditoría técnica y legal.

## Componentes On‑Chain

### FractalToken.sol
- Implementa un token ERC‑20 clásico con suministro inicial.
- Diseñado para desplegarse en la red principal.

### BridgeVault.sol
- Contrato que recibe `FRT` y emite el evento `TokensLocked`.
- Emplea `ReentrancyGuard` y `Ownable` para mitigar ataques y restringir permisos.
- `lockTokens(amount, destChain)` transfiere los tokens al contrato y emite un identificador `lockId`.
- `releaseTokens(user, amount, burnTxHash)` permite a la autoridad del puente liberar los `FRT` originales cuando se demuestre la quema del `wFRT`.

### WrappedFRT.sol
- Token ERC‑20 desplegado en la red secundaria.
- Solo el puente autorizado puede ejecutar `mintWrappedFRT`.
- Los usuarios pueden invocar `burnWrappedFRT` para redimir sus `FRT`; el evento generado contiene los metadatos necesarios para la liberación.

### IBridgeable.sol
- Interfaz que define las funciones básicas de bloqueo y liberación, facilitando la auditabilidad del código.

## Flujo Off‑Chain

1. Un usuario llama `lockTokens` en `BridgeVault` y se genera un evento con `lockId`.
2. Un servicio en Node (`listenerBridge.js`) escucha este evento y, al detectarlo, ejecuta `mintWrappedFRT` en la red secundaria.
3. Para redimir, el usuario llama `burnWrappedFRT` en la red secundaria; el servicio verifica el evento y desencadena `releaseTokens` en la red principal.
4. Un script auxiliar (`mintWrapped.js`) permite emitir `wFRT` manualmente desde el backend en caso de procesos de recuperación o ajustes.

## Controles de Seguridad

- **Reentrancy Guard**: Evita llamadas recursivas en las funciones de bloqueo y liberación.
- **onlyOwner/onlyBridge**: Limita la ejecución de funciones sensibles al dueño del contrato o a la autoridad del puente.
- **Registro de burnTxHash**: Previene la reutilización de comprobantes al almacenar hashes procesados.
- **Firmas u oráculos multisig (opcional)**: Puede agregarse una capa de validación off‑chain antes de liberar fondos.

## Aspectos Legales

- Mantener un registro de las transacciones de bloqueo y quema para fines contables y de cumplimiento.
- Documentar el origen de los fondos y las direcciones involucradas, siguiendo políticas de KYC/AML si son necesarias.
- Conservar los códigos fuente y los binarios compilados como evidencia para auditorías futuras.

Este esquema permite una interoperabilidad sencilla entre cadenas mientras se consideran medidas de seguridad y trazabilidad para eventuales revisiones legales.
