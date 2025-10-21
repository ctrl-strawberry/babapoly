const IMAGE_EDIT_PROMPT =
  "crea una imagen con fondo transparente de mi busto, añademe monoculo, sombrero de copa y un gran bigote blanco clasico.";

const GOOGLE_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/imagegeneration:edit";

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

const errorResponse = (message, status = 400) =>
  jsonResponse({ error: message }, { status });

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

    const { image, mimeType } = payload || {};
    if (typeof image !== "string" || !image.trim()) {
      return errorResponse("Debes enviar el campo 'image' en base64", 400);
    }

    const safeMime = typeof mimeType === "string" && mimeType.trim()
      ? mimeType.trim()
      : "image/png";

    try {
      const googleResponse = await fetch(`${GOOGLE_ENDPOINT}?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "imagen-3.0",
          prompt: {
            text: IMAGE_EDIT_PROMPT,
          },
          image: {
            inlineData: {
              mimeType: safeMime,
              data: image,
            },
          },
        }),
      });

      if (!googleResponse.ok) {
        const errorText = await googleResponse.text();
        console.error("Google API error:", googleResponse.status, errorText);
        return errorResponse("La edición de imagen falló", 502);
      }

      const googlePayload = await googleResponse.json();
      const inlineData =
        googlePayload?.images?.[0]?.inlineData ||
        googlePayload?.data?.[0]?.image?.inlineData ||
        googlePayload?.candidates?.[0]?.content?.parts?.find((part) => part.inlineData)
          ?.inlineData ||
        null;

      if (inlineData?.data) {
        return jsonResponse({
          avatar: `data:${inlineData.mimeType || "image/png"};base64,${inlineData.data}`,
        });
      }

      if (googlePayload?.images?.[0]?.base64Image) {
        return jsonResponse({
          avatar: `data:image/png;base64,${googlePayload.images[0].base64Image}`,
        });
      }

      console.warn("Respuesta inesperada de Google:", googlePayload);
      return errorResponse("No se pudo interpretar la respuesta de la IA", 502);
    } catch (error) {
      console.error("Worker error:", error);
      return errorResponse("No se pudo procesar la imagen", 500);
    }
  },
};
