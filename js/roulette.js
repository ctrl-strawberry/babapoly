import { saveState, getPlayerById } from "./state.js";
import { formatMoney, randomBetween } from "./utils.js";

export const initRoulette = ({
  roulettePlayer,
  rouletteAmount,
  rouletteNumber,
  rouletteHelper,
  rouletteWheel,
  rouletteResult,
  spinBtn,
  showScreen,
  showToast,
  homeActions,
}) => {
  let spinTimeout = null;

  const resetWheel = () => {
    clearTimeout(spinTimeout);
    rouletteWheel.classList.remove("roulette-spin");
    rouletteResult.textContent = "?";
    rouletteHelper.textContent = "";
  };

  const renderPlayerOptions = (players) => {
    roulettePlayer.innerHTML = "";
    players.forEach((player) => {
      const option = document.createElement("option");
      option.value = player.id;
      option.textContent = `${player.name} · ${formatMoney(player.money)}`;
      roulettePlayer.appendChild(option);
    });
    if (!players.length) {
      rouletteHelper.textContent = "Añade jugadores para jugar.";
    }
  };

  const handleResult = (player, bet, chosenNumber, resultNumber) => {
    if (resultNumber === chosenNumber) {
      const prize = bet * 35;
      player.money += bet + prize;
      rouletteHelper.textContent = `¡Acertaste! Ganas ${prize.toLocaleString("es-ES")} monedas.`;
      saveState();
      showToast(`${player.name} gana ${prize.toLocaleString("es-ES")} monedas en la ruleta.`);
      showScreen("inicio");
      homeActions.render();
      homeActions.showMoneyAnimation(player.id, prize);
    } else {
      rouletteHelper.textContent = `No fue esta vez. Pierdes ${bet.toLocaleString("es-ES")} monedas.`;
      saveState();
      showToast(`${player.name} pierde ${bet.toLocaleString("es-ES")} monedas en la ruleta.`);
      showScreen("inicio");
      homeActions.render();
      homeActions.showMoneyAnimation(player.id, -bet);
    }
  };

  const handleSpin = () => {
    const playerId = roulettePlayer.value;
    const player = getPlayerById(playerId);
    if (!player) {
      rouletteHelper.textContent = "Selecciona un jugador válido.";
      return;
    }
    const bet = Number(rouletteAmount.value);
    const chosenNumber = Number(rouletteNumber.value);
    if (!Number.isFinite(bet) || bet <= 0) {
      rouletteHelper.textContent = "La apuesta debe ser positiva.";
      return;
    }
    if (bet > player.money) {
      rouletteHelper.textContent = "Ese jugador no tiene tantas monedas.";
      return;
    }
    if (!Number.isInteger(chosenNumber) || chosenNumber < 0 || chosenNumber > 36) {
      rouletteHelper.textContent = "El número debe estar entre 0 y 36.";
      return;
    }

    rouletteHelper.textContent = "Girando...";
    rouletteWheel.classList.remove("roulette-spin");
    // restart animation
    void rouletteWheel.offsetWidth;
    rouletteWheel.classList.add("roulette-spin");

    player.money -= bet;
    saveState();

    spinTimeout = setTimeout(() => {
      const result = randomBetween(0, 36);
      rouletteResult.textContent = result;
      handleResult(player, bet, chosenNumber, result);
    }, 2300);
  };

  spinBtn.addEventListener("click", handleSpin);

  return {
    renderPlayerOptions,
    resetWheel,
  };
};
