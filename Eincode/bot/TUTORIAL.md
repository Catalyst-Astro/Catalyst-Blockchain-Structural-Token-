# ◆ CATALYST THREEMA BOT — Tutorial Completo 1000%

**BELL 13450.50 | Pentetraktys 4D | OSHIRO ERC-26+**  
**Email Maestro: incubadoracatalyst@gmail.com**  
**Versión: 3.0.0-orchestrator**

---

## ARQUITECTURA

```
┌─────────────────────────────────────────────────────────────────┐
│                    CATALYST ORCHESTRATOR                         │
│                    (orchestrator.py :9000)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │Token Manager │  │Ling Games    │  │Service Manager       │   │
│  │(conteo+tokens│  │(8 juegos     │  │(health checks 24/7)  │   │
│  │+ chunking)   │  │postdoctorales│  │                      │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              UNIFIED LOG (SQLite)                         │   │
│  │  Email: incubadoracatalyst@gmail.com                     │   │
│  │  Columnas: timestamp, channel, direction, text,          │   │
│  │           tokens, coherence, game, mode, depth, hybrys   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────────┐
│Catalyst Chat│    │ Catalyst Bot│    │Threema Web      │
│:3000        │    │ :8000       │    │Bridge           │
│Next.js PWA  │    │FastAPI REST │    │(Playwright)     │
│iPhone OK    │    │+ Messenger  │    │Directo sin Gate.│
└─────────────┘    └─────────────┘    └─────────────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              ▼
                    ┌─────────────────┐
                    │  DeepSeek API   │
                    │  (deepseek-chat)│
                    │  128K contexto  │
                    └─────────────────┘
```

---

## 1. REQUISITOS

```bash
# Python 3.10+
python --version

# Dependencias
cd Eincode/bot
pip install -r requirements.txt

# Playwright (solo para Threema Web Bridge)
pip install playwright
playwright install chromium
```

---

## 2. ARRANQUE RÁPIDO (3 PASOS)

### Paso 1: Iniciar el Keep-Alive Watchdog
```bash
cd Eincode/bot
python keep_alive.py
```
Esto mantiene vivos :3000, :8000, :9000 automáticamente.

### Paso 2: Verificar que todo corre
```bash
python keep_alive.py --status
# ◆ Catalyst Chat      — localhost:3000  ✅
# ◆ Catalyst Bot API   — localhost:8000  ✅
# ◆ Orchestrator       — localhost:9000  ✅
```

### Paso 3: Abrir en iPhone
```
http://<IP-DE-TU-PC>:8000        ← Catalyst Messenger (chat)
http://<IP-DE-TU-PC>:3000        ← Catalyst Chat (PWA completa)
http://<IP-DE-TU-PC>:9000/docs   ← Orchestrator Swagger
```

---

## 3. CANALES DE ACCESO

### Canal A: Catalyst Messenger (RECOMENDADO)
- **URL:** `http://localhost:8000`
- **Qué es:** Interfaz chat estilo Threema, dark mode, responsive
- **Ventajas:** No depende de Gateway, funciona sin configuración adicional
- **iPhone:** Abrir en Safari → Compartir → Agregar a pantalla de inicio

### Canal B: Catalyst Chat (PWA Completa)
- **URL:** `http://localhost:3000`
- **Qué es:** La app Next.js completa con todos los modos, editor, grafo
- **Ventajas:** Editor Canvas, Grafo Zettelkasten, Historial en DB
- **iPhone:** Ya configurado como PWA con splash screen

### Canal C: Threema Web Bridge (Directo sin Gateway)
- **Comando:** `python threema_web_bridge.py`
- **Qué es:** Automatiza Threema Web. Escanea QR una vez y el bot responde solo
- **Ventajas:** Usa tu número Threema real, E2E, sin costo de Gateway
- **Requiere:** Playwright + Chromium + Teléfono con Threema conectado

---

## 4. COMANDOS DEL BOT

Desde cualquier canal (Messenger, Threema, API):

