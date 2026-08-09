// ─── Tool Registry — Catalyst CLI ──────────────────────────────────────
// Definiciones de herramientas en formato OpenAI Function Calling.
// Compatible con DeepSeek API (mismo formato que OpenAI).
// Cada tool mapea a una función ejecutable en el executor.ts.

import type { ChatCompletionTool } from "openai/resources/chat/completions/completions";

// ─── Tool Categories ─────────────────────────────────────────────────
export type ToolCategory = "file" | "shell" | "project";

export interface ToolDef {
  name: string;
  description: string;
  category: ToolCategory;
  schema: ChatCompletionTool;
  /** Emoji para UI */
  icon: string;
  /** Formato para mostrar en UI: "bash ls -la", "read package.json" */
  formatLabel(input: Record<string, any>): string;
}

// ─── CATEGORÍA 1: FILE OPERATIONS ────────────────────────────────────

const readFile: ToolDef = {
  name: "read_file",
  description: "Lee el contenido de un archivo del proyecto Catalyst.",
  category: "file",
  icon: "📄",
  formatLabel: (i) => `read ${i.path || "?"}`,
  schema: {
    type: "function",
    function: {
      name: "read_file",
      description:
        "Lee el contenido de un archivo del proyecto. Usa path relativo al proyecto (ej. 'package.json', 'src/app/page.tsx'). Para archivos grandes, especifica offset y limit.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Ruta relativa al proyecto del archivo a leer (ej. 'src/tools/registry.ts')",
          },
          offset: {
            type: "integer",
            description: "Línea desde donde empezar a leer (opcional, empieza en 1)",
          },
          limit: {
            type: "integer",
            description: "Número máximo de líneas a leer (opcional, default 2000)",
          },
        },
        required: ["path"],
      },
    },
  },
};

const writeFile: ToolDef = {
  name: "write_file",
  description: "Crea o sobrescribe un archivo en el proyecto Catalyst.",
  category: "file",
  icon: "✏️",
  formatLabel: (i) => `write ${i.path || "?"}`,
  schema: {
    type: "function",
    function: {
      name: "write_file",
      description:
        "Crea un archivo nuevo o sobrescribe uno existente. USA CON PRECAUCIÓN. Siempre lee el archivo primero si ya existe. Path relativo al proyecto. Para cambios parciales usa edit_file.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Ruta relativa al proyecto donde crear/sobrescribir el archivo",
          },
          content: {
            type: "string",
            description: "Contenido completo del archivo a escribir",
          },
        },
        required: ["path", "content"],
      },
    },
  },
};

const editFile: ToolDef = {
  name: "edit_file",
  description: "Reemplaza texto exacto en un archivo existente del proyecto.",
  category: "file",
  icon: "🔧",
  formatLabel: (i) => `edit ${i.path || "?"}`,
  schema: {
    type: "function",
    function: {
      name: "edit_file",
      description:
        "Realiza un reemplazo exacto de texto en un archivo existente. old_string debe coincidir EXACTAMENTE (incluyendo indentación) y ser único en el archivo. SIEMPRE lee el archivo antes de editarlo para obtener el contenido exacto.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Ruta relativa al proyecto del archivo a editar",
          },
          old_string: {
            type: "string",
            description: "El texto EXACTO a reemplazar (debe ser único en el archivo, incluyendo indentación)",
          },
          new_string: {
            type: "string",
            description: "El texto nuevo que reemplazará a old_string",
          },
          replace_all: {
            type: "boolean",
            description: "Si es true, reemplaza TODAS las ocurrencias de old_string (default: false)",
          },
        },
        required: ["path", "old_string", "new_string"],
      },
    },
  },
};

const glob: ToolDef = {
  name: "glob",
  description: "Busca archivos por patrón glob en el proyecto.",
  category: "file",
  icon: "🔍",
  formatLabel: (i) => `glob ${i.pattern || "?"}`,
  schema: {
    type: "function",
    function: {
      name: "glob",
      description:
        'Busca archivos que coinciden con un patrón glob. Ejemplos: "**/*.ts", "src/**/*.sol", "*.json". Retorna paths ordenados por modificación.',
      parameters: {
        type: "object",
        properties: {
          pattern: {
            type: "string",
            description: 'Patrón glob para buscar archivos (ej. "**/*.ts", "src/**/*.sol")',
          },
          path: {
            type: "string",
            description: "Directorio base de búsqueda (opcional, default: raíz del proyecto)",
          },
        },
        required: ["pattern"],
      },
    },
  },
};

