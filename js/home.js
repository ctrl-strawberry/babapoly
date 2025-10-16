import {
  state,
  saveState,
  getPlayerById,
  addPlayer,
  deletePlayer,
} from "./state.js";
import { formatMoney } from "./utils.js";

const TRANSFER_DEFAULT = 50;

export const initHome = ({
  playerList,
  playerToolbar,
  addPlayerBtn,
  settingsToggle,
  playerCardTemplate,
  modalContainer,
  onPlayersUpdated = () => {},
}) => {
  const transferState = { from: null, to: null };
  let editingMode = false;
  let activeModal = null;

  const clearTransferSelection = () => {
    transferState.from = null;
    transferState.to = null;
    playerList
      .querySelectorAll(".player-card.selected")
      .forEach((card) => card.classList.remove("selected"));
  };

  const closeModal = () => {
    if (activeModal) {
      activeModal.remove();
      activeModal = null;
      clearTransferSelection();
      return true;
    }
    return false;
  };

  const showMoneyAnimation = (playerId, amount) => {
    if (!amount) return;
    const targetCard = playerList.querySelector(
      `[data-player-id="${playerId}"]`,
    );
    if (!targetCard) return;
    const content = targetCard.querySelector(".player-card-content");
    if (!content) return;

    const type = amount > 0 ? "gain" : "loss";
    const overlayText = `${amount > 0 ? "+" : ""}${amount.toLocaleString("es-ES")}€`;

    targetCard.classList.remove("is-animating", "gain", "loss");
    delete targetCard.dataset.overlay;
    // Force reflow to restart animation
    void targetCard.offsetWidth;

    targetCard.dataset.overlay = overlayText;
    targetCard.classList.add(type);

    const handleAnimationEnd = (event) => {
      if (event.animationName !== "cardOverlayContent") return;
      targetCard.classList.remove("is-animating", "gain", "loss");
      delete targetCard.dataset.overlay;
    };

    content.addEventListener("animationend", handleAnimationEnd, { once: true });
    requestAnimationFrame(() => targetCard.classList.add("is-animating"));
  };

  const handlePlayerDelete = (playerId) => {
    deletePlayer(playerId);
    renderPlayers();
  };

  const launchTransferModal = (fromId, toId) => {
    const sourcePlayer = getPlayerById(fromId);
    const targetPlayer = getPlayerById(toId);
    if (!sourcePlayer || !targetPlayer) return;

    closeModal();

    const modal = document.createElement("div");
    modal.className = "modal-backdrop";
    modal.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h2>Transferir monedas</h2>
        <p class="transfer-info">
          De <strong>${sourcePlayer.name}</strong> hacia <strong>${targetPlayer.name}</strong>.
        </p>
        <form>
          <label for="transferAmount">Cantidad</label>
          <input id="transferAmount" type="number" min="1" max="${sourcePlayer.money}" value="${TRANSFER_DEFAULT}" required>
          <div class="modal-actions">
            <button class="btn btn-ghost" type="button" data-action="cancel">Cancelar</button>
            <button class="btn btn-primary" type="submit">Transferir</button>
          </div>
        </form>
      </div>
    `;

    const form = modal.querySelector("form");
    const amountInput = form.querySelector("#transferAmount");

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const amount = Number(amountInput.value);
      if (!Number.isFinite(amount) || amount <= 0) return;
      if (amount > sourcePlayer.money) {
        amountInput.setCustomValidity("No hay suficientes monedas");
        amountInput.reportValidity();
        return;
      }

      sourcePlayer.money -= amount;
      targetPlayer.money += amount;
      saveState();

      closeModal();
      renderPlayers();
      showMoneyAnimation(fromId, -amount);
      showMoneyAnimation(toId, amount);
    });

    modal
      .querySelector("[data-action='cancel']")
      .addEventListener("click", closeModal);

    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeModal();
      }
    });

    modalContainer.appendChild(modal);
    activeModal = modal;
  };

  const openAddPlayerModal = () => {
    closeModal();

    const modal = document.createElement("div");
    modal.className = "modal-backdrop";
    modal.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h2>Nuevo jugador</h2>
        <form>
          <label for="newPlayerName">Nombre</label>
          <input id="newPlayerName" type="text" maxlength="20" placeholder="Nombre del jugador" required>
          <label for="newPlayerMoney">Dinero inicial</label>
          <input id="newPlayerMoneyRange" type="range" min="100" max="2000" step="50" value="500">
          <input id="newPlayerMoneyValue" type="number" min="100" max="2000" step="50" value="500">
          <div class="modal-actions">
            <button class="btn btn-ghost" type="button" data-action="cancel">Cancelar</button>
            <button class="btn btn-primary" type="submit">Crear</button>
          </div>
        </form>
      </div>
    `;

    const form = modal.querySelector("form");
    const nameInput = form.querySelector("#newPlayerName");
    const rangeInput = form.querySelector("#newPlayerMoneyRange");
    const numberInput = form.querySelector("#newPlayerMoneyValue");

    const syncMoneyInputs = (value) => {
      rangeInput.value = value;
      numberInput.value = value;
    };

    rangeInput.addEventListener("input", (event) => syncMoneyInputs(event.target.value));
    numberInput.addEventListener("input", (event) => {
      let value = Number(event.target.value);
      if (Number.isNaN(value)) value = 100;
      value = Math.min(Math.max(value, Number(rangeInput.min)), Number(rangeInput.max));
      syncMoneyInputs(value);
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const name = nameInput.value.trim();
      const money = Number(rangeInput.value);
      if (!name) {
        nameInput.reportValidity();
        return;
      }
      addPlayer({
        id: crypto.randomUUID(),
        name,
        money,
        pet: { level: 1, xp: 0 },
      });
      closeModal();
      renderPlayers();
    });

    modal
      .querySelector("[data-action='cancel']")
      .addEventListener("click", closeModal);
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeModal();
      }
    });

    modalContainer.appendChild(modal);
    activeModal = modal;
    nameInput.focus();
  };

  const handlePlayerClick = (node, playerId) => {
    if (editingMode) {
      return;
    }

    if (!transferState.from) {
      transferState.from = playerId;
      node.classList.add("selected");
      return;
    }

    if (transferState.from === playerId) {
      clearTransferSelection();
      return;
    }

    transferState.to = playerId;
    node.classList.add("selected");
    launchTransferModal(transferState.from, transferState.to);
  };

  const renderPlayers = () => {
    playerList.innerHTML = "";
    state.players.forEach((player) => {
      const card = playerCardTemplate.content.firstElementChild.cloneNode(true);
      card.dataset.playerId = player.id;
      card.querySelector(".player-name").textContent = player.name;
      card.querySelector(".player-money").textContent = formatMoney(player.money);

      const actionContainer = card.querySelector(".player-actions");
      if (editingMode) {
        actionContainer.hidden = false;
        actionContainer
          .querySelector("[data-action='delete']")
          .addEventListener("click", (event) => {
            event.stopPropagation();
            handlePlayerDelete(player.id);
          });
      } else {
        actionContainer.hidden = true;
      }

      card.addEventListener("click", () => handlePlayerClick(card, player.id));
      playerList.appendChild(card);
    });

    onPlayersUpdated([...state.players]);
  };

  const toggleEditing = () => {
    editingMode = !editingMode;
    settingsToggle.classList.toggle("active", editingMode);
    settingsToggle.setAttribute("aria-pressed", String(editingMode));
    playerToolbar.hidden = !editingMode;
    clearTransferSelection();
    renderPlayers();
  };

  const disableEditing = () => {
    if (!editingMode) return;
    editingMode = false;
    settingsToggle.classList.remove("active");
    settingsToggle.setAttribute("aria-pressed", "false");
    playerToolbar.hidden = true;
    clearTransferSelection();
    renderPlayers();
  };

  settingsToggle.addEventListener("click", toggleEditing);
  addPlayerBtn.addEventListener("click", openAddPlayerModal);

  return {
    render: renderPlayers,
    toggleEditing,
    disableEditing,
    showMoneyAnimation,
    closeModal,
  };
};
