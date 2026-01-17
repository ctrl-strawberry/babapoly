import { saveState, getPlayerById, addToPot } from "./state.js";
import { randomBetween } from "./utils.js";

const ATTACKS = [
  { level: 1, name: "Arañazo tímido", min: 14, max: 20 },
  { level: 2, name: "Mordisco chillón", min: 22, max: 30 },
  { level: 3, name: "Patada estelar", min: 32, max: 44 },
  { level: 4, name: "Onda baba", min: 46, max: 62 },
  { level: 5, name: "Explosión polimorfa", min: 65, max: 85 },
];

const ENEMIES = [
  { name: "Bannette", sprite: "assets/bannete.gif" },
  { name: "Blastoise", sprite: "assets/blastoise.gif" },
  { name: "Giratina", sprite: "assets/giratina.gif" },
  { name: "Haunter", sprite: "assets/haunter.gif" },
  { name: "Mewtwo", sprite: "assets/mewtwo.gif" },
  { name: "Scyther", sprite: "assets/scyder.gif" },
  { name: "Sneasel", sprite: "assets/sneasel.gif" },
  { name: "Totodile", sprite: "assets/totodile-pokemon.gif" },
  { name: "Vaporeon", sprite: "assets/vaporeon.gif" },
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
  playerCharacter,
  enemyCharacter,
  showToast,
  showScreen,
  homeActions,
}) => {
  let battleState = null;

  const appendLog = () => { };

  const playSpriteAnimation = (element, className) => {
    if (!element) return;
    element.classList.remove(className);
    // Reinicia la animación forzando un reflow
    void element.offsetWidth;
    element.classList.add(className);
    const handleAnimationEnd = () => {
      element.classList.remove(className);
      element.removeEventListener("animationend", handleAnimationEnd);
    };
    element.addEventListener("animationend", handleAnimationEnd);
  };

  const triggerAttackAnimation = (side) => {
    if (side === "player") {
      playSpriteAnimation(playerCharacter, "attack-player");
    } else {
      playSpriteAnimation(enemyCharacter, "attack-enemy");
    }
  };

  const triggerHitAnimation = (side) => {
    if (side === "player") {
      playSpriteAnimation(playerCharacter, "hit");
    } else {
      playSpriteAnimation(enemyCharacter, "hit");
    }
  };

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
    if (playerCharacter) {
      playerCharacter.classList.remove("attack-player", "hit");
    }
    if (enemyCharacter) {
      enemyCharacter.classList.remove("attack-enemy", "hit");
    }
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
    triggerAttackAnimation("enemy");
    const damage = randomBetween(
      6 + battleState.enemyLevel * 2,
      12 + battleState.enemyLevel * 3,
    );
    battleState.playerHp = Math.max(0, battleState.playerHp - damage);
    appendLog(`${battleState.enemyName} golpea y hace ${damage} de daño.`);
    updateHealthBars();
    triggerHitAnimation("player");
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
      addToPot(penalty);
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
    triggerAttackAnimation("player");
    const damage = randomBetween(attack.min, attack.max);
    battleState.enemyHp = Math.max(0, battleState.enemyHp - damage);
    appendLog(`Tu mascota usa ${attack.name} y causa ${damage} de daño.`);
    updateHealthBars();
    triggerHitAnimation("enemy");
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

    let enemyLevel;
    const r = Math.random();
    if (petLevel === 1) {
      // 75% mismo nivel (1), 25% nivel superior (2)
      enemyLevel = r < 0.75 ? 1 : 2;
    } else {
      // 50% mismo nivel, 25% inferior, 25% superior
      if (r < 0.25) {
        enemyLevel = petLevel - 1;
      } else if (r < 0.75) {
        enemyLevel = petLevel;
      } else {
        enemyLevel = petLevel + 1;
      }
    }
    enemyLevel = Math.max(1, enemyLevel);
    const enemyMaxHp = 60 + enemyLevel * 18;

    // Pick a random enemy from our Pokemon list
    const randomEnemy = ENEMIES[Math.floor(Math.random() * ENEMIES.length)];

    battleState = {
      playerId,
      playerHp: playerMaxHp,
      playerMaxHp,
      enemyHp: enemyMaxHp,
      enemyMaxHp,
      enemyLevel,
      enemyName: randomEnemy.name,
      turn: "player",
      locked: false,
    };

    playerSelectContainer.hidden = true;
    battleStage.hidden = false;

    // Update UI with names and levels
    playerPetLabel.textContent = player.name;
    if (playerLevelLabel) playerLevelLabel.textContent = petLevel;
    enemyLabel.textContent = battleState.enemyName;
    if (enemyLevelLabel) enemyLevelLabel.textContent = enemyLevel;

    // Update enemy sprite correctly
    if (enemyCharacter) {
      enemyCharacter.src = randomEnemy.sprite;
      enemyCharacter.alt = randomEnemy.name;
    }

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
