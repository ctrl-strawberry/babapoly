const IMAGE_EDIT_PROMPT =
  "crea una imagen con fondo transparente de mi busto, añademe monoculo, sombrero de copa y un gran bigote blanco clasico.";
const DEFAULT_MODEL = "gemini-2.5-flash-image";
const GOOGLE_ENDPOINTS = {
  edit: "https://generativelanguage.googleapis.com/v1beta/models/imagegeneration:edit",
  generate: "https://generativelanguage.googleapis.com/v1beta/models/imagegeneration:generate",
};
const GEMINI_BASE_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const jsonResponse = (body, init = {}) =>
  new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      ...init.headers,
    },
    status: init.status ?? 200,
  });

const errorResponse = (message, status = 400, details, meta) =>
  jsonResponse(
    {
      error: message,
      ...(details ? { details } : {}),
      ...(meta ? { meta } : {}),
    },
    { status },
  );

const handleOptions = (request) => {
  if (
    request.headers.get("Origin") !== null &&
    request.headers.get("Access-Control-Request-Method") !== null &&
    request.headers.get("Access-Control-Request-Headers") !== null
  ) {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  return new Response(null, {
    headers: {
      Allow: "POST, OPTIONS",
    },
  });
};

const isBase64 = (value) => typeof value === "string" && value.trim() && /^[0-9A-Za-z+/=]+={0,2}$/.test(value);

const cloneForDisplay = (value, depth = 0) => {
  if (depth > 6) return "[…]";
  if (typeof value === "string") {
    if (value.startsWith("data:") && value.length > 64) {
      return `<data-uri:${value.length} chars>`;
    }
    if (isBase64(value) && value.length > 64) {
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

const bytesFromBase64 = (base64) =>
  typeof base64 === "string" ? Math.floor((base64.length * 3) / 4) : 0;

const sanitizeJson = (value, depth = 0) => {
  if (depth > 6) return undefined;
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .map((entry) => sanitizeJson(entry, depth + 1))
      .filter((entry) => entry !== undefined);
  }
  if (typeof value === "object") {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
      return undefined;
    }
    const result = {};
    for (const [key, nested] of Object.entries(value)) {
      const clean = sanitizeJson(nested, depth + 1);
      if (clean !== undefined) {
        result[key] = clean;
      }
    }
    return result;
  }
  return undefined;
};

const buildMeta = ({
  endpoint,
  mode,
  model,
  prompt,
  includeRaw,
  image,
  apiFamily,
}) => ({
  endpoint,
  mode,
  model,
  promptLength: prompt.length,
  includeRaw,
  inputBytes: image ? bytesFromBase64(image) : 0,
  apiFamily,
});

export default {
  /**
   * Cloudflare Worker entry point.
   * To deploy: set GOOGLE_AI_KEY as encrypted environment variable.
   */
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return handleOptions(request);
    }

    if (request.method !== "POST") {
      return errorResponse("Método no permitido", 405);
    }

    const apiKey = env.GOOGLE_AI_KEY;
    if (!apiKey) {
      return errorResponse("Falta GOOGLE_AI_KEY en la configuración del Worker", 500);
    }

    let payload = null;
    try {
      payload = await request.json();
    } catch (error) {
      return errorResponse("El cuerpo de la petición debe ser JSON válido", 400);
    }

    if (!payload || typeof payload !== "object") {
      return errorResponse("El cuerpo debe ser un objeto JSON", 400);
    }

    const mode =
      typeof payload.mode === "string" &&
      payload.mode.toLowerCase() === "generate"
        ? "generate"
        : "edit";
    const prompt =
      typeof payload.prompt === "string" && payload.prompt.trim()
        ? payload.prompt.trim()
        : IMAGE_EDIT_PROMPT;
    const model =
      typeof payload.model === "string" && payload.model.trim()
        ? payload.model.trim()
        : DEFAULT_MODEL;
    const includeRaw = payload.includeRaw === true;
    const image = typeof payload.image === "string" ? payload.image.trim() : "";
    const mimeType =
      typeof payload.mimeType === "string" && payload.mimeType.trim()
        ? payload.mimeType.trim()
        : "image/png";
    const isGemini = model.toLowerCase().startsWith("gemini");

    if (mode === "edit" && !isBase64(image)) {
      return errorResponse("Debes enviar el campo 'image' en base64 para usar el modo edición.", 400);
    }

    let endpoint = "";
    let requestBody = null;

    if (isGemini) {
      endpoint = `${GEMINI_BASE_ENDPOINT}/${encodeURIComponent(model)}:generateContent`;

      const parts = [];
      if (mode === "edit" && image) {
        parts.push({
          inlineData: {
            mimeType,
            data: image,
          },
        });
      }
      if (prompt) {
        parts.push({ text: prompt });
      }
      if (parts.length === 0) {
        parts.push({ text: IMAGE_EDIT_PROMPT });
      }

      requestBody = {
        contents: [
          {
            role: "user",
            parts,
          },
        ],
      };

      const generationConfig = sanitizeJson(payload.generationConfig);
      if (generationConfig && typeof generationConfig === "object") {
        requestBody.generationConfig = generationConfig;
      }

      const safetySettings = sanitizeJson(payload.safetySettings);
      if (safetySettings !== undefined) {
        requestBody.safetySettings = safetySettings;
      }

      const responseConfig = sanitizeJson(payload.responseConfig);
      if (responseConfig !== undefined) {
        requestBody.responseConfig = responseConfig;
      }

      const customFields = sanitizeJson(payload.extra);
      if (customFields && typeof customFields === "object") {
        Object.assign(requestBody, customFields);
      }
    } else {
      requestBody = {
        model,
        prompt: { text: prompt },
      };

      if (mode === "edit" && image) {
        requestBody.image = {
          inlineData: {
            mimeType,
            data: image,
          },
        };

        if (typeof payload.mask === "string" && payload.mask.trim()) {
          const maskMime =
            typeof payload.maskMimeType === "string" && payload.maskMimeType.trim()
              ? payload.maskMimeType.trim()
              : "image/png";
          requestBody.mask = {
            inlineData: {
              mimeType: maskMime,
              data: payload.mask.trim(),
            },
          };
        }

        const editConfig = sanitizeJson(payload.editConfig);
        if (editConfig && typeof editConfig === "object") {
          requestBody.editConfig = editConfig;
        }
      } else if (mode === "generate") {
        const imageConfig = sanitizeJson(payload.imageConfig);
        if (imageConfig && typeof imageConfig === "object") {
          requestBody.image = imageConfig;
        }
        const generationConfig = sanitizeJson(payload.generationConfig);
        if (generationConfig && typeof generationConfig === "object") {
          requestBody.generationConfig = generationConfig;
        }
      }

      const safetySettings = sanitizeJson(payload.safetySettings);
      if (safetySettings !== undefined) {
        requestBody.safetySettings = safetySettings;
      }

      const responseConfig = sanitizeJson(payload.responseConfig);
      if (responseConfig !== undefined) {
        requestBody.responseConfig = responseConfig;
      }

      const customFields = sanitizeJson(payload.extra);
      if (customFields && typeof customFields === "object") {
        Object.assign(requestBody, customFields);
      }

      endpoint = GOOGLE_ENDPOINTS[mode] || GOOGLE_ENDPOINTS.edit;
    }

    const requestMeta = {
      ...buildMeta({
        endpoint,
        mode,
        model,
        prompt,
        includeRaw,
        image,
        apiFamily: isGemini ? "gemini" : "imagen",
      }),
      requestPreview: cloneForDisplay(requestBody),
    };

    try {
      const googleResponse = await fetch(`${endpoint}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!googleResponse.ok) {
        const errorText = await googleResponse.text();
        let parsedError = null;
        try {
          parsedError = JSON.parse(errorText);
        } catch {
          parsedError = errorText;
        }
        console.error("Google API error:", googleResponse.status, parsedError);
        return errorResponse(
          `La llamada a Google falló (${googleResponse.status})`,
          googleResponse.status === 429 ? 429 : 502,
          parsedError,
          requestMeta,
        );
      }

      const googlePayload = await googleResponse.json();
      const inlineData =
        googlePayload?.images?.[0]?.inlineData ||
        googlePayload?.data?.[0]?.image?.inlineData ||
        googlePayload?.candidates?.[0]?.content?.parts?.find((part) => part.inlineData)
          ?.inlineData ||
        null;

      let avatarDataUrl = null;
      if (inlineData?.data) {
        avatarDataUrl = `data:${inlineData.mimeType || "image/png"};base64,${inlineData.data}`;
      } else if (googlePayload?.images?.[0]?.base64Image) {
        avatarDataUrl = `data:image/png;base64,${googlePayload.images[0].base64Image}`;
      }

      if (!avatarDataUrl) {
        console.warn("Respuesta inesperada de Google:", googlePayload);
        return errorResponse(
          "No se pudo interpretar la respuesta de la IA",
          502,
          { payload: cloneForDisplay(googlePayload) },
          requestMeta,
        );
      }

      return jsonResponse({
        avatar: avatarDataUrl,
        meta: {
          ...requestMeta,
          googleStatus: googleResponse.status,
        },
        ...(includeRaw ? { raw: googlePayload } : {}),
      });
    } catch (error) {
      console.error("Worker error:", error);
      return errorResponse(
        `No se pudo procesar la imagen: ${error.message}`,
        500,
        null,
        requestMeta,
      );
    }
  },
};
