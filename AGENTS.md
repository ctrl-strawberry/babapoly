# Guía del agente Codex: Baba Poly

## Contexto rápido
- SPA en vanilla JS para gestionar jugadores y minijuegos de una versión custom de Monopoly.
- No hay bundler ni dependencias externas; basta con servir archivos estáticos (`index.html`, `css/`, `js/` y `assets/`).
- Persistencia local mediante `localStorage`; el estado vive en memoria mientras dura la sesión.
- El repo también contiene micrositios/labs estáticos separados bajo `lab/`; cada experimento nuevo debe mantenerse aislado del flujo principal si no forma parte de Baba Poly.

## Arquitectura y archivos clave
- `index.html`: estructura principal, tres secciones (`inicio`, `jimbo`, `ruleta`), plantillas reutilizables y navegación inferior; carga `js/main.js` como módulo ES.
- `js/main.js`: punto de entrada. Crea instancias de `home`, `jimbo` y `roulette`, sincroniza vistas, toasts y navegación (`showScreen`).
- `js/home.js`: renderiza tarjetas de jugadores, modal de alta y de transferencias, modo ajustes (añadir/eliminar) y animaciones de dinero.
- `js/jimbo.js`: interfaz del combate por turnos, preparación de tres ataques, cambios que consumen turno, intención enemiga visible y resumen de XP/dinero/desbloqueos. Usa `homeActions` para refrescar Inicio.
- `js/jimbo-combat.js`: motor sin DOM. Seis ataques desbloqueados entre niveles 1–4, fatiga por repetir, descansos y rivales normales/élite. El jugador gana ventaja sobre los rivales normales con el nivel; los élites conservan mayor dificultad. La mejora se suaviza después del nivel 4. `css/jimbo.css` contiene los ajustes visuales del rework.
- `js/roulette.js`: lógica de la ruleta; valida apuestas, ejecuta animación, aplica ganancias/pérdidas y vuelve a Inicio.
- `js/state.js`: define `state`, helpers CRUD y persistencia (`saveState`, `addPlayer`, `updatePlayerMoney`, etc.). `STORAGE_KEY = baba-poly-state-v1`.
- `js/utils.js`: utilidades compartidas (`formatMoney`, `randomBetween`).
- `css/baba-poly.css`, `css/navbar.css`, `animacion-dinero.css`: estilos principales, navegación y efectos de transferencia; revisar antes de añadir nuevos estilos.
- `css/theme.css`: tema oscuro fijo carbón/lima, Inicio, ajustes y modales. Se carga tras los estilos base; no depende del tema del sistema. `css/roulette-theme.css` adapta mesa y controles de ruleta, conservando intactos el banner, el fuego y el logo originales.
- Inicio conserva las tarjetas originales y muestra el logo ampliado, sin títulos introductorios. La navegación inferior utiliza solo iconos, con etiquetas accesibles y acceso por teclado.
- El modal de jugadores iguala la altura del catálogo y el formulario en escritorio. Hasta 700 px, el catálogo es un desplegable cerrado inicialmente, con lista desplazable al abrirlo.
- La ruleta muestra una notificación de resultado neto (premios menos apuesta total), también en pérdidas parciales y empate. El resultado permanece debajo de la mesa hasta la siguiente apuesta.
- `lab/joji-sebo-rana/`: app estática separada con ranking dual de canciones de Joji; usa sus propios `index.html`, `styles.css` y `app.js` y guarda estado en `localStorage` con una clave independiente.
- `lab/joji-sebo-rana/run-local-server.bat`: lanzador local para abrir esta microapp con `python -m http.server 5173` en Windows.

## Persistencia y estado
- `state` es un objeto mutable exportado; cualquier cambio debe invocar `saveState()` para sincronizar con `localStorage`.
- IDs de jugadores se generan con `crypto.randomUUID()`. La mascota conserva `{ level, xp, moves }`: `moves` son tres IDs de ataques equipados, normalizados con `getLoadout` al cargar partidas antiguas.
- Jimbo usa `getPetXpGoal` y `gainPetXp`: +4 XP por victoria, +2 por derrota; conserva XP sobrante y da 80 × nuevo nivel de bonus por cada subida. La victoria paga 100 + 60 × nivel inicial del combate. La derrota aporta al bote hasta 50 + 15 × nivel, sin dejar saldo negativo.
- `home.render()` vuelve a dibujar las tarjetas; útil tras mutar el estado fuera de `home.js`.

## Flujo de pantallas
- `showScreen(screenId)` alterna clases `.active` en secciones y mantiene la navegación inferior sincronizada.
- Al entrar en `jimbo` se prepara el selector (`renderPlayerSelector`) y se limpia cualquier batalla activa.
- Al salir de Jimbo o pulsar Escape se cancelan los turnos pendientes. El resultado se guarda una sola vez al terminar y permanece visible hasta elegir Inicio u otro jugador. Preparar ataques antes de combatir es gratis; confirmar un cambio durante la pelea consume el turno y mantiene los descansos.
- `roulette.resetWheel()` se ejecuta al aterrizar en la ruleta para quitar animaciones previas.
- Usa `home.showMoneyAnimation(playerId, delta)` para feedback visual de transferencias o recompensas.

## Convenciones de código
- Mantén la separación por módulos: `home` para gestión de jugadores, `state` como fuente de verdad, minijuegos encapsulados.
- Evita manipular el DOM fuera de los módulos encargados; añade nuevos elementos mediante plantillas cuando sea posible.
- Los mensajes al usuario pasan por `showToast`. Añade helpers similares si necesitas feedback consistente.
- El panel de Jimbo renderiza chips tacticos, historial corto y botones estilo Game Boy dentro del propio modulo; manten esa logica encapsulada en `jimbo`.

## Desarrollo y verificación
- Ejecuta con cualquier servidor estático: `python -m http.server 5173` (o similar) desde la raíz y abre `http://localhost:5173/index.html`.
- Pruebas manuales recomendadas tras cambios:
  1. Crear/editar/eliminar jugadores y confirmar persistencia tras recargar.
  2. Transferir dinero entre dos tarjetas y validar animaciones/toasts.
  3. Jugar una batalla Jimbo (victoria y derrota) y revisar niveles/XP.
  4. Apostar en la ruleta con acierto y fallo para verificar saldos y toasts.
- Para verificar las reglas de Jimbo y su progresión: `node --test tests/jimbo-combat.test.mjs`; balance reproducible: `node tests/jimbo-balance.mjs`.
- Si introduces nuevo estado, asegura serialización JSON y compatibilidad con sesiones existentes (`loadState` debe manejar datos previos).

Mantén este archivo actualizado cuando cambie el flujo principal o se añadan módulos relevantes.
