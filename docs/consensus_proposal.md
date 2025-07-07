# Propuesta de Protocolo de Consenso

Este documento propone un protocolo de consenso para la cadena de bloques *Catalyst*, orientado a manejar el token estructural de la plataforma. Se analiza una opción basada en **Prueba de Participación Delegada BFT** (dBFT) y se justifica criptográficamente su funcionamiento y riesgos asociados.

## Resumen de la Propuesta

1. **Modelo híbrido PoS-BFT**: se emplea una capa de Prueba de Participación (PoS) para seleccionar a los nodos validadores y un algoritmo de consenso tolerante a fallos bizantinos (BFT) para validar bloques.
2. **Delegación de voto**: los usuarios bloquean (staking) sus tokens y delegan el peso de su voto en nodos validadores.
3. **Rotación periódica**: la lista de validadores se actualiza de manera regular con base en la cantidad de tokens bloqueados y un sorteo verificable.
4. **Finalidad inmediata**: al usar BFT, los bloques finalizados no pueden revertirse sin comprometer al menos un tercio de los validadores, brindando seguridad a transacciones rápidas.

## Implementación Criptográfica

- **Firmas digitales**: todos los mensajes de consenso están firmados con claves públicas empleando EdDSA (Ed25519) para garantizar autenticidad y no repudio.
- **Hashes de bloque**: cada bloque contiene un hash calculado con SHA‑256 que encadena transacciones previas y el resultado del proceso de consenso.
- **Sorteo verificable**: se usa un esquema de *Verifiable Random Function* (VRF) para seleccionar validadores y delegar de forma impredecible y verificable.
- **Canal cifrado entre validadores**: se recomienda TLS o Noise Protocol para evitar que un adversario intercepte o modifique los mensajes de consenso.

## Riesgos y Mitigaciones

1. **Ataque de nodos maliciosos**: si más de un tercio de los validadores actúan en conjunto de forma maliciosa, pueden censurar o invalidar transacciones.
   - *Mitigación*: incentivos económicos (slashing) para quien envíe mensajes maliciosos y recompensas para quien demuestre el comportamiento deshonesto.
2. **Centralización del staking**: pocos poseedores de tokens podrían controlar la mayoría de validadores, reduciendo la descentralización.
   - *Mitigación*: límites al poder de voto por entidad y mecanismos de rotación para asegurar diversidad entre validadores.
3. **Ataques a la red o al canal cifrado**: un atacante puede intentar interceptar mensajes para evitar que el consenso se complete.
   - *Mitigación*: protocolos de cifrado actualizados y medidas de monitoreo para detectar nodos caídos o corrupción de mensajes.
4. **Riesgo de software y errores**: fallos en la implementación pueden llevar a divisiones de la red o pérdida de fondos.
   - *Mitigación*: auditorías de código, pruebas de carga y despliegues graduales.

## Conclusiones

La combinación de PoS con un algoritmo BFT ofrece seguridad criptográfica sólida y permite finalización rápida de transacciones. Los riesgos principales se centran en la concentración de poder y en la manipulación de nodos validadores; por ello, debe fomentarse la descentralización mediante incentivos y políticas de rotación. Con auditorías y medidas de seguridad adecuadas, la propuesta provee un consenso eficaz y robusto para la plataforma Catalyst.
