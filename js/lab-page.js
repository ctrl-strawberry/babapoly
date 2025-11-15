import { initImageLab } from "./image-lab.js";

const deriveBasePath = () => {
  if (typeof window === "undefined") return "/";
  const segments = window.location.pathname.split("/").filter(Boolean);
  if (!segments.length) {
    return "/";
  }
  segments.pop();
  if (!segments.length) {
    return "/";
  }
  return `/${segments.join("/")}/`;
};

const basePath = deriveBasePath();

const showScreen = (screenId) => {
  if (screenId === "inicio") {
    window.location.href = basePath;
  }
};

const section = document.getElementById("screen-image-lab");

if (section) {
  const lab = initImageLab({
    section,
    showScreen,
  });

  lab?.onEnter?.();
} else {
  console.warn("No se encontró la sección del laboratorio de imágenes.");
}
