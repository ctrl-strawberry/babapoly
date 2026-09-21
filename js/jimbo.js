import { saveState, getPlayerById, addToPot, getPetProgressLabel, gainPetXp } from "./state.js";
import {
  ATTACKS, INTENTS, createBattle, getAvailableAttacks, getLoadout,
  getAttackRange, getEnemyRange, getPlayerStats, getVictoryReward, getDefeatPenalty, resolveTurn,
} from "./jimbo-combat.js";

const ENEMIES = [
  { name: "Banette", sprite: "assets/bannete.gif" },
  { name: "Blastoise", sprite: "assets/blastoise.gif" },
  { name: "Giratina", sprite: "assets/giratina.gif" },
  { name: "Haunter", sprite: "assets/haunter.gif" },
  { name: "Mewtwo", sprite: "assets/mewtwo.gif" },
  { name: "Scyther", sprite: "assets/scyder.gif" },
  { name: "Sneasel", sprite: "assets/sneasel.gif" },
  { name: "Totodile", sprite: "assets/totodile-pokemon.gif" },
  { name: "Vaporeon", sprite: "assets/vaporeon.gif" },
];

const makeElement = (tag, className, text) => {
  const element = document.createElement(tag);
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};
const makeButton = (name, detail, handler) => {
  const button = makeElement("button", "attack-btn");
  button.type = "button";
  button.append(makeElement("span", "attack-name", name), makeElement("span", "attack-damage", detail));
  button.addEventListener("click", handler);
  return button;
};