const grep: ToolDef = {
  name: "grep",
  description: "Busca texto o regex en archivos del proyecto.",
  category: "file",
  icon: "🔎",
  formatLabel: (i) => `grep "${i.pattern || "?"}"`,
  schema: {
    type: "function",
    function: {
      name: "grep",
      description:
        "Busca un patrón regex en archivos del proyecto. Soporta filtrado por tipo de archivo y patrón glob. Retorna archivos que coinciden o líneas con matches.",
      parameters: {
        type: "object",
        properties: {
          pattern: {
            type: "string",
            description: "Patrón regex a buscar (ej. 'function\\s+\\w+', 'import.*from')",
          },
          path: {
            type: "string",
            description: "Directorio donde buscar (opcional, default: raíz del proyecto)",
          },
          glob: {
            type: "string",
            description: "Filtro de archivos por glob (ej. '*.ts', '*.{ts,tsx}')",
          },
          output_mode: {
            type: "string",
            enum: ["content", "files_with_matches", "count"],
            description: "Modo de salida: 'content' (líneas), 'files_with_matches' (solo paths), 'count' (conteos). Default: 'files_with_matches'",
          },
          head_limit: {
            type: "integer",
            description: "Límite de resultados (default: 40)",
          },
          "-i": {
            type: "boolean",
            description: "Case insensitive (default: false)",
          },
        },
        required: ["pattern"],
      },
    },
  },
};

// ─── CATEGORÍA 2: SHELL EXECUTION ────────────────────────────────────

const bash: ToolDef = {
  name: "bash",
  description: "Ejecuta un comando en terminal (Git Bash / POSIX sh) en Windows.",
  category: "shell",
  icon: "$",
  formatLabel: (i) => `$ ${i.command || "?"}`,
  schema: {
    type: "function",
    function: {
      name: "bash",
      description:
        "Ejecuta un comando en Git Bash (POSIX sh) dentro del proyecto Catalyst. Usa para: git, npm, npx, python, curl, grep, find, etc. NO uses PowerShell aquí — para eso usa la herramienta 'powershell'. Timeout: 120s. NUNCA ejecutes comandos destructivos sin confirmación del usuario.",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "El comando shell a ejecutar (sintaxis POSIX sh). Ej: 'git status', 'ls -la src/', 'npx hardhat compile'",
          },
          timeout: {
            type: "integer",
            description: "Timeout en ms (default: 120000, max: 300000)",
          },
          description: {
            type: "string",
            description: "Descripción corta de qué hace el comando (para el log de seguridad)",
          },
          run_in_background: {
            type: "boolean",
            description: "Ejecutar en segundo plano para comandos largos (default: false)",
          },
        },
        required: ["command"],
      },
    },
  },
};

const powershell: ToolDef = {
  name: "powershell",
  description: "Ejecuta un comando PowerShell en Windows.",
  category: "shell",
  icon: "⚡",
  formatLabel: (i) => `PS> ${(i.command || "?").slice(0, 60)}`,
  schema: {
    type: "function",
    function: {
      name: "powershell",
      description:
        "Ejecuta un comando PowerShell dentro del proyecto Catalyst. Usa para operaciones Windows nativas, manejo de procesos, o comandos que requieren PS sintaxis. NO uses para git, npm, o python — para eso usa 'bash'. Timeout: 120s.",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "El comando PowerShell a ejecutar. Ej: 'Get-ChildItem src/ -Recurse -Filter *.ts', 'npm run build'",
          },
          timeout: {
            type: "integer",
            description: "Timeout en ms (default: 120000, max: 300000)",
          },
          description: {
            type: "string",
            description: "Descripción corta de qué hace el comando",
          },
        },
        required: ["command"],
      },
    },
  },
};

// ─── CATEGORÍA 3: PROJECT TOOLS ──────────────────────────────────────

