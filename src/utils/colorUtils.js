export const generateRandomGradient = (baseColor) => {
  const hexToRgb = (hex) => {
    const bigint = parseInt(hex.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return { r, g, b };
  };

  const rgbToHex = (r, g, b) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };

  const adjustColor = (color, percent) => {
    let { r, g, b } = hexToRgb(color);

    r = Math.min(255, Math.max(0, r + Math.floor(r * percent)));
    g = Math.min(255, Math.max(0, g + Math.floor(g * percent)));
    b = Math.min(255, Math.max(0, b + Math.floor(b * percent)));

    return rgbToHex(r, g, b);
  };

  const darkenColor = (color, percent) => {
    let { r, g, b } = hexToRgb(color);

    r = Math.max(0, r - Math.floor(r * percent));
    g = Math.max(0, g - Math.floor(g * percent));
    b = Math.max(0, b - Math.floor(b * percent));

    return rgbToHex(r, g, b);
  };

  const darkBaseColor = darkenColor(baseColor, 0.7); // Darken base color by 70% to ensure dark tones

  const color1 = adjustColor(darkBaseColor, Math.random() * -0.1); // Darken slightly
  const color2 = adjustColor(darkBaseColor, Math.random() * -0.3 - 0.2); // Darken more, ensuring a noticeable difference

  const angle = 90; // Fixed angle for left to right gradient

  return `linear-gradient(${angle}deg, ${color1}, ${color2})`;
};