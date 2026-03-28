# Clockchain Zettelkasten

Esta carpeta es la capa humana de navegacion del modelo `Clockchain NT-SZ`.

## Convencion

- `MOC-*.md`: mapas de contenido por perspectiva.
- `notes/ZK-<DOM>-<NNN>.md`: notas nucleo por dominio critico.
- Cada nota usa frontmatter con:
  - `id`
  - `domain`
  - `kind`
  - `layer`
  - `nt_refs`
  - `artifact_refs`
  - `test_refs`
  - `metric_refs`
  - `evidence_refs`
  - `conflicts`

## Dominios activos de fase 1

- `VAL`: value engine y deploy.
- `EVT`: events, canonical packet, EID/VID.
- `IDC`: identidad, credenciales, AML y compliance.
- `RMP`: ramps, settlement y evidencia de confirmacion.
- `KRN`: nucleo cognitivo transversal del operador IA.
- `GUI`: shell Electron/React, smoke tests y copiloto UI.

## Regla operativa

Toda ruta critica debe poder recorrerse desde:

`nota ZK -> nodos NTX -> artefactos -> tests -> metricas -> evidencia`

El grafo NTX es la fuente de enforcement. Las notas ZK son la fuente de navegacion, sintesis y auditoria humana.
