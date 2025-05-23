import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron';

export default defineConfig({
  plugins: [
    electron([
      {
        entry: 'electron/main.js',
        onstart: (options) => {
          options.startup();
        }
      }
    ]),
  ],
});
