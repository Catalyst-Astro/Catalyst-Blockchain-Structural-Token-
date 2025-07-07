# Ejemplo de Red P2P

Este proyecto incluye una red de nodos muy sencilla implementada en `network/`.
Cada nodo ejecuta un servicio REST basado en Flask que permite enviar
transacciones, propagar bloques y resolver forks por longitud.

## Ejecución de nodos

Existen tres scripts de ejemplo que levantan nodos locales con nombres
simbólicos:

```bash
python network/examples/nodo_sol.py
python network/examples/nodo_luna.py
python network/examples/nodo_merkabah.py
```

Cada nodo se inicia en un puerto diferente y conoce las direcciones de sus
compañeros. Al agregar una transacción en cualquiera de ellos y minar un bloque,
los nodos se sincronizan automáticamente.

Para forzar la sincronización manual puede utilizarse el endpoint `/resolve`:

```bash
curl http://127.0.0.1:5002/resolve
```

## Consultar la cadena

El estado completo del blockchain de un nodo se obtiene con:

```bash
curl http://127.0.0.1:5001/chain
```
