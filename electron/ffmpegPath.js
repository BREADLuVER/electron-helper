import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { config } from "./config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveBundled() {
  const base = path.join(__dirname, "../resources");
  switch (process.platform) {
    case "win32":
      return path.join(base, "win", "ffmpeg.exe");
    case "darwin":
      return path.join(base, "mac", "ffmpeg");
    case "linux":
      return path.join(base, "linux", "ffmpeg");
    default:
      return null;
  }
}

export function getFfmpegPath() {
  // Priority 1: user override in config
  if (config.ffmpegPath && fs.existsSync(config.ffmpegPath)) {
    return config.ffmpegPath;
  }
  // Priority 2: bundled binary
  const bundled = resolveBundled();
  if (bundled && fs.existsSync(bundled)) {
    return bundled;
  }
  // Fallback: assume ffmpeg in PATH
  return "ffmpeg";
}
