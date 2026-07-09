# Catalyst Design Resources — UI Kits + Templates + Imágenes
## Repositorios Open Source para Diseño de Apps Bancarias

> **Última actualización:** 18 Junio 2026  
> **Uso:** Recursos gratuitos para mejorar la UI de Catalyst Wallet

---

## 🎨 UI Kits Bancarios Gratuitos (GitHub)

| Repo | Descripción | Stack | Stars |
|---|---|---|---|
| [bradtraversy/design-resources-for-developers](https://github.com/bradtraversy/design-resources-for-developers) | Lista curada de recursos de diseño: fotos, templates, CSS, UI libraries, iconos, herramientas | Multi | 55k+ |
| [pixeliro/design-kit](https://github.com/pixeliro/design-kit) | 502-componentes HTML que funcionan con agentes de IA | HTML/CSS | New |
| [shadcn-ui/ui](https://github.com/shadcn-ui/ui) | Componentes React reutilizables — perfectos para dashboards bancarios | React/Tailwind | 70k+ |
| [tailwindlabs/tailwindcss](https://github.com/tailwindlabs/tailwindcss) | Framework CSS utility-first — base de todo diseño moderno | CSS | 80k+ |
| [Flowbite/flowbite](https://github.com/themesberg/flowbite) | Componentes Tailwind open source — incluye dashboards | HTML/Tailwind | 7k+ |

---

## 📱 Templates Mobile Banking

| Recurso | Descripción | Link |
|---|---|---|
| **v0.app/templates** | Templates gratuitos de fintech mobile (Tailwind) | [v0.app/templates](https://v0.app/templates) |
| **FinFlow Template** | Modern Finance Mobile & Web App UI | [v0.app/templates/finflow](https://v0.app/templates/finflow-modern-finance-mobile-web-app-ui-TdbdgFKSnpg) |
| **Pagar E-Wallet** | UI Kit completo para billetera digital | Graphicriver (pago) |
| **FinKit** | FinTech Flutter App UI Bundle | Codecanyon (pago) |

---

## 🖼️ Imágenes Gratuitas para Apps Financieras

| Banco de Imágenes | Tipo | Link |
|---|---|---|
| **Unsplash** | Fotos profesionales gratis | [unsplash.com/s/photos/banking](https://unsplash.com/s/photos/banking) |
| **Pexels** | Fotos y videos gratis | [pexels.com/search/banking](https://pexels.com/search/banking/) |
| **Pixabay** | Ilustraciones y fotos | [pixabay.com/images/search/banking](https://pixabay.com/images/search/banking/) |
| **Freepik** | Vectores e ilustraciones | [freepik.com](https://freepik.com) |
| **SVGRepo** | Íconos SVG gratuitos | [svgrepo.com](https://svgrepo.com) |
| **Heroicons** | Íconos SVG de Tailwind | [heroicons.com](https://heroicons.com) |
| **Lordicon** | Íconos animados | [lordicon.com](https://lordicon.com) |

---

## 🛠️ Herramientas de Diseño para Developers

| Herramienta | Uso | Link |
|---|---|---|
| **Figma** | Diseño UI colaborativo (gratis) | [figma.com](https://figma.com) |
| **Penpot** | Alternativa open source a Figma | [penpot.app](https://penpot.app) |
| **Excalidraw** | Diagramas y wireframes | [excalidraw.com](https://excalidraw.com) |
| **Coolors** | Paletas de colores | [coolors.co](https://coolors.co) |
| **CSS Gradient** | Generador de gradientes | [cssgradient.io](https://cssgradient.io) |
| **UI Faces** | Avatares de prueba | [uifaces.co](https://uifaces.co) |

---

## 📦 Para Descargar Directo al Proyecto

```bash
# 1. Clonar el repo de design resources (referencia)
git clone https://github.com/bradtraversy/design-resources-for-developers.git design-refs/

# 2. Descargar íconos SVG para banking (Heroicons)
# Abrir https://heroicons.com → buscar "bank", "wallet", "credit-card"
# Descargar SVG → guardar en apps/catalyst-wallet/icons/

# 3. Descargar imágenes de fondo para la app
# Abrir https://unsplash.com/s/photos/digital-banking
# Elegir imagen → descargar → guardar en apps/catalyst-wallet/img/

# 4. Paleta de colores Catalyst (ya implementada)
# --gold: #ffd700 (amarillo oro)
# --cyan: #4af0ff (cyan neón)
# --bg: #0a0a1a (fondo oscuro)
# --card: #111122 (superficie)
```

---

## 🔗 Integrados en Nuestra App

| Componente | Origen | Archivo |
|---|---|---|
| Credit Card UI | Diseño propio (inspirado BBVA) | `mobile-app.html` |
| Tab Navigation | Patrón iOS/Android nativo | `mobile-app.html` |
| Transfer System | Basado en pay-wallet + WEBANK | `transfer-system.html` |
| Toast Notifications | Patrón Material Design | `mobile-app.html` |
| NFT/Crypto Cards | Inspirado en GHOcard | `mobile-app.html` |