const zkQuery: ToolDef = {
  name: "zk_query",
  description: "Consulta y gestiona la memoria Zettelkasten persistente (notas atómicas con enlaces [[...]]).",
  category: "project",
  icon: "‡",
  formatLabel: (i) => `zk ${i.op || "?"} ${i.key || ""}`,
  schema: {
    type: "function",
    function: {
      name: "zk_query",
      description:
        "Memoria persistente Zettelkasten. Operaciones: 'get' (leer nota), 'set' (crear/actualizar), 'search' (buscar por texto), 'link' (crear enlace [[a]]→[[b]]), 'list' (todas las notas), 'recent' (notas recientes). Las notas se almacenan en docs/zettelkasten/*.md con enlaces [[...]]. Usa esto para recordar decisiones, arquitectura, bugs conocidos, y contexto entre sesiones.",
      parameters: {
        type: "object",
        properties: {
          op: {
            type: "string",
            enum: ["get", "set", "search", "link", "list", "recent"],
            description: "Operación: get=leer, set=crear/actualizar, search=buscar, link=enlazar, list=listar todas, recent=recientes",
          },
          key: {
            type: "string",
            description: "Clave/ID de la nota (slug). Ej: 'agent-limits', 'bug-build-cache'",
          },
          content: {
            type: "string",
            description: "Contenido markdown de la nota (solo para op='set')",
          },
          query: {
            type: "string",
            description: "Texto a buscar (solo para op='search')",
          },
          target: {
            type: "string",
            description: "Nota destino del enlace (solo para op='link')",
          },
        },
        required: ["op"],
      },
    },
  },
};

const listDir: ToolDef = {
  name: "list_dir",
  description: "Lista el contenido de un directorio del proyecto.",
  category: "project",
  icon: "📁",
  formatLabel: (i) => `ls ${i.path || "."}`,
  schema: {
    type: "function",
    function: {
      name: "list_dir",
      description:
        "Lista archivos y subdirectorios de un directorio del proyecto. Más rápido y seguro que usar 'bash ls'.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Ruta relativa al proyecto del directorio a listar (default: raíz)",
          },
        },
        required: [],
      },
    },
  },
};

const gitStatus: ToolDef = {
  name: "git_status",
  description: "Muestra el estado del repositorio git (working tree status).",
  category: "project",
  icon: "📋",
  formatLabel: () => "git status",
  schema: {
    type: "function",
    function: {
      name: "git_status",
      description:
        "Muestra el estado actual del repositorio git: archivos modificados, staged, untracked, y rama actual. Solo lectura, seguro.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
};

const webFetch: ToolDef = {
  name: "web_fetch",
  description: "Consulta documentación externa (MDN, Next.js, Node.js, etc.) vía HTTP GET. Solo dominios whitelist.",
  category: "project",
  icon: "🌐",
  formatLabel: (i) => `curl ${i.url?.slice(0, 50) || "?"}`,
  schema: {
    type: "function",
    function: {
      name: "web_fetch",
      description:
        "Obtiene el contenido de una URL de documentación (solo dominios seguros: nextjs.org, nodejs.org, developer.mozilla.org, docs.openzeppelin.com, etc.). Útil para consultar APIs, guías, y referencias actualizadas sin salir del chat.",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "URL completa a consultar (debe ser HTTPS, dominio whitelist)",
          },
          max_chars: {
            type: "integer",
            description: "Máximo de caracteres a retornar (default 15000, max 30000)",
          },
        },
        required: ["url"],
      },
    },
  },
};

const preflightPlan: ToolDef = {
  name: "preflight_plan",
  description: "Estima el costo de una operación (tool calls, tiempo, necesidades) ANTES de ejecutarla.",
  category: "project",
  icon: "📋",
  formatLabel: (i) => `plan: ${i.objective?.slice(0, 60) || "?"}`,
  schema: {
    type: "function",
    function: {
      name: "preflight_plan",
      description:
        "Analiza un objetivo y estima recursos necesarios ANTES de ejecutar: número de tool calls, tiempo estimado, si requiere build/test, y riesgos. Muestra el plan al usuario para confirmación. NO ejecuta ninguna acción — solo planifica.",
      parameters: {
        type: "object",
        properties: {
          objective: {
            type: "string",
            description: "Descripción del objetivo a planificar (ej: 'refactorizar autenticación', 'añadir tests al módulo X')",
          },
          context: {
            type: "string",
            description: "Contexto adicional: archivos relevantes, restricciones, preferencias (opcional)",
          },
        },
        required: ["objective"],
      },
    },
  },
};

