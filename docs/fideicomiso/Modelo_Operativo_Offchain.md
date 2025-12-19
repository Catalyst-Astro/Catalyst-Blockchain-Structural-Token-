# Modelo Operativo Off-chain (FIDEICOMISO_PATRIMONIAL_BASE)

> Borrador operativo. No constituye asesoria legal.

## 1) Proceso de onboarding de activos

**Objetivo:** aportar activos inmobiliarios o turisticos al fideicomiso patrimonial con trazabilidad y evidencia.

**Entradas:** expediente legal, escrituras, avaluos, dictamen tecnico, certificaciones, reportes ambientales.

**Pasos:**
1. Pre-due diligence: verificacion de titularidad, gravamenes, uso de suelo, permisos clave.
2. Due diligence legal y tecnica: revision de escrituras, antecedentes registrales, riesgos.
3. Valuacion: avaluo independiente y memoria de calculo.
4. Estructura de aportacion: definicion de vehiculo, aportante, condiciones.
5. Escritura de aportacion al fideicomiso (irrevocable) y registro publico.
6. Registro en TrustRegistry: carga de hashes de escrituras y avalusos.
7. Emision o asociacion de serie token (si aplica).

**Salidas:** activo aportado al fideicomiso, evidencia on-chain, expediente cerrado.

## 2) Proceso de onboarding de inversionistas

**Objetivo:** habilitar inversionistas elegibles sin almacenar datos personales on-chain.

**Handoff a AML/KYC (STAR-04):**
- Recepcion de documentos de identidad, beneficiario final, listas restrictivas.
- Evaluacion de riesgo y aprobacion.
- Emision de credencial off-chain y (en modulo STAR-10) whitelist/SBT.

**Salidas:** inversionista aprobado para adquirir Fractal Token o participar en distribuciones.

## 3) Proceso de cobro de ingresos

**Objetivo:** centralizar ingresos y conciliar flujos del activo.

**Pasos:**
1. Definir cuentas receptoras en el fiduciario (rentas, turismo, servicios).
2. Depositos de operadores o arrendatarios.
3. Conciliacion diaria y cierre mensual.
4. Contabilidad: separacion de ingresos por activo/serie.
5. Bitacora de incidencias y ajustes.

**Salidas:** estados de cuenta y data contable para calculo de rendimiento.

## 4) Proceso de calculo de rendimientos

**Objetivo:** determinar el monto distribuible (USDC) y evidencia de calculo.

**Pasos:**
1. Calcular ingresos brutos del periodo.
2. Restar costos operativos, impuestos, seguros y gastos autorizados.
3. Aplicar politica de reservas (mantenimiento, contingencias).
4. Calcular NOI (Net Operating Income).
5. Aplicar comisiones y honorarios.
6. Determinar monto distribuible por serie.
7. Generar hash de reglas (waterfall) y hash de resultados.
8. Registrar en DistributionRegistry.

**Salidas:** monto distribuible, evidencia on-chain, base para pago off-chain.

## 5) Proceso de reporteo

**Objetivo:** transparencia continua para inversionistas y auditores.

**Cadencias:**
- Estados de cuenta mensuales.
- Reportes trimestrales de operacion y riesgos.
- Auditoria anual externa.

**Contenido minimo:**
- Ingresos, egresos, reservas.
- Ocupacion y rendimiento operativo.
- Cambios de estatus de activos.
- Eventos on-chain relevantes.

## 6) Proceso de contingencia

**Objetivo:** mitigar riesgos por fuerza mayor, siniestros, litigios o incumplimientos.

**Eventos gatillo:**
- Siniestro asegurado o no asegurado.
- Incumplimiento de contratos clave.
- Litigio o medida cautelar.
- Caida prolongada de ingresos.

**Respuesta:**
1. Activar comite tecnico y notificar fiduciario.
2. Usar reservas conforme politica.
3. Registrar evento y evidencia on-chain (hash de dictamen).
4. Ajustar distribuciones (si aplica) y notificar a inversionistas.
5. Plan de remediacion y seguimiento.
