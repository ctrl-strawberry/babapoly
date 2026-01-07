import { saveState, getPlayerById, addToPot } from "./state.js";
import { formatMoney } from "./utils.js";

// European Roulette Layout
const NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

const getNumberColor = (num) => {
  if (num === 0) return "green";
  return RED_NUMBERS.includes(num) ? "red" : "black";
};

export const initRoulette = ({
  rouletteSelect,
  rouletteGame,
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
  showScreen,
  showToast,
  homeActions,
}) => {
  let currentPlayerId = null;
  let currentBets = {}; // { "number-17": 100, "color-red": 50, "dozen-1": 20 }
  let selectedChipValue = 50;
  let recentResults = [];

  // --- Initialization & Navigation ---

  const renderPlayerSelector = (players) => {
    rouletteSelect.innerHTML = "";
    players.forEach((player) => {
      const card = playerSelectTemplate.content.firstElementChild.cloneNode(true);
      card.dataset.playerId = player.id;
      card.querySelector(".player-name").textContent = player.name;
      card.querySelector(".player-money").textContent = `${formatMoney(player.money)}`;

      const btn = card.querySelector("button");
      btn.textContent = "Jugar Ruleta";
      btn.addEventListener("click", () => enterGame(player.id));

      rouletteSelect.appendChild(card);
    });
  };

  const enterGame = (playerId) => {
    currentPlayerId = playerId;
    const player = getPlayerById(playerId);
    if (!player) return;

    rouletteSelect.hidden = true;
    rouletteGame.hidden = false;
    updatePlayerDisplay();
    renderBoard();
    clearBets();
    updateMessage("¡Hagan sus apuestas!");
  };

  const exitGame = () => {
    currentPlayerId = null;
    rouletteGame.hidden = true;
    rouletteSelect.hidden = false;
    showScreen("inicio");
  };

  const updatePlayerDisplay = () => {
    const player = getPlayerById(currentPlayerId);
    if (player) {
      roulettePlayerName.textContent = player.name;
      roulettePlayerMoney.textContent = formatMoney(player.money);
    }
  };

  // --- Board Rendering ---

  const renderBoard = () => {
    rouletteBoard.innerHTML = "";

    // Create Overlay Container
    const overlay = document.createElement("div");
    overlay.className = "roulette-overlay";
    rouletteBoard.appendChild(overlay);

    // 0
    rouletteBoard.appendChild(createCell(0, "0", "green", "cell-0", "number-0"));

    // Numbers 1-36
    for (let i = 1; i <= 36; i++) {
      const color = getNumberColor(i);
      // Revert to standard click handler for straight bets
      const cell = createCell(i, i.toString(), color, "cell-number", `number-${i}`);

      const col = Math.ceil(i / 3) + 1;
      const row = 3 - ((i - 1) % 3);

      cell.style.gridColumn = col;
      cell.style.gridRow = row;
      rouletteBoard.appendChild(cell);
    }

    // 2 to 1 (Columns)
    rouletteBoard.appendChild(createSpecialCell("2 to 1", "cell-2to1", 14, 1, "column-1"));
    rouletteBoard.appendChild(createSpecialCell("2 to 1", "cell-2to1", 14, 2, "column-2"));
    rouletteBoard.appendChild(createSpecialCell("2 to 1", "cell-2to1", 14, 3, "column-3"));

    // Dozens
    rouletteBoard.appendChild(createSpecialCell("1st 12", "cell-dozen", "2 / span 4", 4, "dozen-1"));
    rouletteBoard.appendChild(createSpecialCell("2nd 12", "cell-dozen", "6 / span 4", 4, "dozen-2"));
    rouletteBoard.appendChild(createSpecialCell("3rd 12", "cell-dozen", "10 / span 4", 4, "dozen-3"));

    // Outside Bets
    rouletteBoard.appendChild(createSpecialCell("1-18", "cell-outside", "2 / span 2", 5, "low"));
    rouletteBoard.appendChild(createSpecialCell("EVEN", "cell-outside", "4 / span 2", 5, "even"));
    rouletteBoard.appendChild(createSpecialCell("", "cell-outside cell-diamond-red", "6 / span 2", 5, "color-red"));
    rouletteBoard.appendChild(createSpecialCell("", "cell-outside cell-diamond-black", "8 / span 2", 5, "color-black"));
    rouletteBoard.appendChild(createSpecialCell("ODD", "cell-outside", "10 / span 2", 5, "odd"));
    rouletteBoard.appendChild(createSpecialCell("19-36", "cell-outside", "12 / span 2", 5, "high"));

    // Render Overlays after a short delay to ensure layout is computed
    setTimeout(() => renderOverlays(overlay), 100);
  };

  const renderOverlays = (overlay) => {
    overlay.innerHTML = "";

    // Iterate numbers to create hotspots
    for (let i = 1; i <= 36; i++) {
      const cell = rouletteBoard.querySelector(`[data-bet-id="number-${i}"]`);
      if (!cell) continue;

      // Relative positions
      const top = cell.offsetTop;
      const left = cell.offsetLeft;
      const width = cell.offsetWidth;
      const height = cell.offsetHeight;

      // 1. Horizontal Split (Right)
      // If not in the last column (multiples of 3 are top row, but columns are 1..12)
      // Column logic: Math.ceil(i / 3). Max 12.
      // So if Math.ceil(i/3) < 12, we have a right neighbor.
      // Right neighbor is i + 3.
      if (Math.ceil(i / 3) < 12) {
        const neighbor = i + 3;
        createHotspot(overlay, `split-${i}-${neighbor}`,
          left + width - 10, top, 20, height); // 20px wide centered on line
      }

      // 2. Vertical Split (Bottom)
      // If not in the bottom row (Row 3: 1, 4, 7...). i % 3 === 1.
      // Bottom neighbor is i - 1.
      if (i % 3 !== 1) {
        const neighbor = i - 1;
        createHotspot(overlay, `split-${neighbor}-${i}`,
          left, top + height - 10, width, 20); // 20px high centered on line
      }

      // 3. Corner (Bottom-Right)
      // Needs Right Neighbor AND Bottom Neighbor.
      // i + 3 exists AND i - 1 exists.
      if (Math.ceil(i / 3) < 12 && i % 3 !== 1) {
        // Corner: i, i-1, i+3, i+2
        // Sorted: i-1, i, i+2, i+3
        const n1 = i - 1;
        const n2 = i;
        const n3 = i + 2;
        const n4 = i + 3;
        createHotspot(overlay, `corner-${n1}-${n2}-${n3}-${n4}`,
          left + width - 10, top + height - 10, 20, 20);
      }

      // 4. Street (Top Edge of Top Row)
      // Row 1: 3, 6, 9... (i % 3 === 0)
      if (i % 3 === 0) {
        // Street 1-2-3 is above 3.
        // Street n-2, n-1, n
        createHotspot(overlay, `street-${i - 2}-${i - 1}-${i}`,
          left, top - 10, width, 20);

        // 5. Line (Top-Right Corner of Top Row)
        // Intersection of Street i and Street i+3
        if (Math.ceil(i / 3) < 12) {
          // Line: i-2..i and i+1..i+3
          // e.g. 3 and 6 -> Line 1-6
          createHotspot(overlay, `line-${i - 2}-${i + 3}`,
            left + width - 10, top - 10, 20, 20);
        }
      }
    }
  };

  const createHotspot = (container, betId, left, top, width, height) => {
    const spot = document.createElement("div");
    spot.className = "bet-hotspot";
    spot.dataset.betId = betId;
    spot.style.left = `${left}px`;
    spot.style.top = `${top}px`;
    spot.style.width = `${width}px`;
    spot.style.height = `${height}px`;
    spot.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent clicking the number below
      placeBet(betId);
    });
    container.appendChild(spot);
  };

  const createCell = (id, label, color, className, betId, onClick = null) => {
    const cell = document.createElement("div");
    cell.className = `table-cell ${color} ${className || ""}`;
    cell.textContent = label;
    cell.dataset.betId = betId;
    cell.addEventListener("click", onClick ? onClick : () => placeBet(betId));
    return cell;
  };

  const createSpecialCell = (label, className, col, row, betId) => {
    const cell = document.createElement("div");
    cell.className = `table-cell ${className}`;
    cell.textContent = label;
    if (col) cell.style.gridColumn = col;
    if (row) cell.style.gridRow = row;
    cell.dataset.betId = betId;
    cell.addEventListener("click", () => placeBet(betId));
    return cell;
  };

  // --- Betting Logic ---

  const placeBet = (betId) => {
    const player = getPlayerById(currentPlayerId);
    const totalBet = Object.values(currentBets).reduce((a, b) => a + b, 0);

    if (player.money < selectedChipValue) {
      showToast("No tienes suficientes monedas.");
      return;
    }

    if (player.money - totalBet - selectedChipValue < 0) {
      showToast("No tienes suficientes monedas para esta apuesta.");
      return;
    }

    if (!currentBets[betId]) currentBets[betId] = 0;
    currentBets[betId] += selectedChipValue;

    addChipVisual(betId);
    updateMessage(`Apuesta total: ${formatMoney(Object.values(currentBets).reduce((a, b) => a + b, 0))}`);
  };

  const addChipVisual = (betId) => {
    let targetCell = null;
    let positionClass = "center";

    if (betId.startsWith("number-")) {
      targetCell = rouletteBoard.querySelector(`[data-bet-id="${betId}"]`);
    } else if (betId.startsWith("split-")) {
      const nums = betId.split("-").slice(1).map(Number);
      const n1 = nums[0];
      const n2 = nums[1];
      targetCell = rouletteBoard.querySelector(`[data-bet-id="number-${n1}"]`);

      if (n2 === n1 + 3) positionClass = "right"; // Horizontal split
      else if (n2 === n1 + 1) positionClass = "top"; // Vertical split
    } else if (betId.startsWith("corner-")) {
      const nums = betId.split("-").slice(1).map(Number);
      // corner-n1-n2-n3-n4. n1 is bottom-left visually.
      // We want Top-Right of n1.
      targetCell = rouletteBoard.querySelector(`[data-bet-id="number-${nums[0]}"]`);
      positionClass = "top-right";
    } else if (betId.startsWith("street-")) {
      const nums = betId.split("-").slice(1).map(Number);
      // street-n1-n2-n3. n3 is the top number (3, 6, 9).
      targetCell = rouletteBoard.querySelector(`[data-bet-id="number-${nums[2]}"]`);
      positionClass = "top";
    } else if (betId.startsWith("line-")) {
      const nums = betId.split("-").slice(1).map(Number);
      // line-n1-n6. n1=1, n6=6.
      // Triggered by Top-Right of 3 (which is n1+2).
      targetCell = rouletteBoard.querySelector(`[data-bet-id="number-${nums[0] + 2}"]`);
      positionClass = "top-right";
    } else {
      // Outside bets
      targetCell = rouletteBoard.querySelector(`[data-bet-id="${betId}"]`);
    }

    if (!targetCell) return;

    // Check if chip exists for this SPECIFIC betId
    // We can't just query .chip inside the cell because a cell might have multiple chips (center, top, right...)
    // So we need to identify the chip by betId too.
    let chip = null;
    const existingChips = targetCell.querySelectorAll(".chip");
    existingChips.forEach(c => {
      if (c.dataset.betId === betId) chip = c;
    });

    if (!chip) {
      chip = document.createElement("div");
      chip.dataset.betId = betId; // Store betId on chip to distinguish
      targetCell.appendChild(chip);
    }

    const cellTotal = currentBets[betId];
    chip.textContent = cellTotal >= 1000 ? `${(cellTotal / 1000).toFixed(1)}k` : cellTotal;

    chip.className = `chip ${positionClass}`;
    if (cellTotal >= 1000) chip.classList.add("chip-1000");
    else if (cellTotal >= 500) chip.classList.add("chip-500");
    else if (cellTotal >= 100) chip.classList.add("chip-100");
    else if (cellTotal >= 50) chip.classList.add("chip-50");
    else if (cellTotal >= 10) chip.classList.add("chip-10");
    else if (cellTotal >= 5) chip.classList.add("chip-5");
    else chip.classList.add("chip-1");
  };

  const clearBets = () => {
    currentBets = {};
    document.querySelectorAll(".chip").forEach(c => c.remove());
    updateMessage("Hagan sus apuestas");
  };

  // --- Result Handling ---

  const openResultModal = () => {
    const totalBet = Object.values(currentBets).reduce((a, b) => a + b, 0);
    if (totalBet === 0) {
      showToast("Haz al menos una apuesta.");
      return;
    }

    const modal = document.getElementById("resultModal");
    const selector = document.getElementById("resultSelector");
    selector.innerHTML = "";

    // Add 0
    selector.appendChild(createResultBtn(0));

    // Add 1-36
    for (let i = 1; i <= 36; i++) {
      selector.appendChild(createResultBtn(i));
    }

    modal.showModal();
  };

  const createResultBtn = (num) => {
    const btn = document.createElement("button");
    btn.className = `number-btn ${getNumberColor(num)}`;
    btn.textContent = num;
    btn.type = "button"; // Prevent form submit
    btn.addEventListener("click", () => {
      document.getElementById("resultModal").close();
      resolveGame(num);
    });
    return btn;
  };

  const resolveGame = (number) => {
    const player = getPlayerById(currentPlayerId);
    const totalBet = Object.values(currentBets).reduce((a, b) => a + b, 0);

    // Deduct bet
    player.money -= totalBet;

    let winnings = 0;
    const color = getNumberColor(number);

    // Calculate Winnings
    for (const [betId, amount] of Object.entries(currentBets)) {
      if (checkWin(betId, number, color)) {
        winnings += amount * getPayout(betId);
        // Return original bet + winnings for winning bets?
        // Standard roulette: Payout includes original bet? 
        // 35:1 means you get 35 + 1 back.
        // So we add amount * (payout + 1).
        winnings += amount;
      }
    }

    addResultHistory(number, color);

    if (winnings > 0) {
      player.money += winnings;
      updateMessage(`¡Sale el ${number}! Ganas ${formatMoney(winnings)}`);
      showToast(`Ganaste ${formatMoney(winnings)}!`);
      homeActions.render();
      homeActions.showMoneyAnimation(currentPlayerId, winnings - totalBet); // Net gain
    } else {
      updateMessage(`Sale el ${number}. Suerte la próxima.`);
      addToPot(totalBet);
      homeActions.render();
      homeActions.showMoneyAnimation(currentPlayerId, -totalBet);
    }

    saveState();
    updatePlayerDisplay();
    clearBets();
  };

  const checkWin = (betId, number, color) => {
    if (betId.startsWith("number-")) {
      return parseInt(betId.split("-")[1]) === number;
    }
    if (betId.startsWith("split-") || betId.startsWith("corner-") || betId.startsWith("street-") || betId.startsWith("line-")) {
      const nums = betId.split("-").slice(1).map(Number);
      return nums.includes(number);
    }
    if (betId === "basket") {
      return [0, 1, 2, 3].includes(number);
    }

    if (betId === "color-red" && color === "red") return true;
    if (betId === "color-black" && color === "black") return true;
    if (betId === "even" && number !== 0 && number % 2 === 0) return true;
    if (betId === "odd" && number !== 0 && number % 2 !== 0) return true;
    if (betId === "low" && number >= 1 && number <= 18) return true;
    if (betId === "high" && number >= 19 && number <= 36) return true;

    if (betId === "dozen-1" && number >= 1 && number <= 12) return true;
    if (betId === "dozen-2" && number >= 13 && number <= 24) return true;
    if (betId === "dozen-3" && number >= 25 && number <= 36) return true;

    // Columns
    // Col 1: 3, 6, 9... (Remainder 0)
    // Col 2: 2, 5, 8... (Remainder 2)
    // Col 3: 1, 4, 7... (Remainder 1)
    if (betId === "column-1" && number !== 0 && number % 3 === 0) return true;
    if (betId === "column-2" && number !== 0 && number % 3 === 2) return true;
    if (betId === "column-3" && number !== 0 && number % 3 === 1) return true;

    return false;
  };

  const getPayout = (betId) => {
    if (betId.startsWith("number-")) return 35;
    if (betId.startsWith("split-")) return 17;
    if (betId.startsWith("street-")) return 11;
    if (betId.startsWith("corner-")) return 8;
    if (betId.startsWith("line-")) return 5;
    if (betId === "basket") return 6;
    if (betId.startsWith("color-")) return 1;
    if (betId === "even" || betId === "odd") return 1;
    if (betId === "low" || betId === "high") return 1;
    if (betId.startsWith("dozen-")) return 2;
    if (betId.startsWith("column-")) return 2;
    return 0;
  };

  const addResultHistory = (number, color) => {
    const badge = document.createElement("div");
    badge.className = `result-badge ${color}`;
    badge.textContent = number;
    lastResults.prepend(badge);
    if (lastResults.children.length > 10) {
      lastResults.lastElementChild.remove();
    }
    recentResults.unshift(number);
  };

  const updateMessage = (msg) => {
    rouletteMessage.textContent = msg;
  };

  // --- Event Listeners ---

  chipSelector.addEventListener("click", (e) => {
    if (e.target.classList.contains("chip-btn")) {
      document.querySelectorAll(".chip-btn").forEach(b => b.classList.remove("active"));
      e.target.classList.add("active");
      selectedChipValue = Number(e.target.dataset.value);
    }
  });

  spinBtn.addEventListener("click", openResultModal);
  clearBetsBtn.addEventListener("click", clearBets);
  rouletteExitBtn.addEventListener("click", exitGame);

  // Set default chip
  chipSelector.querySelector('[data-value="50"]').classList.add("active");

  return {
    renderPlayerSelector,
  };
};


