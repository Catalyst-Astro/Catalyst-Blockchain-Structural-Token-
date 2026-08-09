// ─── Guard de Seguridad CLI ───────────────────────────────────────────
// Sandbox para ejecución de comandos shell desde el chat Catalyst.
// BELL 13450.50 — Restricciones estrictas para operaciones del sistema.

import * as path from "path";

// ─── Constantes de seguridad ─────────────────────────────────────────
export const MAX_COMMAND_LENGTH = 4000;
export const MAX_OUTPUT_LENGTH = 50000;
/** Límite base de tool calls por request. Configurable via AGENT_MAX_CALLS. */
export const BASE_MAX_TOOL_CALLS = 15;
export const COMMAND_TIMEOUT_MS = 120_000; // 2 minutos
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/** Obtiene el límite dinámico de tool calls desde env var o default. */
export function getMaxToolCalls(): number {
  const env = process.env.AGENT_MAX_CALLS;
  if (env) {
    const parsed = parseInt(env, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return Math.min(parsed, 50); // hard cap en 50
    }
  }
  return BASE_MAX_TOOL_CALLS;
}

// Mantener compatibilidad
export const MAX_TOOL_CALLS_PER_REQUEST = getMaxToolCalls();

// ─── Comandos bloqueados (patrones) ──────────────────────────────────
const BLOCKED_PATTERNS: RegExp[] = [
  // Destructivos — filesystem
  /rm\s+-rf\s+\//i,
  /rm\s+-rf\s+\/mnt/i,
  /rm\s+-rf\s+\/etc/i,
  /rm\s+-rf\s+\/boot/i,
  /rm\s+-rf\s+\/sys/i,
  /rm\s+-rf\s+\/proc/i,
  /rm\s+-rf\s+\~[\/\\]?$/i,
  /del\s+\/[fs]\s+/i,
  /format\s+[a-z]:/i,
  /diskpart/i,
  /fdisk/i,
  /dd\s+if=/i,
  /mkfs/i,

  // Destructivos — git
  /git\s+push\s+--force\s+--no-verify/i,
  /git\s+push\s+-f\s+origin\s+main/i,
  /git\s+push\s+-f\s+origin\s+master/i,
  /git\s+reset\s+--hard\s+origin/i,
  /git\s+clean\s+-fdx/i,

  // Destructivos — npm
  /npm\s+unpublish/i,
  /npm\s+deprecate/i,

  // Red — potencialmente peligrosos
  /curl.*\|\s*(ba)?sh/i,
  /wget.*\|\s*(ba)?sh/i,
  /Invoke-Expression/i,
  /iex\s/i,

  // Registry / sistema
  /reg\s+delete/i,
  /reg\s+add/i,
  /sc\s+delete/i,
  /sc\s+stop/i,

  // Escalada
  /sudo\s/i,
  /runas\s/i,
  /su\s+-/i,
];

// ─── Paths restringidos ──────────────────────────────────────────────
const PROJECT_ROOT = path.resolve(process.cwd());

// Directorios prohibidos para operaciones de archivo
const FORBIDDEN_PATHS: string[] = [
  "/etc",
  "/proc",
  "/sys",
  "/dev",
  "/boot",
  "C:\\Windows",
  "C:\\Windows\\System32",
  "/System",
  "/Library",
  "~/.ssh",
  "~/.gnupg",
  ".env",
  ".env.local",
  ".env.production",
  "node_modules",
];

// ─── API ─────────────────────────────────────────────────────────────

export interface GuardResult {
  allowed: boolean;
  reason?: string;
}

/** Valida un comando shell antes de ejecutarlo */
export function validateShellCommand(command: string): GuardResult {
  if (!command || typeof command !== "string") {
    return { allowed: false, reason: "Comando vacío o inválido" };
  }

  if (command.length > MAX_COMMAND_LENGTH) {
    return {
      allowed: false,
      reason: `Comando demasiado largo (${command.length} > ${MAX_COMMAND_LENGTH} chars)`,
    };
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(command)) {
      return {
        allowed: false,
        reason: `Comando bloqueado por seguridad (patrón: ${pattern.source.slice(0, 40)}…)`,
      };
    }
  }

  return { allowed: true };
}

