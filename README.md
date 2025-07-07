# Catalyst Blockchain Structural Token

Este repositorio contiene un ejemplo sencillo de una arquitectura de nodos para una
red blockchain. Se incluyen nodos completos, nodos ligeros (SPV), funciones de
minado/validación y una topología P2P basada en sockets.

## Estructura

- `blockchain/p2p.py` implementa un nodo P2P genérico.
- `blockchain/block.py` define la estructura de un bloque con un algoritmo de
  *proof of work* muy básico.
- `blockchain/full_node.py` implementa nodos completos que almacenan toda la
  cadena y pueden minar/validar nuevos bloques.
- `blockchain/spv_node.py` implementa nodos ligeros que solo mantienen los
  encabezados de los bloques (SPV).

## Uso rápido

1. Inicie un nodo completo en un terminal:

   ```bash
   python3 -m blockchain.full_node 127.0.0.1 5000
   ```

2. En otro terminal inicie un nodo SPV conectado al nodo completo:

   ```bash
   python3 -m blockchain.spv_node 127.0.0.1 5001 127.0.0.1:5000
   ```

Los nodos se comunican a través de sockets TCP. El nodo completo puede minar
bloques con `mine_block('dato')` desde un intérprete de Python o ampliando el
código para automatizar la minería.
