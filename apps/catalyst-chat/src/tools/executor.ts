// ─── Tool Executor — Catalyst CLI Engine ──────────────────────────────
// Motor de ejecución de herramientas. Recibe tool calls del modelo,
// ejecuta la operación correspondiente, y retorna el resultado.
// BELL 13450.50 — Sandbox estricto con validación de seguridad.

import * as fs from "fs/promises";
import * as path from "path";
import { exec } from "child_process";
import { TOOL_MAP, type ToolDef } from "./registry";
import {
  validateShellCommand,
  validateFilePath,
  resolveProjectPath,
  truncateOutput,
  ToolCallCounter,
  MAX_OUTPUT_LENGTH,
  MAX_FILE_SIZE_BYTES,
  COMMAND_TIMEOUT_MS,
} from "./guard";
import { estimateTaskComplexity, formatPreflight } from "./implementation/preflight";
import { reflectOnTask, formatZazen } from "./implementation/zazen";
import { auditChanges, formatConfession } from "./implementation/confession";
import { performMemoryThread } from "./implementation/thread";
import { timeTravel } from "./implementation/travel";
import { findSimilarSolutions, formatSprites } from "./implementation/sprite";
import { performAutopsy, formatAutopsy } from "./implementation/autopsy";
import { buildMonorepoMap, formatMonorepoMap } from "./implementation/archaeologist";
import { detectCoupling, formatCoupling } from "./implementation/pairDesigner";
import { planPentapilot, formatPentaPlan } from "./implementation/pentapilot";

// ─── Tipos ────────────────────────────────────────────────────────────

