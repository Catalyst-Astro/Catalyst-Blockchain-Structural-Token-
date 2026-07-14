# Catalyst Chat — 55 STAR Prompts para Implementar TODAS las Funciones de ChatGPT + DeepSeek + Claude + Gemini

## FASE 0: FUNDACIÓN (Prompts #001-#008)

### #001 — Configuración del Proyecto Next.js + TypeScript + Tailwind
**S:** Next.js 16 scaffold con TypeScript, Tailwind, y estructura App Router.
**T:** Inicializar proyecto con dependencias: openai, react-markdown, recharts, lucide-react, zustand.
**A:** `npx create-next-app@latest catalyst-chat --typescript --tailwind --app --src-dir`, instalar dependencias, configurar `next.config.ts`.
**R:** Proyecto listo para desarrollo con hot reload.

### #002 — Sistema de Autenticación (Opcional: Clerk/NextAuth)
**S:** Los usuarios necesitan cuentas para persistir chats en la nube.
**T:** Integrar Clerk o NextAuth con proveedores Google/GitHub/Email.
**A:** Instalar `@clerk/nextjs`, configurar middleware, crear `sign-in` y `sign-up` pages.
**R:** Usuarios pueden registrarse/iniciar sesión. Datos asociados a su cuenta.

### #003 — Base de Datos PostgreSQL + Prisma
**S:** Persistencia de chats, mensajes, proyectos, y archivos.
**T:** Configurar Prisma con PostgreSQL (Vercel Postgres o Supabase).
**A:** Crear schema: `User`, `Project`, `Chat`, `Message`, `File`, `Memory`, `Task`.
**R:** Todas las conversaciones persisten entre sesiones y dispositivos.

### #004 — API de Streaming con DeepSeek V4
**S:** El chat necesita respuestas en tiempo real con streaming SSE.
**T:** Implementar `/api/chat` con streaming y soporte para reasoning_content (DeepSeek Thinking).
**A:** Usar OpenAI SDK apuntando a DeepSeek, `stream: true`, `ReadableStream` con SSE.
**R:** Respuestas visibles token por token, con trazabilidad de pensamiento profundo.

### #005 — Sistema de System Prompts Dinámicos
**S:** Diferentes modos (Catalyst, Pentetraktys, Boo, Zettelkasten) requieren diferentes personalidades.
**T:** Sistema de templates de system prompts con variables: `{mode}`, `{depth}`, `{thinking}`, `{research}`.
**A:** Crear archivo `prompts.ts` con templates, función `buildSystemPrompt(mode, depth, thinking, research)`.
**R:** Cada modo produce respuestas consistentes con su personalidad.

### #006 — Zustand State Management
**S:** La UI necesita estado global para chats, modo, canvas, y streaming.
**T:** Implementar store Zustand con slices: `chatSlice`, `uiSlice`, `canvasSlice`, `userSlice`.
**A:** Crear `store.ts` con `create()` y slices independientes.
**R:** Estado reactivo compartido entre todos los componentes sin prop drilling.

### #007 — Diseño Responsive (Mobile First)
**S:** La app debe funcionar en móvil, tablet, y desktop.
**T:** Implementar breakpoints Tailwind: sidebar colapsable en móvil, canvas full-width en tablet.
**A:** Usar `useMediaQuery` hook, clases `lg:`, `md:`, `sm:` en todos los componentes.
**R:** Experiencia fluida en cualquier dispositivo.

### #008 — Tema Oscuro/Claro + Personalización
**S:** Los usuarios prefieren diferentes temas visuales.
**T:** Implementar temas: dark (Catalyst default), light, high-contrast.
**A:** CSS variables, `next-themes`, toggle en sidebar.
**R:** Cambio instantáneo de tema sin perder estado.

---

## FASE 1: CHAT CORE — Funciones Básicas de ChatGPT (#009-#016)

### #009 — Historial de Chats con Persistencia
**S:** Los usuarios necesitan ver, buscar, y reanudar conversaciones anteriores.
**T:** Lista de chats en sidebar con: búsqueda, agrupación por fecha, rename, delete, archive.
**A:** Componente `ChatList` con `filter()`, `sort()`, `map()`. Íconos de lápiz (rename) y basura (delete).
**R:** Navegación fluida entre chats históricos.