const applyPatch: ToolDef = {
  name: "apply_patch",
  description: "Aplica un batch de cambios en formato patch (Add/Update/Delete File). Múltiples operaciones en una sola llamada. Formato Codex V4A.",
  category: "file",
  icon: "📦",
  formatLabel: (i) => `patch: ${(i.operations?.length || 0)} ops`,
  schema: {
    type: "function",
    function: {
      name: "apply_patch",
      description:
        "Aplica múltiples operaciones de archivo en una sola llamada. Usa formato V4A: operations[] con {action: 'add'|'update'|'delete', path, content?}. Más eficiente que múltiples edit_file/write_file separados. Ideal para refactors que tocan varios archivos.",
      parameters: {
        type: "object",
        properties: {
          operations: {
            type: "array",
            description: "Lista de operaciones a aplicar en orden",
            items: {
              type: "object",
              properties: {
                action: {
                  type: "string",
                  enum: ["add", "update", "delete"],
                  description: "add = crear/sobrescribir, update = reemplazar old→new, delete = eliminar archivo",
                },
                path: {
                  type: "string",
                  description: "Ruta relativa al proyecto del archivo",
                },
                content: {
                  type: "string",
                  description: "Contenido nuevo (para add) o texto a insertar (para update)",
                },
                old_content: {
                  type: "string",
                  description: "Texto exacto a reemplazar (solo para update)",
                },
                replace_all: {
                  type: "boolean",
                  description: "Reemplazar todas las ocurrencias de old_content (default false)",
                },
              },
              required: ["action", "path"],
            },
          },
          message: {
            type: "string",
            description: "Descripción del batch de cambios (para el log y revisión)",
          },
        },
        required: ["operations"],
      },
    },
  },
};

const viewImage: ToolDef = {
  name: "view_image",
  description: "Lee y describe una imagen del proyecto (PNG, JPG, SVG, etc.). Retorna metadata y contenido textual.",
  category: "file",
  icon: "🖼️",
  formatLabel: (i) => `view ${i.path || "?"}`,
  schema: {
    type: "function",
    function: {
      name: "view_image",
      description:
        "Lee una imagen del proyecto y extrae información: dimensiones, tipo, tamaño, y si es SVG, el contenido textual. Para PNG/JPG retorna metadata. Útil para revisar assets, icons, screenshots.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Ruta relativa al proyecto de la imagen",
          },
        },
        required: ["path"],
      },
    },
  },
};

const toolSearch: ToolDef = {
  name: "tool_search",
  description: "Busca herramientas disponibles en el catálogo del agente (BM25 semántico). Útil cuando no sabes qué tool usar.",
  category: "project",
  icon: "🔧",
  formatLabel: (i) => `tool_search: ${i.query || "?"}`,
  schema: {
    type: "function",
    function: {
      name: "tool_search",
      description:
        "Busca en el catálogo de herramientas disponibles. Usa esto cuando no estés seguro de qué herramienta usar para una tarea. Retorna las herramientas más relevantes con su descripción y parámetros.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Descripción de lo que quieres hacer (ej: 'buscar texto en archivos', 'ejecutar tests')",
          },
        },
        required: ["query"],
      },
    },
  },
};

const requestUserInput: ToolDef = {
  name: "request_user_input",
  description: "Solicita información al usuario (1-3 preguntas) cuando necesitas aclaraciones para continuar.",
  category: "project",
  icon: "❓",
  formatLabel: (i) => `ask: ${(i.questions?.length || 0)} preguntas`,
  schema: {
    type: "function",
    function: {
      name: "request_user_input",
      description:
        "Hace preguntas al usuario cuando necesitas aclaraciones. Usa esto para: confirmar decisiones de diseño, elegir entre alternativas, pedir contexto adicional. Máximo 3 preguntas por llamada. NO uses para preguntas triviales.",
      parameters: {
        type: "object",
        properties: {
          questions: {
            type: "array",
            description: "Lista de preguntas (1-3)",
            items: {
              type: "object",
              properties: {
                question: { type: "string", description: "La pregunta" },
                header: { type: "string", description: "Etiqueta corta (máx 12 chars)" },
                options: {
                  type: "array",
                  items: { type: "string" },
                  description: "Opciones de respuesta (2-4). Si se omite, texto libre.",
                },
              },
              required: ["question", "header"],
            },
          },
          context: {
            type: "string",
            description: "Explicación de por qué necesitas esta información",
          },
        },
        required: ["questions"],
      },
    },
  },
};

const spawnAgent: ToolDef = {
  name: "spawn_agent",
  description: "Lanza un sub-agente independiente para trabajo paralelo (exploración, búsqueda multi-archivo).",
  category: "project",
  icon: "🤖",
  formatLabel: (i) => `spawn: ${i.task?.slice(0, 50) || "?"}`,
  schema: {
    type: "function",
    function: {
      name: "spawn_agent",
      description:
        "Crea un sub-agente para ejecutar una tarea en paralelo. Útil para: explorar código mientras haces otra cosa, buscar en múltiples directorios simultáneamente, delegar sub-tareas independientes. El agente padre recibe los resultados cuando termina.",
      parameters: {
        type: "object",
        properties: {
          task: {
            type: "string",
            description: "Descripción de la tarea para el sub-agente",
          },
          agent_type: {
            type: "string",
            enum: ["explore", "analyze", "fix"],
            description: "Tipo de sub-agente: explore=lectura/búsqueda, analyze=análisis profundo, fix=edición",
          },
          context: {
            type: "string",
            description: "Contexto adicional (archivos relevantes, restricciones)",
          },
        },
        required: ["task"],
      },
    },
  },
};