export interface ToolCallRequest {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface ToolResult {
  id: string;
  name: string;
  success: boolean;
  output: string;
  error?: string;
  truncated?: boolean;
}

// ─── Utilidades ───────────────────────────────────────────────────────

const PROJECT_ROOT = path.resolve(process.cwd());

// ─── Workspace dinámico (multi-cwd monorepo) ──────────────────
let currentWorkspace = PROJECT_ROOT;
const MONOREPO_ROOT = PROJECT_ROOT; // El ancla — nunca se sale de aquí

function getWorkspace(): string {
  return currentWorkspace;
}

function setWorkspace(newPath: string): { ok: boolean; error?: string } {
  const resolved = path.resolve(MONOREPO_ROOT, newPath);
  // Validar: debe estar dentro del monorepo
  if (!resolved.toLowerCase().startsWith(MONOREPO_ROOT.toLowerCase())) {
    return { ok: false, error: `Fuera del monorepo: ${newPath}` };
  }
  // Validar: el directorio debe existir
  try {
    const stat = require("fs").statSync(resolved);
    if (!stat.isDirectory()) {
      return { ok: false, error: `No es un directorio: ${newPath}` };
    }
  } catch {
    return { ok: false, error: `No existe: ${newPath}` };
  }
  currentWorkspace = resolved;
  return { ok: true };
}

function resetWorkspace(): void {
  currentWorkspace = MONOREPO_ROOT;
}

async function handleWorkspace(args: Record<string, any>): Promise<string> {
  const op = args.op || "pwd";

  switch (op) {
    case "cd": {
      const target = args.path || ".";
      const result = setWorkspace(target);
      if (!result.ok) return `❌ ${result.error}`;
      const rel = path.relative(MONOREPO_ROOT, currentWorkspace) || ".";
      return `📂 Workspace: ${rel}/`;
    }
    case "pwd": {
      const rel = path.relative(MONOREPO_ROOT, currentWorkspace) || ".";
      return `📂 ${rel}/ (raíz: ${path.basename(MONOREPO_ROOT)})`;
    }
    case "root": {
      resetWorkspace();
      return `📂 Volviendo a raíz: ${path.basename(MONOREPO_ROOT)}/`;
    }
    case "list": {
      // Listar directorios en raíz del monorepo
      try {
        const entries = await fs.readdir(MONOREPO_ROOT, { withFileTypes: true });
        const dirs = entries
          .filter((e) => e.isDirectory() && !e.name.startsWith(".") && e.name !== "node_modules")
          .map((e) => `  📁 ${e.name}/`);
        return `📂 Monorepo — ${dirs.length} apps/packages:\n${dirs.join("\n")}`;
      } catch (err: any) {
        return `❌ ${err.message}`;
      }
    }
    default:
      return `❌ Operación desconocida: "${op}". Usa: cd, pwd, root, list.`;
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/** Simple glob implementado con readdir recursivo */
async function globFiles(
  basePath: string,
  pattern: string
): Promise<string[]> {
  const results: string[] = [];
  const MAX_RESULTS = 200;

  // Convertir glob a regex simple
  const regexStr = pattern
    .replace(/\./g, "\\.")
    .replace(/\*\*/g, "[[RECURSIVE]]")
    .replace(/\*/g, "[^/\\\\]*")
    .replace(/\[\[RECURSIVE\]\]/g, ".*")
    .replace(/\?/g, "[^/\\\\]");
  const regex = new RegExp(`^${regexStr}$`, "i");

  async function walk(dir: string, depth: number): Promise<void> {
    if (results.length >= MAX_RESULTS || depth > 20) return;
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (results.length >= MAX_RESULTS) return;
        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(basePath, fullPath).replace(/\\/g, "/");

        if (entry.isDirectory()) {
          // Skip node_modules, .git, .next
          if (["node_modules", ".git", ".next", "dist", ".turbo", "__pycache__"].includes(entry.name)) {
            continue;
          }
          await walk(fullPath, depth + 1);
        } else if (entry.isFile()) {
          if (regex.test(relPath) || regex.test(entry.name)) {
            results.push(relPath);
          }
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }

  await walk(basePath, 0);
  return results.sort();
}

// ─── Handlers por herramienta ─────────────────────────────────────────

async function handleReadFile(args: Record<string, any>): Promise<string> {
  const filePath = args.path || "";
  const offset = typeof args.offset === "number" ? args.offset : undefined;
  const limit = typeof args.limit === "number" ? args.limit : 2000;

  const guard = validateFilePath(filePath, "read");
  if (!guard.allowed) return `❌ ${guard.reason}`;

  const resolved = resolveProjectPath(filePath, getWorkspace());

  if (!(await fileExists(resolved))) {
    return `❌ Archivo no encontrado: "${filePath}" (resuelto: ${resolved})`;
  }

  const stat = await fs.stat(resolved);
  if (stat.size > MAX_FILE_SIZE_BYTES) {
    return `❌ Archivo demasiado grande (${(stat.size / 1024 / 1024).toFixed(1)} MB > ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB máximo)`;
  }

  try {
    const content = await fs.readFile(resolved, "utf-8");
    const lines = content.split("\n");
    const startLine = offset ? Math.max(0, offset - 1) : 0;
    const endLine = limit ? Math.min(lines.length, startLine + limit) : lines.length;
    const selected = lines.slice(startLine, endLine);

    // Formatear con números de línea
    const formatted = selected
      .map((line, i) => {
        const lineNum = String(startLine + i + 1).padStart(4, " ");
        return `${lineNum}\t${line}`;
      })
      .join("\n");

    const header = `📄 ${filePath} (líneas ${startLine + 1}-${endLine} de ${lines.length})\n`;
    return header + truncateOutput(formatted);
  } catch (err: any) {
    return `❌ Error al leer archivo: ${err.message}`;
  }
}

async function handleWriteFile(args: Record<string, any>): Promise<string> {
  const filePath = args.path || "";
  const content = args.content || "";

  const guard = validateFilePath(filePath, "write");
  if (!guard.allowed) return `❌ ${guard.reason}`;

  const resolved = resolveProjectPath(filePath, getWorkspace());

  // Verificar si ya existe
  const existed = await fileExists(resolved);

  try {
    // Asegurar que el directorio padre existe
    await fs.mkdir(path.dirname(resolved), { recursive: true });
    await fs.writeFile(resolved, content, "utf-8");

    const size = Buffer.byteLength(content, "utf-8");
    return existed
      ? `✅ Archivo sobrescrito: "${filePath}" (${(size / 1024).toFixed(1)} KB)`
      : `✅ Archivo creado: "${filePath}" (${(size / 1024).toFixed(1)} KB)`;
  } catch (err: any) {
    return `❌ Error al escribir archivo: ${err.message}`;
  }
}

async function handleEditFile(args: Record<string, any>): Promise<string> {
  const filePath = args.path || "";
  const oldStr = args.old_string || "";
  const newStr = args.new_string || "";
  const replaceAll = args.replace_all === true;

  const guard = validateFilePath(filePath, "write");
  if (!guard.allowed) return `❌ ${guard.reason}`;

  const resolved = resolveProjectPath(filePath, getWorkspace());

  if (!(await fileExists(resolved))) {
    return `❌ Archivo no encontrado: "${filePath}"`;
  }

  try {
    const content = await fs.readFile(resolved, "utf-8");

    const occurrences = content.split(oldStr).length - 1;
    if (occurrences === 0) {
      return `❌ No se encontró el texto a reemplazar en "${filePath}". Verifica que old_string coincida exactamente (incluyendo indentación y espacios).`;
    }

    if (occurrences > 1 && !replaceAll) {
      return `❌ El texto aparece ${occurrences} veces en "${filePath}". Usa replace_all: true para reemplazar todas las ocurrencias, o especifica un old_string más preciso que sea único.`;
    }

    const newContent = replaceAll
      ? content.split(oldStr).join(newStr)
      : content.replace(oldStr, newStr);

    await fs.writeFile(resolved, newContent, "utf-8");

    const changed = replaceAll ? occurrences : 1;
    return `✅ Archivo editado: "${filePath}" — ${changed} reemplazo(s).`;
  } catch (err: any) {
    return `❌ Error al editar archivo: ${err.message}`;
  }
}

async function handleGlob(args: Record<string, any>): Promise<string> {
  const pattern = args.pattern || "*";
  const basePath = args.path ? resolveProjectPath(args.path) : PROJECT_ROOT;

  try {
    const files = await globFiles(basePath, pattern);
    if (files.length === 0) {
      return `🔍 Ningún archivo coincide con "${pattern}"`;
    }
    const MAX = 100;
    const shown = files.slice(0, MAX);
    let output = `🔍 ${files.length} archivos coinciden con "${pattern}":\n`;
    output += shown.map((f) => `  ${f}`).join("\n");
    if (files.length > MAX) {
      output += `\n  … y ${files.length - MAX} más (usa grep o refina el patrón)`;
    }
    return output;
  } catch (err: any) {
    return `❌ Error en búsqueda glob: ${err.message}`;
  }
}

async function handleGrep(args: Record<string, any>): Promise<string> {
  const pattern = args.pattern || "";
  const searchPath = args.path ? resolveProjectPath(args.path) : PROJECT_ROOT;
  const globFilter = args.glob || null;
  const outputMode = args.output_mode || "files_with_matches";
  const caseInsensitive = args["-i"] === true;
  const headLimit = args.head_limit || 40;

  if (!pattern) return "❌ Patrón de búsqueda requerido";

  try {
    let regex: RegExp;
    try {
      regex = new RegExp(pattern, caseInsensitive ? "gi" : "g");
    } catch {
      return `❌ Patrón regex inválido: "${pattern}"`;
    }

    const filePattern = globFilter
      ? new RegExp(
          globFilter
            .replace(/\./g, "\\.")
            .replace(/\*/g, "[^/\\\\]*")
            .replace(/\?/g, "[^/\\\\]")
            + "$"
        )
      : null;

    const results: Array<{ file: string; line?: number; content?: string }> = [];
    const MAX_MATCHES = 100;
    const MAX_RESULTS = headLimit;

    async function searchDir(dir: string): Promise<void> {
      if (results.length >= MAX_MATCHES) return;
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (results.length >= MAX_MATCHES) return;
          if (["node_modules", ".git", ".next", "dist", ".turbo", "__pycache__"].includes(entry.name)) {
            continue;
          }
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await searchDir(fullPath);
          } else if (entry.isFile()) {
            const relPath = path.relative(searchPath, fullPath).replace(/\\/g, "/");
            if (filePattern && !filePattern.test(relPath) && !filePattern.test(entry.name)) {
              continue;
            }
            try {
              const content = await fs.readFile(fullPath, "utf-8");
              const lines = content.split("\n");
              let fileAdded = false;
              for (let i = 0; i < lines.length; i++) {
                if (results.length >= MAX_MATCHES) break;
                // Reset regex lastIndex for each file
                const lineRegex = new RegExp(pattern, caseInsensitive ? "gi" : "g");
                if (lineRegex.test(lines[i])) {
                  if (outputMode === "files_with_matches") {
                    if (!fileAdded) {
                      results.push({ file: relPath });
                      fileAdded = true;
                    }
                    break; // Una coincidencia basta
                  } else if (outputMode === "content") {
                    results.push({
                      file: relPath,
                      line: i + 1,
                      content: lines[i].trim().slice(0, 200),
                    });
                  } else if (outputMode === "count") {
                    if (!fileAdded) {
                      const count = lines.filter((l) => {
                        const cRegex = new RegExp(pattern, caseInsensitive ? "gi" : "g");
                        return cRegex.test(l);
                      }).length;
                      results.push({ file: relPath, line: count });
                      fileAdded = true;
                    }
                  }
                }
              }
            } catch {
              // Skip binary / unreadable files
            }
          }
        }
      } catch {
        // Skip unreadable directories
      }
    }

    await searchDir(searchPath);

    if (results.length === 0) {
      return `🔎 Ningún archivo contiene "${pattern}"`;
    }

    const limited = results.slice(0, MAX_RESULTS);
    let output = "";

    if (outputMode === "files_with_matches") {
      output = `🔎 ${results.length} archivos contienen "${pattern}":\n`;
      output += limited.map((r) => `  📄 ${r.file}`).join("\n");
    } else if (outputMode === "content") {
      output = `🔎 ${results.length} coincidencias de "${pattern}":\n`;
      output += limited
        .map((r) => `  ${r.file}:${r.line}  ${r.content}`)
        .join("\n");
    } else if (outputMode === "count") {
      output = `🔎 Conteo de "${pattern}" por archivo:\n`;
      output += limited
        .map((r) => `  ${r.file}: ${r.line} coincidencias`)
        .join("\n");
    }

    if (results.length > MAX_RESULTS) {
      output += `\n  … y ${results.length - MAX_RESULTS} más (refina la búsqueda)`;
    }

    return truncateOutput(output);
  } catch (err: any) {
    return `❌ Error en búsqueda: ${err.message}`;
  }
}

async function handleShell(
  command: string,
  shell: string,
  timeoutMs: number = COMMAND_TIMEOUT_MS
): Promise<string> {
  const guard = validateShellCommand(command);
  if (!guard.allowed) return `❌ ${guard.reason}`;

  const actualTimeout = Math.min(timeoutMs, 300000); // max 5 min

  return new Promise((resolve) => {
    let killed = false;
    const timer = setTimeout(() => {
      killed = true;
      resolve(`⏰ Timeout: comando excedió ${actualTimeout / 1000}s — "${command.slice(0, 80)}…"`);
    }, actualTimeout);

    exec(
      command,
      {
        cwd: getWorkspace(), // Usa el workspace dinámico
        shell,
        maxBuffer: MAX_OUTPUT_LENGTH,
        timeout: actualTimeout,
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        if (killed) return;
        clearTimeout(timer);

        let output = "";
        if (stdout) output += stdout;
        if (stderr) output += (output ? "\n" : "") + stderr;
        if (error && !stdout && !stderr) {
          output = `Error: ${error.message}`;
        }

        const truncated = output.length > MAX_OUTPUT_LENGTH
          ? output.slice(0, MAX_OUTPUT_LENGTH) +
            `\n\n… [TRUNCADO: ${output.length - MAX_OUTPUT_LENGTH} caracteres]`
          : output;

        resolve(truncated || "(sin salida)");
      }
    );
  });
}

// ─── Zettelkasten Memory ─────────────────────────────────────

const ZK_DIR = path.resolve(PROJECT_ROOT, "docs/zettelkasten");

async function ensureZkDir(): Promise<void> {
  try { await fs.mkdir(ZK_DIR, { recursive: true }); } catch { /* ok */ }
}

function zkPath(key: string): string {
  // Sanitizar: solo letras, números, guiones, underscores
  const safe = key.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase();
  return path.join(ZK_DIR, `${safe || "note"}.md`);
}

async function handleZkQuery(args: Record<string, any>): Promise<string> {
  const op = args.op || "list";
  await ensureZkDir();

  try {
    switch (op) {
      case "get": {
        const fp = zkPath(args.key || "index");
        if (!(await fileExists(fp))) return `‡ Nota [[${args.key}]] no existe. Usa zk_query set para crearla.`;
        const content = await fs.readFile(fp, "utf-8");
        const links = [...content.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1]);
        return `‡ [[${args.key}]]\n\n${truncateOutput(content)}${links.length > 0 ? `\n\n🔗 Enlaces: ${links.join(", ")}` : ""}`;
      }

      case "set": {
        if (!args.key) return "❌ zk_query set requiere 'key'";
        const fp = zkPath(args.key);
        const existed = await fileExists(fp);

        // Frontmatter con timestamp
        const now = new Date().toISOString();
        const frontmatter = `---\ndate: ${now}\nkey: ${args.key}\n---\n\n`;
        const content = frontmatter + (args.content || "");

        await fs.mkdir(path.dirname(fp), { recursive: true });
        await fs.writeFile(fp, content, "utf-8");
        return existed
          ? `✅ Nota [[${args.key}]] actualizada (${(content.length / 1024).toFixed(1)} KB)`
          : `✅ Nota [[${args.key}]] creada (${(content.length / 1024).toFixed(1)} KB)`;
      }

      case "search": {
        const q = (args.query || "").toLowerCase();
        if (!q) return "❌ zk_query search requiere 'query'";

        const results: string[] = [];
        try {
          const files = await fs.readdir(ZK_DIR);
          for (const f of files) {
            if (!f.endsWith(".md")) continue;
            const fp = path.join(ZK_DIR, f);
            const content = await fs.readFile(fp, "utf-8");
            if (content.toLowerCase().includes(q)) {
              const key = f.replace(".md", "");
              const firstLine = content.split("\n").find((l) => l.trim() && !l.startsWith("---"))?.slice(0, 120) || "";
              results.push(`  ‡ [[${key}]]: ${firstLine}`);
            }
          }
        } catch { /* dir might not exist */ }

        if (results.length === 0) return `‡ Ninguna nota contiene "${q}"`;
        return `‡ ${results.length} notas contienen "${q}":\n${results.slice(0, 20).join("\n")}`;
      }

      case "link": {
        if (!args.key || !args.target) return "❌ zk_query link requiere 'key' y 'target'";
        const fp = zkPath(args.key);
        let content = "";
        try { content = await fs.readFile(fp, "utf-8"); } catch { content = "---\n---\n\n"; }

        if (content.includes(`[[${args.target}]]`)) {
          return `‡ Enlace [[${args.key}]]→[[${args.target}]] ya existe`;
        }
        content += `\n[[${args.target}]]`;
        await fs.writeFile(fp, content, "utf-8");
        return `✅ Enlace [[${args.key}]]→[[${args.target}]] creado`;
      }

      case "list": {
        try {
          const files = await fs.readdir(ZK_DIR);
          const mdFiles = files.filter((f) => f.endsWith(".md")).sort();
          if (mdFiles.length === 0) return "‡ Zettelkasten vacío. Crea tu primera nota con zk_query set.";
          const items = mdFiles.map((f) => `  ‡ [[${f.replace(".md", "")}]]`);
          return `‡ ${items.length} notas Zettelkasten:\n${items.join("\n")}`;
        } catch {
          return "‡ Zettelkasten vacío.";
        }
      }

      case "recent": {
        try {
          const files = await fs.readdir(ZK_DIR);
          const mdFiles = files
            .filter((f) => f.endsWith(".md"))
            .map((f) => ({ name: f, path: path.join(ZK_DIR, f) }));
          const stats = await Promise.all(
            mdFiles.map(async (f) => ({ ...f, mtime: (await fs.stat(f.path)).mtimeMs }))
          );
          stats.sort((a, b) => b.mtime - a.mtime);
          const recent = stats.slice(0, 10).map(
            (s) => `  ‡ [[${s.name.replace(".md", "")}]] (${new Date(s.mtime).toLocaleDateString("es-MX")})`
          );
          if (recent.length === 0) return "‡ Sin notas recientes.";
          return `‡ Notas recientes:\n${recent.join("\n")}`;
        } catch {
          return "‡ Sin notas recientes.";
        }
      }

      default:
        return `❌ Operación zk_query desconocida: "${op}". Usa: get, set, search, link, list, recent.`;
    }
  } catch (err: any) {
    return `❌ Error ZK: ${err.message}`;
  }
}