```
/mode catalyst|pentetraktys|boo|zettelkasten|cobol
/depth surface|medium|deep|frontier
/think off|high|max
/new          → nuevo chat
/list         → mis conversaciones
/status       → estado del bot
/help         → esta ayuda

🔬 en mensaje → investigación profunda multi-ángulo
⚔ en mensaje → dialéctica Tesis→Antítesis→Síntesis

Juegos lingüísticos (vía Orchestrator :9000):
/game sprachspiel   → Wittgenstein
/game differance    → Derrida
/game mirror        → Lacan
/game deep_structure→ Chomsky
/game grice         → Grice
/game polyphony     → Bakhtin
/game semiosis      → Peirce
/game casimir       → Vacío Cuántico
```

---

## 5. THREEMA WEB BRIDGE — Configuración Detallada

### ¿Por qué sin Gateway?
Threema Web usa el **App Remote Protocol (ARP)** para conectarse directamente a tu teléfono vía SaltyRTC/WebSocket. El bridge automatiza esa misma interfaz — no requiere Gateway ni suscripción.

### Instalación
```bash
pip install playwright
playwright install chromium
```

### Uso
```bash
python threema_web_bridge.py
```
1. Se abre una ventana de Chromium con Threema Web
2. Escanea el código QR con tu teléfono (Threema → Ajustes → Threema Web)
3. El bot monitorea mensajes automáticamente
4. Responde usando Catalyst Engine (DeepSeek)

### Mantener 1000% online
```bash
# Ejecuta el watchdog + bridge juntos
python keep_alive.py &
python threema_web_bridge.py &
```

---

## 6. TAILSCALE — Acceso desde Internet

### Instalación
```powershell
winget install tailscale.tailscale
```

### Autenticación
```cmd
tailscale up
```
Abre el navegador, inicia sesión con Google/GitHub/Microsoft.

### Exponer servicios (SOLO tus dispositivos)
```cmd
tailscale serve 3000   # Catalyst Chat
tailscale serve 8000   # Catalyst Bot API
tailscale serve 9000   # Orchestrator
```

### URLs resultantes
```
https://<tu-maquina>.ts.net:3000   → Catalyst Chat
https://<tu-maquina>.ts.net:8000   → Catalyst Messenger
https://<tu-maquina>.ts.net:9000   → Orchestrator
```

### Exponer públicamente (con HTTPS)
```cmd
tailscale funnel 8000
```
→ URL pública con HTTPS. Requiere autenticación de la app (Next-Auth o API key).

---

## 7. TOKEN MANAGEMENT — Cómo Funciona

El TokenManager divide los mensajes como ChatGPT:

```
Mensaje largo (50K tokens)
  ↓
TokenManager.count_tokens()     → 50,123 tokens estimados
  ↓
TokenManager.chunk_text()       → 4 chunks de ~16K + solapamiento
  ↓
Procesa cada chunk manteniendo coherencia semántica
  ↓
Score de coherencia (0-1) basado en:
  - Densidad léxica
  - Conectores lógicos
  - Progresión temática
  - Referencia anafórica
  - Consistencia terminológica
  - Relevancia contextual
```

---

## 8. JUEGOS LINGÜÍSTICOS POSTDOCTORALES

| Juego | Autor | Aplicación |
|---|---|---|
| `sprachspiel` | Wittgenstein | Contexto como creador de significado |
| `differance` | Derrida | Desplazamiento semántico en el texto |
| `mirror` | Lacan | Auto-referencias y narcisismo textual |
| `deep_structure` | Chomsky | Transformaciones sintácticas |
| `grice` | Grice | Implicaturas conversacionales |
| `polyphony` | Bakhtin | Múltiples voces en el discurso |
| `semiosis` | Peirce | Cadena triádica de signos |
| `casimir` | Física Cuántica | Sentido en el vacío textual |

