import { formatMoney } from "./utils.js";

export const STORAGE_KEY = "baba-poly-state-v1";
export const DEFAULT_PLAYER_COLOR = "#ffd23f";

const HEX_COLOR_REGEX = /^#([0-9a-f]{6})$/i;
const sanitizePlayerColor = (value) =>
  typeof value === "string" && HEX_COLOR_REGEX.test(value.trim())
    ? value.trim().toLowerCase()
    : DEFAULT_PLAYER_COLOR;

const toFiniteNumber = (value, fallback) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const clonePlayer = (player) => ({
  ...player,
  pet: {
    level: player?.pet?.level ?? 1,
    xp: player?.pet?.xp ?? 0,
  },
});

const sanitizePlayerEntry = (player) => {
  if (!player || typeof player !== "object") return null;
  const id =
    typeof player.id === "string" && player.id.trim().length
      ? player.id
      : crypto.randomUUID();
  const name =
    typeof player.name === "string" && player.name.trim().length
      ? player.name.trim().slice(0, 40)
      : "Jugador sin nombre";
  const money = Math.max(0, Math.round(toFiniteNumber(player.money, 0)));
  const level = Math.max(1, Math.round(toFiniteNumber(player?.pet?.level, 1)));
  const xp = Math.max(0, toFiniteNumber(player?.pet?.xp, 0));
  return {
    id,
    name,
    money,
    pet: { level, xp },
    avatar: typeof player?.avatar === "string" ? player.avatar : null,
    colorHex: sanitizePlayerColor(player?.colorHex),
  };
};

const sanitizePlayerCollection = (collection) => {
  if (!Array.isArray(collection)) return [];
  const unique = new Map();
  collection.forEach((entry) => {
    const sanitized = sanitizePlayerEntry(entry);
    if (!sanitized) return;
    if (!unique.has(sanitized.id)) {
      unique.set(sanitized.id, clonePlayer(sanitized));
    }
  });
  return Array.from(unique.values());
};

const buildSeedPlayers = () =>
  sanitizePlayerCollection([
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
  ]);

export const createDefaultState = () => {
  const seeds = buildSeedPlayers();
  return {
    players: seeds.map((player) => clonePlayer(player)),
    createdPlayers: seeds.map((player) => clonePlayer(player)),
    pot: 0,
  };
};

export const loadState = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      const seeds = buildSeedPlayers();
      return {
        players: seeds.map((player) => clonePlayer(player)),
        createdPlayers: seeds.map((player) => clonePlayer(player)),
        pot: 0,
      };
    }
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed.players)) {
      const normalizedPlayers = sanitizePlayerCollection(parsed.players);
      const sourceCreated = Array.isArray(parsed.createdPlayers)
        ? parsed.createdPlayers
        : normalizedPlayers;
      const normalizedCreated = sanitizePlayerCollection(sourceCreated);
      return {
        ...parsed,
        players: normalizedPlayers,
        createdPlayers: normalizedCreated,
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
  const sanitized = sanitizePlayerEntry(player);
  if (!sanitized) return;
  const existingIndex = state.players.findIndex(
    (candidate) => candidate.id === sanitized.id,
  );
  if (existingIndex !== -1) {
    state.players.splice(existingIndex, 1, clonePlayer(sanitized));
  } else {
    state.players.push(clonePlayer(sanitized));
  }
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

export const takePot = (playerId) => {
  const player = getPlayerById(playerId);
  if (!player) return null;
  const amount = state.pot || 0;
  player.money += amount;
  state.pot = 0;
  saveState();
  return amount;
};

export const getCreatedPlayerById = (id) =>
  state.createdPlayers.find((player) => player.id === id);

export const upsertCreatedPlayer = (player) => {
  const sanitized = sanitizePlayerEntry(player);
  if (!sanitized) return;
  const index = state.createdPlayers.findIndex(
    (candidate) => candidate.id === sanitized.id,
  );
  if (index !== -1) {
    state.createdPlayers.splice(index, 1, clonePlayer(sanitized));
  } else {
    state.createdPlayers.push(clonePlayer(sanitized));
  }
  saveState();
};

export const removeCreatedPlayer = (playerId) => {
  const index = state.createdPlayers.findIndex((player) => player.id === playerId);
  if (index !== -1) {
    state.createdPlayers.splice(index, 1);
    saveState();
  }
};

export const isPlayerActive = (playerId) =>
  state.players.some((player) => player.id === playerId);

export const resetGame = (initialMoney) => {
  const money = Math.max(0, Math.round(toFiniteNumber(initialMoney, 500)));
  state.pot = 0;
  state.players = state.players.map(player => ({
    ...player,
    money: money,
    pet: { level: 1, xp: 0 }
  }));
  saveState();
};