const pentetraktysPlan: ToolDef = {
  name: "pentetraktys_plan",
  description: "Planifica una tarea usando las 5 fases Pentetraktys 4D (Tesis→Antítesis→Síntesis→Conclusión→Hybrys).",
  category: "project",
  icon: "Δ",
  formatLabel: (i) => `Δ plan: ${i.goal?.slice(0, 50) || "?"}`,
  schema: {
    type: "function",
    function: {
      name: "pentetraktys_plan",
      description:
        "Estructura una tarea de código en 5 fases Pentetraktys 4D: TESIS (objetivo claro), ANTÍTESIS (riesgos y limitaciones), SÍNTESIS (solución candidata), CONCLUSIÓN (plan de acción concreto), HYBRYS (check de calidad antes de ejecutar). Usa esto ANTES de tareas complejas para garantizar calidad BELL 13450.50.",
      parameters: {
        type: "object",
        properties: {
          goal: {
            type: "string",
            description: "Objetivo de la tarea a planificar con Pentetraktys",
          },
        },
        required: ["goal"],
      },
    },
  },
};

const workspace: ToolDef = {
  name: "workspace",
  description: "Cambia el directorio de trabajo actual para operaciones CLI. Permite moverte entre apps del monorepo.",
  category: "project",
  icon: "📂",
  formatLabel: (i) => i.op === "cd" ? `cd ${i.path || "?"}` : "pwd",
  schema: {
    type: "function",
    function: {
      name: "workspace",
      description:
        "Gestiona el directorio de trabajo. 'cd' cambia a un subdirectorio del monorepo (nunca fuera de Catalyst-Blockchain-Structural-Token-). 'pwd' muestra el directorio actual. 'root' vuelve a la raíz del monorepo. 'list' muestra las apps/packages disponibles.",
      parameters: {
        type: "object",
        properties: {
          op: {
            type: "string",
            enum: ["cd", "pwd", "root", "list"],
            description: "Operación: cd=cambiar, pwd=directorio actual, root=volver a raíz, list=apps disponibles",
          },
          path: {
            type: "string",
            description: "Subdirectorio destino (solo para op='cd'). Relativo a la raíz del monorepo. Ej: 'apps/catalyst-chat', 'contracts'",
          },
        },
        required: ["op"],
      },
    },
  },
};

const runBuild: ToolDef = {
  name: "run_build",
  description: "Ejecuta el build del proyecto (npm run build o similar). Si falla, retorna el error para auto-corrección.",
  category: "project",
  icon: "🏗️",
  formatLabel: (i) => `build ${i.command || "npm run build"}`,
  schema: {
    type: "function",
    function: {
      name: "run_build",
      description:
        "Ejecuta un comando de build (default: npm run build). Retorna stdout+stderr. Si el build falla, el error se usa para auto-corregir el código. Usa esta tool después de hacer cambios en archivos para verificar que todo compila.",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "Comando de build (default: 'npm run build'). Ej: 'npx hardhat compile', 'npm run lint'",
          },
          cwd: {
            type: "string",
            description: "Subdirectorio donde ejecutar el build (default: raíz del proyecto)",
          },
        },
      },
    },
  },
};

const runTest: ToolDef = {
  name: "run_test",
  description: "Ejecuta tests del proyecto. Retorna resultados parseables (PASS/FAIL).",
  category: "project",
  icon: "🧪",
  formatLabel: (i) => `test ${i.command || "npm test"}`,
  schema: {
    type: "function",
    function: {
      name: "run_test",
      description:
        "Ejecuta un comando de test (default: npm test). Timeout extendido de 300s. Retorna resultados parseables. Usa esta tool para validar cambios con TDD.",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "Comando de test (default: 'npm test'). Ej: 'npx hardhat test', 'pytest'",
          },
          cwd: {
            type: "string",
            description: "Subdirectorio donde ejecutar los tests",
          },
        },
      },
    },
  },
};

