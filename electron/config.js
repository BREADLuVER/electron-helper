// PrepDock runtime configuration (hand-written ES module)
// Reads ~/.config/PrepDock/userConfig.json **and** %APPDATA%/PrepDock/config.json
// and merges with process.env.

import fs from "fs";
import path from "path";
import os from "os";
import { app } from "electron";

const HOME_DIR = path.join(os.homedir(), ".config", "PrepDock");
const APPDATA_DIR = app?.getPath?.("appData")
  ? path.join(app.getPath("appData"), "PrepDock")
  : null;

const possible = [HOME_DIR, APPDATA_DIR].filter(Boolean);

let fileCfg = {};
for (const dir of possible) {
  try {
    const raw = fs.readFileSync(path.join(dir, "userConfig.json"), "utf8");
    fileCfg = { ...fileCfg, ...JSON.parse(raw) };
  } catch (_) {
    /* ignore */
  }
}

export const config = {
  ...process.env,
  ...fileCfg,
};

export function saveConfig(partial) {
  fileCfg = { ...fileCfg, ...partial };
  const targetDir = APPDATA_DIR || HOME_DIR;
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(
    path.join(targetDir, "userConfig.json"),
    JSON.stringify(fileCfg, null, 2),
  );
}

export function missingCriticalKeys() {
  return !config.OPENAI_API_KEY || !config.SUPABASE_URL || !config.SUPABASE_KEY;
}
