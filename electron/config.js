// PrepDock runtime configuration (hand-written ES module)
// Reads ~/.config/PrepDock/userConfig.json and merges with process.env.

import fs from "fs";
import path from "path";
import os from "os";

const CONFIG_DIR = path.join(os.homedir(), ".config", "PrepDock");
const CONFIG_PATH = path.join(CONFIG_DIR, "userConfig.json");

let fileCfg = {};
try {
  const raw = fs.readFileSync(CONFIG_PATH, "utf8");
  fileCfg = JSON.parse(raw);
} catch (_) {
  /* first-run or missing file – continue with env-only */
}

export const config = {
  ...process.env,
  ...fileCfg,
};

export function saveConfig(partial) {
  fileCfg = { ...fileCfg, ...partial };
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(fileCfg, null, 2));
}
