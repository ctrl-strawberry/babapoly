import { readFileAsBase64, toDataUrl, fetchAssetAsBase64 } from "./utils.js";

const DEFAULT_PROMPT =
  "crea una imagen de mi busto, añademe monoculo, sombrero de copa y un gran bigote blanco clasico. añade un fondo negro con estilo ciberpunk e iluminación cinematográfica. la composición debe asemejarse a una foto tipo dni, busto centrado y mirada al frente.";
const DEFAULT_MODEL = "gemini-2.5-flash-image";
const GOOGLE_ENDPOINTS = {
  edit: "https://generativelanguage.googleapis.com/v1beta/models/imagegeneration:edit",
  generate: "https://generativelanguage.googleapis.com/v1beta/models/imagegeneration:generate",
};
const GEMINI_BASE_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

const isGeminiModel = (value) =>
  typeof value === "string" && value.trim().toLowerCase().startsWith("gemini");

const isLikelyBase64 = (value) =>
  typeof value === "string" && value.length > 64 && /^[0-9A-Za-z+/=]+$/.test(value);

const cloneForDisplay = (value, depth = 0) => {
  if (depth > 6) {
    return "[…]";
  }
  if (typeof value === "string") {
    if (value.startsWith("data:") && value.length > 64) {
      return `<data-uri:${value.length} chars>`;
    }
    if (isLikelyBase64(value)) {
      return `<base64:${value.length} chars>`;
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => cloneForDisplay(item, depth + 1));
  }
  if (value && typeof value === "object") {
    const result = {};
    for (const [key, nested] of Object.entries(value)) {
      result[key] = cloneForDisplay(nested, depth + 1);
    }
    return result;
  }
  return value;
};

const stringifyForDisplay = (value) =>
  JSON.stringify(cloneForDisplay(value), null, 2);

const bytesFromBase64 = (base64) => Math.floor((base64.length * 3) / 4);

const extractImageDataUrl = (payload) => {
  if (!payload) return null;
  if (typeof payload.avatar === "string") {
    return payload.avatar;
  }

  const inlineData =
    payload?.images?.[0]?.inlineData ||
    payload?.data?.[0]?.image?.inlineData ||
    payload?.candidates?.[0]?.content?.parts?.find((part) => part.inlineData)
      ?.inlineData ||
    null;

  if (inlineData?.data) {
    return toDataUrl(inlineData.data, inlineData.mimeType || "image/png");
  }

  if (payload?.images?.[0]?.base64Image) {
    return toDataUrl(payload.images[0].base64Image, "image/png");
  }

  return null;
};

