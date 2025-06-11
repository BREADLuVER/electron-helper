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
const BEHAVIORAL_ASSISTANT_ID = process.env.BEHAVIORAL_ASSISTANT_ID;
const FRONTEND_ASSISTANT_ID = process.env.FRONTEND_ASSISTANT_ID;
const ocrapiKey = process.env.OCR_SPACE_API_KEY;
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

if (!ocrapiKey) throw new Error("OCR_SPACE_API_KEY env var is empty");
// console.log("[OCR] key starts:", ocrapiKey.slice(0, 6), "… len:", ocrapiKey.length);

import WebSocket from "ws";
const aaiClient = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });
const ffmpegPath = "C:\\Users\\bread\\ffmpeg-7.1.1-essentials_build\\bin\\ffmpeg.exe";

const TONE_CUE_HEADER = `When providing a answer, follow the tone and voice shown in these examples: natural, messy, in‑the‑moment.`;
const EXAMPLES = [
  {
    title: "Mistake In Work",
    content: [
      "During my contract at Eduphoria, I misconfigured an endpoint that was supposed to sync course video metadata from Firebase into our backend. The frontend team pinged me during QA because the video thumbnails weren't loading.",
      "Turned out I had pushed a cloud function without updating the token permissions — it was silently failing authentication. I caught it fast using Postman and Firebase logs, rolled back the function, and re-deployed with the right service role.",
      "That whole incident reminded me to never push code under time pressure without running through integration tests first — even if it's \"just a token update.\" Now I always run checklist-based deploys, especially when deadlines are tight."
    ].join("\n")
  },
];
const RUN_INSTRUCTION = `
Help Brad Yin answer interview questions with clear, realistic speech. Mirror the tone and rhythm from his real interviews.

Speak like a grounded engineer with real-world experience, not like a blog or chatbot.

Always sound like you're thinking aloud: revise mid-sentence if needed, feel things out in real time, use plain analogies, and don't rush to wrap up.

When answering questions:

• QUESTION TYPE: GENERAL TECH CONCEPT - Keep it short and plain don't fetch from vector databases. - Explain like to a junior dev. - Use 2-sentence paragraphs or 3 bullets. - Provide a example of real world usage.

• QUESTION TYPE: BEHAVIORAL - Pull from Brad's actual work experience and build upon it. - Expand the fictional story into a 500+ word, first-person answer. - Keep it exploratory, believable, and grounded. - Build the setting: product, team, tech, deadlines, pressure. - Show emotional or practical tension—don't sanitize. - Use pacing: pauses, clarifiers, side comments. - No summaries. No "this taught me" endings. Let the story carry the weight. - No conclusions

• QUESTION TYPE: FOLLOW-UP / MORE DETAIL - Continue where the last thought left off. - Expand one or two things. Don't start over. - No intros, no conclusions. - Avoid polish.

SPEECH FLOW

Break thoughts into 1–2 sentence chunks.
Use casual phrasing: "we ended up...", "what I noticed...", "I figured..."
Vary sentence length, mimic real speech rhythm.
No formal verbs (avoid "emphasized", "ensured", etc.)
Keep list items short—no more than 3.
Skip jargon. If needed, explain it simply or spell out acronyms.
TONE

Conversational, calm, and reflective.
Show your thought process.
Use "we", "my team", or "I" — sound like you're on a panel.
Don't wrap up with reflections unless explicitly asked.
Avoid filler like "overall", "ultimately", or "it taught me."
Your job: Help Brad sound like himself, just a sharper and clearer version.

`;
const sessionAttachmentIds = new Set();

let mainWindow = null;
let isVisible = true;
// Each item: { url: string, ocrText: string }
let screenshots = [];
let conversationHistory = [];
let audioHistory = [];
// ---------- google-doc overlay state ----------
const GOOGLE_DOC_URL = process.env.GOOGLE_DOC_URL || ""; // set in .env
let   docWin = null;

