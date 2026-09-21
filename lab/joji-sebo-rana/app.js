const STORAGE_KEY = "joji-split-rank-v1";
const ANIMATION_WINDOW_MS = 720;
const DRAG_THRESHOLD = 8;
const AUTO_SCROLL_EDGE = 96;
const COLLAPSED_CONSENSUS_COUNT = 5;

const TRACKS = [
  { id: "pixelated-kisses", title: "PIXELATED KISSES", detail: "Track 01" },
  { id: "cigarette", title: "Cigarette", detail: "Track 02" },
  { id: "last-of-a-dying-breed", title: "Last of a Dying Breed", detail: "Track 03" },
  { id: "love-you-less", title: "LOVE YOU LESS", detail: "Track 04" },
  { id: "if-it-only-gets-better", title: "If It Only Gets Better", detail: "Track 05" },
  { id: "love-me-better", title: "Love Me Better", detail: "Track 06" },
  { id: "piece-of-you", title: "Piece of You", detail: "Track 07 - with Giveon" },
  { id: "hotel-california", title: "Hotel California", detail: "Track 08" },
  { id: "tarmac", title: "Tarmac", detail: "Track 09" },
  { id: "forehead-touch-the-ground", title: "Forehead Touch the Ground", detail: "Track 10" },
  { id: "past-wont-leave-my-bed", title: "Past Won't Leave My Bed", detail: "Track 11" },
  { id: "fade-to-black", title: "Fade to Black", detail: "Track 12 - with 4batz" },
  { id: "cant-see-shit-in-the-club", title: "CAN'T SEE SH*T IN THE CLUB", detail: "Track 13" },
  { id: "sojourn", title: "Sojourn", detail: "Track 14" },
  { id: "dykily", title: "DYKILY", detail: "Track 15" },
  { id: "rose-colored", title: "Rose Colored", detail: "Track 16 - with Yeat" },
  { id: "silhouette-man", title: "Silhouette Man", detail: "Track 17" },
  { id: "fragments", title: "Fragments", detail: "Track 18 - with Don Toliver" },
  { id: "horses-to-water", title: "Horses to Water", detail: "Track 19" },
  { id: "strange-home", title: "Strange Home", detail: "Track 20" },
  { id: "dior", title: "Dior", detail: "Track 21" }
];

const TRACK_MAP = new Map(TRACKS.map((track) => [track.id, track]));
const DEFAULT_ORDER = TRACKS.map((track) => track.id);

const state = {
  rankings: loadRankings(),
  fx: null,
  drag: null,
  showAllConsensus: false
};

const elements = {
  lists: {
    sebo: document.querySelector("#list-sebo"),
    rana: document.querySelector("#list-rana")
  },
  template: document.querySelector("#songCardTemplate"),
  topSebo: document.querySelector("#topSebo"),
  topRana: document.querySelector("#topRana"),
  sharedCount: document.querySelector("#sharedCount"),
  consensusLeader: document.querySelector("#consensusLeader"),
  biggestGapSong: document.querySelector("#biggestGapSong"),
  biggestGapValue: document.querySelector("#biggestGapValue"),
  consensusList: document.querySelector("#consensusList"),
  toggleConsensusButton: document.querySelector("#toggleConsensusButton"),
  resetButton: document.querySelector("#resetButton"),
  exportButton: document.querySelector("#exportButton"),
  importButton: document.querySelector("#importButton"),
  importInput: document.querySelector("#importInput"),
  storageHintTitle: document.querySelector("#storageHintTitle"),
  storageHintText: document.querySelector("#storageHintText")
};

render();
bindEvents();
exposeDiagnostics();
runPreviewMoveFromQuery();
updateStorageHint();