const parseAdvancedConfig = (textarea) => {
  const raw = textarea.value.trim();
  if (!raw) {
    return { data: null, error: null };
  }

  try {
    const parsed = JSON.parse(raw);
    return { data: parsed, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const initImageLab = ({ section, openButton, showScreen }) => {
  if (!section) {
    throw new Error("Image lab section is required");
  }

  const statusNode = section.querySelector("#imageLabStatus");
  const backButton = section.querySelector("#imageLabBackBtn");
  const form = section.querySelector("#imageLabForm");
  const fileInput = section.querySelector("#imageLabFile");
  const sampleButton = section.querySelector("#imageLabSampleBtn");
  const clearButton = section.querySelector("#imageLabClearBtn");
  const promptInput = section.querySelector("#imageLabPrompt");
  const modelInput = section.querySelector("#imageLabModel");
  const modeSelect = section.querySelector("#imageLabMode");
  const endpointInput = section.querySelector("#imageLabEndpoint");
  const advancedTextarea = section.querySelector("#imageLabAdvancedJson");
  const includeRawCheckbox = section.querySelector("#imageLabIncludeRaw");
  const backendBtn = section.querySelector("#imageLabBackendBtn");
  const directBtn = section.querySelector("#imageLabDirectBtn");
  const apiKeyInput = section.querySelector("#imageLabApiKey");
  const sourcePreviewImg = section.querySelector("#imageLabSourcePreview");
  const sourceInfoNode = section.querySelector("#imageLabSourceInfo");
  const resultPreviewImg = section.querySelector("#imageLabResultPreview");
  const resultInfoNode = section.querySelector("#imageLabResultInfo");
  const requestPreview = section.querySelector("#imageLabRequestPreview");
  const responsePreview = section.querySelector("#imageLabResponsePreview");

  const defaultEndpoint =
    typeof window !== "undefined" && window.BABA_POLY_AVATAR_ENDPOINT
      ? window.BABA_POLY_AVATAR_ENDPOINT
      : "/api/edit-avatar";

  const state = {
    base64: "",
    mimeType: "",
    fileName: "",
    fileSize: 0,
  };

  const setStatus = (message, tone = "info") => {
    if (!statusNode) return;
    statusNode.textContent = message || "";
    statusNode.classList.remove("is-error", "is-success", "is-busy");
    if (tone === "error") {
      statusNode.classList.add("is-error");
    } else if (tone === "success") {
      statusNode.classList.add("is-success");
    } else if (tone === "busy") {
      statusNode.classList.add("is-busy");
    }
  };

  const setActionDisabled = (disabled) => {
    if (backendBtn) backendBtn.disabled = disabled;
    if (directBtn) directBtn.disabled = disabled;
  };

  const buildBackendRequest = ({ strict, advancedConfig }) => {
    const endpoint = (endpointInput.value || "").trim() || defaultEndpoint;
    const mode = modeSelect.value;
    const prompt = promptInput.value.trim();
    const model = modelInput.value.trim();
    const includeRaw = includeRawCheckbox.checked;

    const body = {
      mode,
    };

    if (prompt) {
      body.prompt = prompt;
    }
    if (model) {
      body.model = model;
    }
    if (includeRaw) {
      body.includeRaw = true;
    }

    if (mode === "edit") {
      if (!state.base64) {
        if (strict) {
          const error = new Error("missing-image");
          error.code = "missing-image";
          throw error;
        }
      } else {
        body.image = state.base64;
        body.mimeType = state.mimeType || "image/png";
      }
    }

    if (advancedConfig && typeof advancedConfig === "object") {
      Object.assign(body, advancedConfig);
    }

    return { endpoint, body };
  };

  const buildGoogleRequest = ({ strict, advancedConfig }) => {
    const mode = modeSelect.value;
    const prompt = promptInput.value.trim() || DEFAULT_PROMPT;
    const model = modelInput.value.trim() || DEFAULT_MODEL;
    const isGemini = isGeminiModel(model);

    if (mode === "edit" && !state.base64) {
      if (strict) {
        const error = new Error("missing-image");
        error.code = "missing-image";
        throw error;
      }
    }

    let endpoint = "";
    let body = null;

    if (isGemini) {
      endpoint = `${GEMINI_BASE_ENDPOINT}/${encodeURIComponent(model)}:generateContent`;

      const parts = [];
      if (mode === "edit" && state.base64) {
        parts.push({
          inlineData: {
            mimeType: state.mimeType || "image/png",
            data: state.base64,
          },
        });
      }
      if (prompt) {
        parts.push({ text: prompt });
      }
      if (parts.length === 0) {
        parts.push({ text: DEFAULT_PROMPT });
      }

      body = {
        contents: [
          {
            role: "user",
            parts,
          },
        ],
      };
    } else {
      endpoint = GOOGLE_ENDPOINTS[mode] || GOOGLE_ENDPOINTS.edit;
      body = {
        model,
        prompt: { text: prompt },
      };

      if (mode === "edit" && state.base64) {
        body.image = {
          inlineData: {
            mimeType: state.mimeType || "image/png",
            data: state.base64,
          },
        };
      }
    }

    if (advancedConfig && typeof advancedConfig === "object") {
      Object.assign(body, advancedConfig);
    }

    return { endpoint, body };
  };

  const updateRequestPreview = () => {
    const advanced = parseAdvancedConfig(advancedTextarea);
    if (advanced.error) {
      advancedTextarea.setAttribute("aria-invalid", "true");
      requestPreview.value = `⚠️ JSON extra inválido: ${advanced.error.message}`;
      return;
    }

    advancedTextarea.removeAttribute("aria-invalid");

    const backendData = buildBackendRequest({
      strict: false,
      advancedConfig: advanced.data,
    });
    const googleData = buildGoogleRequest({
      strict: false,
      advancedConfig: advanced.data,
    });

    const preview = {
      backend: {
        endpoint: backendData.endpoint,
        body: backendData.body,
      },
      google: {
        endpoint: `${googleData.endpoint}?key=<api-key>`,
        body: googleData.body,
      },
    };

    requestPreview.value = stringifyForDisplay(preview);
  };

  const resetResultPreview = (message = "Aún no hay resultados.") => {
    resultPreviewImg.removeAttribute("src");
    resultInfoNode.textContent = message;
  };

  const clearState = () => {
    state.base64 = "";
    state.mimeType = "";
    state.fileName = "";
    state.fileSize = 0;
    if (fileInput) fileInput.value = "";
    if (advancedTextarea) advancedTextarea.value = "";
    includeRawCheckbox.checked = false;
    responsePreview.value = "";
    sourcePreviewImg.removeAttribute("src");
    sourceInfoNode.textContent = "Carga una imagen para comenzar.";
    resetResultPreview();
    setStatus("Campos reiniciados. Configura tu prueba.", "info");
    updateRequestPreview();
  };

  const renderSourceInfo = () => {
    if (!state.base64) {
      sourceInfoNode.textContent = "Carga una imagen para comenzar.";
      return;
    }
    const sizeKb = state.fileSize ? Math.round(state.fileSize / 102.4) / 10 : Math.round(bytesFromBase64(state.base64) / 102.4) / 10;
    const label = state.fileName ? state.fileName : "Imagen seleccionada";
    sourceInfoNode.textContent = `${label} · ${sizeKb.toFixed(1)} KB`;
  };

  const loadFile = async (file) => {
    if (!file) return;
    try {
      const base64 = await readFileAsBase64(file);
      if (!base64) {
        setStatus("No se pudo leer el archivo seleccionado.", "error");
        return;
      }
      state.base64 = base64;
      state.mimeType = file.type || "image/png";
      state.fileName = file.name;
      state.fileSize = file.size;
      sourcePreviewImg.src = toDataUrl(state.base64, state.mimeType);
      renderSourceInfo();
      resetResultPreview();
      setStatus("Imagen cargada. Ejecuta una prueba cuando quieras.", "success");
      updateRequestPreview();
    } catch (error) {
      setStatus(`Error al leer el archivo: ${error.message}`, "error");
    }
  };

  const loadSample = async () => {
    try {
      setStatus("Cargando imagen de ejemplo...", "busy");
      const { base64, mimeType } = await fetchAssetAsBase64("assets/mascota.webp");
      state.base64 = base64;
      state.mimeType = mimeType;
      state.fileName = "mascota.webp";
      state.fileSize = bytesFromBase64(base64);
      sourcePreviewImg.src = toDataUrl(base64, mimeType);
      renderSourceInfo();
      resetResultPreview();
      setStatus("Imagen de ejemplo cargada.", "success");
      updateRequestPreview();
    } catch (error) {
      setStatus(`No se pudo cargar la imagen de ejemplo: ${error.message}`, "error");
    }
  };

  const handleBackendTest = async () => {
    const advanced = parseAdvancedConfig(advancedTextarea);
    if (advanced.error) {
      setStatus(`JSON extra inválido: ${advanced.error.message}`, "error");
      advancedTextarea.focus();
      return;
    }

    let request;
    try {
      request = buildBackendRequest({ strict: true, advancedConfig: advanced.data });
    } catch (error) {
      if (error.code === "missing-image") {
        setStatus("Sube una imagen o cambia a modo Generar para probar.", "error");
        fileInput?.focus();
        return;
      }
      throw error;
    }

    const { endpoint, body } = request;
    setActionDisabled(true);
    setStatus("Llamando al backend…", "busy");
    responsePreview.value = "";
    resetResultPreview("Esperando respuesta...");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await response.text();
      let payload;
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { raw: text };
      }

      responsePreview.value = stringifyForDisplay(payload);
      const avatarUrl = extractImageDataUrl(payload);

      if (response.ok) {
        if (avatarUrl) {
          resultPreviewImg.src = avatarUrl;
          resultInfoNode.textContent = "Avatar recibido desde el backend.";
        } else {
          resetResultPreview("El backend respondió sin imagen.");
        }
        setStatus("Backend respondió correctamente.", "success");
      } else {
        resetResultPreview("Sin imagen por error del backend.");
        setStatus(`Error ${response.status} al llamar al backend.`, "error");
      }
    } catch (error) {
      resetResultPreview("Sin imagen por error de red.");
      responsePreview.value = stringifyForDisplay({ error: error.message });
      setStatus(`Fallo al llamar al backend: ${error.message}`, "error");
    } finally {
      setActionDisabled(false);
    }
  };

  const handleDirectTest = async () => {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      setStatus("Introduce tu clave de Google para la prueba directa.", "error");
      apiKeyInput.focus();
      return;
    }

    const advanced = parseAdvancedConfig(advancedTextarea);
    if (advanced.error) {
      setStatus(`JSON extra inválido: ${advanced.error.message}`, "error");
      advancedTextarea.focus();
      return;
    }

    let request;
    try {
      request = buildGoogleRequest({ strict: true, advancedConfig: advanced.data });
    } catch (error) {
      if (error.code === "missing-image") {
        setStatus("Sube una imagen o cambia el modo a Generar antes de llamar a Google.", "error");
        fileInput?.focus();
        return;
      }
      throw error;
    }

    const { endpoint, body } = request;
    const url = `${endpoint}?key=${encodeURIComponent(apiKey)}`;

    setActionDisabled(true);
    setStatus("Llamando a Google…", "busy");
    responsePreview.value = "";
    resetResultPreview("Esperando respuesta...");

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await response.text();
      let payload;
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { raw: text };
      }

      responsePreview.value = stringifyForDisplay(payload);
      const avatarUrl = extractImageDataUrl(payload);

      if (avatarUrl) {
        resultPreviewImg.src = avatarUrl;
        resultInfoNode.textContent = "Respuesta directa de Google.";
      } else if (response.ok) {
        resetResultPreview("Google respondió sin imagen.");
      } else {
        resetResultPreview("Sin imagen por error de Google.");
      }

      if (response.ok) {
        setStatus("Google respondió correctamente.", "success");
      } else {
        setStatus(`Google devolvió un error ${response.status}.`, "error");
      }
    } catch (error) {
      resetResultPreview("Sin imagen por error de red.");
      responsePreview.value = stringifyForDisplay({ error: error.message });
      setStatus(`Fallo en la llamada directa: ${error.message}`, "error");
    } finally {
      setActionDisabled(false);
    }
  };

  if (promptInput && !promptInput.value.trim()) {
    promptInput.value = DEFAULT_PROMPT;
  }
  if (modelInput && !modelInput.value.trim()) {
    modelInput.value = DEFAULT_MODEL;
  }
  if (endpointInput && !endpointInput.value.trim()) {
    endpointInput.value = defaultEndpoint;
  }

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
  });
  fileInput?.addEventListener("change", () => {
    const [file] = fileInput.files || [];
    loadFile(file);
  });
  sampleButton?.addEventListener("click", loadSample);
  clearButton?.addEventListener("click", clearState);
  backendBtn?.addEventListener("click", handleBackendTest);
  directBtn?.addEventListener("click", handleDirectTest);
  backButton?.addEventListener("click", () => showScreen("inicio"));
  openButton?.addEventListener("click", () => {
    showScreen("lab");
    setStatus("Configura tu llamada y ejecuta una prueba.", "info");
    updateRequestPreview();
  });

  const previewInputs = [
    promptInput,
    modelInput,
    modeSelect,
    endpointInput,
    advancedTextarea,
    includeRawCheckbox,
  ].filter(Boolean);

  previewInputs.forEach((node) => {
    const isCheckbox =
      node && node.tagName === "INPUT" && node.getAttribute("type") === "checkbox";
    node.addEventListener(isCheckbox ? "change" : "input", updateRequestPreview);
  });

  updateRequestPreview();
  renderSourceInfo();
  resetResultPreview();
  setStatus("Configura tu llamada y ejecuta una prueba.", "info");

  return {
    onEnter() {
      if (!endpointInput.value.trim()) {
        endpointInput.value = defaultEndpoint;
      }
      if (!promptInput.value.trim()) {
        promptInput.value = DEFAULT_PROMPT;
      }
      updateRequestPreview();
    },
  };
};
