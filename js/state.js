import { formatMoney } from "./utils.js";

export const STORAGE_KEY = "baba-poly-state-v1";

export const createDefaultState = () => ({
  players: [
    { id: crypto.randomUUID(), name: "Rosi", money: 800, pet: { level: 1, xp: 0 } },
    { id: crypto.randomUUID(), name: "Nico", money: 650, pet: { level: 1, xp: 0 } },
    { id: crypto.randomUUID(), name: "Pilar", money: 900, pet: { level: 2, xp: 0.5 } }
  ]
});

export const loadState = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return createDefaultState();
    }
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed.players)) {
      return parsed;
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
  state.players.push(player);
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
