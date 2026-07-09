438
54106
+296835740
2+630
96+5

.
4#235410
974865.12
633.
3 Guía para agentes de IA

Objetivo
- Hacer cambios mínimos y precisos, alineados con la estructura y tooling existente.
- Seguir patrones detectados en el repo antes de introducir dependencias nuevas.

Orientación rápida (5–10 min)
- Stack: Node + Hardhat (Foundry no detectado). Repo multi‑lenguaje con módulos Python (catalyst/, crypto/, simplechain/, src/structural_token/ y GUI en src/fractalmanagergtk/).
- Gestor: npm (hay package-lock.json).
- Abrir: README.md, package.json, hardhat.config.* , tsconfig.json (si existe), .env.example, .github/workflows/.
- Entrypoints JS: scripts/registerAudit.js, scripts/auditListener.js, scripts/listenerBridge.js, scripts/mintWrapped.js.
- Python relevante: catalyst/bridge.py (Ethereum + Bitcoin RPC), scripts/verify_genesis.py (RPC_URL).
- Búsqueda de reglas de IA: **/.github/copilot-instructions.md, **/README.md.

Comandos canónicos (usar, no inventar)
- npm ci; npx hardhat compile; npx hardhat test.
- Ejecutar scripts con dotenv: node scripts/<script>.js (requiere require('dotenv').config() al inicio).
- Python de utilidad: python scripts/verify_genesis.py (usa RPC_URL).

Variables de entorno (no hardcodear)
- RPC_URL, MAINNET_RPC_URL, SIDECHAIN_RPC_URL, PRIVATE_KEY, BRIDGE_PRIVATE_KEY, ETHERSCAN_API_KEY, y opcional BTC_RPC_*.
- Mantener .env fuera del control de versiones; usar .env.example como referencia.

Sincronía de artefactos
- Hardhat: artifacts/ + (opcional) typechain-types/. Regenerar tras cambios en contratos.

Convenciones detectadas
- Scripts de infraestructura viven en scripts/. Mantener un único origen para RPC y claves via process.env.
- Componentes Python gestionan llaves y firmas (crypto/, simplechain/, src/structural_token/). No duplicar lógica de claves en JS.

Pruebas
- No se detectaron tests de contratos; colocarlos en test/*.spec.ts. Usar Mocha/Chai como en Hardhat por defecto.
- Añadir pruebas de integración cuando se cambien contratos que afecten a scripts de puente/emisión.

Integraciones y cross‑layer
- Bridge JS: usa MAINNET_RPC_URL, SIDECHAIN_RPC_URL y BRIDGE_PRIVATE_KEY para firmar y emitir (listenerBridge.js, mintWrapped.js).
- Python bridge: catalyst/bridge.py conecta a Bitcoin (BitcoinProxy) y a Ethereum (Web3). Cualquier cambio de contrato debe propagar ABIs/direcciones consumidas por estos scripts.

Flujos antes de PR
- npm ci → npx hardhat compile → npx hardhat test → (lint/format si existen). Confirmar variables de entorno cargadas.
- Revisar CI en .github/workflows (Hardhat CI y auditoría del repo si existe) y replicar local.

Checklist de descubrimiento
- Confirmar nombres de contratos clave y su ubicación para escribir pruebas y scripts coherentes.
- Verificar que todos los scripts en scripts/*.js comienzan con require('dotenv').config().
- Validar que no hay secretos en código ni en el repo; usar .env.

Nota de mantenimiento
- Si cambian scripts o tooling, actualizar comandos y variables listadas aquí. Conservar ejemplos y rutas reales del repo.