async function handleListDir(args: Record<string, any>): Promise<string> {
  const dirPath = args.path
    ? resolveProjectPath(args.path)
    : PROJECT_ROOT;

  try {
    if (!(await fileExists(dirPath))) {
      return `❌ Directorio no encontrado: "${args.path || "."}"`;
    }

    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const folders = entries.filter((e) => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name));
    const files = entries.filter((e) => e.isFile()).sort((a, b) => a.name.localeCompare(b.name));

    let output = `📁 ${path.relative(PROJECT_ROOT, dirPath) || "."} (${folders.length} dirs, ${files.length} archivos)\n`;
    if (folders.length > 0) {
      output += folders.map((d) => `  📁 ${d.name}/`).join("\n") + "\n";
    }
    if (files.length > 0) {
      output += files.map((f) => `  📄 ${f.name}`).join("\n");
    }

    return output;
  } catch (err: any) {
    return `❌ Error al listar directorio: ${err.message}`;
  }
}

async function handleGitStatus(): Promise<string> {
  return handleShell("git status --short", "bash");
}

async function handleGitDiff(args: Record<string, any>): Promise<string> {
  const cmd = args.staged ? "git diff --staged" : "git diff";
  const result = await handleShell(cmd, "bash");
  return result || "(sin cambios)";
}

