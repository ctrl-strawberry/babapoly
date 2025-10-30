import { formatMoney } from "./utils.js";

export const STORAGE_KEY = "baba-poly-state-v1";
export const DEFAULT_PLAYER_COLOR = "#000000";

const HEX_COLOR_REGEX = /^#([0-9a-f]{6})$/i;
const sanitizePlayerColor = (value) =>
  typeof value === "string" && HEX_COLOR_REGEX.test(value.trim())
    ? value.trim().toLowerCase()
    : DEFAULT_PLAYER_COLOR;

export const createDefaultState = () => ({
  players: [
    {
      id: crypto.randomUUID(),
      name: "Rosi",
      money: 800,
      pet: { level: 1, xp: 0 },
      avatar: null,
      colorHex: DEFAULT_PLAYER_COLOR,
    },
    {
      id: crypto.randomUUID(),
      name: "Nico",
      money: 650,
      pet: { level: 1, xp: 0 },
      avatar: null,
      colorHex: DEFAULT_PLAYER_COLOR,
    },
    {
      id: crypto.randomUUID(),
      name: "Pilar",
      money: 900,
      pet: { level: 2, xp: 0.5 },
      avatar: null,
      colorHex: DEFAULT_PLAYER_COLOR,
    },
  ],
  pot: 0,
});

export const loadState = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return createDefaultState();
    }
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed.players)) {
      const normalizedPlayers = parsed.players.map((player) => ({
        ...player,
        avatar: typeof player?.avatar === "string" ? player.avatar : null,
        colorHex: sanitizePlayerColor(player?.colorHex),
      }));
      return {
        ...parsed,
        players: normalizedPlayers,
        pot: typeof parsed.pot === "number" && Number.isFinite(parsed.pot) && parsed.pot >= 0
          ? parsed.pot
          : 0,
      };
    }
  } catch (error) {
    console.warn("No se pudo cargar el estado guardado:", error);
  }
  return createDefaultState();
};

export const state = loadState();

export const saveState = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("No se pudo guardar el estado:", error);
  }
};

export const getPlayerById = (id) => state.players.find((player) => player.id === id);

export const addPlayer = (player) => {
  const sanitized = {
    ...player,
    colorHex: sanitizePlayerColor(player?.colorHex),
  };
  state.players.push(sanitized);
  saveState();
};

export const deletePlayer = (playerId) => {
  const index = state.players.findIndex((player) => player.id === playerId);
  if (index !== -1) {
    state.players.splice(index, 1);
    saveState();
  }
};

export const updatePlayerMoney = (playerId, delta) => {
  const player = getPlayerById(playerId);
  if (!player) return null;
  player.money = Math.max(0, player.money + delta);
  saveState();
  return player;
};

export const formatPlayersForSelect = () =>
  state.players.map((player) => ({
    id: player.id,
    label: `${player.name} · ${formatMoney(player.money)}`,
  }));

export const addToPot = (amount) => {
  if (!Number.isFinite(amount) || amount <= 0) return state.pot;
  if (typeof state.pot !== "number" || !Number.isFinite(state.pot)) {
    state.pot = 0;
  }
  state.pot += amount;
  saveState();
  return state.pot;
};