function bindEvents() {
  Object.values(elements.lists).forEach((list) => {
    list.addEventListener("pointerdown", onDragPointerDown);
    list.addEventListener("keydown", onDragKeydown);
  });

  elements.resetButton.addEventListener("click", resetRankings);
  elements.exportButton.addEventListener("click", exportRankings);
  elements.importButton.addEventListener("click", () => elements.importInput.click());
  elements.importInput.addEventListener("change", onImportFile);
  elements.toggleConsensusButton.addEventListener("click", toggleConsensusView);
  window.addEventListener("pointermove", onDragPointerMove, { passive: false });
  window.addEventListener("pointerup", onDragPointerEnd);
  window.addEventListener("pointercancel", onDragPointerEnd);
}

function onDragKeydown(event) {
  const handle = event.target.closest(".song-card__drag");
  if (!handle) {
    return;
  }

  const card = handle.closest(".song-card");
  const column = card?.dataset.column;
  const songId = card?.dataset.songId;
  if (!column || !songId) {
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    moveSong(column, songId, "up", { persist: true });
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    moveSong(column, songId, "down", { persist: true });
  }
}

function onDragPointerDown(event) {
  const handle = event.target.closest(".song-card__drag");
  if (!handle) {
    return;
  }

  const card = handle.closest(".song-card");
  const column = card?.dataset.column;
  const songId = card?.dataset.songId;
  if (!card || !column || !songId) {
    return;
  }

  state.drag = {
    pointerId: event.pointerId,
    column,
    songId,
    list: elements.lists[column],
    handle,
    card,
    startX: event.clientX,
    startY: event.clientY,
    currentX: event.clientX,
    currentY: event.clientY,
    isActive: false,
    hoverSongId: null,
    placement: "after"
  };

  handle.setPointerCapture?.(event.pointerId);
}

function onDragPointerMove(event) {
  if (!state.drag || event.pointerId !== state.drag.pointerId) {
    return;
  }

  state.drag.currentX = event.clientX;
  state.drag.currentY = event.clientY;

  const offsetY = event.clientY - state.drag.startY;
  const offsetX = event.clientX - state.drag.startX;

  if (!state.drag.isActive) {
    if (Math.hypot(offsetX, offsetY) < DRAG_THRESHOLD) {
      return;
    }
    activateDrag();
  }

  event.preventDefault();
  updateDraggedCard(offsetY);
  maybeAutoScrollWindow(event.clientY);
  updateDropTarget(state.drag, event.clientX, event.clientY);
}

function onDragPointerEnd(event) {
  if (!state.drag || event.pointerId !== state.drag.pointerId) {
    return;
  }

  const drag = state.drag;
  clearDropIndicators(drag.list);
  cleanupDragStyles(drag);
  state.drag = null;

  if (!drag.isActive || !drag.hoverSongId) {
    return;
  }

  moveSongToPlacement(drag.column, drag.songId, drag.hoverSongId, drag.placement, { persist: true });
}

function activateDrag() {
  const drag = state.drag;
  if (!drag) {
    return;
  }

  drag.isActive = true;
  drag.card.classList.add("is-dragging", "is-moving");
  drag.card.style.pointerEvents = "none";
  document.body.classList.add("is-dragging-song");
}

function updateDraggedCard(offsetY) {
  const drag = state.drag;
  if (!drag) {
    return;
  }

  drag.card.style.transform = `translate3d(0, ${offsetY}px, 0) scale(1.02)`;
  drag.card.classList.toggle("is-moving-up", offsetY < 0);
  drag.card.classList.toggle("is-moving-down", offsetY >= 0);
}

function updateDropTarget(drag, clientX, clientY) {
  clearDropIndicators(drag.list);

  let hoverCard = document.elementFromPoint(clientX, clientY)?.closest(".song-card");
  if (!isValidHoverCard(hoverCard, drag)) {
    hoverCard = findFallbackCard(drag, clientY);
  }

  if (!hoverCard) {
    drag.hoverSongId = null;
    return;
  }

  const rect = hoverCard.getBoundingClientRect();
  const placement = clientY < rect.top + rect.height / 2 ? "before" : "after";
  hoverCard.classList.add(placement === "before" ? "drop-before" : "drop-after");
  drag.hoverSongId = hoverCard.dataset.songId;
  drag.placement = placement;
}

