import { state } from "./state.js";
import { initHome } from "./home.js";
import { initJimbo } from "./jimbo.js";
import { initRoulette } from "./roulette.js";

const screens = {
  inicio: document.getElementById("screen-inicio"),
  jimbo: document.getElementById("screen-jimbo"),
  ruleta: document.getElementById("screen-ruleta"),
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

const showToast = (message) => {
  const toast = document.createElement("div");
  toast.className = "result-toast";
  toast.textContent = message;
  toastLayer.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
};

let jimboApi = null;
let rouletteApi = null;

const home = initHome({
  playerList,
  playerToolbar,
  addPlayerBtn,
  settingsToggle,
  playerCardTemplate,
  modalContainer,
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

let currentScreen = "inicio";

const showScreen = (screenId) => {
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

  if (screenId === "jimbo") {
    jimboApi.enterJimbo();
  } else if (screenId === "ruleta") {
    rouletteApi.resetWheel();
  }
};

bottomNavRadios.forEach((radio) => {
  radio.addEventListener("change", () => {
    if (radio.checked) {
      showScreen(radio.dataset.screen);
    }
  });
});

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
