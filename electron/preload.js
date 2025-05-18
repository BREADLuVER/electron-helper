const { contextBridge, ipcRenderer } = require("electron");

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
  "audio-clear",
];

contextBridge.exposeInMainWorld("ipcRenderer", {
  send(channel, data) {
    if (VALID_CHANNELS.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },

  on(channel, listener) {
    if (VALID_CHANNELS.includes(channel)) {
      const wrapped = (_event, ...args) => listener(...args);
      ipcRenderer.on(channel, wrapped);
      return () => ipcRenderer.removeListener(channel, wrapped);
    }
    return () => {};
  },

  once(channel, listener) {
    if (VALID_CHANNELS.includes(channel)) {
      ipcRenderer.once(channel, (_event, ...args) => listener(...args));
    }
  },
});