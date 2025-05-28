import { app, BrowserWindow, globalShortcut, ipcMain } from "electron";
import path from "path";
import { screen } from "electron";
import screenshot from "screenshot-desktop";
import pkg from "ocr-space-api-wrapper";
const { ocrSpace } = pkg;
import { spawn } from "child_process";
import { AssemblyAI } from "assemblyai";
import fs from "fs";
import os from "os";
import { pathToFileURL } from "url";
import { runAssistantStream } from "./runAssistantStream.js"; // ⬅ helper above
import { OpenAI } from "openai";
import { fileURLToPath } from "url";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); // still used for images
const BEHAVIORAL_ASSISTANT_ID = process.env.BEHAVIORAL_ASSISTANT_ID;
const FRONTEND_ASSISTANT_ID = process.env.FRONTEND_ASSISTANT_ID;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import fetch from "node-fetch";
import { FormData } from 'formdata-node';
import { fileFromPath } from 'formdata-node/file-from-path';

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not defined in the environment variables.");
}

if (!process.env.ASSEMBLYAI_API_KEY) {
  throw new Error("ASSEMBLYAI_API_KEY is not defined in the environment variables.");
}

if (!process.env.OCR_SPACE_API_KEY) {
  throw new Error("OCR_SPACE_API_KEY is not defined in the environment variables.");
}

import WebSocket from "ws";
const aaiClient = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });
const ffmpegPath = "C:\\Users\\bread\\ffmpeg-7.1.1-essentials_build\\bin\\ffmpeg.exe";

const TONE_CUE_HEADER = `When providing a answer, follow the tone and voice shown in these examples: natural, messy, in‑the‑moment.`;
const EXAMPLES = [
  "Yeah the reason we developed this new product is that when I joined, the QA team was still using this old internal tool that basically just dumped raw logs. If you wanted to figure out what went wrong — like some color flickering or a sync issue — you had to open these massive text files and scan through timestamps.It worked, but it was super manual and didn’t scale well, especially with newer GPU features like HDR or variable refresh. That’s where the idea for the Display Insights Portal came in — we wanted to build a web tool that could actually show real-time telemetry, so engineers could catch problems as they happened, instead of digging through logs afterward.",
  "So at AMD I was on a lean team — like six of us total — and I handled the front end for our GPU telemetry dashboard. But because we were small, I also had to sync a lot with backend and QA. There was one stretch where we were getting bug reports from QA, new schema changes from firmware, and on top of that, the display team wanted to demo a new data stream for HDR validation. So the way I handled it was pretty simple — I started joining their triage meetings twice a week. Just listening in helped me catch blockers early. I also set up a shared Notion page to track which endpoints were stable and which ones were still changing, so front end wouldn’t keep breaking. It wasn’t anything fancy, but keeping that cross-team thread helped me avoid surprises and prioritize the right features week to week.",
  "This was during a release crunch — we were maybe five days out, and QA flagged that one of our GPU metrics was randomly vanishing from the UI. Totally intermittent. Some testers saw it, some didn’t. First instinct was to blame the WebSocket stream, but logs weren’t consistent. So I paired with a backend dev and we replayed old packets with mock data to narrow it down. Turned out one of our front-end filters had a typo that dropped the metric if its value was null, which was valid in some scenarios. Quick fix — but super subtle. After that, I wrote a small test harness to load every metric with dummy values, just to catch stuff like that early. Wasn’t glamorous, but it saved us the next time someone pushed an edge case.",
];
const RUN_INSTRUCTION = `

`;
const sessionAttachmentIds = new Set();

