import path from "path";
import fs from "fs";
import { config } from "./config.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function resolveFfmpegPath() {
  // 1) User-override via config
  if (config.ffmpegPath && fs.existsSync(config.ffmpegPath)) {
    return config.ffmpegPath;
  }

  // 2) Bundled binaries under resources/<os>/ffmpeg[.exe]
  const platform = process.platform;
  let candidate;

  if (platform === "win32") {
    candidate = path.join(__dirname, "../resources/win/ffmpeg.exe");
  } else if (platform === "darwin") {
    candidate = path.join(__dirname, "../resources/mac/ffmpeg");
  } else if (platform === "linux") {
    candidate = path.join(__dirname, "../resources/linux/ffmpeg");
  }

  if (candidate && fs.existsSync(candidate)) {
    return candidate;
  }

  throw new Error(
    "FFmpeg binary not found. Set `ffmpegPath` in PrepDock settings or ensure it is bundled in resources/<os>/ffmpeg(.exe).",
  );
}
