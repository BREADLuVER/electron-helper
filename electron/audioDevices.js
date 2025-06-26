import { spawn } from "child_process";
import { resolveFfmpegPath } from "./ffmpegResolver.js";

const ffmpegPath = resolveFfmpegPath();

// Utility – enumerate audio capture devices using FFmpeg
export async function listAudioDevices() {
  if (process.platform !== "win32") {
    // TODO: macOS/Linux enumeration later
    return { micDevices: [], sysDevices: [] };
  }

  // --- helper to parse quoted audio device names ---
  const parseList = (stderr) => {
    const names = [];
    stderr.split(/\r?\n/).forEach((line) => {
      const m = line.match(/"([^"]+)"\s*\((audio)\)/i);
      if (m) names.push(m[1]);
    });
    return names;
  };

  // run ffmpeg with given args and capture stderr
  const runEnum = async (label, args) => {
    return new Promise((resolve) => {
      const proc = spawn(ffmpegPath, args);
      let out = "";
      proc.stderr.on("data", (b) => (out += b));
      proc.on("close", () => {
        const parsed = parseList(out);
        if (!parsed.length) {
          console.warn(
            `[audioDevices] ${label} raw output yielded no devices – dumping:\n${out}`,
          );
        }
        resolve(parsed);
      });
    });
  };

  const dshow = await runEnum("dshow", [
    "-list_devices",
    "true",
    "-f",
    "dshow",
    "-i",
    "dummy",
  ]);
  const wasapi = await runEnum("wasapi", [
    "-list_devices",
    "true",
    "-f",
    "wasapi",
    "-i",
    "dummy",
  ]);

  const all = [...new Set([...dshow, ...wasapi])];

  const micDevices = all.filter((n) => /mic|microphone/i.test(n));
  const sysDevices = all.filter((n) =>
    /mix|loopback|output|virtual|speaker/i.test(n),
  );

  return { micDevices, sysDevices };
} 