let mainWindow = null;
let isVisible = true;
let screenshots = [];
let conversationHistory = [];
let audioHistory = [];
// ---------- audio‑overlay state ----------
let audioWin = null;
let audioStream = null;
let aai = null;
let audioVisible = false;
let   recorder       = null;
let   currentOutput  = null;
let recProc   = null;
let ws        = null;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  const winWidth = 500;
  const winHeight = 600;
  const x = Math.floor((width - winWidth) / 2);
  const y = Math.floor((height - winHeight) / 2);

  mainWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: x,
    y: y,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  mainWindow.on("move", () => {
    if (!audioWin) return;
  
    if (!mainWindow) return;
    const mainBounds = mainWindow.getBounds();
    const margin = 10;
  
    const audioWidth = audioWin.getBounds().width;
    const audioHeight = audioWin.getBounds().height;
  
    const x = mainBounds.x + mainBounds.width + margin;
    const y = mainBounds.y + Math.floor((mainBounds.height - audioHeight) / 2);
  
    audioWin.setBounds({ x, y, width: audioWidth, height: audioHeight });
  });

  mainWindow.setIgnoreMouseEvents(false);
  mainWindow.setContentProtection(true);
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mainWindow.loadFile(path.join(__dirname, "../index.html"));

  registerShortcuts();
}

async function extractText(fp) {
  console.log("Extracting text from image:", fp);
  const res = await ocrSpace(
    fp,
    {
      apiKey: process.env.OCR_SPACE_API_KEY,
      OCREngine: "1",
      language: "eng",
      isOverlayRequired: false,
      scale: true,
      filetype: "PNG",
      url: "https://apipro1.ocr.space/parse/image"
    }
  );

  console.log("OCR result:", res);
  return (res?.ParsedResults || [])
    .map(r => r.ParsedText || "")
    .join("\n");
}


const WINDOW = 120;
let   buffer = [];
let   merged = [];

function mergeSliceText(sliceText) {
  sliceText.split(/\r?\n/).forEach(raw => {
    const line = raw.trimEnd();
    if (buffer.includes(line))  return;

    merged.push(line);
    buffer.push(line);
    if (buffer.length > WINDOW) buffer.shift();
    if (merged.length > 3000)    merged.shift();
  });
}

function registerShortcuts() {
  globalShortcut.register("F2", () => {
    if (!mainWindow) return;
    isVisible = !isVisible;
    if (isVisible) {
      mainWindow.show();
      mainWindow.setOpacity(1);
      mainWindow.setIgnoreMouseEvents(false);
    } else {
      mainWindow.setOpacity(0);
      mainWindow.setIgnoreMouseEvents(true, { forward: true });
    }
  });

  globalShortcut.register("F10", () => {
    screenshots = [];
    conversationHistory = [];
    audioHistory = [];
    merged = [];
    sessionAttachmentIds.clear();
    mainWindow?.webContents.send("cleared");
  });

  globalShortcut.register("Control+Up", () => moveWindow(0, -30));
  globalShortcut.register("Control+Down", () => moveWindow(0, 30));
  globalShortcut.register("Control+Left", () => moveWindow(-30, 0));
  globalShortcut.register("Control+Right", () => moveWindow(30, 0));

  let isClickThrough = false

  globalShortcut.register("Insert", () => {
    if (!mainWindow) return;
    isClickThrough = !isClickThrough;
    mainWindow.setIgnoreMouseEvents(isClickThrough, { forward: true });

    if (audioWin) {
      audioWin.setIgnoreMouseEvents(isClickThrough, { forward: true });
    }

    console.log("Click-through mode:", isClickThrough ? "ON" : "OFF");
  });

  globalShortcut.register("Control+G", async () => {
    if (!mainWindow) return;

    mainWindow.setOpacity(0);
    audioWin?.setOpacity(0);
    audioWin?.setIgnoreMouseEvents(true, { forward: true });
    mainWindow.setIgnoreMouseEvents(true, { forward: true });

    setTimeout(async () => {
      let img;
      try {
        img = await screenshot();

        const filePath = path.join(os.tmpdir(), `ss-${Date.now()}.png`);
        fs.writeFileSync(filePath, img);
        const txt = await extractText(filePath);
        mergeSliceText(txt);
        mainWindow?.webContents.send("screenshot", pathToFileURL(filePath).href);
      } catch (e) {
        console.error("Screenshot failed:", e);
      } finally {
        mainWindow?.setOpacity(1);
        mainWindow?.setIgnoreMouseEvents(false);
        audioWin?.setOpacity(img ? 1 : 0);
        audioWin?.setIgnoreMouseEvents(false);
      }
    }, 300);
  });

  globalShortcut.register("Control+Enter", () => {
    const ocrPayload = merged.join("\n").trim();
    mainWindow?.webContents.send("send-to-api", {
      screenshots: [],
      ocr: ocrPayload,
    });
    merged = [];
    buffer = [];
  });

  globalShortcut.register("F5", async () => {
    if (!audioWin) {
      if (!mainWindow) return;
  
      const mainBounds = mainWindow.getBounds();
      const margin = 10;
  
      const audioWidth = 500;
      const audioHeight = 600;
  
      const x = mainBounds.x + mainBounds.width + margin;
      const y = mainBounds.y + Math.floor((mainBounds.height - audioHeight) / 2);
  
      audioWin = new BrowserWindow({
        width: audioWidth,
        height: audioHeight,
        x: x,
        y: y,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        hasShadow: false,
        focusable: false,
        webPreferences: {
          preload: path.join(__dirname, "preload.js"),
          nodeIntegration: false,
          contextIsolation: true,
        },
      });
      audioWin.setContentProtection(true);
      audioWin.loadFile(path.join(__dirname, "../audio.html"));
    }

    audioVisible = !audioVisible;
    audioWin.setOpacity(audioVisible ? 1 : 0);
    audioWin.setIgnoreMouseEvents(!audioVisible, { forward: true });

    if (audioVisible) {
      startAudioPipeline(audioWin);
    } else {
      stopAudioPipeline();
    }
  });
}

