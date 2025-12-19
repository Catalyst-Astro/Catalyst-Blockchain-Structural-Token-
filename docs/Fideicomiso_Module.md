# FIDEICOMISO_PATRIMONIAL_BASE - Fideicomiso_Module

> Alcance: borrador tecnico-operativo. No constituye asesoria legal.

## Proposito
Definir una capa juridica y operativa para fideicomisos patrimoniales inmobiliarios en Mexico, con evidencia on-chain para trazabilidad, gobierno y distribucion de rendimientos.

## Alcance legal y operativo
- El activo queda bajo titularidad del fiduciario en un fideicomiso patrimonial irrevocable.
- El token representa derechos economicos, no propiedad directa del inmueble.
- La blockchain registra hashes y eventos, sin datos personales ni direcciones exactas.
- El pago de rendimientos se ejecuta off-chain; este modulo solo registra evidencia.

## Flujo end-to-end
1. Aportacion del activo (due diligence + escritura + registro fiduciario).
2. Registro en TrustRegistry (fideicomiso, activo, serie de token).
3. Operacion del activo y cobro de ingresos.
4. Calculo de rendimiento (NOI, reservas, comisiones).
5. Registro de periodo y resultados en DistributionRegistry.
6. Pago off-chain a fideicomisarios (USDC como unidad de cuenta).

## Riesgos y controles
- **Riesgo regulatorio:** estructura de fideicomiso y separacion patrimonial.
- **Riesgo operativo:** reservas, seguros, mantenimiento.
- **Riesgo de datos:** privacidad on-chain, solo hashes y metadatos generales.
- **Riesgo de gobierno:** roles claros, quorums, bitacoras y evidencias.

## Evidencia on-chain (eventos)
- TrustCreated
- TrustStatusChanged
- AssetAdded
- AssetStatusChanged
- DocumentHashUpdated
- TokenSeriesRegistered
- TokenSeriesStatusChanged
- PeriodOpened
- PeriodClosed
- DistributionRecorded

## Diagramas ASCII

Flujo de aportacion al fideicomiso
```
[Due Diligence] -> [Escritura/Aportacion] -> [Fiduciario]
        |                                      |
        v                                      v
  [Hashes Doc] -------------------------> [TrustRegistry]
```

Flujo de ingresos y distribucion
```
[Ingresos] -> [Conciliacion] -> [NOI/Reservas] -> [DistributionRegistry]
                                         |
                                         v
                                  [Pago Off-chain]
```

Relacion fideicomiso <-> tokens <-> DAO
```
[Fideicomiso] --(Derechos economicos)--> [Fractal Token Series]
      |                                          |
      v                                          v
[TrustRegistry] <------------------------> [DAO Council]
```

## Integracion con modulos futuros
- STAR-04 AML/KYC: onboarding de inversionistas y evaluacion de riesgo.
- STAR-10 Whitelist/SBT: habilitacion de wallets elegibles.

## Componentes del modulo
- `contracts/TrustRegistry.sol`
- `contracts/DistributionRegistry.sol`
- `docs/fideicomiso/Modelo_Operativo_Offchain.md`
- `docs/fideicomiso/templates/`

## Notas de privacidad
- No almacenar datos personales en blockchain.
- No publicar direcciones exactas de inmuebles.
- Usar hashes verificables y metadatos generales.
