// ─── Repo Archaeologist — Mapa vivo del monorepo ──────────────────────
// BELL 13450.50 | Pentetraktys 4D
// Construye un mapa de apps, tecnologías, actividad y lo cachea en ZK.

import { exec } from "child_process";

export interface AppInfo {
  path: string;
  name: string;
  techs: string[];
  activityLastMonth: number;
  mainFiles: string[];
}

export interface MonorepoMap {
  root: string;
  apps: AppInfo[];
  lastUpdated: string;
}

async function shell(cmd: string, cwd: string): Promise<string> {
  return new Promise((resolve) => {
    exec(cmd, { cwd, shell: "bash", timeout: 30000, windowsHide: true }, (_, stdout) => {
      resolve((stdout || "").trim());
    });
  });
}

export async function buildMonorepoMap(root: string): Promise<MonorepoMap> {
  const apps: AppInfo[] = [];

  // Buscar apps (directorios con package.json)
  const findResult = await shell(
    `find . -maxdepth 3 -name "package.json" -not -path "*/node_modules/*" -not -path "*/.next/*" 2>/dev/null | head -20`,
    root
  );

  const pkgFiles = findResult.split("\n").filter(Boolean);
  for (const pkgPath of pkgFiles) {
    const dir = pkgPath.replace("/package.json", "").replace("./", "");
    try {
      const pkgJson = await shell(`cat ${pkgPath} 2>/dev/null`, root);
      const pkg = JSON.parse(pkgJson);

      const techs: string[] = [];
      if (pkgJson.includes("next")) techs.push("Next.js");
      if (pkgJson.includes("react")) techs.push("React");
      if (pkgJson.includes("electron")) techs.push("Electron");
      if (pkgJson.includes("hardhat")) techs.push("Hardhat");
      if (pkgJson.includes("solidity") || pkgJson.includes(".sol")) techs.push("Solidity");
      if (pkgJson.includes("tailwind")) techs.push("Tailwind");
      if (pkgJson.includes("drizzle")) techs.push("DrizzleORM");
      if (pkgJson.includes("openai")) techs.push("AI/LLM");

      // Actividad del último mes
      const gitLog = await shell(
        `git log --oneline --since="1 month ago" -- "${dir}/" 2>/dev/null | wc -l`,
        root
      );
      const activity = parseInt(gitLog) || 0;

      // Archivos principales
      const findMain = await shell(
        `find "${dir}/src" -maxdepth 2 -name "index.*" -o -name "main.*" -o -name "App.*" 2>/dev/null | head -5`,
        root
      );
      const mainFiles = findMain.split("\n").filter(Boolean).map((f) => f.trim()).slice(0, 5);

      apps.push({
        path: dir,
        name: pkg.name || dir,
        techs: techs.length > 0 ? techs : ["Node.js"],
        activityLastMonth: activity,
        mainFiles,
      });
    } catch {
      // Skip packages sin package.json válido
    }
  }

  apps.sort((a, b) => b.activityLastMonth - a.activityLastMonth);

  return {
    root,
    apps,
    lastUpdated: new Date().toISOString(),
  };
}

export function formatMonorepoMap(m: MonorepoMap): string {
  let out = `🗺️ MAPA DEL MONOREPO\n\n`;
  out += `📁 ${m.apps.length} apps/paquetes encontrados:\n\n`;
  for (const app of m.apps) {
    const hot = app.activityLastMonth > 10 ? " 🔥" : app.activityLastMonth > 0 ? " 📝" : " 💤";
    out += `${hot} **${app.name}**\n`;
    out += `   📂 ${app.path}\n`;
    out += `   🛠️  ${app.techs.join(", ")}\n`;
    out += `   📊 Actividad: ${app.activityLastMonth} commits/mes\n`;
    if (app.mainFiles.length > 0) {
      out += `   📄 Principal: ${app.mainFiles.slice(0, 2).join(", ")}\n`;
    }
    out += `\n`;
  }
  out += `🕐 Actualizado: ${m.lastUpdated}`;
  return out;
}
