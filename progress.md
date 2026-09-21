Original prompt: crea un proyecto nuevo
webapp de 2 columnas, sebo y rana, sera una lista de canciones del ultimo album de joji, asegurate de eque esten todas las 21 y en ambas columnas. cada cancion sera un blque que podemos mover de arriba a abajo segun nuestra prefencia. espero que sea atractiva visualmente y estilo iphone
añade a los botones una animacion de reaccion respecto el bloque que estoy moviendo, con dinamica de fluidos. separa esta version de la anterior

- 2026-03-14: Se crea una app nueva separada en `lab/joji-sebo-rana/`.
- 2026-03-14: Fuente musical verificada para el album mas reciente de Joji (`Piss In The Wind`, 2026-02-06, 21 canciones).
- 2026-03-14: Verificacion visual hecha con Chrome headless sobre `http://127.0.0.1:5173/lab/joji-sebo-rana/`; capturas en `output/playwright/`.
- 2026-03-14: Dataset comprobado en codigo: 21 canciones, inicializadas en ambas columnas a partir de `DEFAULT_ORDER`.
- 2026-03-14: Ajuste posterior: un solo scroll de pagina, sin scroll interno en columnas, y drag real desde la capsula lateral de cada bloque.
- 2026-03-14: Verificado con Playwright CLI: drag de `LOVE YOU LESS` por encima de `Last of a Dying Breed` en Sebo y `window.scrollY = 1400` con listas en `overflowY: visible`.
- TODO: Si se quiere afinar mas, se puede anadir autoscroll mas agresivo al arrastrar cerca del borde superior o inferior.
