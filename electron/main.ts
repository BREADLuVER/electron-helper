import { app, BrowserWindow, globalShortcut, ipcMain } from "electron";
import * as path from "path";
import { screen } from "electron";
import screenshot from "screenshot-desktop";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { AssemblyAI } from "assemblyai";
import { nanoid } from "nanoid"; 
import * as fs from "fs";
import * as os from "os";
import { pathToFileURL } from "url";
import dotenv from "dotenv";
dotenv.config();
import { OpenAI } from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not defined in the environment variables.");
}
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
if (!process.env.ASSEMBLYAI_API_KEY) {
  throw new Error("ASSEMBLYAI_API_KEY is not defined in the environment variables.");
}
const aaiClient = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });
const transcriber = aaiClient.realtime.transcriber();
const resumeText = fs.readFileSync("resume.txt", "utf-8");
const ffmpegPath = "C:\\Users\\bread\\ffmpeg-7.1.1-essentials_build\\bin\\ffmpeg.exe";


let mainWindow: BrowserWindow | null = null;
let isVisible: boolean = true;
let screenshots: string[] = [];
let conversationHistory: OpenAI.Chat.ChatCompletionMessageParam[] = [];
// ---------- audio‑overlay state ----------
let audioWin: BrowserWindow | null = null;
let audioStream: ChildProcessWithoutNullStreams | null = null;
let aai: ReturnType<typeof aaiClient.realtime.transcriber> | null = null;
let audioVisible = false;

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
  
    const mainBounds = mainWindow!.getBounds();
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

  globalShortcut.register("F4", () => {
    screenshots = [];
    conversationHistory = [];
    mainWindow?.webContents.send("cleared");
  });

  globalShortcut.register("Control+Up", () => moveWindow(0, -10));
  globalShortcut.register("Control+Down", () => moveWindow(0, 10));
  globalShortcut.register("Control+Left", () => moveWindow(-10, 0));
  globalShortcut.register("Control+Right", () => moveWindow(10, 0));

  globalShortcut.register("Control+G", async () => {
    if (screenshots.length >= 3) return;
    if (!mainWindow) return;

    mainWindow.setOpacity(0);
    mainWindow.setIgnoreMouseEvents(true, { forward: true });

    setTimeout(async () => {
      try {
        const img = await screenshot();
        const filePath = path.join(os.tmpdir(), `ss-${Date.now()}.jpg`);
        fs.writeFileSync(filePath, img);
        screenshots.push(filePath);
        mainWindow?.webContents.send("screenshot", pathToFileURL(filePath).href);
      } catch (e) {
        console.error("Screenshot failed:", e);
      } finally {
        mainWindow?.setOpacity(1);
        mainWindow?.setIgnoreMouseEvents(false);
      }
    }, 300);
  });

  globalShortcut.register("Control+Enter", () => {
    mainWindow?.webContents.send("send-to-api", screenshots);
  });

  globalShortcut.register("Control+B", async () => {
    if (!audioWin) {
      if (!mainWindow) return;
  
      const mainBounds = mainWindow.getBounds();
      const margin = 10;
  
      const audioWidth = 380;
      const audioHeight = 260;
  
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
        webPreferences: {
          preload: path.join(__dirname, "preload.js"),
          nodeIntegration: false,
          contextIsolation: true,
        },
      });
  
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

export async function startAudioPipeline(win: BrowserWindow): Promise<void> {
  if (audioStream !== null || aai !== null) {
    return; // already running
  }

  // 1. spawn FFmpeg in loopback capture mode
  audioStream = spawn(ffmpegPath, [
    "-f", "dshow",
    "-i", "audio=Stereo Mix (Realtek(R) Audio)", // update this to match your device
    "-ac", "1",
    "-ar", "16000",
    "-f", "s16le",
    "-"
  ]);

  // 2. connect AssemblyAI realtime transcriber
  try {
    aai = await aaiClient.realtime.transcriber({
      sampleRate: 16000
    });

    aai.on("transcript", async (result) => {
      if (result.message_type !== "FinalTranscript") {
        return;
      }

      const userText = result.text;
      win.webContents.send("transcript", userText);

      // 3. Get personalized response from OpenAI
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: resumeText
            },
            {
              role: "user",
              content: userText
            }
          ]
        });

        const reply = completion.choices[0]?.message?.content ?? "";
        win.webContents.send("assistant-reply", reply);
      } catch (err) {
        console.error("OpenAI response error:", err);
      }
    });

    // 4. pipe audio to AssemblyAI
    audioStream.stdout.on("data", (chunk: Buffer) => {
      if (aai) {
        aai.sendAudio(chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength));
      }
    });

    aai.on("close", () => {
      console.log("AssemblyAI connection closed");
      aai = null;
    });
  } catch (error) {
    console.error("Failed to initialize AssemblyAI transcriber:", error);
    aai = null;
  }
}

function stopAudioPipeline() {
  audioStream?.kill("SIGKILL");
  audioStream = null;
  aai?.close();
  aai = null;
}

function moveWindow(deltaX: number, deltaY: number) {
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


ipcMain.on("send-to-api", async (event, { message, screenshots }) => {
  try {
    const files = screenshots.slice(0, 3).map((filePath: string) => ({
      name: path.basename(filePath),
      buffer: fs.readFileSync(filePath)
    }));

    const estimatedPromptTokens = JSON.stringify([...conversationHistory]).length / 4;
    const maxAvailable = 128000 - Math.floor(estimatedPromptTokens);
    const customSystemPrompt = `
    You are a software engineer GPT specialized in solving frontend interview questions.
    Your role is to help users by writing clean explicit return code that mimics real-world interview responses.
    Always explain your approach clearly before providing any code.
    Focus on understandable logic and readability. Write simple, direct solutions without overengineering.
    Include heavy commenting in the code to explain sections and mark changes made.
    Always write fully explicit return code.
    Build from any starter code provided by the user naturally and pragmatically, not adding unnecessary complexity.
    If clarification is needed from the user, politely ask.
    Maintain a calm, professional, and clear tone in your explanations and code.
    `;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: [{ type: "text", text: customSystemPrompt }]
        },
        ...conversationHistory,
        {
          role: "user",
          content: [
            { type: "text", text: message || "..." },
            ...files.map((file: { name: string; buffer: Buffer }) => ({
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${file.buffer.toString("base64")}`,
              },
            })),
          ]
        }
      ],
      max_tokens: Math.min(4096, maxAvailable),
    });

    // console.log("Sending message + screenshots:", message, screenshots);

    const reply = response.choices?.[0]?.message?.content || "No response";
    event.sender.send("api-response", reply);
    conversationHistory.push({
      role: "user",
      content: [{ type: "text", text: message }]
    });

    conversationHistory.push({
      role: "assistant",
      content: [{ type: "text", text: reply }]
    });
  } catch (err) {
    console.error("OpenAI Error:", err);
    event.sender.send("api-response", "Failed to contact OpenAI.");
  }
});