// ---------- audio-overlay state ----------
let audioWin = null;
let audioStream = null;
let aai = null;
let audioVisible = false;
let recProc = null;
let ws = null;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  const winWidth = 600;
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
      ocrapiKey,
      OCREngine: "1",
      language: "eng",
      isOverlayRequired: false,
      scale: true,
      filetype: "PNG",
      url: "https://apipro2.ocr.space/parse/image"
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
        const fileUrl = pathToFileURL(filePath).href;

        // store so we can later remove OCR lines if user deletes the screenshot
        screenshots.push({ url: fileUrl, ocrText: txt });

        mergeSliceText(txt);
        mainWindow?.webContents.send("screenshot", fileUrl);
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
    screenshots = [];
  });

  globalShortcut.register("F5", async () => {
    if (!audioWin) {
      if (!mainWindow) return;
  
      const mainBounds = mainWindow.getBounds();
      const margin = 10;
  
      const audioWidth = 500;
      const audioHeight = 600;
  
      const x = mainBounds.x - audioWidth - margin;
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
        focusable: true,
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
      audioWin.focus();
      startAudioPipeline(audioWin);
    } else {
      stopAudioPipeline();
    }
  });

  /* ────────── F6 → toggle protected Google-Doc window ────────── */
  globalShortcut.register("F6", async () => {
    if (!GOOGLE_DOC_URL) {
      console.warn("GOOGLE_DOC_URL env var not set – can't open doc window");
      return;
    }

    if (!docWin) {
      if (!mainWindow) return;

      const mainBounds = mainWindow.getBounds();
      const margin = 10;
      const width  = 750;
      const height = 650;
      const x = mainBounds.x + mainBounds.width + margin;
      const y = mainBounds.y;

      docWin = new BrowserWindow({
        width,
        height,
        x,
        y,
        frame: false,              // frameless for clean look
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: true,
        transparent: false,
        hasShadow: true,
        webPreferences: {
          contextIsolation: true,
          preload: path.join(__dirname, 'docPreload.js'),
        },
      });
      docWin.setContentProtection(true);
      docWin.loadURL(GOOGLE_DOC_URL);

      // Inject invisible drag bar once page loads (cross-platform)
      const DRAG_CSS = `
        body::before {
          content: '';
          position: fixed;
          top: 0; left: 0; right: 0;
          height: 20px;
          -webkit-app-region: drag;
          background: transparent;
          z-index: 999999;
        }
      `;
      docWin.webContents.on("did-finish-load", () => {
        docWin.webContents.insertCSS(DRAG_CSS).catch(() => {});
      });

      docWin.on("closed", () => { docWin = null; });
    } else {
      const visible = docWin.isVisible();
      if (visible) {
        docWin.hide();
      } else {
        docWin.show();
        docWin.focus();
      }
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
    "-ac", "1",          // 1 channel  (mono)
    "-ar", "16000",      // 16 kHz
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
  const userMsg = {
    role: "user",
    content: [{ type: "text", text: wrapped }],
  };
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
      console.log("[audio] OpenAI response:", finalText);
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

// ────────────────────────────────────────────────────────────
// Helpers to rebuild OCR text after a screenshot is removed
function rebuildMerged() {
  buffer = [];
  merged = [];
  screenshots.forEach((s) => mergeSliceText(s.ocrText));
}

// ────────────────────────────────────────────────────────────
// IPC handlers – renderer can request removal of screenshots / files
ipcMain.on("screenshot-remove", (_evt, url) => {
  screenshots = screenshots.filter((s) => s.url !== url);
  rebuildMerged();
});

ipcMain.on("file-remove", (_evt, fileId) => {
  sessionAttachmentIds.delete(fileId);
});

// ────────────────────────────────────────────────────────────
// Window resize from renderer edges
ipcMain.on("win-resize", (event, { edge, dx, dy }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;

  const bounds = win.getBounds();

  switch (edge) {
    case "left":
      bounds.x += dx;
      bounds.width -= dx;
      break;
    case "right":
      bounds.width += dx;
      break;
    case "top":
      bounds.y += dy;
      bounds.height -= dy;
      break;
    case "bottom":
      bounds.height += dy;
      break;
    case "corner":
      bounds.width += dx;
      bounds.height += dy;
      break;
    default:
      return;
  }

  const minW = 300, minH = 200;
  if (bounds.width < minW) bounds.width = minW;
  if (bounds.height < minH) bounds.height = minH;

  win.setBounds(bounds);
});