function isValidHoverCard(card, drag) {
  return Boolean(card && card.dataset.column === drag.column && card.dataset.songId !== drag.songId);
}

function findFallbackCard(drag, clientY) {
  const cards = [...drag.list.querySelectorAll(".song-card:not(.is-dragging)")];
  if (!cards.length) {
    return null;
  }

  if (clientY <= cards[0].getBoundingClientRect().top) {
    return cards[0];
  }

  const lastCard = cards[cards.length - 1];
  if (clientY >= lastCard.getBoundingClientRect().bottom) {
    return lastCard;
  }

  return cards.find((card) => {
    const rect = card.getBoundingClientRect();
    return clientY >= rect.top && clientY <= rect.bottom;
  }) ?? null;
}

function maybeAutoScrollWindow(clientY) {
  if (clientY < AUTO_SCROLL_EDGE) {
    window.scrollBy(0, -Math.max(10, (AUTO_SCROLL_EDGE - clientY) * 0.32));
  }

  if (clientY > window.innerHeight - AUTO_SCROLL_EDGE) {
    window.scrollBy(0, Math.max(10, (clientY - (window.innerHeight - AUTO_SCROLL_EDGE)) * 0.32));
  }
}

function clearDropIndicators(list) {
  list.querySelectorAll(".drop-before, .drop-after").forEach((card) => {
    card.classList.remove("drop-before", "drop-after");
  });
}

function cleanupDragStyles(drag) {
  drag.handle.releasePointerCapture?.(drag.pointerId);
  document.body.classList.remove("is-dragging-song");
  drag.card.classList.remove("is-dragging", "is-moving", "is-moving-up", "is-moving-down");
  drag.card.style.transform = "";
  drag.card.style.pointerEvents = "";
}

function moveSong(column, songId, direction, { persist }) {
  const order = [...state.rankings[column]];
  const currentIndex = order.indexOf(songId);

  if (currentIndex === -1) {
    return;
  }

  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= order.length) {
    return;
  }

  const nextOrder = [...order];
  [nextOrder[currentIndex], nextOrder[targetIndex]] = [nextOrder[targetIndex], nextOrder[currentIndex]];
  commitOrder(column, nextOrder, { persist, songId, direction });
}

function moveSongToPlacement(column, songId, hoverSongId, placement, { persist }) {
  const order = [...state.rankings[column]];
  const fromIndex = order.indexOf(songId);
  if (fromIndex === -1) {
    return;
  }

  const filteredOrder = order.filter((id) => id !== songId);
  let insertionIndex = filteredOrder.indexOf(hoverSongId);
  if (insertionIndex === -1) {
    return;
  }

  if (placement === "after") {
    insertionIndex += 1;
  }

  filteredOrder.splice(insertionIndex, 0, songId);
  const finalIndex = filteredOrder.indexOf(songId);

  if (finalIndex === fromIndex) {
    render(window.scrollY);
    return;
  }

  const direction = finalIndex < fromIndex ? "up" : "down";
  commitOrder(column, filteredOrder, { persist, songId, direction });
}

function commitOrder(column, nextOrder, { persist, songId, direction }) {
  const currentScrollY = window.scrollY;
  state.rankings[column] = nextOrder;
  state.fx = {
    column,
    songId,
    direction,
    startedAt: Date.now()
  };

  if (persist) {
    saveRankings();
  }

  render(currentScrollY);

  window.clearTimeout(commitOrder.clearFxTimer);
  commitOrder.clearFxTimer = window.setTimeout(() => {
    state.fx = null;
    render(window.scrollY);
  }, ANIMATION_WINDOW_MS);
}