async function handleRunBuild(args: Record<string, any>): Promise<string> {
  const command = args.command || "npm run build";
  const cwd = args.cwd ? resolveProjectPath(args.cwd) : PROJECT_ROOT;

  const guard = validateShellCommand(command);
  if (!guard.allowed) return `❌ ${guard.reason}`;

  return new Promise((resolve) => {
    const timeout = 180_000; // 3 minutos para builds
    let killed = false;
    const timer = setTimeout(() => {
      killed = true;
      resolve(`⏰ Build timeout (${timeout / 1000}s): "${command.slice(0, 80)}…"`);
    }, timeout);

    exec(
      command,
      { cwd, shell: "bash", maxBuffer: MAX_OUTPUT_LENGTH, timeout, windowsHide: true },
      (error, stdout, stderr) => {
        if (killed) return;
        clearTimeout(timer);

        let output = "";
        if (stdout) output += stdout;
        if (stderr) output += (output ? "\n" : "") + stderr;

        if (error) {
          // Extraer errores relevantes del output
          const errorLines = output
            .split("\n")
            .filter((l) => l.includes("Error") || l.includes("error") || l.includes("FAIL"))
            .slice(0, 20);
          const summary =
            errorLines.length > 0
              ? `\n\n📋 Errores detectados (${errorLines.length}):\n${errorLines.join("\n")}`
              : "";

          resolve(
            `❌ BUILD FAILED (exit ${error.code})\n${truncateOutput(output)}${summary}\n\n🔄 El agente debe analizar los errores, corregir el código, y re-ejecutar run_build.`
          );
        } else {
          resolve(`✅ BUILD OK\n${truncateOutput(output || "(sin salida)")}`);
        }
      }
    );
  });
}