### #010 — Folders / Proyectos para Organizar Chats
**S:** Power users necesitan organizar cientos de chats por tema/proyecto.
**T:** Sistema de carpetas con drag & drop. Cada folder tiene instrucciones y archivos compartidos.
**A:** Componente `FolderTree` con `react-dnd`. Estado en Zustand + Prisma.
**R:** Chats organizados jerárquicamente. Folder con contexto compartido.

### #011 — Búsqueda Full-Text en Chats
**S:** Encontrar conversaciones pasadas por palabra clave.
**T:** Índice de búsqueda en memoria (Fuse.js) + búsqueda server-side (Prisma full-text).
**A:** Instalar `fuse.js`. Componente `SearchBar` con debounce 300ms.
**R:** Resultados instantáneos mientras el usuario escribe.

### #012 — Web Search con Citations
**S:** ChatGPT tiene búsqueda web en tiempo real con citas.
**T:** Integrar API de búsqueda (Serper.dev o Brave Search API) y mostrar resultados con fuentes.
**A:** Botón "Search Web" en input. API route `/api/search`. Mostrar resultados con favicon, título, snippet.
**R:** Respuestas con fuentes verificables y links clickeables.

### #013 — Voice Mode (Speech-to-Text + Text-to-Speech)
**S:** Los usuarios quieren dictar mensajes y escuchar respuestas.
**T:** Implementar Web Speech API: `SpeechRecognition` para input, `SpeechSynthesis` para output.
**A:** Botón micrófono que activa reconocimiento. Botón play que lee la respuesta.
**R:** Conversación manos libres completa.

### #014 — Vision (Upload + Analyze Images)
**S:** ChatGPT entiende imágenes — los usuarios suben screenshots, fotos, diagramas.
**T:** Upload de imágenes con preview. Enviar como mensaje multimodal a DeepSeek (si soporta visión).
**A:** Input file con preview `<img>`. Enviar base64 en el mensaje si el modelo lo soporta.
**R:** "¿Qué dice este documento?" con imagen adjunta.

### #015 — File Upload + Data Analysis
**S:** Subir PDF, Word, Excel, CSV, JSON. ChatGPT los analiza y responde.
**T:** Upload con `react-dropzone`. Parsear en backend: `pdf-parse`, `mammoth` (Word), `xlsx` (Excel).
**A:** Componente `FileDropzone`. API `/api/upload`. Extraer texto y agregar al contexto del chat.
**R:** "Analiza este CSV de ventas y dime las tendencias."

### #016 — Interactive Charts & Tables
**S:** Las respuestas con datos numéricos deben mostrar gráficos interactivos.
**T:** Detectar datos tabulares en respuestas. Renderizar con `recharts`: bar, line, pie, scatter.
**A:** Componente `DataViz` que parsea tablas markdown. Botones para cambiar tipo de gráfico.
**R:** Tablas convertidas en gráficos interactivos con un clic.

---

## FASE 2: PENSAMIENTO PROFUNDO + RAZONAMIENTO (#017-#024)

### #017 — DeepSeek Thinking Mode — Chain of Thought Visible
**S:** DeepSeek V4 expone `reasoning_content` — el proceso de pensamiento del modelo.
**T:** Implementar UI para mostrar/ocultar la cadena de razonamiento.
**A:** Componente `ThinkingTrace` colapsable. Manejar eventos SSE `{type: 'thinking'}` vs `{type: 'text'}`.
**R:** Usuario ve EXACTAMENTE cómo razonó el modelo.

### #018 — 3 Niveles de Esfuerzo de Razonamiento
**S:** DeepSeek V4 ofrece 3 modos: non-think, think high, think max.
**T:** Selector en UI: ⚡ Fast / 🧠 Think / 🔬 Deep Think. Mapear a `reasoning_effort`.
**A:** Dropdown en top bar. Pasar `thinking: {type: 'enabled'}` para high/max.
**R:** Control granular sobre profundidad vs velocidad.