function resetRankings() {
  state.rankings = {
    sebo: [...DEFAULT_ORDER],
    rana: [...DEFAULT_ORDER]
  };
  state.fx = null;
  saveRankings();
  render(window.scrollY);
  flashStorageHint("Orden restaurado", "Se han dejado las dos columnas con el orden original del album.");
}

function toggleConsensusView() {
  state.showAllConsensus = !state.showAllConsensus;
  render(window.scrollY);
}

function render(scrollY = window.scrollY) {
  const positions = getPositionMaps();
  const consensus = getConsensusRanking(positions);

  renderList("sebo", positions);
  renderList("rana", positions);
  renderConsensus(consensus);
  updateStats(positions, consensus);

  elements.toggleConsensusButton.textContent = state.showAllConsensus ? "Mostrar top 5" : "Ver ranking global";
  window.scrollTo({ top: scrollY, behavior: "auto" });
}

function renderList(column, positions) {
  const list = elements.lists[column];
  const otherColumn = column === "sebo" ? "rana" : "sebo";
  const otherName = otherColumn === "sebo" ? "Sebo" : "Rana";

  list.textContent = "";

  state.rankings[column].forEach((songId, index) => {
    const track = TRACK_MAP.get(songId);
    if (!track) {
      return;
    }

    const fragment = elements.template.content.cloneNode(true);
    const card = fragment.querySelector(".song-card");
    const rank = fragment.querySelector(".song-card__rank");
    const title = fragment.querySelector(".song-card__title");
    const subtitle = fragment.querySelector(".song-card__subtitle");
    const delta = fragment.querySelector(".song-card__delta");
    const dragHandle = fragment.querySelector(".song-card__drag");

    const currentPosition = index + 1;
    const otherPosition = positions[otherColumn].get(songId);
    const comparison = getComparisonData(currentPosition, otherPosition, otherName);

    card.dataset.column = column;
    card.dataset.songId = songId;
    rank.textContent = String(currentPosition).padStart(2, "0");
    title.textContent = track.title;
    subtitle.textContent = track.detail;
    delta.dataset.trend = comparison.trend;
    delta.innerHTML = `<strong>${comparison.label}</strong><span>${comparison.meta}</span>`;
    delta.title = comparison.title;
    dragHandle.setAttribute("aria-label", `Arrastrar ${track.title}`);

    if (isFxTarget(column, songId)) {
      card.classList.add("is-moving", `is-moving-${state.fx.direction}`);
    }

    list.appendChild(fragment);
  });
}

function renderConsensus(consensus) {
  const visibleEntries = state.showAllConsensus ? consensus : consensus.slice(0, COLLAPSED_CONSENSUS_COUNT);
  elements.consensusList.textContent = "";

  visibleEntries.forEach((entry, index) => {
    const item = document.createElement("article");
    const copy = document.createElement("div");
    const meta = document.createElement("div");
    const rank = document.createElement("span");
    const title = document.createElement("strong");
    const detail = document.createElement("span");
    const average = document.createElement("span");
    const gap = document.createElement("span");

    item.className = "consensus-item";
    item.setAttribute("role", "listitem");
    item.style.setProperty("--gap-strength", String(Math.min(entry.gap / 10, 1)));

    rank.className = "consensus-item__rank";
    rank.textContent = String(index + 1).padStart(2, "0");

    copy.className = "consensus-item__copy";
    title.textContent = TRACK_MAP.get(entry.songId)?.title ?? entry.songId;
    detail.textContent = `Sebo #${entry.seboPosition} / Rana #${entry.ranaPosition}`;
    copy.append(rank, title, detail);

    meta.className = "consensus-item__meta";
    average.textContent = `media ${formatAverage(entry.averagePosition)}`;
    gap.textContent = entry.gap === 0 ? "match total" : `gap ${entry.gap}`;
    meta.append(average, gap);

    item.append(copy, meta);
    elements.consensusList.appendChild(item);
  });
}

