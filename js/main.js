import { state } from "./state.js";
import { initHome } from "./home.js";
import { initJimbo } from "./jimbo.js";
import { initRoulette } from "./roulette.js";
import { initImageLab } from "./image-lab.js";

const screens = {
  inicio: document.getElementById("screen-inicio"),
  jimbo: document.getElementById("screen-jimbo"),
  ruleta: document.getElementById("screen-ruleta"),
  lab: document.getElementById("screen-image-lab"),
};

const bottomNavRadios = Array.from(
  document.querySelectorAll(".bottom-tabs input[type='radio']"),
);
const homeHeader = document.getElementById("homeHeader");
const settingsToggle = document.getElementById("settingsToggle");
const playerToolbar = document.getElementById("playerToolbar");
const addPlayerBtn = document.getElementById("addPlayerBtn");
const playerList = document.getElementById("playerList");
const playerCardTemplate = document.getElementById("playerCardTemplate");
const playerSelectTemplate = document.getElementById("playerSelectCard");
const modalContainer = document.getElementById("modalContainer");
const toastLayer = document.getElementById("toastLayer");
const bottomNav = document.querySelector(".bottom-nav");

const jimboSelect = document.getElementById("jimboSelect");
const battleStage = document.getElementById("battleStage");
const playerPetLabel = document.getElementById("playerPetLabel");
const enemyLabel = document.getElementById("enemyLabel");
const playerHealthFill = document.getElementById("playerHealthFill");
const enemyHealthFill = document.getElementById("enemyHealthFill");
const playerHealthText = document.getElementById("playerHealthText");
const enemyHealthText = document.getElementById("enemyHealthText");
const attackGrid = document.getElementById("attackGrid");
const playerLevelLabel = document.getElementById("playerLevelLabel");
const enemyLevelLabel = document.getElementById("enemyLevelLabel");
const playerCharacterSprite = document.querySelector(".battle-character-player");
const enemyCharacterSprite = document.querySelector(".battle-character-enemy");

const rouletteSelect = document.getElementById("rouletteSelect");
const rouletteGame = document.getElementById("rouletteGame");
const rouletteWheel = document.getElementById("rouletteWheel");
const rouletteBoard = document.getElementById("rouletteBoard");
const roulettePlayerName = document.getElementById("roulettePlayerName");
const roulettePlayerMoney = document.getElementById("roulettePlayerMoney");
const rouletteMessage = document.getElementById("rouletteMessage");
const chipSelector = document.getElementById("chipSelector");
const spinBtn = document.getElementById("spinBtn");
const clearBetsBtn = document.getElementById("clearBetsBtn");
const rouletteExitBtn = document.getElementById("rouletteExitBtn");
const lastResults = document.getElementById("lastResults");

const deriveBasePath = () => {
  return "/";
};

const basePath = deriveBasePath();

