import {
  state,
  saveState,
  getPlayerById,
  addPlayer,
  deletePlayer,
  DEFAULT_PLAYER_COLOR,
} from "./state.js";
import { formatMoney, readFileAsBase64, toDataUrl } from "./utils.js";

const BANK_PLAYER_ID = "bank";
const BANK_PLAYER_NAME = "Banca";
const POT_PLAYER_ID = "pot";
const POT_PLAYER_NAME = "Bote";

const prefersDarkScheme =
  typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;

const COLOR_PRESETS = [
  { label: "Negro", value: DEFAULT_PLAYER_COLOR },
  { label: "Neón Violeta", value: "#7f5af0" },
  { label: "Cian Plasma", value: "#00b7ff" },
  { label: "Verde Ácido", value: "#2ce598" },
  { label: "Magenta Pulsar", value: "#ff2d88" },
];

const HEX_COLOR_REGEX = /^#([0-9a-f]{6})$/i;

const sanitizeHexColor = (value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (HEX_COLOR_REGEX.test(trimmed)) {
      return trimmed.toLowerCase();
    }
  }
  return DEFAULT_PLAYER_COLOR;
};

const rgbToHex = (r, g, b) =>
  `#${[r, g, b]
    .map((component) =>
      Math.round(Math.min(255, Math.max(0, component)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;

const hexToRgb = (hex) => {
  const normalized = sanitizeHexColor(hex).slice(1);
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
};

const mixHexColors = (sourceHex, targetHex, ratio) => {
  const safeRatio = Math.min(Math.max(Number(ratio) || 0, 0), 1);
  const source = hexToRgb(sourceHex);
  const target = hexToRgb(targetHex);
  const mixComponent = (a, b) => a + (b - a) * safeRatio;
  return rgbToHex(
    mixComponent(source.r, target.r),
    mixComponent(source.g, target.g),
    mixComponent(source.b, target.b),
  );
};

const adjustColorForScheme = (hex, isDark) => {
  const sanitized = sanitizeHexColor(hex);
  return isDark
    ? mixHexColors(sanitized, "#ffffff", 0.6)
    : mixHexColors(sanitized, "#000000", 0.4);
};

const getSchemeAdjustedNameColor = (hex) =>
  adjustColorForScheme(hex, prefersDarkScheme?.matches ?? false);

const applyNameAccent = (element, color) => {
  if (!element) return;
  element.style.color = getSchemeAdjustedNameColor(color);
};

const AVATAR_EDIT_ENDPOINT =
  typeof window !== "undefined" && window.BABA_POLY_AVATAR_ENDPOINT
    ? window.BABA_POLY_AVATAR_ENDPOINT
    : "/api/edit-avatar";

const requestAvatarFromBackend = async (
  file,
  { colorHex = DEFAULT_PLAYER_COLOR } = {},
) => {
  const base64Source = await readFileAsBase64(file);
  const fallback = toDataUrl(base64Source, file.type || "image/png");
  const backgroundColor = sanitizeHexColor(colorHex);
  const prompt = `crea una imagen de mi busto, añademe monoculo, sombrero de copa y un gran bigote blanco clasico. añade un fondo del color ${backgroundColor} con estilo ciberpunk e iluminación cinematográfica, con luces de neón y volumen dramático. la composición debe asemejarse a una foto tipo dni, busto centrado y mirada al frente.`;

  if (!base64Source) {
    return fallback;
  }

  if (!AVATAR_EDIT_ENDPOINT || AVATAR_EDIT_ENDPOINT === "#") {
    return fallback;
  }

  try {
    const response = await fetch(AVATAR_EDIT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: base64Source,
        mimeType: "image/png",
        prompt,
        colorHex: backgroundColor,
      }),
    });

    if (!response.ok) {
      throw new Error(`Avatar backend responded ${response.status}`);
    }

    const payload = await response.json();
    if (payload?.avatar && typeof payload.avatar === "string") {
      return payload.avatar;
    }

    return fallback;
  } catch (error) {
    console.warn("No se pudo obtener la imagen desde el backend:", error);
    return fallback;
  }
};

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

  addPlayerBtn.hidden = true;

  const isBank = (playerId) => playerId === BANK_PLAYER_ID;
  const isPot = (playerId) => playerId === POT_PLAYER_ID;

  const getParticipantById = (playerId) => {
    if (isBank(playerId)) {
      return {
        id: BANK_PLAYER_ID,
        name: BANK_PLAYER_NAME,
        money: Number.POSITIVE_INFINITY,
      };
    }
    if (isPot(playerId)) {
      return {
        id: POT_PLAYER_ID,
        name: POT_PLAYER_NAME,
        money: state.pot ?? 0,
      };
    }
    return getPlayerById(playerId);
  };

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
    if (isBank(playerId) || isPot(playerId)) return;

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

  const openDeleteConfirmModal = (playerId) => {
    const player = getPlayerById(playerId);
    if (!player) return;

    closeModal();

    const modal = document.createElement("div");
    modal.className = "modal-backdrop";
    modal.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h2>Eliminar jugador</h2>
        <p>¿Seguro que quieres eliminar a <strong>${player.name}</strong>?</p>
        <div class="modal-actions">
          <button class="btn btn-ghost" type="button" data-action="cancel">Cancelar</button>
          <button class="btn btn-danger" type="button" data-action="confirm">SI</button>
        </div>
      </div>
    `;

    modal.querySelector("[data-action='cancel']").addEventListener("click", closeModal);
    modal.querySelector("[data-action='confirm']").addEventListener("click", () => {
      deletePlayer(playerId);
      closeModal();
      renderPlayers();
    });

    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeModal();
      }
    });

    modalContainer.appendChild(modal);
    activeModal = modal;
    requestAnimationFrame(() => {
      amountInput.focus({ preventScroll: true });
      amountInput.select();
      amountInput.scrollIntoView({ block: "center" });
    });
  };

  const launchTransferModal = (fromId, toId) => {
    if (isPot(fromId) || isPot(toId)) return;

    const sourcePlayer = getParticipantById(fromId);
    const targetPlayer = getParticipantById(toId);
    if (!sourcePlayer || !targetPlayer) return;

    closeModal();

    const sourceMax = Number.isFinite(sourcePlayer.money)
      ? sourcePlayer.money
      : null;
    const maxAttribute =
      sourceMax !== null ? `max="${sourceMax}"` : "";

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
          <input id="transferAmount" type="number" min="1" ${maxAttribute} inputmode="decimal" autocomplete="off" required>
          <div class="modal-actions">
            <button class="btn btn-ghost" type="button" data-action="cancel">Cancelar</button>
            <button class="btn btn-primary" type="submit">Transferir</button>
          </div>
        </form>
      </div>
    `;

    const form = modal.querySelector("form");
    const amountInput = form.querySelector("#transferAmount");
    amountInput.addEventListener("input", () => amountInput.setCustomValidity(""));

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      amountInput.setCustomValidity("");
      const rawValue = amountInput.value.trim();
      if (!rawValue.length) {
        amountInput.setCustomValidity("Introduce una cantidad válida");
        amountInput.reportValidity();
        return;
      }
      const amount = Number(rawValue);
      if (!Number.isFinite(amount) || amount <= 0) {
        amountInput.setCustomValidity("Introduce una cantidad válida");
        amountInput.reportValidity();
        return;
      }
      if (Number.isFinite(sourceMax) && amount > sourceMax) {
        amountInput.setCustomValidity("No hay suficientes monedas");
        amountInput.reportValidity();
        return;
      }

      if (!isBank(fromId)) {
        sourcePlayer.money -= amount;
      }
      if (!isBank(toId)) {
        targetPlayer.money += amount;
      }

      if (!isBank(fromId) || !isBank(toId)) {
        saveState();
      }

      closeModal();
      renderPlayers();
      if (!isBank(fromId)) {
        showMoneyAnimation(fromId, -amount);
      }
      if (!isBank(toId)) {
        showMoneyAnimation(toId, amount);
      }
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
    requestAnimationFrame(() => {
      amountInput.focus({ preventScroll: true });
      amountInput.select();
      amountInput.scrollIntoView({ block: "center" });
    });
  };

  const openAddPlayerModal = () => {
    if (!editingMode) return;

    closeModal();

    const modal = document.createElement("div");
    modal.className = "modal-backdrop";
    modal.innerHTML = `
      <div class="modal add-player-modal" role="dialog" aria-modal="true">
        <header class="add-player-header">
          <h2>Gestionar jugadores</h2>
          <p>Revisa los jugadores existentes o crea uno nuevo con una foto personalizada.</p>
        </header>
        <div class="add-player-content">
          <section class="existing-players-section">
            <h3>Jugadores actuales</h3>
            <div class="existing-player-list" id="existingPlayerList"></div>
          </section>
          <form class="new-player-form">
            <h3>Crear jugador</h3>
            <label for="newPlayerName">Nombre</label>
            <input id="newPlayerName" type="text" maxlength="20" placeholder="Nombre del jugador" required>
            <label for="newPlayerMoney">Dinero inicial</label>
            <div class="money-inputs">
              <input id="newPlayerMoneyRange" type="range" min="100" max="2000" step="50" value="500">
              <input id="newPlayerMoneyValue" type="number" min="100" max="2000" step="50" value="500">
            </div>
            <div class="color-picker">
              <span class="color-picker-label">Color del fondo</span>
              <div class="color-picker-options" id="newPlayerColorOptions"></div>
              <p class="helper-text color-picker-helper">Se aplicará al fondo ciberpunk del retrato.</p>
            </div>
            <label for="newPlayerPhoto">Foto</label>
            <input id="newPlayerPhoto" type="file" accept="image/*" capture="environment" required>
            <p class="helper-text add-player-helper">
              La imagen se enviará a la IA para aplicar el estilo clásico con monóculo, sombrero, bigote y un fondo iluminado con el color elegido.
            </p>
            <div class="modal-actions">
              <button class="btn btn-ghost" type="button" data-action="cancel">Cancelar</button>
              <button class="btn btn-primary" type="submit" data-action="submit">Crear</button>
            </div>
          </form>
        </div>
        <p class="add-player-status" aria-live="polite"></p>
      </div>
    `;

    const form = modal.querySelector(".new-player-form");
    const nameInput = form.querySelector("#newPlayerName");
    const rangeInput = form.querySelector("#newPlayerMoneyRange");
    const numberInput = form.querySelector("#newPlayerMoneyValue");
    const photoInput = form.querySelector("#newPlayerPhoto");
    const submitButton = form.querySelector("[data-action='submit']");
    const cancelButton = form.querySelector("[data-action='cancel']");
    const statusLabel = modal.querySelector(".add-player-status");
    const existingList = modal.querySelector("#existingPlayerList");
    const colorOptionsContainer = form.querySelector("#newPlayerColorOptions");

    const colorButtonMap = new Map();
    let selectedColorHex = DEFAULT_PLAYER_COLOR;
    let customOption;
    let customColorInput;
    let customSwatch;
    let customHelperLabel;

    const selectColor = (color, element) => {
      const sanitized = sanitizeHexColor(color);
      selectedColorHex = sanitized;

      colorOptionsContainer
        ?.querySelectorAll(".color-option")
        .forEach((option) => {
          option.classList.remove("is-selected");
          option.setAttribute("aria-pressed", "false");
        });

      const target =
        element ??
        colorButtonMap.get(sanitized) ??
        customOption ??
        null;

      if (target) {
        target.classList.add("is-selected");
        target.setAttribute("aria-pressed", "true");
      }

      if (target === customOption && customColorInput) {
        if (customColorInput.value.toLowerCase() !== sanitized) {
          customColorInput.value = sanitized;
        }
        customSwatch?.style.setProperty("--swatch-color", sanitized);
        customHelperLabel && (customHelperLabel.textContent = sanitized.toUpperCase());
      } else if (customColorInput) {
        customSwatch?.style.setProperty("--swatch-color", customColorInput.value);
        customHelperLabel &&
          (customHelperLabel.textContent = customColorInput.value.toUpperCase());
      }
    };

    const createColorOption = ({ label, value }) => {
      const sanitized = sanitizeHexColor(value);
      const option = document.createElement("div");
      option.className = "color-option";
      option.tabIndex = 0;
      option.setAttribute("role", "button");
      option.setAttribute("aria-pressed", "false");
      option.dataset.color = sanitized;

      const swatch = document.createElement("span");
      swatch.className = "color-option-swatch";
      swatch.style.setProperty("--swatch-color", sanitized);

      const name = document.createElement("span");
      name.className = "color-option-name";
      name.textContent = label;

      const helper = document.createElement("span");
      helper.className = "color-option-helper";
      helper.textContent = sanitized.toUpperCase();

      option.append(swatch, name, helper);

      option.addEventListener("click", (event) => {
        event.preventDefault();
        selectColor(sanitized, option);
      });

      option.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectColor(sanitized, option);
        }
      });

      colorButtonMap.set(sanitized, option);
      return option;
    };

    const createCustomOption = () => {
      const option = document.createElement("div");
      option.className = "color-option color-option-custom";
      option.setAttribute("role", "button");
      option.setAttribute("aria-pressed", "false");
      option.tabIndex = 0;

      const swatch = document.createElement("span");
      swatch.className = "color-option-swatch";
      swatch.style.setProperty("--swatch-color", DEFAULT_PLAYER_COLOR);

      const name = document.createElement("span");
      name.className = "color-option-name";
      name.textContent = "Personalizar";

      const helper = document.createElement("span");
      helper.className = "color-option-helper";
      helper.textContent = DEFAULT_PLAYER_COLOR.toUpperCase();

      const colorInput = document.createElement("input");
      colorInput.type = "color";
      colorInput.value = DEFAULT_PLAYER_COLOR;
      colorInput.id = "newPlayerCustomColor";
      colorInput.className = "color-option-color-input";
      colorInput.setAttribute("aria-label", "Elige un color personalizado");
      colorInput.tabIndex = -1;

      option.append(swatch, name, helper, colorInput);

      const openPicker = () => {
        selectColor(colorInput.value, option);
        colorInput.click();
      };

      option.addEventListener("click", (event) => {
        if (event.target === colorInput) {
          return;
        }
        event.preventDefault();
        openPicker();
      });

      option.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openPicker();
        }
      });

      const handleCustomChange = () => {
        selectColor(colorInput.value, option);
      };

      colorInput.addEventListener("input", handleCustomChange);
      colorInput.addEventListener("change", handleCustomChange);

      colorInput.addEventListener("click", (event) => {
        event.stopPropagation();
        selectColor(colorInput.value, option);
      });

      customColorInput = colorInput;
      customHelperLabel = helper;
      customSwatch = swatch;
      return option;
    };

    if (colorOptionsContainer) {
      COLOR_PRESETS.forEach((preset) => {
        const option = createColorOption(preset);
        colorOptionsContainer.appendChild(option);
      });
      customOption = createCustomOption();
      colorOptionsContainer.appendChild(customOption);
      selectColor(DEFAULT_PLAYER_COLOR, colorButtonMap.get(DEFAULT_PLAYER_COLOR));
    }

    const clampMoney = (value) => {
      const min = Number(rangeInput.min);
      const max = Number(rangeInput.max);
      const numeric = Number.isFinite(Number(value)) ? Number(value) : min;
      return Math.min(Math.max(numeric, min), max);
    };

    const syncMoneyInputs = (value) => {
      const clamped = clampMoney(value);
      rangeInput.value = clamped;
      numberInput.value = clamped;
    };

    const renderExistingPlayersList = () => {
      existingList.innerHTML = "";
      if (!state.players.length) {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "helper-text";
        emptyMessage.textContent = "Todavía no hay jugadores registrados.";
        existingList.appendChild(emptyMessage);
        return;
      }

      state.players.forEach((player) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "existing-player-item";
        item.innerHTML = `
          <span class="existing-player-name">${player.name}</span>
          <span class="existing-player-money">${formatMoney(player.money)}</span>
        `;
        const playerColor = sanitizeHexColor(player.colorHex);
        const nameNode = item.querySelector(".existing-player-name");
        applyNameAccent(nameNode, playerColor);
        if (player.avatar) {
          const avatarPreview = document.createElement("img");
          avatarPreview.src = player.avatar;
          avatarPreview.alt = `Avatar de ${player.name}`;
          avatarPreview.loading = "lazy";
          avatarPreview.decoding = "async";
          avatarPreview.className = "existing-player-avatar";
          item.prepend(avatarPreview);
        }
        item.addEventListener("click", () => {
          nameInput.value = player.name;
          syncMoneyInputs(player.money);
          selectColor(playerColor);
          nameInput.focus();
        });
        existingList.appendChild(item);
      });
    };

    renderExistingPlayersList();

    rangeInput.addEventListener("input", (event) => syncMoneyInputs(event.target.value));
    numberInput.addEventListener("input", (event) => syncMoneyInputs(event.target.value));

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      statusLabel.classList.remove("is-error");
      statusLabel.textContent = "";

      const name = nameInput.value.trim();
      const money = Number(rangeInput.value);
      const photoFile = photoInput.files?.[0] ?? null;

      if (!name) {
        nameInput.reportValidity();
        return;
      }

      if (!photoFile) {
        photoInput.reportValidity();
        return;
      }

      const originalSubmitText = submitButton.textContent;
      submitButton.disabled = true;
      cancelButton.disabled = true;
      submitButton.textContent = "Creando...";
      statusLabel.textContent = "Generando imagen con la IA...";

      try {
        const colorHex = sanitizeHexColor(selectedColorHex);
        const avatarDataUrl = await requestAvatarFromBackend(photoFile, { colorHex });
        addPlayer({
          id: crypto.randomUUID(),
          name,
          money,
          pet: { level: 1, xp: 0 },
          avatar: avatarDataUrl,
          colorHex,
        });
        closeModal();
        renderPlayers();
      } catch (error) {
        console.error("No se pudo crear el jugador:", error);
        statusLabel.textContent = "No se pudo crear el jugador. Inténtalo de nuevo.";
        statusLabel.classList.add("is-error");
      } finally {
        submitButton.disabled = false;
        cancelButton.disabled = false;
        submitButton.textContent = originalSubmitText;
      }
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
    if (isPot(playerId)) {
      clearTransferSelection();
      return;
    }

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

    const bankCard = playerCardTemplate.content.firstElementChild.cloneNode(true);
    bankCard.dataset.playerId = BANK_PLAYER_ID;
    bankCard.classList.add("bank-card");
    bankCard.querySelector(".player-name").textContent = BANK_PLAYER_NAME;
    const bankMoneyNode = bankCard.querySelector(".player-money");
    if (bankMoneyNode) {
      bankMoneyNode.textContent = "";
    }
    const bankActions = bankCard.querySelector(".player-actions");
    bankActions?.remove();
    bankCard.addEventListener("click", () => handlePlayerClick(bankCard, BANK_PLAYER_ID));
    playerList.appendChild(bankCard);

    const potCard = playerCardTemplate.content.firstElementChild.cloneNode(true);
    potCard.dataset.playerId = POT_PLAYER_ID;
    potCard.classList.add("pot-card");
    potCard.querySelector(".player-name").textContent = POT_PLAYER_NAME;
    const potMoneyNode = potCard.querySelector(".player-money");
    if (potMoneyNode) {
      potMoneyNode.textContent = formatMoney(state.pot ?? 0);
    }
    const potActions = potCard.querySelector(".player-actions");
    potActions?.remove();
    potCard.disabled = true;
    potCard.classList.add("is-static");
    playerList.appendChild(potCard);

    state.players.forEach((player) => {
      const card = playerCardTemplate.content.firstElementChild.cloneNode(true);
      card.dataset.playerId = player.id;
      const playerColor = sanitizeHexColor(player.colorHex);
      card.style.setProperty("--player-accent", playerColor);

      const nameNode = card.querySelector(".player-name");
      if (nameNode) {
        nameNode.textContent = player.name;
        applyNameAccent(nameNode, playerColor);
      }

      const moneyNode = card.querySelector(".player-money");
      if (moneyNode) {
        moneyNode.textContent = formatMoney(player.money);
      }

      const actionArea = card.querySelector(".player-actions");
      const deleteButton = actionArea?.querySelector("[data-action='delete']");
      const avatarImg = actionArea?.querySelector(".player-avatar");

      if (avatarImg) {
        if (player.avatar) {
          avatarImg.src = player.avatar;
          avatarImg.alt = `Avatar de ${player.name}`;
          avatarImg.loading = "lazy";
          avatarImg.decoding = "async";
          card.classList.add("has-avatar");
        } else {
          avatarImg.removeAttribute("src");
          avatarImg.alt = "";
          card.classList.remove("has-avatar");
        }
      }

      card.classList.toggle("show-actions", editingMode);

      if (deleteButton) {
        deleteButton.tabIndex = editingMode ? 0 : -1;
        deleteButton.setAttribute("aria-hidden", editingMode ? "false" : "true");
        const handleDelete = (event) => {
          event.stopPropagation();
          openDeleteConfirmModal(player.id);
        };
        deleteButton.addEventListener("click", handleDelete);
        deleteButton.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleDelete(event);
          }
        });
      }

      card.addEventListener("click", () => handlePlayerClick(card, player.id));
      playerList.appendChild(card);
    });

    onPlayersUpdated([...state.players]);
  };

  if (prefersDarkScheme) {
    prefersDarkScheme.addEventListener("change", () => {
      renderPlayers();
    });
  }

  const toggleEditing = () => {
    editingMode = !editingMode;
    settingsToggle.classList.toggle("active", editingMode);
    settingsToggle.setAttribute("aria-pressed", String(editingMode));
    playerToolbar.hidden = !editingMode;
    addPlayerBtn.hidden = !editingMode;
    clearTransferSelection();
    renderPlayers();
  };

  const disableEditing = () => {
    if (!editingMode) return;
    editingMode = false;
    settingsToggle.classList.remove("active");
    settingsToggle.setAttribute("aria-pressed", "false");
    playerToolbar.hidden = true;
    addPlayerBtn.hidden = true;
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