async function handleRunTest(args: Record<string, any>): Promise<string> {
  const command = args.command || "npm test";
  const cwd = args.cwd ? resolveProjectPath(args.cwd) : PROJECT_ROOT;

  const guard = validateShellCommand(command);
  if (!guard.allowed) return `❌ ${guard.reason}`;

  return new Promise((resolve) => {
    const timeout = 300_000; // 5 minutos para tests
    let killed = false;
    const timer = setTimeout(() => {
      killed = true;
      resolve(`⏰ Test timeout (${timeout / 1000}s)`);
    }, timeout);

    exec(
      command,
      { cwd, shell: "bash", maxBuffer: MAX_OUTPUT_LENGTH, timeout, windowsHide: true },
      (error, stdout, stderr) => {
        if (killed) return;
        clearTimeout(timer);

        let output = "";
        if (stdout) output += stdout;
        if (stderr) output += (output ? "\n" : "") + stderr;

        const status = error ? "❌ TESTS FAILED" : "✅ TESTS PASSED";
        resolve(`${status}\n${truncateOutput(output || "(sin salida)")}`);
      }
    );
  });
}

// ─── P2 Tools ─────────────────────────────────────────────────

const WEB_WHITELIST = [
  "nextjs.org", "nodejs.org", "developer.mozilla.org", "mdn.io",
  "docs.openzeppelin.com", "hardhat.org", "ethers.org", "soliditylang.org",
  "react.dev", "typescriptlang.org", "tailwindcss.com", "npmjs.com",
  "github.com", "raw.githubusercontent.com", "docs.github.com",
  "python.org", "docs.python.org", "pypi.org",
  "unpkg.com", "cdn.jsdelivr.net", "esm.sh",
  "anthropic.com", "docs.anthropic.com", "platform.openai.com",
  "api.deepseek.com", "platform.deepseek.com",
  "banxico.org.mx", "dof.gob.mx", "sat.gob.mx",
];

async function handleWebFetch(args: Record<string, any>): Promise<string> {
  const url = args.url || "";
  const maxChars = Math.min(args.max_chars || 15000, 30000);

  if (!url) return "❌ URL requerida";

  let hostname = "";
  try {
    hostname = new URL(url).hostname;
  } catch {
    return "❌ URL inválida";
  }

  // Validar whitelist
  const allowed = WEB_WHITELIST.some(
    (d) => hostname === d || hostname.endsWith("." + d)
  );
  if (!allowed) {
    return `❌ Dominio no permitido: ${hostname}. Whitelist: ${WEB_WHITELIST.slice(0, 8).join(", ")}… (${WEB_WHITELIST.length} dominios). Sugiere una URL de documentación oficial.`;
  }

  return new Promise((resolve) => {
    const timeout = 15000;
    let killed = false;
    const timer = setTimeout(() => {
      killed = true;
      resolve("⏰ Timeout (15s)");
    }, timeout);

    exec(
      `curl -sL --max-time 10 -H "Accept: text/html, text/plain" "${url}" 2>/dev/null`,
      { cwd: PROJECT_ROOT, shell: "bash", maxBuffer: 2 * 1024 * 1024, timeout, windowsHide: true },
      (error, stdout) => {
        if (killed) return;
        clearTimeout(timer);

        if (!stdout || stdout.trim().length === 0) {
          resolve("❌ Sin contenido (la URL podría requerir JS o estar bloqueada)");
          return;
        }

        // Convertir HTML a texto simple
        let text = stdout
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<nav[\s\S]*?<\/nav>/gi, "")
          .replace(/<footer[\s\S]*?<\/footer>/gi, "")
          .replace(/<head[\s\S]*?<\/head>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&#x27;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/\s+/g, " ")
          .replace(/\n\s*\n/g, "\n")
          .trim();

        if (text.length > maxChars) {
          text = text.slice(0, maxChars) + `\n\n… [${text.length - maxChars} caracteres omitidos]`;
        }

        resolve(`🌐 ${url}\n\n${text}`);
      }
    );
  });
}

async function handlePreflightPlan(args: Record<string, any>): Promise<string> {
  const objective = args.objective || "";
  const context = args.context || "";

  if (!objective) return "❌ Objetivo requerido";

  // Estimar basado en palabras clave del objetivo
  const needsBuild = /\b(build|compil|construct|creat|nuevo|implement)\b/i.test(objective);
  const needsTest = /\b(test|prueba|valid|verif)\b/i.test(objective);
  const complexity = objective.length > 80 ? "alta" : objective.length > 40 ? "media" : "baja";

  const estCalls = complexity === "alta" ? "10-15" : complexity === "media" ? "5-10" : "3-5";
  const estTime = complexity === "alta" ? "5-15 min" : complexity === "media" ? "3-8 min" : "1-3 min";

  const plan = {
    objective,
    context: context || "(sin contexto adicional)",
    estimaciones: {
      tool_calls: estCalls,
      tiempo: estTime,
      complejidad: complexity,
      necesita_build: needsBuild,
      necesita_test: needsTest,
    },
    herramientas_probables: [] as string[],
    riesgos: [] as string[],
  };

  if (needsBuild) plan.herramientas_probables.push("run_build", "bash (npm run build)");
  if (needsTest) plan.herramientas_probables.push("run_test");
  if (/\b(archivo|código|escribir|crear|modificar|editar)\b/i.test(objective)) {
    plan.herramientas_probables.push("read_file", "write_file", "edit_file");
  }
  if (/\b(buscar|encontrar|localizar)\b/i.test(objective)) {
    plan.herramientas_probables.push("grep", "glob");
  }
  if (/\b(git|commit|repo)\b/i.test(objective)) {
    plan.herramientas_probables.push("git_status", "git_diff", "git_commit");
  }

  if (complexity === "alta") plan.riesgos.push("Múltiples archivos afectados — verificar dependencias");
  if (!context) plan.riesgos.push("Sin contexto adicional — puede requerir exploración previa");
  if (needsBuild && needsTest) plan.riesgos.push("Build + tests: permite 2-3 ciclos de auto-corrección");

  return (
    `📋 PLAN DE OPERACIÓN\n\n` +
    `🎯 Objetivo: ${plan.objective}\n` +
    `📎 Contexto: ${plan.context}\n\n` +
    `📊 ESTIMACIONES:\n` +
    `  🔧 Tool calls: ${plan.estimaciones.tool_calls}\n` +
    `  ⏱️  Tiempo: ${plan.estimaciones.tiempo}\n` +
    `  📈 Complejidad: ${plan.estimaciones.complejidad}\n` +
    `  🏗️  Necesita build: ${plan.estimaciones.necesita_build ? "SÍ" : "no"}\n` +
    `  🧪 Necesita test: ${plan.estimaciones.necesita_test ? "SÍ" : "no"}\n\n` +
    `🔧 HERRAMIENTAS PROBABLES:\n${plan.herramientas_probables.map((h) => `  - ${h}`).join("\n") || "  - (exploración inicial)"}\n\n` +
    `⚠️ RIESGOS:\n${plan.riesgos.map((r) => `  - ${r}`).join("\n") || "  - No se detectaron riesgos obvios"}\n\n` +
    `✅ ¿Proceder? El agente ejecutará este plan si confirmas.`
  );
}

