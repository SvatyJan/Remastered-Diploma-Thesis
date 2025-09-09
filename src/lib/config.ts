// Configuration for mock/real API switching
export const USE_MOCK = import.meta.env.VITE_API_MOCK === "1";

export const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api",
  timeout: 10000,
} as const;

export const GAME_CONFIG = {
  combat: {
    gridSize: 8,
    turnTimeLimit: 30000, // 30 seconds
  },
  inventory: {
    maxSlots: 50,
  },
  character: {
    maxLevel: 100,
  },
} as const;