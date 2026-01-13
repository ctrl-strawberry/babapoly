import {
  state,
  saveState,
  getPlayerById,
  addPlayer,
  deletePlayer,
  DEFAULT_PLAYER_COLOR,
  upsertCreatedPlayer,
  removeCreatedPlayer,
  isPlayerActive,
  takePot,
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
  { label: "Amarillo Solar", value: DEFAULT_PLAYER_COLOR },
  { label: "Neón Violeta", value: "#7f5af0" },
  { label: "Cian Plasma", value: "#00b7ff" },
  { label: "Verde Ácido", value: "#2ce598" },
  { label: "Magenta Pulsar", value: "#ff2d88" },
  { label: "Coral Prisma", value: "#ff5f57" },
  { label: "Naranja Aurora", value: "#ff8a4d" },
  { label: "Azul Profundo", value: "#1f3dff" },
  { label: "Blanco Holograma", value: "#f5f7ff" },
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

const formatPotValue = (amount) => {
  const numericValue = Number(amount);
  if (!Number.isFinite(numericValue)) {
    return "0";
  }
  return numericValue.toLocaleString("es-ES");
};

const requestAvatarFromBackend = async (
  file,
  { colorHex = DEFAULT_PLAYER_COLOR } = {},
) => {
  const base64Source = await readFileAsBase64(file);
  const fallback = toDataUrl(base64Source, file.type || "image/png");
  const backgroundColor = sanitizeHexColor(colorHex);
  const prompt = `crea una imagen de mi cara, añademe monoculo, un mini bombin y un gran bigote blanco clasico. que solo se vea la cara en primer plano. añade un fondo del color ${backgroundColor} con estilo ciberpunk e iluminación cinematográfica, con luces de neón y volumen dramático. la composición debe asemejarse a una foto tipo dni, rostro centrado y mirada al frente.`;

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
  bottomNav,
  onPlayersUpdated = () => { },
}) => {
  const transferState = { from: null, to: null, prizeMode: false };
  let editingMode = false;
  let activeModal = null;
  let potAmountNodeRef = null;
  let potDisplayValue = state.pot ?? 0;
  let potAnimationTimer = null;
  const POT_ANIMATION_DURATION = 3000;

  const clearPotAnimation = () => {
    if (potAnimationTimer) {
      clearInterval(potAnimationTimer);
      potAnimationTimer = null;
    }
  };

  const updatePotAmountNode = (value) => {
    if (!potAmountNodeRef) return;
    potAmountNodeRef.textContent = formatPotValue(value);
  };

  const animatePotValue = (from, to) => {
    clearPotAnimation();

    if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) {
      potDisplayValue = to;
      updatePotAmountNode(to);
      return;
    }

    potDisplayValue = from;
    updatePotAmountNode(from);

    const totalSteps = Math.abs(Math.round(to - from));
    if (!totalSteps) {
      potDisplayValue = to;
      updatePotAmountNode(to);
      return;
    }

    const stepDirection = to > from ? 1 : -1;
    const stepDuration = POT_ANIMATION_DURATION / totalSteps;

    potAnimationTimer = setInterval(() => {
      if (!potAmountNodeRef) {
        clearPotAnimation();
        return;
      }

      potDisplayValue += stepDirection;
      updatePotAmountNode(potDisplayValue);

      if (potDisplayValue === to) {
        clearPotAnimation();
      }
    }, stepDuration);
  };

  addPlayerBtn.hidden = true;

  const setBottomNavHidden = (hidden) => {
    if (!bottomNav) return;
    bottomNav.classList.toggle("is-hidden", hidden);
    bottomNav.setAttribute("aria-hidden", hidden ? "true" : "false");
  };

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
    transferState.prizeMode = false;
    playerList
      .querySelectorAll(".player-card.selected")
      .forEach((card) => card.classList.remove("selected"));
    playerList
      .querySelectorAll(".player-card.prize-mode-active")
      .forEach((card) => card.classList.remove("prize-mode-active"));
  };

  const closeModal = () => {
    if (activeModal) {
      activeModal.remove();
      activeModal = null;
      clearTransferSelection();
      setBottomNavHidden(false);
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

    const cancelButtonNode = modal.querySelector("[data-action='cancel']");
    modalContainer.appendChild(modal);
    activeModal = modal;
    setBottomNavHidden(true);
    requestAnimationFrame(() => {
      cancelButtonNode?.focus({ preventScroll: true });
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
    setBottomNavHidden(true);
    requestAnimationFrame(() => {
      amountInput.focus({ preventScroll: true });
      amountInput.select();
      amountInput.scrollIntoView({ block: "center" });
    });
  };

  const openPrizeModal = (playerId) => {
    const player = getPlayerById(playerId);
    if (!player) return;

    const potAmount = state.pot || 0;
    if (potAmount <= 0) return;

    closeModal();

    const modal = document.createElement("div");
    modal.className = "modal-backdrop";
    modal.innerHTML = `
      <div class="prize-modal" role="dialog" aria-modal="true">
        <h2 class="prize-title">¡PREMIO!</h2>
        <div class="prize-amount">${formatMoney(potAmount)}</div>
        <p class="prize-winner">Felicidades <strong>${player.name}</strong>, el contenido del bote es tuyo.</p>
        <div class="modal-actions" style="justify-content: center; margin-top: 1rem;">
          <button class="btn-prize" type="button" data-action="confirm">ACEPTAR</button>
        </div>
      </div>
    `;

    modal.querySelector("[data-action='confirm']").addEventListener("click", () => {
      const amount = takePot(playerId);
      closeModal();
      renderPlayers();
      if (amount > 0) {
        showMoneyAnimation(playerId, amount);
      }
    });

    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        // En este modal de gloria, quizás es mejor no cerrarlo por error clicando fuera
        // pero por consistencia lo dejamos.
        closeModal();
      }
    });

    modalContainer.appendChild(modal);
    activeModal = modal;
    setBottomNavHidden(true);
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
        </header>
        <div class="add-player-content">
          <section class="created-players-section">
            <h3>Jugadores creados</h3>
            <div class="created-player-list" id="createdPlayerList"></div>
            <div class="created-player-action-bar" id="createdPlayerActionBar" hidden>
              <button class="btn btn-primary" type="button" data-action="addSelected">Añadir</button>
              <button class="btn btn-danger" type="button" data-action="removeSelected">Eliminar</button>
            </div>
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
              <div class="color-picker-options" id="newPlayerColorOptions" role="radiogroup" aria-label="Colores predeterminados"></div>
            </div>
            <div class="photo-picker">
              <span class="photo-picker-label">Foto</span>
              <div class="photo-picker-options">
                <button class="photo-picker-option" type="button" data-source="camera">
                  <span class="photo-picker-icon" aria-hidden="true">
                    <svg viewBox="0 0 48 48" role="img" focusable="false">
                      <path
                        fill="currentColor"
                        d="M15 12h4.3l2.7-4h10l2.7 4H39a5 5 0 0 1 5 5v18a5 5 0 0 1-5 5H15a5 5 0 0 1-5-5V17a5 5 0 0 1 5-5Zm9 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm0-4a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z"
                      />
                    </svg>
                  </span>
                  <span class="photo-picker-name">Cámara</span>
                </button>
                <button class="photo-picker-option" type="button" data-source="gallery">
                  <span class="photo-picker-icon" aria-hidden="true">
                    <svg viewBox="0 0 48 48" role="img" focusable="false">
                      <path
                        fill="currentColor"
                        d="M11 6h26a5 5 0 0 1 5 5v26a5 5 0 0 1-5 5H11a5 5 0 0 1-5-5V11a5 5 0 0 1 5-5Zm7 6a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm-7 24h32L32 22l-8 12-6-8-10 12Z"
                      />
                    </svg>
                  </span>
                  <span class="photo-picker-name">Galería</span>
                </button>
              </div>
              <input id="newPlayerPhotoCamera" type="file" accept="image/*" capture="environment" hidden>
              <input id="newPlayerPhotoGallery" type="file" accept="image/*" hidden>
              <p class="helper-text photo-picker-status" data-selected-photo-text aria-live="polite">
                Sin imagen seleccionada.
              </p>
            </div>
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
    const photoPickerButtons = Array.from(
      form.querySelectorAll(".photo-picker-option"),
    );
    const photoCameraInput = form.querySelector("#newPlayerPhotoCamera");
    const photoGalleryInput = form.querySelector("#newPlayerPhotoGallery");
    const photoStatusLabel = form.querySelector("[data-selected-photo-text]");
    const submitButton = form.querySelector("[data-action='submit']");
    const cancelButton = form.querySelector("[data-action='cancel']");
    const statusLabel = modal.querySelector(".add-player-status");
    const createdList = modal.querySelector("#createdPlayerList");
    const actionBar = modal.querySelector("#createdPlayerActionBar");
    const addSelectedButton =
      actionBar?.querySelector("[data-action='addSelected']") ?? null;
    const removeSelectedButton =
      actionBar?.querySelector("[data-action='removeSelected']") ?? null;
    const colorOptionsContainer = form.querySelector("#newPlayerColorOptions");

    const colorButtonMap = new Map();
    let selectedCreatedPlayerId = null;
    let selectedColorHex = sanitizeHexColor(DEFAULT_PLAYER_COLOR);
    let customOption;
    let customColorInput;
    let customSwatch;
    const shouldAutofocusNameInput =
      typeof window !== "undefined" && window.matchMedia
        ? !window.matchMedia("(pointer: coarse)").matches
        : true;
    const focusNameInput = () => {
      if (shouldAutofocusNameInput) {
        nameInput.focus({ preventScroll: true });
      }
    };

    if (actionBar) {
      actionBar.setAttribute("aria-hidden", "true");
    }

    const setOptionSelection = (option, isSelected) => {
      if (!option) return;
      option.classList.toggle("is-selected", Boolean(isSelected));
      if (option instanceof HTMLElement && option.getAttribute("role") === "radio") {
        option.setAttribute("aria-checked", isSelected ? "true" : "false");
      }
    };

    const updateCustomSwatch = (color) => {
      if (!customSwatch) return;
      const sanitized = sanitizeHexColor(color);
      customSwatch.style.setProperty("--custom-color", sanitized);
    };

    const selectColor = (color, element) => {
      const sanitized = sanitizeHexColor(color);
      selectedColorHex = sanitized;

      const presetOption = colorButtonMap.get(sanitized) ?? null;
      let target = element ?? presetOption ?? null;

      if (!target && customOption) {
        target = customOption;
      }

      colorOptionsContainer
        ?.querySelectorAll(".color-option")
        .forEach((option) => {
          setOptionSelection(option, option === target);
        });

      const highlightCustom =
        target === customOption || (!presetOption && customOption);

      if (customColorInput && highlightCustom) {
        const currentValue = customColorInput.value.toLowerCase();
        if (currentValue !== sanitized) {
          customColorInput.value = sanitized;
        }
        updateCustomSwatch(sanitized);
      }

      setOptionSelection(customOption, highlightCustom);
    };

    const createColorOption = ({ label, value }) => {
      const sanitized = sanitizeHexColor(value);
      const option = document.createElement("button");
      option.type = "button";
      option.className = "color-option";
      option.dataset.color = sanitized;
      option.setAttribute("role", "radio");
      option.setAttribute("aria-checked", "false");
      option.setAttribute("aria-label", label);

      const swatch = document.createElement("span");
      swatch.className = "color-option-swatch";
      swatch.style.setProperty("--swatch-color", sanitized);

      option.append(swatch);

      option.addEventListener("click", () => {
        selectColor(sanitized, option);
      });

      colorButtonMap.set(sanitized, option);
      return option;
    };

    const createCustomOption = () => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "color-option color-option-custom";
      option.setAttribute("role", "radio");
      option.setAttribute("aria-checked", "false");
      option.setAttribute("aria-label", "Color personalizado");
      option.dataset.custom = "true";

      const swatch = document.createElement("span");
      swatch.className = "color-option-swatch color-option-swatch-multi";

      const indicator = document.createElement("span");
      indicator.className = "color-option-custom-indicator";
      swatch.appendChild(indicator);

      const colorInput = document.createElement("input");
      colorInput.type = "color";
      colorInput.value = DEFAULT_PLAYER_COLOR;
      colorInput.className = "color-option-color-input";
      colorInput.setAttribute("aria-label", "Elegir color personalizado");
      colorInput.tabIndex = -1;

      option.append(swatch, colorInput);

      customOption = option;
      customColorInput = colorInput;
      customSwatch = swatch;
      updateCustomSwatch(colorInput.value);

      const openPicker = () => {
        selectColor(colorInput.value, option);
        colorInput.focus();
        if (typeof colorInput.showPicker === "function") {
          colorInput.showPicker();
        } else {
          colorInput.click();
        }
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

      colorInput.addEventListener("input", () => {
        selectColor(colorInput.value, option);
      });
      colorInput.addEventListener("change", () => {
        selectColor(colorInput.value, option);
      });
      colorInput.addEventListener("focus", () => {
        selectColor(colorInput.value, option);
      });

      return option;
    };

    if (colorOptionsContainer) {
      COLOR_PRESETS.forEach((preset) => {
        const option = createColorOption(preset);
        colorOptionsContainer.appendChild(option);
      });
      const custom = createCustomOption();
      if (custom) {
        colorOptionsContainer.appendChild(custom);
      }
    }

    selectColor(selectedColorHex, colorButtonMap.get(selectedColorHex));

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

    const setStatusMessage = (message, { error = false } = {}) => {
      if (!statusLabel) return;
      statusLabel.textContent = message ?? "";
      statusLabel.classList.toggle("is-error", Boolean(error));
    };
    setStatusMessage("");

    const updateCreatedPlayerActionBar = () => {
      if (!actionBar) return;

      const catalog = state.createdPlayers ?? [];
      const availablePlayers = catalog.filter(
        (player) => !isPlayerActive(player.id),
      );
      const selectedPlayer =
        selectedCreatedPlayerId != null
          ? availablePlayers.find(
            (player) => player.id === selectedCreatedPlayerId,
          ) ?? null
          : null;

      if (!selectedPlayer) {
        actionBar.hidden = true;
        actionBar.setAttribute("aria-hidden", "true");
        if (addSelectedButton) {
          addSelectedButton.disabled = true;
          addSelectedButton.textContent = "Añadir";
          addSelectedButton.title =
            "Selecciona un jugador para añadirlo a la partida";
        }
        if (removeSelectedButton) {
          removeSelectedButton.disabled = true;
          removeSelectedButton.title =
            "Selecciona un jugador para eliminarlo del catálogo";
        }
        return;
      }

      actionBar.hidden = false;
      actionBar.setAttribute("aria-hidden", "false");

      if (removeSelectedButton) {
        removeSelectedButton.disabled = false;
        removeSelectedButton.title = `Eliminar a ${selectedPlayer.name} del catálogo`;
      }

      if (addSelectedButton) {
        const alreadyActive = isPlayerActive(selectedPlayer.id);
        addSelectedButton.disabled = alreadyActive;
        addSelectedButton.textContent = alreadyActive ? "Añadido" : "Añadir";
        addSelectedButton.title = alreadyActive
          ? `${selectedPlayer.name} ya está en la partida.`
          : `Añadir a ${selectedPlayer.name} a la partida`;
      }
    };

    const renderCreatedPlayersList = () => {
      createdList.innerHTML = "";
      const catalog = state.createdPlayers ?? [];
      const availablePlayers = catalog.filter(
        (player) => !isPlayerActive(player.id),
      );

      if (
        selectedCreatedPlayerId &&
        !availablePlayers.some((player) => player.id === selectedCreatedPlayerId)
      ) {
        selectedCreatedPlayerId = null;
      }

      if (!availablePlayers.length) {
        updateCreatedPlayerActionBar();
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "helper-text";
        emptyMessage.textContent = catalog.length
          ? "Todos los jugadores guardados ya están en la partida."
          : "Todavía no has guardado ningún jugador.";
        createdList.appendChild(emptyMessage);
        return;
      }

      availablePlayers.forEach((player) => {
        const playerColor = sanitizeHexColor(player.colorHex);

        const card = document.createElement("article");
        card.className = "created-player-card";
        card.dataset.playerId = player.id;
        card.tabIndex = 0;
        card.setAttribute("role", "button");

        const info = document.createElement("div");
        info.className = "created-player-info";

        const avatar = document.createElement("div");
        avatar.className = "created-player-avatar";
        if (player.avatar) {
          const avatarImage = document.createElement("img");
          avatarImage.src = player.avatar;
          avatarImage.alt = `Avatar de ${player.name}`;
          avatarImage.loading = "lazy";
          avatarImage.decoding = "async";
          avatar.appendChild(avatarImage);
        } else {
          avatar.textContent = player.name?.[0]?.toUpperCase() ?? "?";
        }

        const details = document.createElement("div");
        details.className = "created-player-details";

        const nameNode = document.createElement("span");
        nameNode.className = "created-player-name";
        nameNode.textContent = player.name;
        applyNameAccent(nameNode, playerColor);

        const meta = document.createElement("div");
        meta.className = "created-player-meta";

        const moneyNode = document.createElement("span");
        moneyNode.className = "created-player-money";
        moneyNode.textContent = formatMoney(player.money);

        const colorIndicator = document.createElement("span");
        colorIndicator.className = "created-player-color";
        colorIndicator.style.setProperty("--player-color", playerColor);
        colorIndicator.title = `Color ${playerColor.toUpperCase()}`;

        meta.append(moneyNode, colorIndicator);
        details.append(nameNode, meta);
        info.append(avatar, details);

        const prefillFromCatalogEntry = () => {
          nameInput.value = player.name;
          syncMoneyInputs(player.money);
          selectColor(playerColor);
          focusNameInput();
        };

        const handleSelect = () => {
          if (selectedCreatedPlayerId !== player.id) {
            createdList
              .querySelectorAll(".created-player-card.is-selected")
              .forEach((element) => element.classList.remove("is-selected"));
            selectedCreatedPlayerId = player.id;
            card.classList.add("is-selected");
            updateCreatedPlayerActionBar();
          }
          prefillFromCatalogEntry();
        };

        card.addEventListener("click", handleSelect);
        card.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleSelect();
          }
        });

        if (selectedCreatedPlayerId === player.id) {
          card.classList.add("is-selected");
        }

        card.append(info);
        createdList.appendChild(card);
      });

      updateCreatedPlayerActionBar();
    };

    addSelectedButton?.addEventListener("click", () => {
      if (!selectedCreatedPlayerId) return;
      const catalog = state.createdPlayers ?? [];
      const player =
        catalog.find((item) => item.id === selectedCreatedPlayerId) ?? null;
      if (!player) {
        selectedCreatedPlayerId = null;
        renderCreatedPlayersList();
        return;
      }
      if (isPlayerActive(player.id)) {
        updateCreatedPlayerActionBar();
        setStatusMessage(`${player.name} ya está en la partida actual.`);
        return;
      }
      addPlayer({
        ...player,
        pet: { ...player.pet },
      });
      renderPlayers();
      setStatusMessage(`${player.name} se añadió a la partida.`);
      renderCreatedPlayersList();
    });

    removeSelectedButton?.addEventListener("click", () => {
      if (!selectedCreatedPlayerId) return;
      const catalog = state.createdPlayers ?? [];
      const player =
        catalog.find((item) => item.id === selectedCreatedPlayerId) ?? null;
      if (!player) {
        selectedCreatedPlayerId = null;
        renderCreatedPlayersList();
        return;
      }
      const wasActive = isPlayerActive(player.id);
      removeCreatedPlayer(player.id);
      selectedCreatedPlayerId = null;
      renderCreatedPlayersList();
      const suffix = wasActive
        ? " Sigue disponible en la partida actual."
        : "";
      setStatusMessage(`${player.name} se eliminó del catálogo.${suffix}`);
    });

    let selectedPhotoFile = null;

    const resetPhotoSelection = () => {
      selectedPhotoFile = null;
      if (photoStatusLabel) {
        photoStatusLabel.textContent = "Sin imagen seleccionada.";
        photoStatusLabel.classList.remove("is-error");
      }
      photoPickerButtons.forEach((button) =>
        button.classList.remove("is-selected"),
      );
    };

    resetPhotoSelection();

    const applyPhotoSelection = (file, source) => {
      if (!file) {
        resetPhotoSelection();
        return;
      }
      selectedPhotoFile = file;
      photoPickerButtons.forEach((button) => {
        button.classList.toggle(
          "is-selected",
          button.dataset.source === source,
        );
      });
      if (photoStatusLabel) {
        photoStatusLabel.textContent = file.name;
        photoStatusLabel.classList.remove("is-error");
      }
    };

    const handleInputSelection = (input, source) => {
      const file = input?.files?.[0] ?? null;
      if (file) {
        applyPhotoSelection(file, source);
      } else if (!selectedPhotoFile) {
        resetPhotoSelection();
      }
      if (input) {
        input.value = "";
      }
    };

    photoCameraInput?.addEventListener("change", () =>
      handleInputSelection(photoCameraInput, "camera"),
    );
    photoGalleryInput?.addEventListener("change", () =>
      handleInputSelection(photoGalleryInput, "gallery"),
    );

    photoPickerButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const source = button.dataset.source;
        if (source === "camera") {
          photoCameraInput?.click();
        } else if (source === "gallery") {
          photoGalleryInput?.click();
        }
      });
    });

    renderCreatedPlayersList();

    rangeInput.addEventListener("input", (event) => syncMoneyInputs(event.target.value));
    numberInput.addEventListener("input", (event) => syncMoneyInputs(event.target.value));

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      statusLabel.classList.remove("is-error");
      statusLabel.textContent = "";

      const name = nameInput.value.trim();
      const money = Number(rangeInput.value);
      const photoFile = selectedPhotoFile ?? null;

      if (!name) {
        nameInput.reportValidity();
        return;
      }

      if (!photoFile) {
        if (photoStatusLabel) {
          photoStatusLabel.textContent =
            "Selecciona una imagen para crear al jugador.";
          photoStatusLabel.classList.add("is-error");
        }
        photoPickerButtons[0]?.focus({ preventScroll: true });
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
        const newPlayer = {
          id: crypto.randomUUID(),
          name,
          money,
          pet: { level: 1, xp: 0 },
          avatar: avatarDataUrl,
          colorHex,
        };
        addPlayer(newPlayer);
        upsertCreatedPlayer(newPlayer);
        renderCreatedPlayersList();
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
    setBottomNavHidden(true);
    focusNameInput();
  };

  const handlePlayerClick = (node, playerId) => {
    if (isPot(playerId)) {
      if (transferState.from) {
        return;
      }

      const potAmount = state.pot || 0;
      if (potAmount <= 0) {
        // En lugar de alert, vamos a dejar que se active pero daremos un aviso visual o log
        console.log("El bote está vacío.");
        return;
      }

      if (transferState.prizeMode) {
        clearTransferSelection();
      } else {
        transferState.prizeMode = true;
        node.classList.add("prize-mode-active");
      }
      return;
    }

    if (editingMode) {
      return;
    }

    if (transferState.prizeMode) {
      if (isBank(playerId)) return;
      openPrizeModal(playerId);
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
    clearPotAnimation();
    potAmountNodeRef = null;

    const bankCard = playerCardTemplate.content.firstElementChild.cloneNode(true);
    bankCard.dataset.playerId = BANK_PLAYER_ID;
    bankCard.classList.add("bank-card");
    bankCard.querySelector(".player-name").textContent = BANK_PLAYER_NAME;
    const bankMoneyNode = bankCard.querySelector(".player-money");
    if (bankMoneyNode) {
      bankMoneyNode.textContent = "";
    }
    bankCard.querySelector(".player-card-visual")?.remove();
    bankCard.querySelector("[data-action='delete']")?.remove();
    bankCard.addEventListener("click", () => handlePlayerClick(bankCard, BANK_PLAYER_ID));

    const potCard = playerCardTemplate.content.firstElementChild.cloneNode(true);
    potCard.dataset.playerId = POT_PLAYER_ID;
    potCard.classList.add("pot-card");
    const potCardContent = potCard.querySelector(".player-card-content");
    potCardContent?.classList.add("pot-card-content");

    const potInfo = potCard.querySelector(".player-card-info");
    potInfo?.classList.add("pot-card-info");

    const potNameNode = potCard.querySelector(".player-name");
    if (potNameNode) {
      potNameNode.textContent = POT_PLAYER_NAME.toUpperCase();
      potNameNode.classList.add("pot-card-label");
    }

    const potMoneyNode = potCard.querySelector(".player-money");
    if (potMoneyNode) {
      potAmountNodeRef = potMoneyNode;
      const targetPotValue = state.pot ?? 0;
      if (potDisplayValue !== targetPotValue) {
        animatePotValue(potDisplayValue, targetPotValue);
      } else {
        updatePotAmountNode(targetPotValue);
      }
      potMoneyNode.classList.add("pot-card-amount");
    }

    // Add bubble wrapper to pot card
    const aura = document.createElement("div");
    aura.className = "pot-aura-wrapper";
    // Create 3 complex bubbles
    for (let i = 0; i < 3; i++) {
      const bubble = document.createElement("div");
      bubble.className = "bubble";
      bubble.innerHTML = "<span></span><span></span><span></span><span></span><span></span>";
      aura.appendChild(bubble);
    }
    potCard.appendChild(aura);

    potCard.addEventListener("click", () => handlePlayerClick(potCard, POT_PLAYER_ID));

    potCard.querySelector(".player-card-visual")?.remove();
    potCard.querySelector("[data-action='delete']")?.remove();

    const bankPotRow = document.createElement("div");
    bankPotRow.classList.add("bank-pot-row");

    const potWrapper = document.createElement("div");
    potWrapper.classList.add("pot-card-wrapper");
    potWrapper.appendChild(potCard);

    const bankWrapper = document.createElement("div");
    bankWrapper.classList.add("bank-card-wrapper");
    bankWrapper.appendChild(bankCard);

    bankPotRow.appendChild(potWrapper);
    bankPotRow.appendChild(bankWrapper);
    playerList.appendChild(bankPotRow);

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

      const visualArea = card.querySelector(".player-card-visual");
      const avatarImg = visualArea?.querySelector(".player-avatar");
      const avatarBlur = visualArea?.querySelector(".player-avatar-blur");
      const deleteButton = card.querySelector("[data-action='delete']");

      if (player.avatar && avatarImg) {
        avatarImg.src = player.avatar;
        avatarImg.alt = `Avatar de ${player.name}`;
        avatarImg.loading = "lazy";
        avatarImg.decoding = "async";
        card.classList.add("has-avatar");
        card.style.setProperty("--player-avatar-image", `url("${player.avatar}")`);
        if (visualArea) {
          visualArea.style.backgroundImage = `url("${player.avatar}")`;
        }
        if (avatarBlur) {
          avatarBlur.style.backgroundImage = `url("${player.avatar}")`;
        }
      } else {
        card.classList.remove("has-avatar");
        card.style.removeProperty("--player-avatar-image");
        if (visualArea) {
          visualArea.style.backgroundImage = "none";
        }
        if (avatarImg) {
          avatarImg.removeAttribute("src");
          avatarImg.alt = "";
        }
        if (avatarBlur) {
          avatarBlur.style.backgroundImage = "none";
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