### #019 — Deep Research Mode (Multi-paso autónomo)
**S:** ChatGPT Deep Research: el modelo investiga autónomamente, consulta fuentes, y produce reportes.
**T:** Implementar agente que: 1) formula preguntas, 2) busca en web, 3) sintetiza, 4) itera.
**A:** Botón "Deep Research". El backend hace múltiples llamadas a DeepSeek + búsqueda web. Muestra progreso en vivo.
**R:** Reportes citados de 5-15 minutos de investigación.

### #020 — Reasoning Steps Visualization (Árbol de decisión)
**S:** Claude muestra artefactos de razonamiento. Visualizar el árbol de decisión.
**T:** Componente `ReasoningTree` que muestra nodos: hipótesis → evidencia → conclusión.
**A:** Parsear `<think>` tags en jerarquía. Renderizar con `react-flow` (diagrama de nodos).
**R:** Mapa visual del razonamiento paso a paso.

### #021 — Self-Correction Loop (Hybrys Detection)
**S:** El sistema debe detectar cuándo está sobreconfiado (hybris).
**T:** Implementar Pentetraktys Hybrys: si confidence > 0.8 y validation < 0.4 → auto-reset.
**A:** Analizar respuestas del modelo. Si detecta afirmaciones absolutas sin evidencia → forzar antítesis.
**R:** El sistema se auto-corrige antes de entregar respuestas incorrectas.

### #022 — Multi-Perspective Analysis (6 Thinking Hats)
**S:** Deep Research debe analizar desde múltiples ángulos.
**T:** Implementar modo "6 Hats": datos, emociones, riesgos, beneficios, creatividad, meta.
**A:** Prompt template que pide al modelo analizar desde 6 perspectivas. UI muestra pestañas por "hat".
**R:** Análisis 360° de cualquier tema.

### #023 — Counterfactual Simulation
**S:** ¿Qué pasaría si...? Simular escenarios alternativos.
**T:** Botón "What if?" que pide al modelo explorar realidades alternativas.
**A:** Prompt: "Consider an alternative scenario where [X]. How would the outcome differ?"
**R:** Exploración de múltiples futuros posibles.

### #024 — Source Verification & Fact-Checking
**S:** Gemini Deep Research verifica fuentes. Implementar verificador de claims.
**T:** Cada afirmación en Deep Research debe tener fuente. Botón "Verify" que busca corroboración.
**A:** Extraer claims de la respuesta. Buscar cada claim. Mostrar: ✅ verificado / ⚠️ disputado / ❌ falso.
**R:** Respuestas con indicador de confiabilidad.

---

## FASE 3: CANVAS + ARTIFACTS (#025-#032)

### #025 — Canvas Editor (Collaborative Document)
**S:** ChatGPT Canvas: editor side-by-side donde editas texto/código con IA.
**T:** Componente `Canvas` con textarea sincronizado, botones de quick action, y versionado.
**A:** Ya implementado. Mejorar: syntax highlighting con `prism.js`, auto-save, markdown preview.
**R:** Editor colaborativo IA-humano.

### #026 — Canvas Quick Actions (Polish, Expand, Shorten, etc.)
**S:** ChatGPT Canvas tiene botones: Suggest edits, Adjust length, Change reading level, Add final polish.
**T:** Implementar 10 quick actions como botones en toolbar del Canvas.
**A:** Cada botón envía prompt específico al modelo con el texto seleccionado.
**R:** Edición de texto con un clic. Sin regenerar todo.

### #027 — Canvas Code Actions (Fix Bugs, Add Comments, Port Language)
**S:** ChatGPT Canvas para código: Review, Add logs, Add comments, Fix bugs, Port to language.
**T:** Detectar lenguaje del código. Mostrar quick actions específicas: Python→JS, Add tests, Refactor.
**A:** `detectLang()` function. Botones contextuales según el tipo de código.
**R:** IDE ligero integrado en el chat.

### #028 — Canvas Version History + Diff View
**S:** Canvas tiene historial de versiones. Ver cambios entre versiones.
**T:** Guardar snapshots del contenido cada vez que cambia. Mostrar diff con colores (verde=add, rojo=delete).
**A:** Array `versions[]`. Componente `DiffView` con `diff` library.
**R:** Nunca pierdes trabajo. Siempre puedes volver atrás.

