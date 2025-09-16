# FractalDashboard

Interfaz de visualización para eventos simbólicos registrados en la cadena. Utiliza **React**, **Tailwind CSS** y conexión Web3 mediante `ethers.js`/`wagmi`.

## Instalación

```bash
npm install
npm run dev
```

## Integración con contratos

1. **FractalToken** y **FractalDispenser** proveen la economía básica. El dashboard no interactúa directamente pero puede mostrar balances utilizando `ethers.js` si se desea.
2. **SymbolicEventLog** emite eventos con la estructura indicada en `lib/contractInterfaces.js`. Ajusta `symbolicEventLogAddress` al desplegado en tu red.
3. Si utilizas contratos adicionales, importa sus ABIs y direcciones en `lib/contractInterfaces.js` y crea hooks similares en `hooks/`.

## Estructura

```
fractal-dashboard/
├── components/
│   ├── BlockNode.js          // Representación visual de cada bloque
│   ├── GlifoRenderer.js      // Carga glifos SVG desde IPFS
│   ├── EventModal.js         // Muestra detalles narrativos
│   └── SidebarFilter.js      // Filtros laterales
├── hooks/
│   └── useSymbolicEvents.js  // Obtiene eventos desde el contrato
├── lib/
│   └── contractInterfaces.js // ABIs y direcciones
├── pages/
│   └── index.js              // Página principal
├── styles/
│   └── tailwind.config.js    // Configuración Tailwind
├── index.css                 // Estilos base
└── index.html                // Entrada para Vite
```

## Modo oscuro y claro

Se usa la clase `dark` en el elemento `<html>` para cambiar entre modos. Puedes alternar dinámicamente agregando o quitando esa clase.

## Glifos en IPFS

`GlifoRenderer` obtiene el SVG asociado a cada evento accediendo a `https://ipfs.io/ipfs/<glifo_hash>`.
Asegúrate de que tus glifos estén disponibles en IPFS para visualizarlos correctamente.

## Animaciones y estética

Los nodos brillan suavemente con `animate-pulseSlow` cuando el evento está activo. Cambia colores y formas en `BlockNode.js` según tus propios principios y arquetipos.
