const { contextBridge, ipcRenderer } = require("electron");

const VALID_CHANNELS = [
  "screenshot",
  "send-to-api",
  "api-response",
  "cleared",

  "transcript",
  "assistant-reply",
  "audio-submit",
  "audio-clear" 
];

contextBridge.exposeInMainWorld("ipcRenderer", {
  send(channel, data) {
    if (VALID_CHANNELS.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },

  on(channel, listener) {
    if (VALID_CHANNELS.includes(channel)) {
      const wrapped = (_ev, ...args) => listener(...args);
      ipcRenderer.on(channel, wrapped);
      return () => ipcRenderer.removeListener(channel, wrapped);
    }
    return () => {};
  },

  once(channel, listener) {
    if (VALID_CHANNELS.includes(channel)) {
      ipcRenderer.once(channel, (_ev, ...args) => listener(...args));
    }
  },
});