### #029 — Canvas Export (PDF, MD, DOCX, Code)
**S:** El contenido del Canvas debe exportarse en múltiples formatos.
**T:** Botón "Export" con dropdown: PDF, Markdown, Word, TXT, o archivo de código según lenguaje.
**A:** `jsPDF` para PDF, `html-docx-js` para Word. Detección de lenguaje para extensión de archivo.
**R:** Un clic para descargar en el formato que necesites.

### #030 — Claude Artifacts (React Components Renderizados)
**S:** Claude renderiza artifacts — componentes React, SVGs, dashboards — directamente en el chat.
**T:** Detectar bloques de código JSX/HTML en respuestas. Renderizarlos en un sandbox.
**A:** Componente `ArtifactRenderer` con `<iframe sandbox>`. Ejecutar código en entorno aislado.
**R:** La IA no solo escribe código — lo ejecuta y lo muestra.

### #031 — Interactive HTML/CSS/JS Preview
**S:** Similar a CodePen/JSFiddle integrado. Escribir y ver resultado instantáneo.
**T:** Canvas con split view: código (izq) + preview (der). Hot reload al editar.
**A:** `CodePreview` component. `<iframe>` con `srcdoc`. Actualizar en cada cambio.
**R:** Prototipado web instantáneo.

### #032 — Diagram Generation (Mermaid, Flowchart, Sequence)
**S:** Generar diagramas desde descripciones en lenguaje natural.
**T:** Integrar `mermaid.js`. Detectar pedidos de diagrama → generar código Mermaid → renderizar.
**A:** Prompt: "Generate a Mermaid diagram for...". Renderizar con `<Mermaid>` component.
**R:** Diagramas arquitectónicos, flujos, secuencias — generados y visibles.

---

## FASE 4: AGENTES + AUTOMATIZACIÓN (#033-#040)

### #033 — Agent Mode (Operator) — Tareas Multi-paso
**S:** ChatGPT Operator ejecuta tareas en el mundo real: formularios, compras, reservas.
**T:** Implementar agente que: 1) recibe objetivo, 2) planifica pasos, 3) ejecuta en sandbox, 4) reporta.
**A:** Modo "Agent" en UI. El backend ejecuta pasos con Puppeteer/Playwright. Muestra progreso.
**R:** "Reserva un vuelo a NY el 15 de agosto" → el agente lo hace.

### #034 — Scheduled Tasks (Cron + Recurrencia)
**S:** ChatGPT Tasks: programar acciones recurrentes (daily briefing, weekly report).
**T:** Backend con `node-cron`. UI para crear/editar/eliminar tareas programadas.
**A:** API `/api/tasks` CRUD. Componente `TaskScheduler` con selector de frecuencia.
**R:** "Cada lunes a las 8am, envíame un resumen de noticias de crypto."

### #035 — Workspace Agents (24/7 Cloud Sandbox)
**S:** ChatGPT Workspace Agents: agentes que corren 24/7 en sandbox, con archivos, herramientas, memoria.
**T:** Agentes con: estado persistente, herramientas (web, código, archivos), cola de tareas.
**A:** Backend con `bull` queue. Cada agente es un worker que procesa tareas y guarda estado.
**R:** Agentes autónomos que trabajan mientras duermes.

### #036 — Custom GPTs / Agent Builder (No-code)
**S:** Los usuarios crean sus propios agentes especializados sin programar.
**T:** UI de creación: nombre, descripción, system prompt, archivos de conocimiento, herramientas.
**A:** Página `/create-agent`. Formulario → guardar configuración → desplegar como endpoint.
**R:** "Crea un agente que analice contratos legales y detecte cláusulas abusivas."

### #037 — App Connectors (Google Drive, Slack, GitHub, etc.)
**S:** ChatGPT Business tiene 60+ conectores OAuth a apps externas.
**T:** Implementar OAuth flow para Google Drive, Slack, GitHub. Listar archivos/conversaciones/repos.
**A:** `next-auth` providers. Componentes `DriveBrowser`, `SlackThread`, `GitHubRepo`.
**R:** El chat accede a tus datos en otras plataformas.

