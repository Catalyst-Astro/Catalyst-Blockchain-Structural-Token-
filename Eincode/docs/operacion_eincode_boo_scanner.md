# EINCODE Operativo: Boo Scanner y Atencion del Sistema

## Objetivo

Convertir el enfoque filosofico de ARKE/EINCODE en una operacion concreta: ante cada consulta, el sistema debe seleccionar automaticamente los modulos mas utiles, ejecutarlos con baja latencia y emitir una recomendacion trazable.

## Distincion operativa principal

- No ejecutar todos los modulos por defecto.
- Ejecutar solo los modulos con mejor puntaje de relevancia para la consulta.

Esta distincion define la funcion de `boo`: atencion selectiva y coordinacion de respuesta.

## Rol de `boo`

`boo` es el coordinador de consciencia limitada del sistema:

1. Escanea capacidades de todos los modulos del proyecto.
2. Puntua relevancia por consulta.
3. Activa un subconjunto optimo (top-k) en paralelo.
4. Consolida resultados en una decision unica.
5. Registra trazabilidad para auditoria.

## Contrato de entrada/salida

### Entrada

```json
{
  "consulta": "texto libre del operador",
  "contexto": {
    "dominio": "gobernanza|tactico|estrategico|general",
    "prioridad": "baja|media|alta",
    "restricciones": ["etica", "tiempo", "recursos"]
  }
}
```

### Salida

```json
{
  "modulos_activados": ["simulador", "prediccion", "gobernanza", "cognicion_fi"],
  "escenarios_generados": 7,
  "decision_final": "accion recomendada",
  "icd": 0.93,
  "vt": 0.88,
  "idt": 0.91,
  "justificacion": "resumen operativo",
  "audit": {
    "timestamp": "iso8601",
    "latencia_ms": 182,
    "fuentes": ["arke_orquestador", "arke_aprendizaje", "arke_decision"]
  }
}
```

## Metrica documental del proyecto

Para que la documentacion y el codigo esten alineados, cada flujo de decision debe declarar:

- `Consulta`: problema recibido.
- `Atencion`: modulos elegidos por `boo`.
- `Escenarios`: opciones simuladas.
- `Colapso`: criterio de seleccion (`IDT`).
- `Accion`: respuesta final ejecutable.
- `Auditoria`: evidencias y latencia.

## Funcionamiento de seleccion de modulos

`boo` mantiene un catalogo de capacidades con etiquetas por modulo.

Ejemplo de mapeo recomendado:

- `cognicion_ti`: analisis logico, riesgo.
- `cognicion_ne`: exploracion de posibilidades.
- `cognicion_fi`: validacion etica.
- `simulador`: bifurcacion de escenarios.
- `prediccion`: anticipacion de resultados.
- `gobernanza`: propuesta de accion ejecutiva.
- `aprendizaje`: memoria historica.
- `ser`: filtro de alineacion.

Regla base:

- Seleccionar modulos con puntaje > umbral.
- Si no se alcanza minimo, usar top-2 por puntaje.
- Limitar a top-4 para controlar latencia.

## Indice de decision tactica (IDT)

Definir:

- `ICD`: coherencia etica.
- `VT`: viabilidad tactica.

Calculo sugerido:

- `IDT = (0.6 * ICD) + (0.4 * VT)`

El escenario ganador es el de mayor `IDT`.

## Criterios de aceptacion de implementacion

Se considera correcta la implementacion cuando:

1. `boo` no ejecuta todos los modulos por defecto.
2. Se registran `modulos_activados`, `latencia_ms` e `IDT`.
3. La salida final incluye accion concreta y justificacion.
4. Existen tests para:
   - seleccion por consulta simple,
   - fallback top-2,
   - empate de escenarios,
   - rechazo por umbral etico.

## Alcance tactico y gobernanza

EINCODE se comporta como digital twin de apoyo al decisor:

- Prevencion: anticipa escenarios antes del evento.
- Estrategia: prioriza acciones con mejor costo-impacto.
- Tactica: recomienda maniobras concretas bajo restricciones.
- Gobernanza: mantiene trazabilidad y filtros eticos.

No reemplaza mando humano; provee apoyo de decision con evidencia y baja latencia.
