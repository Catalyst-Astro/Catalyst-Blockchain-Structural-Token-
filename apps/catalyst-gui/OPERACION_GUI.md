# Operacion GUI Catalyst

## 1. Arranque correcto

Ejecuta la GUI en modo Electron (no solo Vite):

```bash
npm run gui:dev
```

Si ejecutas solo `dev:renderer`, los botones que usan el bridge de Electron no tendran backend IPC.

## 2. Variables de entorno

Configura variables en el `.env` de la raiz del repositorio (la GUI las toma desde ahi).
`apps/catalyst-gui/.env.example` queda como referencia.

Minimo requerido para botones Web3:

- `VITE_WC_PROJECT_ID`
- `VITE_SEPOLIA_RPC_URL`
- `SEPOLIA_RPC_URL`
- `VITE_WC_PROJECT_ID` debe ser un valor real de WalletConnect Cloud (no `TU_PROJECT_ID`).

Opcional para metrica de valuacion real:

- `VITE_RPC_URL`
- `VITE_VALUATION_LEDGER`

## 3. Mapa de botones

- Header
  - `Toggle theme`: cambia light/dark.
  - `Refresh`: refresca estado de vista.
- Sidebar
  - `Dashboard`, `Projects`, `Settings`: navegan entre modulos.
- Dashboard
  - `Create operation`: agrega un registro nuevo al ledger local de operaciones.
  - `Refresh` (Sepolia card): consulta `chainId` y `latest block`.
- Projects
  - `Link a project`: crea operacion y la inserta en el ledger.
- Settings
  - `Enable email`: guarda el estado en almacenamiento local de Electron.
  - `Set/Disable Slack webhook`: pide URL, valida y guarda estado en almacenamiento local de Electron.
- Wallet
  - `Connect`: abre WalletConnect (requiere `VITE_WC_PROJECT_ID`).
  - `Switch to Sepolia`: cambia red a Sepolia.
  - `Send`: envia ETH de prueba.
  - `Sign test message`: firma mensaje.
  - `Check balance`: consulta balance ERC20.

## 4. Verificacion rapida

1. Inicia `npm run gui:dev`.
2. Verifica que `Sepolia connection` muestre network y bloque.
3. Ve a `Projects` y pulsa `Link a project`.
4. Regresa a `Dashboard` y confirma nueva fila en `Operations ledger`.
5. Cierra y abre la app; verifica que operaciones y settings siguen persistidos.