### #038 — Tool Use / Function Calling
**S:** El modelo puede llamar funciones: `get_weather()`, `search_database()`, `send_email()`.
**T:** Implementar sistema de tools con schema JSON. El modelo decide cuándo llamarlas.
**A:** Definir tools en `tools.ts`. Pasar al API como `functions`. Manejar `tool_calls` en la respuesta.
**R:** "Envía un email a Juan con el resumen de la reunión" → el modelo llama `send_email()`.

### #039 — Memory System (Cross-Chat Persistence)
**S:** ChatGPT recuerda preferencias, proyectos, y contexto entre conversaciones.
**T:** Sistema de memoria: extraer hechos de conversaciones, guardar en vector DB, recuperar por similitud.
**A:** `MemoryManager` con `prisma` + `pinecone` (vector). UI de "What ChatGPT knows about you".
**R:** "Recuerdas que soy vegetariano? Recomiéndame restaurantes."

### #040 — Custom Instructions (User + Project Level)
**S:** Los usuarios definen reglas globales de comportamiento.
**T:** Página de Settings con textareas: "What would you like ChatGPT to know about you?" y "How would you like ChatGPT to respond?"
**A:** Guardar en `User.preferences`. Inyectar al inicio de cada system prompt.
**R:** ChatGPT siempre responde en tu estilo preferido.

---

## FASE 5: COLABORACIÓN + COMPARTIR (#041-#048)

### #041 — Share Chat (Link público)
**S:** Compartir una conversación completa vía link.
**T:** Generar UUID único por chat compartido. Ruta `/share/[id]` que muestra chat en modo lectura.
**A:** Botón "Share" → crear `SharedChat` en DB → copiar link al portapapeles.
**R:** Cualquiera con el link puede ver la conversación.

### #042 — Collaborative Canvas (Multi-user real-time)
**S:** Google Docs-style: múltiples usuarios editando el mismo Canvas simultáneamente.
**T:** WebSocket para sincronización en tiempo real. `yjs` para CRDT.
**A:** Servidor WebSocket. `useYjs` hook. Cursor colors por usuario.
**R:** Edición colaborativa en tiempo real.

### #043 — Comments & Annotations
**S:** Comentar partes específicas de una respuesta o documento.
**T:** Sistema de comentarios: seleccionar texto → "Add comment" → thread de respuestas.
**A:** Componente `CommentThread`. Guardar en DB con referencia al mensaje + posición.
**R:** Discusiones contextuales sobre contenido específico.

### #044 — Export Chat (PDF, MD, JSON, HTML)
**S:** Exportar conversación completa en múltiples formatos.
**T:** Botón "Export" con dropdown de formatos. Generar archivo y descargar.
**A:** Templates para cada formato. `jsPDF` para PDF. Markdown nativo para MD.
**R:** Conversación portable a cualquier plataforma.

### #045 — Chat Templates (Prompt Library)
**S:** Guardar y reusar prompts efectivos.
**T:** Biblioteca de templates: "Summarize meeting notes", "Debug this error", "Write a cover letter".
**A:** Componente `TemplateLibrary`. CRUD de templates. Insertar con un clic.
**R:** No vuelvas a escribir el mismo prompt.

### #046 — Comparisons Mode (Side-by-side)
**S:** Comparar respuestas de diferentes modos o modelos.
**T:** UI con 2-4 paneles mostrando respuestas diferentes al mismo prompt.
**A:** Selector de modos en cada panel. Enviar mismo prompt a todos simultáneamente.
**R:** "¿Cómo responde Catalyst vs Pentetraktys vs Boo a esta pregunta?"

### #047 — Feedback System (👍👎 + Reason)
**S:** Los usuarios califican respuestas y el sistema aprende.
**T:** Botones 👍👎 en cada mensaje. Si 👎, preguntar razón. Guardar en DB.
**A:** Componente `Feedback`. API `/api/feedback`. Dashboard de calidad.
**R:** Mejora continua del sistema basada en feedback real.

### #048 — Analytics Dashboard (Usage, Tokens, Cost)
**S:** Los usuarios quieren ver su uso: mensajes, tokens, costo, tiempo.
**T:** Dashboard con `recharts`: mensajes/día, tokens/mes, costo acumulado, top prompts.
**A:** Página `/analytics`. Queries agregadas de la DB. Gráficos interactivos.
**R:** Transparencia total sobre el uso del sistema.

