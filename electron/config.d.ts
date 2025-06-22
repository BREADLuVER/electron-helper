export {};

declare module "./config.js" {
  export const config: Record<string, unknown>;
  export function saveConfig(partial: Record<string, unknown>): void;
}
