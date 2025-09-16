# FractalManagerGTK

Aplicaci\u00f3n GTK para gesti\u00f3n de tokens Fractal y operaciones DAO.

## Estructura de m\u00f3dulos

```
src/fractalmanagergtk/
    __init__.py
    application.py        # clase principal `FractalManagerApplication`
    views/
        __init__.py
        home.py           # vista de inicio
        tokens.py         # emisi\u00f3n y transferencia
        dao.py            # propuestas y votos
        contracts.py      # ejecuci\u00f3n de funciones de contratos
        events.py         # listado de eventos on-chain
pyproject.toml            # metadatos y dependencias
build_deb.sh              # empaquetado .deb mediante fpm
```

Cada vista se agrega a `Adw.ViewStack` dentro de `FractalManagerApplication`.
Las llamadas a la blockchain est\u00e1n representadas por placeholders para
`FractalToken`, `FractalDAO` y dem\u00e1s contratos.
