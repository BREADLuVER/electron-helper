import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

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

contextBridge.exposeInMainWorld("ipcRenderer", {
  send(channel: string, data?: unknown) {
    if (VALID_CHANNELS.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },

  on(channel: string, listener: (...args: unknown[]) => void) {
    if (VALID_CHANNELS.includes(channel)) {
      const wrapped = (_event: IpcRendererEvent, ...args: unknown[]) =>
        listener(...args);
      ipcRenderer.on(channel, wrapped);
      return () => ipcRenderer.removeListener(channel, wrapped);
    }
    return () => {};
  },

  once(channel: string, listener: (...args: unknown[]) => void) {
    if (VALID_CHANNELS.includes(channel)) {
      ipcRenderer.once(
        channel,
        (_event: IpcRendererEvent, ...args: unknown[]) => listener(...args),
      );
    }
  },

  invoke(channel: string, data?: unknown) {
    if (VALID_CHANNELS.includes(channel)) {
      return ipcRenderer.invoke(channel, data);
    }
    return Promise.reject(new Error("Invalid channel"));
  },
});

contextBridge.exposeInMainWorld("recorder", {
  toggle: () => ipcRenderer.invoke("recorder:toggle"),
});

ipcRenderer.on("recorder:status", (_e: IpcRendererEvent, isLive: boolean) =>
  window.dispatchEvent(new CustomEvent("recorder:status", { detail: isLive })),
);
ipcRenderer.on("recorder:partial", (_e: IpcRendererEvent, text: string) =>
  window.dispatchEvent(new CustomEvent("recorder:partial", { detail: text })),
);
ipcRenderer.on("recorder:final", (_e: IpcRendererEvent, text: string) =>
  window.dispatchEvent(new CustomEvent("recorder:final", { detail: text })),
);
ipcRenderer.on("recorder:error", (_e: IpcRendererEvent, msg: unknown) =>
  window.dispatchEvent(new CustomEvent("recorder:error", { detail: msg })),
);