/** Valida un path de archivo para lectura/escritura */
export function validateFilePath(filePath: string, operation: "read" | "write"): GuardResult {
  if (!filePath || typeof filePath !== "string") {
    return { allowed: false, reason: "Path vacío o inválido" };
  }

  // Prevenir path traversal
  const normalized = path.normalize(filePath);

  // Normalizar para comparación cross-platform
  const normalizedLower = normalized.toLowerCase();

  for (const forbidden of FORBIDDEN_PATHS) {
    if (normalizedLower.includes(forbidden.toLowerCase())) {
      // Permitir .env si es explícitamente el archivo del proyecto
      if (forbidden === ".env" && normalizedLower.endsWith(".env.example")) {
        continue;
      }
      return {
        allowed: false,
        reason: `Path restringido: "${forbidden}" — acceso denegado`,
      };
    }
  }

  // Para escritura, bloquear archivos de configuración sensibles
  if (operation === "write") {
    const basename = path.basename(normalized).toLowerCase();
    const sensitiveFiles = [
      ".env",
      ".env.local",
      ".env.production",
      "id_rsa",
      "id_ed25519",
      "known_hosts",
      "authorized_keys",
    ];
    if (sensitiveFiles.includes(basename)) {
      return {
        allowed: false,
        reason: `No se puede escribir en archivo sensible: "${basename}"`,
      };
    }
  }

  return { allowed: true };
}

/** Resuelve un path relativo al proyecto asegurando que no escape del monorepo */
export function resolveProjectPath(filePath: string, workspaceRoot?: string): string {
  const root = workspaceRoot || PROJECT_ROOT;
  const resolved = path.resolve(root, filePath);

  // Verificar que no escape del monorepo padre
  if (!resolved.toLowerCase().startsWith(PROJECT_ROOT.toLowerCase())) {
    const relToRoot = path.relative(PROJECT_ROOT, resolved);
    if (relToRoot.startsWith("..")) {
      throw new Error(
        `Path fuera del monorepo: "${filePath}" → "${resolved}" fuera de ${PROJECT_ROOT}`
      );
    }
  }

  return resolved;
}

/** Trunca output a tamaño máximo seguro */
export function truncateOutput(output: string): string {
  if (output.length <= MAX_OUTPUT_LENGTH) return output;
  return (
    output.slice(0, MAX_OUTPUT_LENGTH) +
    `\n\n… [TRUNCADO: ${output.length - MAX_OUTPUT_LENGTH} caracteres omitidos]`
  );
}

/** Contador de tool calls por request con límite dinámico */
export class ToolCallCounter {
  private count = 0;
  private limit: number;
  private warnedExtended = false;

  constructor() {
    this.limit = getMaxToolCalls();
  }

  increment(): GuardResult {
    this.count++;
    if (this.count > this.limit) {
      // Permitir extensión automática una vez (hasta 30)
      if (!this.warnedExtended && this.limit < 30) {
        this.warnedExtended = true;
        this.limit = Math.min(this.limit + 15, 50);
        // No bloqueamos — permitimos continuar con warning implícito
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: `Límite de ${this.limit} tool calls por request excedido (${this.count} ejecutadas). Aumenta AGENT_MAX_CALLS en .env para tareas grandes.`,
      };
    }
    return { allowed: true };
  }

  /** Permite extender manualmente el límite (para tareas grandes confirmadas). */
  extendLimit(newLimit: number): void {
    this.limit = Math.min(newLimit, 50);
    this.warnedExtended = true;
  }

  reset(): void {
    this.count = 0;
  }

  get current(): number {
    return this.count;
  }

  get max(): number {
    return this.limit;
  }
}
