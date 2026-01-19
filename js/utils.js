export const formatMoney = (amount) => `${amount.toLocaleString("es-ES")} monedas`;

export const randomBetween = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export const readFileAsBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        const [, base64] = result.split(",");
        resolve(base64 || "");
      } else {
        resolve("");
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export const toDataUrl = (base64, mimeType = "image/png") =>
  `data:${mimeType};base64,${base64}`;

const readBlobAsBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === "string") {
        const [, base64] = result.split(",");
        resolve(base64 || "");
      } else {
        resolve("");
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

export const fetchAssetAsBase64 = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo cargar ${url} (${response.status})`);
  }
  const blob = await response.blob();
  const base64 = await readBlobAsBase64(blob);
  return { base64, mimeType: blob.type || "image/png" };
};

/**
 * Comprime una imagen en base64 redimensionándola y ajustando su calidad.
 * @param {string} base64 - Imagen en base64 (con o sin prefijo data:).
 * @param {object} options - Opciones de compresión.
 * @returns {Promise<string>} - Imagen comprimida en base64 (con prefijo data:).
 */
export const compressImage = (base64, { maxWidth = 256, maxHeight = 256, quality = 0.7, mimeType = "image/jpeg" } = {}) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`;
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      const compressed = canvas.toDataURL(mimeType, quality);
      resolve(compressed);
    };
    img.onerror = (e) => reject(e);
  });
};