export const initJimbo = ({
  playerSelectContainer, playerSelectTemplate, battleStage, attackGrid,
  playerPetLabel, enemyLabel, playerHealthFill, enemyHealthFill,
  playerHealthText, enemyHealthText, playerLevelLabel, enemyLevelLabel,
  battleTypeChip, battleThreatChip, battleIntentChip, battleHintText, battleLog,
  playerCharacter, enemyCharacter, showToast, showScreen, homeActions,
}) => {
  let battleState = null;
  let turnTimer = null;
  let selectingSlot = null;
  let changingMoves = false;
  let lastPlayers = [];

  const appendLog = (message) => {
    battleLog.prepend(makeElement("li", "battle-log-entry", message));
    while (battleLog.children.length > 4) battleLog.lastElementChild.remove();
  };

  const playSpriteAnimation = (element, className) => {
    if (!element) return;
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
    element.addEventListener("animationend", () => element.classList.remove(className), { once: true });
  };

  const updateHealthBars = () => {
    const b = battleState;
    if (!b) return;
    playerHealthFill.style.width = `${100 * b.playerHp / b.playerMaxHp}%`;
    enemyHealthFill.style.width = `${100 * b.enemyHp / b.enemyMaxHp}%`;
    playerHealthText.textContent = `${b.playerHp}/${b.playerMaxHp}`;
    enemyHealthText.textContent = `${b.enemyHp}/${b.enemyMaxHp}`;
  };

  const clearBattle = () => {
    clearTimeout(turnTimer);
    turnTimer = null;
    battleState = null;
    selectingSlot = null;
    changingMoves = false;
    playerSelectContainer.hidden = false;
    battleStage.hidden = true;
    attackGrid.replaceChildren();
    battleLog.replaceChildren();
    playerCharacter?.classList.remove("attack-player", "hit");
    enemyCharacter?.classList.remove("attack-enemy", "hit");
  };

  const renderStatus = () => {
    const b = battleState;
    const enemyRange = getEnemyRange(b);
    battleTypeChip.textContent = `Turno ${b.turn}`;
    battleThreatChip.textContent = b.elite ? "Rival élite" : "Rival normal";
    battleThreatChip.dataset.threat = b.elite ? "elite" : "normal";
    battleIntentChip.textContent = `${INTENTS[b.intent].name} · ${b.intent === "recover" ? "+16 PS" : `${enemyRange.min}–${enemyRange.max} daño`}`;
    battleHintText.textContent = INTENTS[b.intent].hint;
  };

  const renderAttacks = () => {
    const b = battleState;
    attackGrid.replaceChildren();
    if (!b || b.outcome) return;
    renderStatus();
    if (changingMoves) {
      battleHintText.textContent = selectingSlot === null
        ? "Elige qué ataque sustituir. Mirar o cancelar es gratis; confirmar el cambio consume el turno y el rival actúa."
        : `Sustituir ${ATTACKS.find((a) => a.id === b.moves[selectingSlot]).name}. El ataque nuevo estará disponible en tu próximo turno.`;
      if (selectingSlot === null) {
        b.moves.forEach((id, slot) => {
          const attack = ATTACKS.find((a) => a.id === id);
          attackGrid.append(makeButton(attack.name, "Sustituir este ataque", () => {
            selectingSlot = slot;
            renderAttacks();
          }));
        });
      } else {
        getAvailableAttacks(b.level).filter((a) => !b.moves.includes(a.id)).forEach((attack) => {
          const cooldown = b.cooldowns[attack.id] || 0;
          attackGrid.append(makeButton(`Equipar ${attack.name}`, `${attack.description} · Cuesta 1 turno${cooldown > 1 ? ` · Descanso pendiente: ${cooldown - 1}` : ""}`, () => {
            performAction({ type: "swap", slot: selectingSlot, attackId: attack.id });
          }));
        });
      }
      attackGrid.append(makeButton("Cancelar", "No consume turno", () => {
        changingMoves = false;
        selectingSlot = null;
        renderAttacks();
      }));
      return;
    }
    b.moves.forEach((id) => {
      const attack = ATTACKS.find((a) => a.id === id);
      const range = getAttackRange(b, attack);
      const cooldown = b.cooldowns[id] || 0;
      const label = cooldown ? `Descansa ${cooldown} turno${cooldown > 1 ? "s" : ""}`
        : `${range.min}–${range.max} daño${range.fatigued ? " · Fatiga −35%" : ""}`;
      const button = makeButton(attack.name, label, () => performAction({ type: "attack", attackId: id }));
      button.append(makeElement("span", "attack-description", attack.description));
      button.disabled = b.locked || cooldown > 0;
      button.dataset.attackId = id;
      attackGrid.append(button);
    });
    const reserve = getAvailableAttacks(b.level).length - 3;
    const change = makeButton("Cambiar ataque", reserve ? `${reserve} en reserva · Cuesta 1 turno` : "Primera reserva en el nivel 2", () => {
      changingMoves = true;
      selectingSlot = null;
      renderAttacks();
    });
    change.classList.add("attack-btn-change");
    change.disabled = b.locked || !reserve;
    attackGrid.append(change);
  };

  const handleBattleEnd = () => {
    const b = battleState;
    if (!b || b.settled) return;
    b.settled = true;
    b.locked = true;
    const player = getPlayerById(b.playerId);
    if (!player) {
      clearBattle();
      return;
    }
    const won = b.outcome === "win";
    const xpGain = won ? 4 : 2;
    const baseReward = won ? getVictoryReward(b.level) : -Math.min(player.money, getDefeatPenalty(b.level));
    const { previousLevel, levelBonus } = gainPetXp(player.pet, xpGain);
    player.money += baseReward + levelBonus;
    if (!won) addToPot(-baseReward);
    saveState();
    homeActions.render();
    battleTypeChip.textContent = won ? "¡Victoria!" : "Derrota";
    battleIntentChip.textContent = `+${xpGain} XP · ${getPetProgressLabel(player.pet)}`;
    playerLevelLabel.textContent = `Nv. ${player.pet.level}`;
    const unlocked = ATTACKS.filter((a) => a.level > previousLevel && a.level <= player.pet.level);
    const result = [`${won ? `Ganas ${baseReward}` : `Pierdes ${-baseReward}`} monedas. +${xpGain} XP.`];
    if (player.pet.level > previousLevel) {
      result.push(`¡Nivel ${player.pet.level}! +${levelBonus} monedas de bonus y mejores estadísticas.`);
      if (unlocked.length) result.push(`Nuevo: ${unlocked.map((a) => a.name).join(", ")}. Equípalo antes del próximo combate.`);
      if (previousLevel < 4 && player.pet.level >= 4) result.push("¡Ya tienes los seis ataques desbloqueados!");
    }
    battleHintText.textContent = result.join(" ");
    showToast(won ? "¡Victoria de Jimbo! +4 XP" : "Jimbo aprende de la derrota: +2 XP");
    attackGrid.replaceChildren(makeButton("Volver a Inicio", "Resultado guardado", () => {
      const delta = baseReward + levelBonus;
      clearBattle();
      showScreen("inicio");
      homeActions.showMoneyAnimation(player.id, delta);
    }), makeButton("Elegir jugador", "Preparar otro combate", () => {
      clearBattle();
      renderPlayerSelector(lastPlayers);
    }));
  };

  const performAction = (action) => {
    const b = battleState;
    if (!b || b.locked || b.outcome) return;
    b.locked = true;
    attackGrid.querySelectorAll("button").forEach((button) => { button.disabled = true; });
    if (action.type === "attack") playSpriteAnimation(playerCharacter, "attack-player");
    turnTimer = setTimeout(() => {
      if (battleState !== b) return;
      const result = resolveTurn(b, action);
      if (result) {
        if (action.type === "swap") {
          const player = getPlayerById(b.playerId);
          if (player) {
            player.pet.moves = [...b.moves];
            saveState();
          }
        }
        appendLog(`Turno ${b.outcome ? b.turn : b.turn - 1} · ${result.messages.join(" ")}`);
        if (result.playerDamage) playSpriteAnimation(enemyCharacter, "hit");
        if (result.enemyDamage) {
          playSpriteAnimation(enemyCharacter, "attack-enemy");
          playSpriteAnimation(playerCharacter, "hit");
        }
      }
      changingMoves = false;
      selectingSlot = null;
      b.locked = false;
      updateHealthBars();
      if (b.outcome) handleBattleEnd();
      else renderAttacks();
    }, 600);
  };

  const startBattle = (playerId) => {
    const player = getPlayerById(playerId);
    if (!player) return;
    clearBattle();
    battleState = { ...createBattle(player.pet.level, player.pet.moves), playerId, locked: false };
    const enemy = ENEMIES[Math.floor(Math.random() * ENEMIES.length)];
    playerSelectContainer.hidden = true;
    battleStage.hidden = false;
    playerPetLabel.textContent = player.name;
    playerLevelLabel.textContent = `Nv. ${player.pet.level}`;
    enemyLabel.textContent = enemy.name;
    enemyLevelLabel.textContent = battleState.elite ? "Élite" : "Normal";
    enemyCharacter.src = enemy.sprite;
    enemyCharacter.alt = enemy.name;
    updateHealthBars();
    renderAttacks();
    appendLog("El daño de los botones ya incluye defensa y fatiga. Repetir un ataque reduce su daño un 35%.");
  };

  const renderPreparation = (card, player) => {
    const details = makeElement("details", "jimbo-preparation");
    details.append(makeElement("summary", "", "Preparar ataques · 3 equipados"));
    const available = getAvailableAttacks(player.pet.level);
    const next = ATTACKS.find((a) => a.level > player.pet.level);
    details.append(makeElement("p", "", next ? `Próximo: ${next.name} al nivel ${next.level}.` : "Todos los ataques desbloqueados. Sigue subiendo para mejorar vida, daño y premios."));
    const loadout = getLoadout(player.pet.level, player.pet.moves);
    loadout.forEach((id, slot) => {
      const label = makeElement("label", "", `Ataque ${slot + 1}`);
      const select = document.createElement("select");
      available.forEach((a) => {
        const option = makeElement("option", "", a.name);
        option.value = a.id;
        select.append(option);
      });
      select.value = id;
      label.append(select);
      const description = makeElement("p", "jimbo-move-description", ATTACKS.find((a) => a.id === id).description);
      select.addEventListener("change", () => {
        if (loadout.includes(select.value)) {
          select.value = loadout[slot];
          showToast("Ese ataque ya está equipado. Elige uno distinto.");
          return;
        }
        loadout[slot] = select.value;
        player.pet.moves = [...loadout];
        description.textContent = ATTACKS.find((a) => a.id === select.value).description;
        saveState();
      });
      details.append(label, description);
    });
    details.append(makeElement("p", "", "Aquí los cambios son gratis. En combate, cambiar consume tu turno de ataque."));
    card.append(details);
  };

  const renderPlayerSelector = (players) => {
    lastPlayers = players;
    playerSelectContainer.replaceChildren();
    const rules = makeElement("div", "jimbo-guide");
    rules.append(makeElement("strong", "", "Lee al rival. Elige tu respuesta."),
      makeElement("p", "", "3 ataques equipados. Repetir resta un 35% de daño. +4 XP al ganar, +2 al perder. Nuevos ataques en los niveles 2, 3 y 4; más vida, daño y monedas al subir."));
    playerSelectContainer.append(rules);
    if (!players.length) playerSelectContainer.append(makeElement("p", "helper-text", "Añade un jugador en Inicio para jugar con Jimbo."));
    players.forEach((player) => {
      const card = playerSelectTemplate.content.firstElementChild.cloneNode(true);
      card.dataset.playerId = player.id;
      card.querySelector(".player-name").textContent = player.name;
      card.querySelector(".player-money").textContent = `Nivel ${player.pet.level} · ${getPetProgressLabel(player.pet)} · ${getPlayerStats(player.pet.level).hp} PS`;
      card.append(makeElement("p", "jimbo-reward", `Victoria: +${getVictoryReward(player.pet.level)} monedas · Derrota: hasta −${getDefeatPenalty(player.pet.level)}`));
      card.querySelector("button").addEventListener("click", () => startBattle(player.id));
      renderPreparation(card, player);
      playerSelectContainer.append(card);
    });
  };

  return {
    renderPlayerSelector,
    enterJimbo: () => { clearBattle(); renderPlayerSelector(lastPlayers); },
    abortBattle: () => {
      if (!battleState) return false;
      clearBattle();
      renderPlayerSelector(lastPlayers);
      return true;
    },
  };
};
