// preload.js  – runs in the isolated, privileged context
// ------------------------------------------------------
const { contextBridge, ipcRenderer } = require("electron");

/**
 * Allow only the channels we actually use.
 * This keeps the attack surface tiny.
 */
const VALID_CHANNELS = [
  "screenshot",
  "send-to-api",
  "api-response",
  "cleared",
];

/**
 * Expose limited IPC functionality to the renderer process.
 */
contextBridge.exposeInMainWorld("ipcRenderer", {
  /**
   * Renderer ➜ Main
   */
  send(channel, data) {
    if (VALID_CHANNELS.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },

  /**
   * Main ➜ Renderer (continuous)
   * Returns an unsubscribe function for convenience.
   */
  on(channel, listener) {
    if (VALID_CHANNELS.includes(channel)) {
      const wrapped = (_ev, ...args) => listener(...args);
      ipcRenderer.on(channel, wrapped);
      return () => ipcRenderer.removeListener(channel, wrapped);
    }
    return () => {};
  },

  /**
   * Main ➜ Renderer (single‑shot)
   */
  once(channel, listener) {
    if (VALID_CHANNELS.includes(channel)) {
      ipcRenderer.once(channel, (_ev, ...args) => listener(...args));
    }
  },
});