const gitCommit: ToolDef = {
  name: "git_commit",
  description: "Crea un commit seguro con archivos específicos. NUNCA hace git add -A.",
  category: "project",
  icon: "📦",
  formatLabel: (i) => `git commit "${i.message || "?"}"`,
  schema: {
    type: "function",
    function: {
      name: "git_commit",
      description:
        "Crea un commit git con archivos específicos. Solo hace stage de los archivos indicados (nunca git add -A). Bloqueado en rama main sin override explícito. Usa git_status antes para ver qué archivos incluir.",
      parameters: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "Mensaje del commit (conventional commits: feat:, fix:, chore:)",
          },
          files: {
            type: "array",
            items: { type: "string" },
            description: "Lista de archivos a incluir en el commit (paths relativos al proyecto)",
          },
          allow_main: {
            type: "boolean",
            description: "Confirmación explícita para commitear en main (default: false)",
          },
        },
        required: ["message", "files"],
      },
    },
  },
};

const gitDiff: ToolDef = {
  name: "git_diff",
  description: "Muestra los cambios (diff) del repositorio.",
  category: "project",
  icon: "📊",
  formatLabel: () => "git diff",
  schema: {
    type: "function",
    function: {
      name: "git_diff",
      description:
        "Muestra el diff de cambios en el repositorio: unstaged changes, staged changes, o ambos. Solo lectura.",
      parameters: {
        type: "object",
        properties: {
          staged: {
            type: "boolean",
            description: "Mostrar cambios staged (git diff --staged). Default: false (unstaged).",
          },
        },
      },
    },
  },
};

// ─── REGISTRY ─────────────────────────────────────────────────────────

// ─── 10 FUNCIONES CREATIVAS (Bloques A-D) ──────────────────────────
const preflightOracle: ToolDef = {
  name: "preflight_oracle", description: "Estima costo, tokens, tiempo y riesgo de una tarea ANTES de ejecutar tools.", category: "project", icon: "🔮",
  formatLabel: (i) => `oráculo: ${i.task_description?.slice(0, 40) || "?"}`,
  schema: { type: "function", function: { name: "preflight_oracle", description: "Estima recursos necesarios para una tarea: tool calls, tokens, costo USD, tiempo, nivel de riesgo. Usa esto ANTES de ejecutar cualquier tarea compleja.", parameters: { type: "object", properties: { task_description: { type: "string", description: "Descripción de la tarea a analizar" } }, required: ["task_description"] } } },
};

const codeZazen: ToolDef = {
  name: "code_zazen", description: "Meditación técnica: presenta 3 caminos alternativos antes de ejecutar tareas complejas.", category: "project", icon: "🧘",
  formatLabel: (i) => `zen: ${i.task_description?.slice(0, 40) || "?"}`,
  schema: { type: "function", function: { name: "code_zazen", description: "Antes de ejecutar una tarea compleja, presenta 3 caminos: conservador, directo, arquitectónico. Evalúa riesgos de cada uno y pregunta al usuario si es necesario.", parameters: { type: "object", properties: { task_description: { type: "string", description: "Descripción de la tarea" } }, required: ["task_description"] } } },
};

const confession: ToolDef = {
  name: "confession", description: "Auto-crítica post-tarea: incertidumbres, suposiciones, riesgos y tests sugeridos.", category: "project", icon: "😌",
  formatLabel: () => "confesión post-tarea",
  schema: { type: "function", function: { name: "confession", description: "Después de completar una tarea de edición, analiza los cambios y confiesa: qué no se entiende, qué se asumió, riesgos potenciales, y tests sugeridos.", parameters: { type: "object", properties: { task: { type: "string", description: "Descripción de la tarea completada" }, files_changed: { type: "array", items: { type: "string" }, description: "Lista de archivos modificados" } }, required: ["task"] } } },
};

const memoryThread: ToolDef = {
  name: "memory_thread", description: "ADRs con trazabilidad causal. Registra y consulta decisiones arquitectónicas.", category: "project", icon: "📜",
  formatLabel: (i) => `thread ${i.op || "?"} ${i.object || ""}`,
  schema: { type: "function", function: { name: "memory_thread", description: "Registra decisiones arquitectónicas (ADRs) con timestamp, razón y parent_id. Consulta el hilo completo de decisiones de un objeto y detecta contradicciones.", parameters: { type: "object", properties: { op: { type: "string", enum: ["record", "get", "contradictions", "list"], description: "Operación" }, object: { type: "string", description: "Objeto/feature de la decisión" }, reason: { type: "string", description: "Razón de la decisión (solo para record)" }, parentId: { type: "string", description: "ID de decisión anterior relacionada (opcional)" } }, required: ["op"] } } },
};