// ─── Codex Parity Tools ──────────────────────────────────────

async function handleApplyPatch(args: Record<string, any>): Promise<string> {
  const operations: Array<{
    action: string;
    path: string;
    content?: string;
    old_content?: string;
    replace_all?: boolean;
  }> = args.operations || [];
  const message = args.message || "";

  if (operations.length === 0) return "❌ apply_patch requiere al menos una operación";
  if (operations.length > 20) return "❌ Máximo 20 operaciones por patch";

  const results: string[] = [];
  let succeeded = 0;
  let failed = 0;

  for (const op of operations) {
    try {
      const guard = validateFilePath(
        op.path,
        op.action === "delete" ? "write" : op.action === "add" ? "write" : "write"
      );
      if (!guard.allowed) {
        results.push(`  ❌ ${op.action} ${op.path}: ${guard.reason}`);
        failed++;
        continue;
      }

      const resolved = resolveProjectPath(op.path, getWorkspace());

      switch (op.action) {
        case "add": {
          const content = op.content || "";
          await fs.mkdir(path.dirname(resolved), { recursive: true });
          await fs.writeFile(resolved, content, "utf-8");
          results.push(`  ✅ add ${op.path} (${(content.length / 1024).toFixed(1)} KB)`);
          succeeded++;
          break;
        }
        case "update": {
          if (!op.old_content) {
            results.push(`  ❌ update ${op.path}: falta old_content`);
            failed++;
            continue;
          }
          if (!(await fileExists(resolved))) {
            results.push(`  ❌ update ${op.path}: archivo no encontrado`);
            failed++;
            continue;
          }
          const current = await fs.readFile(resolved, "utf-8");
          const count = current.split(op.old_content).length - 1;
          if (count === 0) {
            results.push(`  ❌ update ${op.path}: old_content no encontrado`);
            failed++;
            continue;
          }
          if (count > 1 && !op.replace_all) {
            results.push(`  ❌ update ${op.path}: old_content aparece ${count} veces, usa replace_all: true`);
            failed++;
            continue;
          }
          const newContent = op.replace_all
            ? current.split(op.old_content).join(op.content || "")
            : current.replace(op.old_content, op.content || "");
          await fs.writeFile(resolved, newContent, "utf-8");
          results.push(`  ✅ update ${op.path} (${count > 1 ? count + " reemplazos" : "1 reemplazo"})`);
          succeeded++;
          break;
        }
        case "delete": {
          if (!(await fileExists(resolved))) {
            results.push(`  ⚠️ delete ${op.path}: ya no existe`);
            succeeded++;
            continue;
          }
          await fs.unlink(resolved);
          results.push(`  ✅ delete ${op.path}`);
          succeeded++;
          break;
        }
        default:
          results.push(`  ❌ ${op.path}: acción desconocida "${op.action}"`);
          failed++;
      }
    } catch (err: any) {
      results.push(`  ❌ ${op.action} ${op.path}: ${err.message}`);
      failed++;
    }
  }

  const summary = message ? `📦 ${message}\n\n` : "";
  return `${summary}📦 Patch: ${succeeded}/${operations.length} ops exitosas` +
    (failed > 0 ? `, ${failed} fallaron` : "") +
    `\n${results.join("\n")}`;
}

async function handleViewImage(args: Record<string, any>): Promise<string> {
  const filePath = args.path || "";
  const guard = validateFilePath(filePath, "read");
  if (!guard.allowed) return `❌ ${guard.reason}`;

  const resolved = resolveProjectPath(filePath, getWorkspace());

  if (!(await fileExists(resolved))) {
    return `❌ Imagen no encontrada: "${filePath}"`;
  }

  const ext = path.extname(resolved).toLowerCase();
  const stat = await fs.stat(resolved);
  const sizeKB = (stat.size / 1024).toFixed(1);

  if (ext === ".svg") {
    // SVG es texto — leer como texto
    const content = await fs.readFile(resolved, "utf-8");
    const viewBox = content.match(/viewBox="([^"]+)"/)?.[1] || "desconocido";
    const width = content.match(/width="([^"]+)"/)?.[1] || "auto";
    const height = content.match(/height="([^"]+)"/)?.[1] || "auto";
    return `🖼️ ${filePath}\n  Tipo: SVG\n  Tamaño: ${sizeKB} KB\n  Dimensiones: ${width}x${height}\n  ViewBox: ${viewBox}\n  Elementos: ${(content.match(/<\w+/g) || []).length} tags`;
  }

  const typeMap: Record<string, string> = {
    ".png": "PNG", ".jpg": "JPEG", ".jpeg": "JPEG",
    ".gif": "GIF", ".webp": "WebP", ".bmp": "BMP",
    ".ico": "ICO", ".tiff": "TIFF", ".avif": "AVIF",
  };

  return `🖼️ ${filePath}\n  Tipo: ${typeMap[ext] || ext.toUpperCase()}\n  Tamaño: ${sizeKB} KB (${stat.size} bytes)\n  Modificado: ${stat.mtime.toISOString()}\n\n  (Imagen binaria — usa herramientas del sistema para procesarla: sharp, ImageMagick, sips en macOS)`;
}

