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
