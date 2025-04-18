
import { app, BrowserWindow, globalShortcut, ipcMain } from "electron";
import * as path from "path";
import { screen } from "electron";
import screenshot from "screenshot-desktop";
import * as fs from "fs";
import * as os from "os";

let mainWindow: BrowserWindow | null = null;
let isVisible: boolean = true;
let screenshots: string[] = [];

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  const winWidth = 900;
  const winHeight = 900;
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
      nodeIntegration: true,
      contextIsolation: false,
    }
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
    mainWindow?.webContents.send("cleared");
  });

  globalShortcut.register("Up", () => moveWindow(0, -10));
  globalShortcut.register("Down", () => moveWindow(0, 10));
  globalShortcut.register("Left", () => moveWindow(-10, 0));
  globalShortcut.register("Right", () => moveWindow(10, 0));

  globalShortcut.register("Control+Z", async () => {
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
        mainWindow?.webContents.send("screenshot", filePath);
      } catch (e) {
        console.error("Screenshot failed:", e);
      } finally {
        mainWindow?.setOpacity(1);
        mainWindow?.setIgnoreMouseEvents(false);
      }
    }, 300);
  });

  globalShortcut.register("Control+I", () => {
    mainWindow?.webContents.send("show-input");
  });

  globalShortcut.register("Control+X", () => {
    mainWindow?.webContents.send("send-to-api", screenshots);
  });
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