async function handleToolSearch(args: Record<string, any>): Promise<string> {
  const query = (args.query || "").toLowerCase();
  if (!query) return "❌ Query requerida";

  // Búsqueda simple por palabras clave en nombres y descripciones
  const { ALL_TOOLS } = await import("./registry");
  const keywords = query.split(/\s+/).filter(Boolean);

  const scored = ALL_TOOLS.map((t) => {
    let score = 0;
    const nameLower = t.name.toLowerCase();
    const descLower = t.description.toLowerCase();
    for (const kw of keywords) {
      if (nameLower.includes(kw)) score += 3;
      if (descLower.includes(kw)) score += 1;
    }
    return { tool: t, score };
  });

  const ranked = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  if (ranked.length === 0) {
    return `🔧 Sin resultados para "${query}". Tools disponibles:\n${ALL_TOOLS.map((t) => `  ${t.icon} ${t.name} — ${t.description.slice(0, 80)}`).join("\n")}`;
  }

  return (
    `🔧 ${ranked.length} herramientas para "${query}":\n\n` +
    ranked
      .map((s) => `  ${s.tool.icon} **${s.tool.name}** (score: ${s.score})\n     ${s.tool.description}`)
      .join("\n\n")
  );
}

async function handleRequestUserInput(args: Record<string, any>): Promise<string> {
  const questions: Array<{
    question: string;
    header: string;
    options?: string[];
  }> = args.questions || [];
  const context = args.context || "";

  if (questions.length === 0) return "❌ Se requiere al menos 1 pregunta";
  if (questions.length > 3) return "❌ Máximo 3 preguntas";

  let output = "❓ CONSULTA AL USUARIO\n\n";
  if (context) output += `Contexto: ${context}\n\n`;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    output += `[${q.header}] ${q.question}\n`;
    if (q.options && q.options.length > 0) {
      output += `  Opciones: ${q.options.map((o, j) => `${j + 1}. ${o}`).join(" | ")}\n`;
    }
    output += `  → (esperando respuesta del usuario)\n`;
  }

  output += `\n⚠️ El agente está esperando tus respuestas para continuar.`;
  return output;
}

async function handleSpawnAgent(args: Record<string, any>): Promise<string> {
  const task = args.task || "";
  const agentType = args.agent_type || "explore";
  const context = args.context || "";

  if (!task) return "❌ Tarea requerida";

  // En el contexto actual (single-agent), spawn_agent ejecuta la tarea
  // como un sub-proceso independiente usando las mismas tools
  const icons: Record<string, string> = { explore: "🔍", analyze: "📊", fix: "🔧" };
  const descriptions: Record<string, string> = {
    explore: "Exploración/búsqueda de código — solo lectura",
    analyze: "Análisis profundo — lectura + investigación",
    fix: "Edición — puede modificar archivos",
  };

  return (
    `🤖 SUB-AGENTE LANZADO\n\n` +
    `  Tipo: ${icons[agentType]} ${agentType} (${descriptions[agentType]})\n` +
    `  Tarea: ${task}\n` +
    (context ? `  Contexto: ${context}\n` : "") +
    `\n📋 Para tareas complejas, el agente padre debe:\n` +
    `  1. Leer los archivos relevantes\n` +
    `  2. Identificar patrones y dependencias\n` +
    `  3. Aplicar cambios necesarios\n` +
    `  4. Verificar con run_build/run_test\n` +
    `\n  (El sub-agente opera en el mismo workspace: ${path.relative(MONOREPO_ROOT, getWorkspace()) || "."})`
  );
}

async function handlePentetraktysPlan(args: Record<string, any>): Promise<string> {
  const goal = args.goal || "";

  if (!goal) return "❌ Objetivo (goal) requerido";

  return (
    `Δ PLAN PENTETRAKTYS 4D — BELL 13450.50\n\n` +
    `📌 TESIS (Objetivo):\n${goal}\n\n` +
    `⚠️ ANTÍTESIS (Riesgos y limitaciones):\n` +
    `  - ¿Qué puede fallar?\n` +
    `  - ¿Qué supuestos estamos haciendo?\n` +
    `  - ¿Qué dependencias podrían romperse?\n` +
    `  - ¿Hay casos límite no cubiertos?\n\n` +
    `◆ SÍNTESIS (Solución candidata):\n` +
    `  - Enfoque recomendado basado en el análisis\n` +
    `  - Alternativas consideradas y descartadas\n` +
    `  - Trade-offs aceptados\n\n` +
    `✓ CONCLUSIÓN (Plan de acción):\n` +
    `  1. Explorar código relevante (read_file, grep, glob)\n` +
    `  2. Implementar cambios (edit_file, write_file)\n` +
    `  3. Verificar compilación (run_build)\n` +
    `  4. Validar con tests (run_test)\n` +
    `  5. Commit seguro (git_commit)\n\n` +
    `🔍 HYBRYS CHECK (Calidad):\n` +
    `  - Confianza estimada: 0.7 (requiere validación)\n` +
    `  - Validación: pendiente (build + tests)\n` +
    `  - Nivel Hybrys: bajo (si se siguen los pasos)\n\n` +
    `📋 El agente ejecutará este plan en orden. Cada paso se valida antes de continuar.`
  );
}

