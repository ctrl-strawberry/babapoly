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

const roulettePlayer = document.getElementById("roulettePlayer");
const rouletteAmount = document.getElementById("rouletteAmount");
const rouletteNumber = document.getElementById("rouletteNumber");
const rouletteHelper = document.getElementById("rouletteHelper");
const rouletteWheel = document.getElementById("rouletteWheel");
const rouletteResult = document.getElementById("rouletteResult");
const spinBtn = document.getElementById("spinBtn");

const deriveBasePath = () => {
  if (typeof window === "undefined") {
    return "/";
  }
  const segments = window.location.pathname.split("/").filter(Boolean);
  if (!segments.length) {
    return "/";
  }
  const lastSegment = segments[segments.length - 1];
  if (
    lastSegment.includes(".") ||
    Object.prototype.hasOwnProperty.call(screens, lastSegment)
  ) {
    segments.pop();
  }
  if (!segments.length) {
    return "/";
  }
  return `/${segments.join("/")}/`;
};

const basePath = deriveBasePath();

const normalizePathname = (pathname) => {
  if (!pathname || pathname === "/") {
    return "/";
  }
  return pathname.endsWith("/") && pathname.length > 1
    ? pathname.slice(0, -1)
    : pathname;
};

const getScreenFromLocation = () => {
  if (typeof window === "undefined") {
    return "inicio";
  }
  const normalized = normalizePathname(window.location.pathname);
  if (normalized === "/") {
    return "inicio";
  }
  const segments = normalized.split("/").filter(Boolean);
  if (!segments.length) {
    return "inicio";
  }
  const lastSegment = segments[segments.length - 1];
  if (Object.prototype.hasOwnProperty.call(screens, lastSegment)) {
    return lastSegment;
  }
  return "inicio";
};

const buildPathForScreen = (screenId) => {
  const prefix = basePath === "/" ? "/" : basePath;
  if (screenId === "inicio") {
    return prefix;
  }
  return `${prefix}${screenId}`;
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
    rouletteApi?.renderPlayerOptions(players);
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
  roulettePlayer,
  rouletteAmount,
  rouletteNumber,
  rouletteHelper,
  rouletteWheel,
  rouletteResult,
  spinBtn,
  showScreen: (screenId) => showScreen(screenId),
  showToast,
  homeActions: {
    render: () => home.render(),
    showMoneyAnimation: (playerId, amount) => home.showMoneyAnimation(playerId, amount),
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
    if (window.location.pathname !== targetPath) {
      window.history.replaceState({ screenId }, "", targetPath);
    }
  }

  if (screenId === "jimbo") {
    jimboApi.enterJimbo();
  } else if (screenId === "ruleta") {
    rouletteApi.resetWheel();
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
rouletteApi.renderPlayerOptions(state.players);

export {};
