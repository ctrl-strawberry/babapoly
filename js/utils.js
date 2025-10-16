export const formatMoney = (amount) => `${amount.toLocaleString("es-ES")} monedas`;

export const randomBetween = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