function updateStats(positions, consensus) {
  const topSeboId = state.rankings.sebo[0];
  const topRanaId = state.rankings.rana[0];
  const shared = state.rankings.sebo.reduce((count, songId, index) => count + Number(songId === state.rankings.rana[index]), 0);
  const leader = consensus[0];
  const biggestGap = [...consensus].sort((left, right) => {
    if (right.gap !== left.gap) {
      return right.gap - left.gap;
    }
    return left.averagePosition - right.averagePosition;
  })[0];

  elements.topSebo.textContent = TRACK_MAP.get(topSeboId)?.title ?? "-";
  elements.topRana.textContent = TRACK_MAP.get(topRanaId)?.title ?? "-";
  elements.sharedCount.textContent = `${shared} / ${TRACKS.length}`;
  elements.consensusLeader.textContent = TRACK_MAP.get(leader?.songId)?.title ?? "-";
  elements.biggestGapSong.textContent = TRACK_MAP.get(biggestGap?.songId)?.title ?? "-";
  elements.biggestGapValue.textContent = biggestGap ? `${biggestGap.gap} puestos` : "-";
}

function getPositionMaps() {
  return {
    sebo: new Map(state.rankings.sebo.map((songId, index) => [songId, index + 1])),
    rana: new Map(state.rankings.rana.map((songId, index) => [songId, index + 1]))
  };
}

function getComparisonData(currentPosition, otherPosition, otherName) {
  const difference = currentPosition - otherPosition;

  if (difference === 0) {
    return {
      trend: "same",
      label: "igual",
      meta: `mismo puesto que ${otherName}`,
          title: `Esta cancion esta en el mismo puesto que en la lista de ${otherName}.`
    };
  }

  if (difference < 0) {
    return {
      trend: "up",
      label: `${Math.abs(difference)} arriba`,
      meta: `mejor que ${otherName}`,
      title: `Aqui esta ${Math.abs(difference)} puestos mas arriba que en la lista de ${otherName}.`
    };
  }

  return {
    trend: "down",
    label: `${difference} abajo`,
    meta: `peor que ${otherName}`,
      title: `Aqui esta ${difference} puestos mas abajo que en la lista de ${otherName}.`
  };
}

function getConsensusRanking(positions) {
  return TRACKS
    .map((track) => {
      const seboPosition = positions.sebo.get(track.id);
      const ranaPosition = positions.rana.get(track.id);
      return {
        songId: track.id,
        seboPosition,
        ranaPosition,
        averagePosition: (seboPosition + ranaPosition) / 2,
        gap: Math.abs(seboPosition - ranaPosition)
      };
    })
    .sort((left, right) => {
      if (left.averagePosition !== right.averagePosition) {
        return left.averagePosition - right.averagePosition;
      }
      if (left.gap !== right.gap) {
        return left.gap - right.gap;
      }
      return DEFAULT_ORDER.indexOf(left.songId) - DEFAULT_ORDER.indexOf(right.songId);
    });
}

function formatAverage(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function isFxTarget(column, songId) {
  if (!state.fx) {
    return false;
  }

  const isFresh = Date.now() - state.fx.startedAt <= ANIMATION_WINDOW_MS;
  return isFresh && state.fx.column === column && state.fx.songId === songId;
}

function loadRankings() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        sebo: [...DEFAULT_ORDER],
        rana: [...DEFAULT_ORDER]
      };
    }

    const parsed = JSON.parse(raw);
    return {
      sebo: sanitizeOrder(parsed.sebo),
      rana: sanitizeOrder(parsed.rana)
    };
  } catch {
    return {
      sebo: [...DEFAULT_ORDER],
      rana: [...DEFAULT_ORDER]
    };
  }
}

function sanitizeOrder(order) {
  if (!Array.isArray(order)) {
    return [...DEFAULT_ORDER];
  }

  const unique = [];
  const seen = new Set();

  order.forEach((songId) => {
    if (TRACK_MAP.has(songId) && !seen.has(songId)) {
      unique.push(songId);
      seen.add(songId);
    }
  });

  DEFAULT_ORDER.forEach((songId) => {
    if (!seen.has(songId)) {
      unique.push(songId);
    }
  });

  return unique;
}

