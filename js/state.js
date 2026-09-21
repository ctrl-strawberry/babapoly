import { formatMoney } from "./utils.js";
import { getLoadout } from "./jimbo-combat.js";

export const STORAGE_KEY = "baba-poly-state-v1";
export const DEFAULT_PLAYER_COLOR = "#ffd23f";
export const STATE_VERSION = 2;

export const getPetXpGoal = (level) => 8 + Math.max(0, level - 1) * 3;

export const gainPetXp = (pet, amount) => {
  const previousLevel = pet.level;
  pet.xp += amount;
  let levelBonus = 0;
  while (pet.xp >= getPetXpGoal(pet.level)) {
    pet.xp -= getPetXpGoal(pet.level);
    pet.level += 1;
    levelBonus += pet.level * 80;
  }
  return { previousLevel, levelBonus };
};

export const getPetProgressLabel = (pet = {}) => {
  const level = Math.max(1, Math.round(Number(pet?.level) || 1));
  const xp = Math.max(0, Math.round(Number(pet?.xp) || 0));
  return `XP ${xp.toLocaleString("es-ES")}/${getPetXpGoal(level).toLocaleString("es-ES")}`;
};

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
    moves: getLoadout(player?.pet?.level ?? 1, player?.pet?.moves),
  },
});

const normalizePetXp = (level, xp, sourceVersion = STATE_VERSION) => {
  const safeLevel = Math.max(1, Math.round(toFiniteNumber(level, 1)));
  const safeXp = Math.max(0, toFiniteNumber(xp, 0));

  if (sourceVersion >= STATE_VERSION) {
    return Math.round(safeXp);
  }

  if (!safeXp) {
    return 0;
  }

  const legacyGoal = Math.max(1, safeLevel);
  const progressRatio = Math.min(0.999, safeXp / legacyGoal);
  return Math.round(progressRatio * getPetXpGoal(safeLevel));
};

const sanitizePlayerEntry = (player, { sourceVersion = STATE_VERSION } = {}) => {
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
  const xp = normalizePetXp(level, player?.pet?.xp, sourceVersion);
  return {
    id,
    name,
    money,
    pet: { level, xp, moves: getLoadout(level, player?.pet?.moves) },
    avatar: typeof player?.avatar === "string" ? player.avatar : null,
    colorHex: sanitizePlayerColor(player?.colorHex),
  };
};

const sanitizePlayerCollection = (
  collection,
  { sourceVersion = STATE_VERSION } = {},
) => {
  if (!Array.isArray(collection)) return [];
  const unique = new Map();
  collection.forEach((entry) => {
    const sanitized = sanitizePlayerEntry(entry, { sourceVersion });
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
      pet: { level: 2, xp: 3 },
      avatar: null,
      colorHex: DEFAULT_PLAYER_COLOR,
    },
  ]);

export const createDefaultState = () => {
  const seeds = buildSeedPlayers();
  return {
    version: STATE_VERSION,
    players: seeds.map((player) => clonePlayer(player)),
    createdPlayers: seeds.map((player) => clonePlayer(player)),
    pot: 0,
  };
};

export const loadState = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return createDefaultState();
    }
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed.players)) {
      const sourceVersion =
        typeof parsed.version === "number" && Number.isFinite(parsed.version)
          ? parsed.version
          : 1;
      const normalizedPlayers = sanitizePlayerCollection(parsed.players, {
        sourceVersion,
      });
      const sourceCreated = Array.isArray(parsed.createdPlayers)
        ? parsed.createdPlayers
        : normalizedPlayers;
      const normalizedCreated = sanitizePlayerCollection(sourceCreated, {
        sourceVersion,
      });
      return {
        ...parsed,
        version: STATE_VERSION,
        players: normalizedPlayers,
        createdPlayers: normalizedCreated,
        pot:
          typeof parsed.pot === "number" &&
          Number.isFinite(parsed.pot) &&
          parsed.pot >= 0
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

let saveTimeout = null;
/**
 * Guarda el estado en localStorage de forma debounced para evitar escrituras excesivas
 * y posibles condiciones de carrera durante cambios rapidos.
 */
export const saveState = () => {
  if (saveTimeout) clearTimeout(saveTimeout);

  saveTimeout = setTimeout(() => {
    try {
      state.version = STATE_VERSION;
      const serialized = JSON.stringify(state);
      localStorage.setItem(STORAGE_KEY, serialized);
    } catch (error) {
      if (
        error.name === "QuotaExceededError" ||
        error.name === "NS_ERROR_DOM_QUOTA_REACHED"
      ) {
        console.error(
          "Error: El almacenamiento local esta lleno. No se pudo guardar el estado.",
        );
      } else {
        console.warn("No se pudo guardar el estado:", error);
      }
    }
    saveTimeout = null;
  }, 100);
};

/**
 * Escucha cambios en el almacenamiento desde otras pestanas para mantener el estado sincronizado.
 */
window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY && event.newValue) {
    try {
      const newState = JSON.parse(event.newValue);
      const sourceVersion =
        typeof newState.version === "number" && Number.isFinite(newState.version)
          ? newState.version
          : 1;
      Object.assign(state, {
        version: STATE_VERSION,
        players: sanitizePlayerCollection(newState.players, { sourceVersion }),
        createdPlayers: sanitizePlayerCollection(newState.createdPlayers, {
          sourceVersion,
        }),
        pot: typeof newState.pot === "number" ? newState.pot : 0,
      });

      window.dispatchEvent(new CustomEvent("baba-poly-state-updated"));
    } catch (error) {
      console.error("Error al sincronizar el estado desde otra pestana:", error);
    }
  }
});

export const getPlayerById = (id) => state.players.find((player) => player.id === id);

export const addPlayer = (player) => {
  const sanitized = sanitizePlayerEntry(player, { sourceVersion: STATE_VERSION });
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
  const sanitized = sanitizePlayerEntry(player, { sourceVersion: STATE_VERSION });
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
  state.version = STATE_VERSION;
  state.pot = 0;
  state.players = state.players.map((player) => ({
    ...player,
    money,
    pet: { level: 1, xp: 0 },
  }));
  saveState();
};