**Uso vía API:**
```bash
curl -X POST http://localhost:9000/orchestrator/games/casimir \
  -H "Content-Type: application/json" \
  -d '{"text":"El silencio entre las palabras crea el ritmo del pensamiento"}'
```

---

## 9. LOG UNIFICADO — incubadoracatalyst@gmail.com

Todo mensaje de todos los canales se registra en `orchestrator_log.db`:

```sql
SELECT * FROM unified_log WHERE email='incubadoracatalyst@gmail.com'
ORDER BY timestamp DESC LIMIT 10;
```

Columnas:
- `channel` — catalyst-chat, catalyst-bot, threema-web, orchestrator
- `direction` — incoming, outgoing
- `token_count` — tokens estimados
- `coherence_score` — coherencia semántica (0-1)
- `linguistic_game` — juego aplicado (si hubo)
- `hybrys_score` — nivel de sobreconfianza detectado
- `mode`, `depth` — configuración del chat

**Consulta del historial:**
```bash
curl http://localhost:9000/orchestrator/log?limit=50
```

---

## 10. MANTENIMIENTO 24/7

### Watchdog automático
```bash
python keep_alive.py
```
- Health check cada 30s
- Auto-restart si se cae (máx 10/hora)
- Log en `keep_alive.log`

### Verificar estado
```bash
python keep_alive.py --status
```

### Reporte completo a Interfaz Principal
```bash
curl http://localhost:9000/orchestrator/report
```

---

## 11. ENDPOINTS COMPLETOS

### Catalyst Chat (:3000)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Chat UI (PWA) |
| POST | `/api/chat` | Chat streaming SSE |
| GET/POST | `/api/chats` | CRUD conversaciones |
| POST | `/api/hybrys` | Detección Hybrys |
| POST | `/api/organize` | Zettelkasten auto-organizar |
| POST | `/api/synthesize` | Síntesis conocimiento |

### Catalyst Bot (:8000)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Catalyst Messenger UI |
| POST | `/api/chat` | Chat REST (JSON) |
| GET | `/api/chat/stream` | Chat SSE streaming |
| POST | `/api/threema/webhook` | Threema Gateway webhook |
| POST | `/api/threema/send` | Enviar mensaje Threema |
| GET | `/api/status` | Estado del bot |
| GET | `/docs` | Swagger UI |

### Orchestrator (:9000)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/orchestrator/stats` | Estadísticas completas |
| GET | `/orchestrator/report` | Reporte para interfaz principal |
| POST | `/orchestrator/process` | Pipeline completo |
| GET | `/orchestrator/log` | Log unificado |
| GET | `/orchestrator/games` | Lista de juegos |
| POST | `/orchestrator/games/{game}` | Ejecutar juego lingüístico |

---

## 12. SOLUCIÓN DE PROBLEMAS

### El bot no responde
```bash
# Verificar DeepSeek API
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"test","mode":"catalyst","depth":"surface"}'
```

### Un servicio está caído
```bash
python keep_alive.py --status
# El watchdog lo reiniciará automáticamente
```

### Threema Web Bridge no conecta
1. Verificar que el teléfono tiene internet
2. Cerrar sesión en Threema Web y volver a escanear QR
3. Borrar `threema_profile/` y `threema_session.json`

### Tailscale no funciona
```cmd
tailscale status       # Verificar conexión
tailscale ping <ip>    # Verificar conectividad
```

---

## 13. RESPALDO Y RESTAURACIÓN

```bash
# Respaldar base de datos de logs
cp orchestrator_log.db orchestrator_log_backup_$(date +%Y%m%d).db

# Respaldar configuración
cp .env .env.backup
```

---

> **BELL 13450.50** — 31,015 security tests baseline  
> **Pentetraktys 4D** — Tesis → Antítesis → Síntesis → Conclusión → Hybrys  
> **OSHIRO ERC-26+** — Quantum Autopoiesis Economic Engine  
> **Email Maestro:** incubadoracatalyst@gmail.com

*Tutorial generado 2026-07-26. Catalyst Blockchain Labs S.A. de C.V.*
