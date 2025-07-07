# Catalyst Blockchain Structural Token

Este proyecto provee ejemplos de interoperabilidad entre Ethereum, Bitcoin e IPFS.
Utiliza librerías de código abierto para interactuar con estas redes e incluye
funciones básicas para crear puentes mediante wrapped tokens.

```python
from catalyst.bridge import BlockchainBridge, EthereumConfig, BitcoinConfig

bridge = BlockchainBridge(
    EthereumConfig(provider_url="https://mainnet.infura.io/v3/tu-api-key"),
    BitcoinConfig(rpc_url="http://user:pass@localhost:8332"),
)

eth_balance = bridge.get_eth_balance("0x...")
```
