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

## Levantamiento de red Alexandria (Render + laboratorios locales)

Si necesitas un levantamiento de red controlado para todo el blockchain
(por ejemplo, para entornos tipo Render y laboratorios locales), la
siguiente definición fija un bloque RFC1918 y subredes separadas:

```yaml
alexandria:
  entity_version: "1.1.0"
  lab_network:
    rfc1918: true
    cidr: "10.42.0.0/16"
    subnets:
      mgmt: "10.42.10.0/24"
      workloads: "10.42.20.0/24"
      observability: "10.42.30.0/24"
      data: "10.42.40.0/24"
    policies:
      bind_default: "127.0.0.1"
      bind_lan_when_needed: "10.42.0.0/16"
      forbid_public_ranges: true
```

### Docker (Windows + WSL2)

En PowerShell con Docker Desktop instalado:

```bash
docker network create --driver bridge --subnet 10.42.0.0/16 alexandria_net
docker run -it --rm --network alexandria_net ubuntu:latest bash
```

### k3d/kind (Kubernetes en Docker)

k3d y kind suelen crear su propia red. Lo recomendable es:

- Aceptar la red de k3d/kind y controlar exposición por puertos
  (NodePort/Ingress).
- O crear/redirigir a una red Docker custom si necesitas determinismo
  de 10.42.0.0/16 y evitar colisiones.
