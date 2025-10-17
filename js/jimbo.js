import { saveState, getPlayerById } from "./state.js";
import { randomBetween } from "./utils.js";

const ATTACKS = [
  { level: 1, name: "Arañazo tímido", min: 8, max: 12 },
  { level: 2, name: "Mordisco chillón", min: 12, max: 18 },
  { level: 3, name: "Patada estelar", min: 18, max: 26 },
  { level: 4, name: "Onda baba", min: 24, max: 34 },
  { level: 5, name: "Explosión polimorfa", min: 32, max: 46 },
];

const ENEMY_NAMES = [
  "Caracol Punk",
  "Hongo Loco",
  "Foca Ninja",
  "Blob Galáctico",
  "Robot Cascarrabias",
];

const getAvailableAttacks = (level) =>
  ATTACKS.filter((attack) => attack.level <= level);

export const initJimbo = ({
  playerSelectContainer,
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
  showToast,
  showScreen,
  homeActions,
}) => {
  let battleState = null;

  const appendLog = () => {};

  const lockAttacks = (locked) => {
    attackGrid
      .querySelectorAll("button")
      .forEach((button) => (button.disabled = locked));
  };

  const updateHealthBars = () => {
    if (!battleState) return;
    const { playerHp, playerMaxHp, enemyHp, enemyMaxHp } = battleState;
    const playerPercent = Math.max(0, (playerHp / playerMaxHp) * 100);
    const enemyPercent = Math.max(0, (enemyHp / enemyMaxHp) * 100);

    playerHealthFill.style.width = `${playerPercent}%`;
    enemyHealthFill.style.width = `${enemyPercent}%`;
    if (playerHealthText) playerHealthText.textContent = `${Math.max(0, playerHp)}`;
    if (enemyHealthText) enemyHealthText.textContent = `${Math.max(0, enemyHp)}`;
  };

  const clearBattle = () => {
    battleState = null;
    playerSelectContainer.hidden = false;
    battleStage.hidden = true;
    attackGrid.innerHTML = "";
    if (playerLevelLabel) playerLevelLabel.textContent = "";
    if (enemyLevelLabel) enemyLevelLabel.textContent = "";
  };

  const renderAttacks = (level) => {
    const attacks = getAvailableAttacks(level);
    attackGrid.innerHTML = "";
    attacks.forEach((attack) => {
      const button = document.createElement("button");
      button.className = "attack-btn";
      button.textContent = `${attack.name} · ${attack.min}-${attack.max}`;
      button.addEventListener("click", () => {
        if (battleState?.turn === "player" && !battleState.locked) {
          executePlayerAttack(attack);
        }
      });
      attackGrid.appendChild(button);
    });
  };

  const executeEnemyAttack = () => {
    if (!battleState) return;
    const damage = randomBetween(
      10 + battleState.enemyLevel * 2,
      18 + battleState.enemyLevel * 3,
    );
    battleState.playerHp = Math.max(0, battleState.playerHp - damage);
    appendLog(`${battleState.enemyName} golpea y hace ${damage} de daño.`);
    updateHealthBars();
    if (battleState.playerHp <= 0) {
      handleBattleEnd("lose");
    } else {
      battleState.turn = "player";
      battleState.locked = false;
      lockAttacks(false);
    }
  };

  const handleBattleEnd = (result) => {
    if (!battleState) return;
    lockAttacks(true);
    const player = getPlayerById(battleState.playerId);
    if (!player) return;

    if (result === "win") {
      appendLog(`¡${player.name} gana la batalla!`);
      const reward = 80 + player.pet.level * 40;
      player.money += reward;
      const xpGain = 0.75;
      player.pet.xp += xpGain;
      const threshold = player.pet.level;
      if (player.pet.xp >= threshold) {
        player.pet.level += 1;
        player.pet.xp = 0;
        if (playerLevelLabel) playerLevelLabel.textContent = player.pet.level;
        appendLog(`La mascota sube a nivel ${player.pet.level}. Nuevos ataques disponibles.`);
      } else {
        appendLog(`Gana ${reward} monedas y ${xpGain.toFixed(2)} de XP.`);
      }
      saveState();
      setTimeout(() => {
        showToast(`${player.name} gana ${reward.toLocaleString("es-ES")} monedas en Jimbo.`);
        showScreen("inicio");
        homeActions.render();
        homeActions.showMoneyAnimation(player.id, reward);
        clearBattle();
      }, 1400);
    } else {
      appendLog(`${player.name} pierde la batalla.`);
      const penalty = Math.min(player.money, 70 + player.pet.level * 30);
      player.money -= penalty;
      saveState();
      setTimeout(() => {
        showToast(`${player.name} pierde ${penalty.toLocaleString("es-ES")} monedas en Jimbo.`);
        showScreen("inicio");
        homeActions.render();
        homeActions.showMoneyAnimation(player.id, -penalty);
        clearBattle();
      }, 1400);
    }
  };

  const executePlayerAttack = (attack) => {
    if (!battleState) return;
    battleState.locked = true;
    lockAttacks(true);
    const damage = randomBetween(attack.min, attack.max);
    battleState.enemyHp = Math.max(0, battleState.enemyHp - damage);
    appendLog(`Tu mascota usa ${attack.name} y causa ${damage} de daño.`);
    updateHealthBars();
    if (battleState.enemyHp <= 0) {
      handleBattleEnd("win");
    } else {
      battleState.turn = "enemy";
      setTimeout(executeEnemyAttack, 900);
    }
  };

  const startBattle = (playerId) => {
    const player = getPlayerById(playerId);
    if (!player) return;
    const petLevel = player.pet.level;
    const playerMaxHp = 60 + petLevel * 20;
    const enemyLevel = Math.max(1, petLevel + randomBetween(-1, 1));
    const enemyMaxHp = 60 + enemyLevel * 18;

    battleState = {
      playerId,
      playerHp: playerMaxHp,
      playerMaxHp,
      enemyHp: enemyMaxHp,
      enemyMaxHp,
      enemyLevel,
      enemyName: ENEMY_NAMES[Math.floor(Math.random() * ENEMY_NAMES.length)],
      turn: "player",
      locked: false,
    };

    playerSelectContainer.hidden = true;
    battleStage.hidden = false;
    playerPetLabel.textContent = player.name;
    if (playerLevelLabel) playerLevelLabel.textContent = petLevel;
    enemyLabel.textContent = battleState.enemyName;
    if (enemyLevelLabel) enemyLevelLabel.textContent = enemyLevel;
    updateHealthBars();
    renderAttacks(petLevel);
    appendLog(`¡${player.name} entra en combate!`);
    appendLog(`Aparece ${battleState.enemyName} (nivel ${enemyLevel}).`);
  };

  const renderPlayerSelector = (players) => {
    playerSelectContainer.innerHTML = "";
    players.forEach((player) => {
      const card = playerSelectTemplate.content.firstElementChild.cloneNode(true);
      card.dataset.playerId = player.id;
      card.querySelector(".player-name").textContent = player.name;
      card.querySelector(".player-money").textContent = `${player.money.toLocaleString("es-ES")} monedas · Nivel ${player.pet.level}`;
      card.querySelector("button").addEventListener("click", () => startBattle(player.id));
      playerSelectContainer.appendChild(card);
    });
  };

  const enterJimbo = () => {
    clearBattle();
  };

  const abortBattle = () => {
    if (!battleState) return false;
    clearBattle();
    return true;
  };

  return {
    renderPlayerSelector,
    enterJimbo,
    abortBattle,
  };
};
