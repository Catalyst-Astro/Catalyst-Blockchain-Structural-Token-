# FractalLandRegistry

Este contrato inteligente permite registrar y rastrear activos inmobiliarios o cooperativos con validez legal y notarial. Proporciona transparencia para auditores y la comunidad mediante funciones de consulta públicas.

## Características

- Registro de activos con ID único, hash de certificado y propietario inicial.
- Emisión de eventos con metadatos de ubicación, tipo de activo, fecha y coordenadas.
- Actualización controlada del estado y de la propiedad solo por validadores autorizados.
- Historial de propietarios y línea de tiempo de modificaciones accesible de forma pública.

## Estados del activo

1. `PENDIENTE`
2. `ACTIVO`
3. `TRANSFERIDO`
4. `BLOQUEADO`
5. `FINALIZADO`

## Uso

1. **Despliegue**: El administrador despliega `FractalLandRegistry` y asigna validadores mediante `addValidator`.
2. **Registro**: Un validador llama a `registerAsset`, adjuntando los metadatos en el evento `AssetRegistered`.
3. **Actualización**: Los validadores pueden actualizar el estado con `updateAssetStatus` o transferir la propiedad con `transferAssetOwnership`.
4. **Consulta**: Cualquier cuenta puede usar `getAsset`, `getOwnerHistory` y `getTimeline` para verificar la trazabilidad.

Este diseño permite mantener un historial legal verificable y abierto, apto para cooperativas y procesos notariales.