function saveRankings() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.rankings));
}

function exportRankings() {
  const payload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    rankings: state.rankings
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "joji-split-rank-backup.json";
  link.click();
  URL.revokeObjectURL(url);

  flashStorageHint(
    "Backup listo",
    "Se ha descargado un JSON con las dos listas para recuperarlas aunque cambies de navegador, URL o reinicies el PC."
  );
}

async function onImportFile(event) {
  const [file] = event.target.files ?? [];
  if (!file) {
    return;
  }

  try {
    const raw = await file.text();
    const parsed = JSON.parse(raw);
    state.rankings = {
      sebo: sanitizeOrder(parsed?.rankings?.sebo),
      rana: sanitizeOrder(parsed?.rankings?.rana)
    };
    saveRankings();
    render(window.scrollY);
    flashStorageHint(
      "Backup cargado",
      "La app ha restaurado el orden desde el archivo que acabas de importar."
    );
  } catch {
    flashStorageHint(
      "Importacion fallida",
      "Ese archivo no tenia un backup valido de esta microapp."
    );
  } finally {
    event.target.value = "";
  }
}

function flashStorageHint(title, text) {
  window.clearTimeout(flashStorageHint.resetTimer);
  elements.storageHintTitle.textContent = title;
  elements.storageHintText.textContent = text;
  flashStorageHint.resetTimer = window.setTimeout(updateStorageHint, 4600);
}

function updateStorageHint() {
  const currentUrl = `${window.location.origin}${window.location.pathname}`;

  if (window.location.hostname === "127.0.0.1") {
    elements.storageHintTitle.textContent = "Autoguardado en 127.0.0.1";
    elements.storageHintText.textContent = `Si tu orden bueno estaba en localhost, abre http://localhost:5173/lab/joji-sebo-rana/ porque el navegador guarda distinto por origen. Ahora mismo estas usando ${currentUrl}.`;
    return;
  }

  if (window.location.hostname === "localhost") {
    elements.storageHintTitle.textContent = "Autoguardado en localhost";
    elements.storageHintText.textContent = `Esta URL es la que conviene mantener si aqui tienes tu orden correcto. Si alguna vez cambias de origen, usa Guardar lista para sacar un backup JSON.`;
    return;
  }

  elements.storageHintTitle.textContent = "Autoguardado local activo";
  elements.storageHintText.textContent = `La lista se guarda en este navegador y en esta URL: ${currentUrl}.`;
}

function exposeDiagnostics() {
  window.render_game_to_text = () => {
    const positions = getPositionMaps();
    const consensus = getConsensusRanking(positions);

    return JSON.stringify({
      album: "Piss In The Wind",
      trackCount: TRACKS.length,
      seboTop3: state.rankings.sebo.slice(0, 3).map((songId) => TRACK_MAP.get(songId)?.title),
      ranaTop3: state.rankings.rana.slice(0, 3).map((songId) => TRACK_MAP.get(songId)?.title),
      consensusTop3: consensus.slice(0, 3).map((entry) => TRACK_MAP.get(entry.songId)?.title),
      sharedCount: state.rankings.sebo.reduce((count, songId, index) => count + Number(songId === state.rankings.rana[index]), 0)
    });
  };

  window.advanceTime = () => {
    render(window.scrollY);
  };
}

function runPreviewMoveFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const previewMove = params.get("previewMove");
  if (!previewMove) {
    return;
  }

  const [column, songId, direction] = previewMove.split(":");
  if (!state.rankings[column] || !TRACK_MAP.has(songId) || !["up", "down"].includes(direction)) {
    return;
  }

  window.setTimeout(() => {
    moveSong(column, songId, direction, { persist: false });
  }, 140);
}