const getScreenFromLocation = () => {
  if (typeof window === "undefined") {
    return "inicio";
  }
  const hash = window.location.hash;
  if (!hash || hash === "#" || hash === "#/") {
    return "inicio";
  }
  const screenId = hash.replace(/^#\/?/, "");
  if (Object.prototype.hasOwnProperty.call(screens, screenId)) {
    return screenId;
  }
  return "inicio";
};

const buildPathForScreen = (screenId) => {
  if (screenId === "inicio") {
    return "/";
  }
  return `/#/${screenId}`;
};

const showToast = (message) => {
  const toast = document.createElement("div");
  toast.className = "result-toast";
  toast.textContent = message;
  toastLayer.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
};

let jimboApi = null;
let rouletteApi = null;
let imageLabApi = null;

const home = initHome({
  playerList,
  playerToolbar,
  addPlayerBtn,
  settingsToggle,
  playerCardTemplate,
  modalContainer,
  bottomNav,
  onPlayersUpdated: (players) => {
    jimboApi?.renderPlayerSelector(players);
    rouletteApi?.renderPlayerSelector(players);
  },
});

jimboApi = initJimbo({
  playerSelectContainer: jimboSelect,
  playerSelectTemplate,
  battleStage,
  attackGrid,
  playerPetLabel,
  enemyLabel,
  playerHealthFill,
  enemyHealthFill,
  playerHealthText,
  enemyHealthText,
  playerLevelLabel,
  enemyLevelLabel,
  playerCharacter: playerCharacterSprite,
  enemyCharacter: enemyCharacterSprite,
  showToast,
  showScreen: (screenId) => showScreen(screenId),
  homeActions: {
    render: () => home.render(),
    showMoneyAnimation: (playerId, amount) => home.showMoneyAnimation(playerId, amount),
  },
});

rouletteApi = initRoulette({
  rouletteSelect,
  rouletteGame,
  rouletteWheel,
  rouletteBoard,
  roulettePlayerName,
  roulettePlayerMoney,
  rouletteMessage,
  chipSelector,
  spinBtn,
  clearBetsBtn,
  rouletteExitBtn,
  lastResults,
  playerSelectTemplate,
  showScreen: (screenId) => showScreen(screenId),
  showToast,
  homeActions: {
    render: () => home.render(),
    showMoneyAnimation: (playerId, amount) => home.showMoneyAnimation(playerId, amount),
    getPlayers: () => state.players, // Added this helper
  },
});

imageLabApi = initImageLab({
  section: screens.lab,
  showScreen: (screenId) => showScreen(screenId),
});

let currentScreen = "inicio";

const showScreen = (screenId, { skipHistory = false } = {}) => {
  if (!screens[screenId]) return;
  currentScreen = screenId;

  Object.entries(screens).forEach(([id, section]) => {
    section.classList.toggle("active", id === screenId);
  });

  bottomNavRadios.forEach((radio) => {
    const shouldCheck = radio.dataset.screen === screenId;
    if (radio.checked !== shouldCheck) {
      radio.checked = shouldCheck;
    }
  });

  if (screenId === "inicio") {
    homeHeader.style.display = "flex";
  } else {
    homeHeader.style.display = "none";
    home.disableEditing();
  }

  if (!skipHistory && typeof window !== "undefined") {
    const targetPath = buildPathForScreen(screenId);
    // Use pushState to allow back button, or replaceState if we want to avoid history clutter
    // For tabs, replaceState is often better, but hash change naturally adds to history if assigned.
    // Let's use replaceState to match previous behavior but with hash.
    if (window.location.hash !== `#/${screenId}` && !(screenId === "inicio" && (!window.location.hash || window.location.hash === "#/"))) {
      window.history.replaceState({ screenId }, "", targetPath);
    }
  }

  if (screenId === "jimbo") {
    jimboApi.enterJimbo();
  } else if (screenId === "ruleta") {
    // rouletteApi.resetWheel(); // Removed as it's not exposed/needed for selector
  } else if (screenId === "lab") {
    imageLabApi.onEnter();
  }
};

bottomNavRadios.forEach((radio) => {
  radio.addEventListener("change", () => {
    if (radio.checked) {
      showScreen(radio.dataset.screen);
    }
  });
});

const applyScreenFromLocation = () => {
  const target = getScreenFromLocation();
  if (target !== currentScreen) {
    showScreen(target, { skipHistory: true });
  } else if (target === "lab") {
    imageLabApi.onEnter();
  }
};

if (typeof window !== "undefined") {
  window.addEventListener("popstate", applyScreenFromLocation);
  window.addEventListener("hashchange", applyScreenFromLocation); // Add hashchange support
  applyScreenFromLocation();
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (home.closeModal()) return;
  if (currentScreen === "jimbo" && jimboApi.abortBattle()) return;
});

// Render inicial
home.render();
jimboApi.renderPlayerSelector(state.players);
rouletteApi.renderPlayerSelector(state.players);

export { };