---

## FASE 6: MULTIMEDIA + CREATIVE (#049-#052)

### #049 — Image Generation (DALL-E / Stable Diffusion)
**S:** Generar imágenes desde descripciones textuales.
**T:** Integrar API de generación (OpenAI DALL-E 3 o Stability AI). Mostrar imagen en el chat.
**A:** Detectar prompts de imagen ("genera una imagen de..."). Llamar API. Mostrar con lightbox.
**R:** "Genera un logo para Catalyst Bank" → imagen generada en segundos.

### #050 — Video/Audio Understanding
**S:** Subir video/audio y hacer preguntas sobre el contenido.
**T:** Upload de archivos multimedia. Transcribir con Whisper API. Analizar transcripción.
**A:** Componente `MediaUpload`. API `/api/transcribe`. Mostrar transcripción + permitir preguntas.
**R:** "¿Qué dijo el CEO en el minuto 3:45 de esta entrevista?"

### #051 — Document OCR + Understanding
**S:** Subir una foto de un documento físico y extraer texto.
**T:** Integrar Tesseract.js para OCR client-side. Enviar texto extraído al modelo.
**A:** Componente `OCRUpload`. Procesar imagen con Tesseract. Agregar texto al input.
**R:** "Lee esta receta médica escrita a mano."

### #052 — Presentation Generator (PPT/Google Slides)
**S:** Generar presentaciones desde un tema o documento.
**T:** El modelo genera estructura de slides. Renderizar con `reveal.js` o exportar a PPTX.
**A:** Prompt: "Genera una presentación de 10 slides sobre...". Componente `SlidePreview`. Exportar.
**R:** Presentación lista en minutos.

---

## FASE 7: DEPLOY + PRODUCCIÓN (#053-#055)

### #053 — Vercel Deploy + Edge Functions
**S:** La app debe correr en producción con escala global.
**T:** Configurar Vercel con Edge Functions para API routes. Conectar dominio personalizado.
**A:** `vercel.json` con config de edge. Variables de entorno en Vercel dashboard.
**R:** App viva en `catalyst-chat.vercel.app` con respuesta global <100ms.

### #054 — Rate Limiting + API Key Management
**S:** Proteger la API contra abuso. Los usuarios gestionan sus propias API keys.
**T:** Rate limiting con `upstash/ratelimit`. Página de API keys en Settings.
**A:** Middleware de rate limit. CRUD de API keys. Documentación de API.
**R:** App protegida. Usuarios avanzados usan la API directamente.

### #055 — Monitoring + Error Tracking + Analytics
**S:** Saber qué pasa en producción: errores, performance, uso.
**T:** Integrar Sentry para errores, Vercel Analytics para tráfico, PostHog para producto.
**A:** `@sentry/nextjs`, `@vercel/analytics`. Dashboard de monitoreo.
**R:** Visibilidad total. Alertas automáticas. Mejora continua.

---

## RESUMEN: 55 Prompts × 7 Fases

| Fase | Prompts | Features |
|---|---|---|
| 0: Fundación | #001-#008 | Next.js, Auth, DB, API, State, UI, Theme |
| 1: Chat Core | #009-#016 | History, Folders, Search, Voice, Vision, Files, Charts |
| 2: Deep Thinking | #017-#024 | Thinking Mode, Deep Research, Reasoning Tree, Self-Correction, Multi-Perspective |
| 3: Canvas + Artifacts | #025-#032 | Canvas, Quick Actions, Code Actions, Version History, Export, Artifacts, Diagrams |
| 4: Agents + Automation | #033-#040 | Agent Mode, Scheduled Tasks, Workspace Agents, Custom GPTs, Connectors, Tools, Memory |
| 5: Collaboration | #041-#048 | Share, Collaborative Canvas, Comments, Export, Templates, Comparisons, Feedback, Analytics |
| 6: Multimedia | #049-#052 | Image Gen, Video/Audio, OCR, Presentations |
| 7: Production | #053-#055 | Deploy, Rate Limiting, Monitoring |

**Total: 55 STAR Prompts — 7 Fases — 50+ Features de ChatGPT + DeepSeek + Claude + Gemini**
