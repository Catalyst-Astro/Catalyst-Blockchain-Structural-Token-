# Catalyst-Blockchain-Structural-Token

Este repositorio contiene ejemplos simples para demostrar conceptos de almacenamiento en libro mayor.

## Narrativa del Libro Mayor

Se ha implementado un sistema de **memoria narrativa** donde cada acción relevante se registra como historia dentro del libro mayor. Para agregar una nueva entrada puede utilizarse el script `story_ledger.py`.

### Uso

```bash
python narrative_memory/story_ledger.py "Actor" "Descripción de la acción"
```

Cada invocación añadirá un registro en `narrative_ledger.jsonl` con la fecha, el actor y la descripción de la acción.

