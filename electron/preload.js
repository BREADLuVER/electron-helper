"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const VALID_CHANNELS = [
  "screenshot",
  "send-to-api",
  "api-response",
  "assistant-stream-start",
  "assistant-stream-data",
  "assistant-stream-end",
  "cleared",
  "transcript-partial",
  "transcript-final",
  "assistant-reply",
  "audio-submit",
  "audio-initialize",
  "audio-clear",
  "recorder:status",
  "recorder:error",
  "recorder:partial",
  "recorder:final",
  "upload-file",
  "file-uploaded",
  "file-upload-error",
  "screenshot-remove",
  "file-remove",
  "win-resize",
  "audio-get-devices",
  "audio-device-list",
  "audio-set-devices",
];
electron_1.contextBridge.exposeInMainWorld("ipcRenderer", {
  send(channel, data) {
    if (VALID_CHANNELS.includes(channel)) {
      electron_1.ipcRenderer.send(channel, data);
    }
  },
  on(channel, listener) {
    if (VALID_CHANNELS.includes(channel)) {
      const wrapped = (_event, ...args) => listener(...args);
      electron_1.ipcRenderer.on(channel, wrapped);
      return () => electron_1.ipcRenderer.removeListener(channel, wrapped);
    }
    return () => {};
  },
  once(channel, listener) {
    if (VALID_CHANNELS.includes(channel)) {
      electron_1.ipcRenderer.once(channel, (_event, ...args) =>
        listener(...args),
      );
    }
  },
  invoke(channel, data) {
    if (VALID_CHANNELS.includes(channel)) {
      return electron_1.ipcRenderer.invoke(channel, data);
    }
    return Promise.reject(new Error("Invalid channel"));
  },
});
electron_1.contextBridge.exposeInMainWorld("recorder", {
  toggle: () => electron_1.ipcRenderer.invoke("recorder:toggle"),
});
electron_1.ipcRenderer.on("recorder:status", (_e, isLive) =>
  window.dispatchEvent(new CustomEvent("recorder:status", { detail: isLive })),
);
electron_1.ipcRenderer.on("recorder:partial", (_e, text) =>
  window.dispatchEvent(new CustomEvent("recorder:partial", { detail: text })),
);
electron_1.ipcRenderer.on("recorder:final", (_e, text) =>
  window.dispatchEvent(new CustomEvent("recorder:final", { detail: text })),
);
electron_1.ipcRenderer.on("recorder:error", (_e, msg) =>
  window.dispatchEvent(new CustomEvent("recorder:error", { detail: msg })),
);
