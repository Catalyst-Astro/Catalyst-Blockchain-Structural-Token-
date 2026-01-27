import fs from "fs";
import path from "path";

export class StoryLedger {
  private filepath: string;

  constructor(filename = path.join(process.cwd(), "narrative_memory", "narrative_ledger.jsonl")) {
    this.filepath = filename;
    const dir = path.dirname(this.filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.filepath)) {
      fs.writeFileSync(this.filepath, "");
    }
  }

  logAction(actor: string, action: string) {
    const entry = {
      timestamp: new Date().toISOString(),
      actor,
      action,
    };
    fs.appendFileSync(this.filepath, JSON.stringify(entry) + "\n", { encoding: "utf8" });
  }
}
