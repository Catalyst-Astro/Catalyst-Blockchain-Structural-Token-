# Tokenización de Activos Registrados

Este documento describe un ejemplo básico de tokenización que sigue lineamientos legales comunes para la emisión de valores respaldados por bienes tangibles.

## Flujo General
1. **Validación del activo**: el contrato `FractalLandRegistry` expone la función `isAssetActive` para comprobar que el ID registrado está vigente. El `Factory` solo permite crear tokens para propietarios reconocidos.
2. **Emisión del token**: `FractalAssetToken` implementa ERC‑20 y verifica en el registro que el activo continúe activo antes de acuñar nuevas unidades. El contrato mantiene el `assetId` y el hash del documento legal que respalda la propiedad.
3. **Mecanismo de fondeo**: `FractalFundingVault` registra proyectos con metas en ether y gestiona las contribuciones. Los validadores con rol especial aprueban la distribución final.
4. **Reclamación de tokens**: cada participante puede invocar `claimToken` para recibir la cantidad proporcional a su aporte una vez validado el fondeo.

## Cumplimiento Normativo
- Se emiten eventos de auditoría `AssetTokenized`, `ContributionReceived` y `TokensClaimed` para mantener trazabilidad.
- Los contratos siguen prácticas recomendadas de [OpenZeppelin](https://openzeppelin.com/contracts) para minimizar riesgos.
- Se recomienda documentar fuera de la cadena las pruebas de propiedad, valoraciones y cualquier permiso requerido por la jurisdicción pertinente.
