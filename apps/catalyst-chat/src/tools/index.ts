// ─── Catalyst Agent Core — API pública ─────────────────────────────────
// Paquete reusable para cualquier app del monorepo (chat, gui, electron, cli).
// Importa desde aquí en lugar de los archivos internos.
//
// USO:
//   import { AgentLoop, ToolExecutor, executeToolCall, ALL_TOOLS, getToolSchemas } from "@/tools";
//
// BELL 13450.50 | Pentetraktys 4D | 22 herramientas (Codex parity)

// ─── Tool Definitions ──────────────────────────────────────────────
export {
  ALL_TOOLS,
  TOOL_MAP,
  getToolSchemas,
  CLI_SYSTEM_AUGMENT,
} from "./registry";
export type { ToolDef, ToolCategory } from "./registry";

// ─── Tool Execution ────────────────────────────────────────────────
export {
  executeToolCall,
  executeToolCalls,
} from "./executor";
export type { ToolCallRequest, ToolResult } from "./executor";

// ─── Security Guard ────────────────────────────────────────────────
export {
  validateShellCommand,
  validateFilePath,
  resolveProjectPath,
  truncateOutput,
  ToolCallCounter,
  getMaxToolCalls,
  MAX_COMMAND_LENGTH,
  MAX_OUTPUT_LENGTH,
  MAX_TOOL_CALLS_PER_REQUEST,
  BASE_MAX_TOOL_CALLS,
  COMMAND_TIMEOUT_MS,
  MAX_FILE_SIZE_BYTES,
} from "./guard";
export type { GuardResult } from "./guard";

// ─── Convenience ───────────────────────────────────────────────────
import { ALL_TOOLS } from "./registry";
import { executeToolCall } from "./executor";
import { ToolCallCounter } from "./guard";

/** Ejecuta una tool call por nombre (API simplificada). */
export async function runTool(
  name: string,
  args: Record<string, any>,
  counter?: ToolCallCounter
) {
  const id = `tool_${Date.now().toString(36)}`;
  const check = counter?.increment();
  if (check && !check.allowed) {
    return { id, name, success: false, output: "", error: check.reason };
  }
  return executeToolCall({ id, name, arguments: args });
}

/** Lista los nombres de todas las herramientas disponibles. */
export function listToolNames(): string[] {
  return ALL_TOOLS.map((t) => t.name);
}

/** Busca una herramienta por nombre. */
export function findTool(name: string) {
  return ALL_TOOLS.find((t) => t.name === name);
}