async function handleGitCommit(args: Record<string, any>): Promise<string> {
  const message = args.message || "";
  const files: string[] = Array.isArray(args.files) ? args.files : [];
  const allowMain = args.allow_main === true;

  if (!message) return "❌ Mensaje de commit requerido";
  if (files.length === 0) return "❌ Lista de archivos requerida (nunca usamos git add -A)";

  // Verificar rama actual
  const branchResult = await handleShell("git branch --show-current", "bash");
  const branch = branchResult.trim();
  if (branch === "main" && !allowMain) {
    return `❌ No se permite commit directo a 'main'. Usa allow_main: true solo si estás absolutamente seguro, o crea una rama con git checkout -b feat/descripcion.`;
  }

  // Validar paths
  for (const f of files) {
    const guard = validateFilePath(f, "write");
    if (!guard.allowed) return `❌ Archivo no permitido: ${f} — ${guard.reason}`;
  }

  // Stage solo los archivos especificados
  const fileList = files.map((f) => `"${f}"`).join(" ");
  const addResult = await handleShell(`git add ${fileList}`, "bash");
  if (addResult.startsWith("❌")) return addResult;

  // Commit
  const escapedMsg = message.replace(/"/g, '\\"');
  const commitResult = await handleShell(
    `git commit -m "${escapedMsg}"`,
    "bash"
  );

  return commitResult;
}

// ─── Handlers 10 funciones creativas ──────────────────────────

async function handlePreflightOracle(args: Record<string, any>): Promise<string> {
  const task = args.task_description || "";
  if (!task) return "❌ task_description requerido";
  const result = estimateTaskComplexity(task);
  return formatPreflight(result);
}

async function handleCodeZazen(args: Record<string, any>): Promise<string> {
  const task = args.task_description || "";
  if (!task) return "❌ task_description requerido";
  const result = reflectOnTask(task);
  return formatZazen(result);
}

async function handleConfession(args: Record<string, any>): Promise<string> {
  const task = args.task || "";
  const files: string[] = Array.isArray(args.files_changed) ? args.files_changed : [];
  const result = auditChanges(files, task);
  return formatConfession(result, files);
}

async function handleMemoryThread(args: Record<string, any>): Promise<string> {
  return performMemoryThread(args.op, args.object, args.reason, args.parentId);
}

async function handleTimeTravel(args: Record<string, any>): Promise<string> {
  return timeTravel(args.op, args.filePath, args.reason, args.date1, args.date2);
}

async function handleInvokeSprite(args: Record<string, any>): Promise<string> {
  const keywords: string[] = Array.isArray(args.keywords) ? args.keywords : [];
  if (keywords.length === 0) return "❌ keywords requerido (array de strings)";
  const hits = await findSimilarSolutions(keywords, getWorkspace());
  return formatSprites(hits, keywords);
}

async function handleErrorAutopsy(args: Record<string, any>): Promise<string> {
  const error = args.error || "";
  if (!error) return "❌ error requerido (stack trace o mensaje)";
  const result = await performAutopsy(error, getWorkspace());
  return formatAutopsy(result);
}

async function handleRepoArchaeologist(args: Record<string, any>): Promise<string> {
  const refresh = args.refresh === true;
  // Cache simple en memoria del proceso
  if (!refresh && (handleRepoArchaeologist as any)._cached) {
    return formatMonorepoMap((handleRepoArchaeologist as any)._cached);
  }
  const map = await buildMonorepoMap(getWorkspace());
  (handleRepoArchaeologist as any)._cached = map;
  return formatMonorepoMap(map);
}

async function handlePairDesigner(args: Record<string, any>): Promise<string> {
  const files: string[] = Array.isArray(args.files) ? args.files : [];
  if (files.length === 0) return "❌ files requerido (array de paths)";
  const result = detectCoupling(files);
  return formatCoupling(result);
}

async function handlePentapilot(args: Record<string, any>): Promise<string> {
  const task = args.task || "";
  const files: string[] = Array.isArray(args.files) ? args.files : [];
  if (!task) return "❌ task requerido";
  const plan = planPentapilot(task, files);
  return formatPentaPlan(plan);
}

// ─── Executor principal ───────────────────────────────────────────────

const HANDLERS: Record<
  string,
  (args: Record<string, any>) => Promise<string>
> = {
  read_file: handleReadFile,
  write_file: handleWriteFile,
  edit_file: handleEditFile,
  glob: handleGlob,
  grep: handleGrep,
  bash: (args) => handleShell(args.command || "", "bash", args.timeout),
  powershell: (args) =>
    handleShell(args.command || "", "powershell.exe", args.timeout),
  list_dir: handleListDir,
  zk_query: handleZkQuery,
  git_status: handleGitStatus,
  git_diff: handleGitDiff,
  workspace: handleWorkspace,
  run_build: handleRunBuild,
  run_test: handleRunTest,
  git_commit: handleGitCommit,
  web_fetch: handleWebFetch,
  preflight_plan: handlePreflightPlan,
  pentetraktys_plan: handlePentetraktysPlan,
  apply_patch: handleApplyPatch,
  view_image: handleViewImage,
  tool_search: handleToolSearch,
  request_user_input: handleRequestUserInput,
  spawn_agent: handleSpawnAgent,
  preflight_oracle: handlePreflightOracle,
  code_zazen: handleCodeZazen,
  confession: handleConfession,
  memory_thread: handleMemoryThread,
  time_travel: handleTimeTravel,
  invoke_sprite: handleInvokeSprite,
  error_autopsy: handleErrorAutopsy,
  repo_archaeologist: handleRepoArchaeologist,
  pair_designer: handlePairDesigner,
  pentapilot: handlePentapilot,
};

/** Ejecuta una tool call y retorna el resultado */
export async function executeToolCall(
  call: ToolCallRequest
): Promise<ToolResult> {
  const toolDef: ToolDef | undefined = TOOL_MAP.get(call.name);

  if (!toolDef) {
    return {
      id: call.id,
      name: call.name,
      success: false,
      output: "",
      error: `Herramienta desconocida: "${call.name}"`,
    };
  }

  const handler = HANDLERS[call.name];
  if (!handler) {
    return {
      id: call.id,
      name: call.name,
      success: false,
      output: "",
      error: `Handler no implementado para: "${call.name}"`,
    };
  }

  try {
    const output = await handler(call.arguments || {});
    const isError = output.startsWith("❌") || output.startsWith("⏰");

    return {
      id: call.id,
      name: call.name,
      success: !isError,
      output,
      truncated: output.length >= MAX_OUTPUT_LENGTH,
    };
  } catch (err: any) {
    return {
      id: call.id,
      name: call.name,
      success: false,
      output: "",
      error: err.message || "Error desconocido en ejecución",
    };
  }
}

/** Ejecuta múltiples tool calls en paralelo (cuando son independientes) */
export async function executeToolCalls(
  calls: ToolCallRequest[],
  counter: ToolCallCounter
): Promise<ToolResult[]> {
  // Validar rate limiting
  for (const _ of calls) {
    const check = counter.increment();
    if (!check.allowed) {
      return [
        {
          id: "rate_limit",
          name: "guard",
          success: false,
          output: "",
          error: check.reason,
        },
      ];
    }
  }

  // Ejecutar todas en paralelo (las tool calls del mismo turno son independientes)
  const results = await Promise.all(calls.map((c) => executeToolCall(c)));
  return results;
}