function moveWindow(deltaX, deltaY) {
  if (!mainWindow) return;
  const bounds = mainWindow.getBounds();
  mainWindow.setBounds({
    x: bounds.x + deltaX,
    y: bounds.y + deltaY,
    width: bounds.width,
    height: bounds.height,
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

ipcMain.on("send-to-api", async (event, { message, screenshots, ocr = "", uploadedFileIds }) => {
  try {
    event.sender.send("assistant-stream-start");

    const plainText = [message, ocr].filter(Boolean).join("\n\n```txt\n") + (ocr ? "\n```" : "");
    const userMsg = {
      role: "user",
      content: [{ type: "text", text: plainText || "..." }],
      attachments: [...sessionAttachmentIds].map(id => ({
        file_id: id,
        tools: [{ type: "file_search" }],
      })),
    };

    console.log("[assistant] user message:", userMsg);
    console.log("[assistant] conversation history:", conversationHistory);

    // 2) stream assistant reply
    let finalText = "";
    await runAssistantStream(
      FRONTEND_ASSISTANT_ID,
      userMsg,
      (token) => {
        event.sender.send("assistant-stream-data", token);
        finalText += token;
      }
    );

    console.log("[assistant] final text:", finalText);
    // 3) end-of-stream marker
    event.sender.send("assistant-stream-end");

    // 4) keep history if you want it
    conversationHistory.push({ role: "user",      content: [{ type:"text", text: message }] });
    conversationHistory.push({ role: "assistant", content: [{ type:"text", text: finalText }] });
  } catch (err) {
    console.error("OpenAI Error:", err);
    event.sender.send("assistant-stream-end");
    event.sender.send("api-response", "Failed to contact OpenAI.");
  }
});

async function startAudioPipeline(win) {
  if (audioStream !== null || aai !== null) {
    console.log("[audio] pipeline already running, skipping.");
    return;
  }

  console.log("[audio] spawning FFmpeg…");
  audioStream = spawn(ffmpegPath, [
    "-f", "dshow",
    "-i", "audio=Stereo Mix (Realtek(R) Audio)",
    "-ac", "1",          // 1 channel  (mono)
    "-ar", "16000",      // 16 kHz
    "-f", "s16le",       // raw PCM 16‑bit LE
    "-"                  // output to stdout pipe
  ]);

  audioStream.stderr.on("data", data => {
    console.error("[ffmpeg stderr]", data.toString());
    return;
  });
  audioStream.on("error", err => {
    console.error("[ffmpeg spawn error]", err);
    return;
  });
  audioStream.on("close", (code, signal) => {
    console.log(`[ffmpeg exited] code=${code}, signal=${signal}`);
    audioStream = null;
    return;
  });

  console.log("[audio] initializing AssemblyAI transcriber…");

  aai = await aaiClient.realtime.transcriber({ sampleRate: 16000 });

  let   isReady      = false;
  const bufferQueue  = [];

  aai.on("open", ({ sessionId }) => {
    console.log("[AssemblyAI] WebSocket open – session:", sessionId);
    isReady = true;

    /* Flush anything buffered while socket was opening */
    bufferQueue.forEach(buf => aai.sendAudio(buf));
    bufferQueue.length = 0;
    return;
  });

  aai.on("error", err => {
    console.error("[AssemblyAI] error", err);
    return;
  });

  aai.on("close", () => {
    console.log("[AssemblyAI] connection closed");
    aai = null;
    return;
  });

  aai.on("transcript", result => {
    const text = result.text.trim();
    if (!text) return;

    if (result.message_type === "PartialTranscript") {
      win.webContents.send("transcript-partial", text);
      console.log("[AssemblyAI] partial transcript", text);
    } else {
      win.webContents.send("transcript-final", text);
    }
  });

  await aai.connect();
  console.log("[AssemblyAI] WebSocket connected");

  audioStream.stdout.on("data", chunk => {
    if (!isReady) {
      bufferQueue.push(chunk);
    } else {
      try {
        aai.sendAudio(chunk);
      } catch (sendErr) {
        console.error("[audio] sendAudio error", sendErr);
      }
    }
    return;
  });
}

function stopAudioPipeline() {
  audioStream?.kill("SIGKILL");
  audioStream = null;
  aai?.close();
  aai = null;
}

function wrapQuestion(raw) {
  const fewShot = EXAMPLES.slice(0, 3).join("\n\n");
  return `
  ${TONE_CUE_HEADER}

  ---
  ${fewShot}
  ---

  ${RUN_INSTRUCTION.trim()}

  ${raw.trim()}
  `.trim();
}

ipcMain.on("upload-file", async (event, { path: filePath, name }) => {
  try {
    // 1. Upload file to OpenAI
    const form = new FormData();
    form.append("file", await fileFromPath(filePath), name);
    form.append("purpose", "assistants"); // required for Assistants API

    const res = await fetch("https://api.openai.com/v1/files", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || res.statusText);

    // 2. Notify renderer of success and file id
    sessionAttachmentIds.add(json.id);
    console.log("[file-upload] success:", json);
    event.sender.send("file-uploaded", { id: json.id, name: json.filename });
  } catch (err) {
    event.sender.send("file-upload-error", err.message);
  }
});

// ---------- audio‑overlay pipeline ----------
function waitForWav(filePath, minBytes = 8192, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    (function poll() {
      fs.stat(filePath, (err, stats) => {
        if (!err && stats.size >= minBytes) return resolve();
        if (Date.now() - start > timeoutMs) {
          return reject(new Error("No audio captured (file too small)."));
        }
        setTimeout(poll, 200);
      });
    })();
  });
}

let audioBusy = false;

ipcMain.on("audio-submit", async (_evt, question) => {
  if (!audioWin) return;
  if (audioBusy) return;
  audioBusy = true;

  if (!question) { audioBusy = false; return; }
  audioHistory.push({ role: "user", content: question });
  console.log("[audio] submitting audio history to OpenAI…");
  audioWin.webContents.send("assistant-stream-start");
  const wrapped = wrapQuestion(question);
  const userMsg = { role: "user", content: wrapped };
  let finalText = "";
  try {
      await runAssistantStream(                        // ② same helper you use for screenshots
        BEHAVIORAL_ASSISTANT_ID,
        userMsg,
        (token) => {                                  // ③ drip every token
          audioWin.webContents.send("assistant-stream-data", token);
          finalText += token;
        }
      );
      audioWin.webContents.send("assistant-stream-end");   // ④ done
      console.log("[audio] OpenAI response:", reply);
      audioHistory.push({ role: "assistant", content: finalText });
    } catch (e) {
      console.error("[audio-submit]", e);
      audioWin.webContents.send("assistant-stream-end");
      audioWin.webContents.send("assistant-reply", "Error generating response.");
    } finally {
      audioBusy = false;
    }
});

ipcMain.on("audio-clear", () => {
  audioHistory = [];
  return;
});

ipcMain.handle("recorder:toggle", (evt) => {
  const win = BrowserWindow.fromWebContents(evt.sender);
  ws ? stopStream(win) : startStream(win);
});
function startStream(win) {
  if (ws) return;

  /* ---------- 1. open websocket ---------- */
  ws = new WebSocket(
    "wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000",
    { headers: { authorization: process.env.ASSEMBLYAI_API_KEY } }
  );

  ws.on("open", () => {
    win.webContents.send("recorder:status", true);    // badge ON
    console.log("[recorder] websocket open");

    /* ---------- 2. spawn FFmpeg ---------- */
    recProc = spawn(ffmpegPath, [
      "-hide_banner", "-loglevel", "error",
      "-f", "dshow", "-i", "audio=Stereo Mix (Realtek(R) Audio)",
      "-f", "dshow", "-i", "audio=Microphone (NVIDIA Broadcast)",
      "-filter_complex", "[0:a][1:a]amix=inputs=2:duration=longest:dropout_transition=2",
      "-ac", "1", "-ar", "16000", "-sample_fmt", "s16",
      "-f", "s16le", "-"          // raw 16-bit PCM to stdout
    ], { windowsHide: true });

    recProc.stderr.on("data", (b) => console.error("[ffmpeg]", b.toString()));

    /* ---------- 3. pipe audio → ws ---------- */
    let chunk = Buffer.alloc(0);
    recProc.stdout.on("data", (data) => {
      chunk = Buffer.concat([chunk, data]);
      while (chunk.length >= 3200) {          // 100 ms of audio @16k/16-bit/mono
        if (ws && ws.readyState === 1) {
          ws.send(chunk.slice(0, 3200));
        }
        chunk = chunk.slice(3200);
      }
    });
  });

  ws.on("message", (buf) => {
    const data = JSON.parse(buf.toString());

    switch (data.message_type) {
      /* ---------- live keystroke-like feed ---------- */
      case "PartialTranscript": {
        const partial = data.text || "";
        console.log("[WS partial]", partial);
        mainWindow.webContents.send("recorder:partial", partial);
        break;
      }

      /* ---------- committed utterance ---------- */
      case "FinalTranscript": {
        // prefer the punctuated version if AssemblyAI provides it
        const final =
          (data.punctuated && data.punctuated.transcript) ||
          data.text ||
          "";
        console.log("[WS final]", final);
        mainWindow.webContents.send("recorder:final", final);
        break;
      }

      case "SessionBegins":
        console.log("[AssemblyAI] session started");
        break;

      default:
        // you can log other message types here if curious
        break;
    }
  });


  ws.on("close", () => stopStream(win));
  ws.on("error", (err) => {
    console.error("WS error", err);
    stopStream(win);
    win.webContents.send("recorder:error", err.message);
  });
}

function stopStream(win) {
  if (recProc) { recProc.kill("SIGINT"); recProc = null; }
  if (ws)      { ws.close(); ws = null; }

  win.webContents.send("recorder:status", false);     // badge OFF
  win.webContents.send("recorder:partial", "");       // clear trailing partial
  console.log("[recorder] stopped");
}

export { startAudioPipeline, stopAudioPipeline };