const timeTravelTool: ToolDef = {
  name: "time_travel", description: "Snapshots de archivos con diff + razón + timestamp. Viaja en el tiempo del código.", category: "project", icon: "📸",
  formatLabel: (i) => `snapshot ${i.op || "?"} ${i.filePath || ""}`,
  schema: { type: "function", function: { name: "time_travel", description: "Captura snapshots del estado de archivos antes/después de cambios. Consulta versiones anteriores, compara diffs entre fechas.", parameters: { type: "object", properties: { op: { type: "string", enum: ["capture", "query", "diff", "list"], description: "Operación" }, filePath: { type: "string", description: "Ruta del archivo" }, reason: { type: "string", description: "Razón del cambio (para capture)" }, date1: { type: "string", description: "Fecha inicial (para diff)" }, date2: { type: "string", description: "Fecha final (para diff)" } }, required: ["op"] } } },
};

const invokeSprite: ToolDef = {
  name: "invoke_sprite", description: "Busca soluciones previas en TODO el monorepo: código, git log, ZK.", category: "project", icon: "🔮",
  formatLabel: (i) => `sprite: ${(i.keywords || []).join(", ")}`,
  schema: { type: "function", function: { name: "invoke_sprite", description: "Busca en código, git log y Zettelkasten de todo el monorepo soluciones previas similares al problema actual. Evita reinventar la rueda.", parameters: { type: "object", properties: { keywords: { type: "array", items: { type: "string" }, description: "Palabras clave a buscar (ej: ['auth', 'JWT', 'login'])" } }, required: ["keywords"] } } },
};

const errorAutopsy: ToolDef = {
  name: "error_autopsy", description: "Diagnóstico de causa raíz: correlaciona errores con cambios recientes.", category: "project", icon: "🔬",
  formatLabel: (i) => `autopsia: ${i.error?.slice(0, 50) || "?"}`,
  schema: { type: "function", function: { name: "error_autopsy", description: "Analiza un error de build/test, busca cambios recientes en los archivos del stack trace, snapshots y ADRs, y genera hipótesis de causa raíz con probabilidades.", parameters: { type: "object", properties: { error: { type: "string", description: "Mensaje de error o stack trace completo" } }, required: ["error"] } } },
};

const repoArchaeologist: ToolDef = {
  name: "repo_archaeologist", description: "Mapa vivo del monorepo: apps, tecnologías, actividad, responsables.", category: "project", icon: "🗺️",
  formatLabel: () => "mapa del monorepo",
  schema: { type: "function", function: { name: "repo_archaeologist", description: "Construye un mapa del monorepo: lista de apps/paquetes, tecnologías usadas, actividad reciente (commits/mes), y archivos principales. Se actualiza bajo demanda.", parameters: { type: "object", properties: { refresh: { type: "boolean", description: "Forzar regeneración del mapa (default: false, usa cache)" } } } } },
};

const pairDesignerTool: ToolDef = {
  name: "pair_designer", description: "Detecta acoplamiento entre archivos y sugiere orden de edición.", category: "project", icon: "📎",
  formatLabel: (i) => `pairs: ${(i.files || []).length} archivos`,
  schema: { type: "function", function: { name: "pair_designer", description: "Analiza imports y referencias cruzadas entre archivos para detectar acoplamiento. Sugiere el orden óptimo de edición para minimizar conflictos.", parameters: { type: "object", properties: { files: { type: "array", items: { type: "string" }, description: "Lista de archivos a analizar" } }, required: ["files"] } } },
};

const pentapilotTool: ToolDef = {
  name: "pentapilot", description: "Orquestador 5 fases Pentetraktys con checkpoints de usuario.", category: "project", icon: "Δ",
  formatLabel: (i) => `penta: ${i.task?.slice(0, 40) || "?"}`,
  schema: { type: "function", function: { name: "pentapilot", description: "Divide una tarea compleja en 5 fases Pentetraktys 4D (TESIS→ANTÍTESIS→SÍNTESIS→CONCLUSIÓN→HYBRYS) con checkpoints de confirmación del usuario en cada fase.", parameters: { type: "object", properties: { task: { type: "string", description: "Descripción de la tarea compleja" }, files: { type: "array", items: { type: "string" }, description: "Archivos involucrados (opcional)" } }, required: ["task"] } } },
};

/** Todas las herramientas disponibles */
export const ALL_TOOLS: ToolDef[] = [
  readFile,
  writeFile,
  editFile,
  glob,
  grep,
  bash,
  powershell,
  listDir,
  zkQuery,
  workspace,
  gitStatus,
  gitDiff,
  runBuild,
  runTest,
  gitCommit,
  webFetch,
  preflightPlan,
  pentetraktysPlan,
  applyPatch,
  viewImage,
  toolSearch,
  requestUserInput,
  spawnAgent,
  preflightOracle,
  codeZazen,
  confession,
  memoryThread,
  timeTravelTool,
  invokeSprite,
  errorAutopsy,
  repoArchaeologist,
  pairDesignerTool,
  pentapilotTool,
];

/** Mapa nombre → ToolDef para búsqueda rápida */
export const TOOL_MAP: Map<string, ToolDef> = new Map(
  ALL_TOOLS.map((t) => [t.name, t])
);

/** Schemas en formato OpenAI tools[] para enviar al modelo */
export function getToolSchemas(): ChatCompletionTool[] {
  return ALL_TOOLS.map((t) => t.schema);
}

/** System prompt augment para cuando CLI mode está activo */
export const CLI_SYSTEM_AUGMENT = `
[MODO CLI ACTIVADO — HABILIDADES DE TERMINAL]
Tienes acceso a herramientas del sistema para leer, escribir y ejecutar código:

📄 ARCHIVOS:
- read_file: leer archivos del proyecto Catalyst
- write_file: crear/sobrescribir archivos (USA CON PRECAUCIÓN)
- edit_file: reemplazo exacto en archivos existentes
- apply_patch: batch de cambios (Add/Update/Delete) en una sola llamada (formato Codex V4A)
- glob: buscar archivos por patrón (*.ts, **/*.sol, etc.)
- grep: buscar texto/regex en archivos
- list_dir: listar directorio
- view_image: leer metadata de imágenes (SVG, PNG, JPG)

‡ MEMORIA ZETTELKASTEN:
- zk_query: memoria persistente entre sesiones
  · zk_query get <clave> — recuperar conocimiento previo
  · zk_query set <clave> — guardar decisiones, bugs, arquitectura
  · zk_query search <texto> — buscar en todas las notas
  · zk_query recent — notas más recientes
  · Usa esto para NO repetir errores y recordar contexto

🐚 SHELL:
- bash: ejecutar comandos (Git Bash / POSIX sh en Windows)
- powershell: ejecutar comandos PowerShell
- workspace: navegar el monorepo (cd apps/catalyst-chat, cd contracts, pwd, root, list)

📋 PROYECTO:
- git_status: estado del repositorio
- git_diff: cambios pendientes
- git_commit: commit seguro (archivos específicos, nunca -A)
- run_build: compilar/construir proyecto (npm run build, hardhat compile, etc.)
- run_test: ejecutar tests (npm test, pytest, etc.)

🔄 AUTO-CORRECCIÓN:
- Si run_build falla, analiza el error y corrige el código automáticamente
- Si run_test falla, usa el error para arreglar y vuelve a ejecutar
- Máximo 3 intentos de auto-corrección por build/test

🌐 CONOCIMIENTO EXTERNO:
- web_fetch: consultar documentación oficial (MDN, Next.js, Node.js, etc.)
  · Solo dominios whitelist (seguridad)

📋 PLANIFICACIÓN:
- preflight_plan: estimar costo de una operación ANTES de ejecutar
- pentetraktys_plan: planificar con 5 fases (TESIS→ANTÍTESIS→SÍNTESIS→CONCLUSIÓN→HYBRYS)

🤖 MULTI-AGENT:
- spawn_agent: lanza sub-agentes para trabajo paralelo (explore/analyze/fix)
- tool_search: busca en el catálogo de herramientas (si no sabes cuál usar)
- request_user_input: pregunta al usuario cuando necesites aclaraciones

Δ HYBRYS AUTO-DETECT:
- El sistema monitorea fallos repetidos automáticamente
- Si >50% de tool calls fallan → HYBRYS WARNING
- Si >75% → HYBRYS CRITICAL → sugiere reset del plan

REGLAS DE ORO:
1. NUNCA ejecutes comandos destructivos sin confirmación del usuario
2. Siempre usa read_file ANTES de edit_file para verificar contenido exacto
3. Confirma con el usuario antes de modificar archivos fuera del scope
4. Los comandos tienen timeout de 120s — para tareas largas, advierte al usuario
5. Reporta SIEMPRE el resultado de cada herramienta al usuario en español
6. Si un comando falla, explica el error y sugiere corrección
7. Mantén tu identidad Pentetraktys 4D — el CLI es una extensión, no un reemplazo
8. Estándar BELL 13450.50 en todas las operaciones`;
