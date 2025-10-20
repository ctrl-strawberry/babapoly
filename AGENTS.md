# Guía del agente Codex: Baba Poly

## Contexto rápido
- SPA en vanilla JS para gestionar jugadores y minijuegos de una versión custom de Monopoly.
- No hay bundler ni dependencias externas; basta con servir archivos estáticos (`index.html`, `css/`, `js/` y `assets/`).
- Persistencia local mediante `localStorage`; el estado vive en memoria mientras dura la sesión.

## Arquitectura y archivos clave
- `index.html`: estructura principal, tres secciones (`inicio`, `jimbo`, `ruleta`), plantillas reutilizables y navegación inferior; carga `js/main.js` como módulo ES.
- `js/main.js`: punto de entrada. Crea instancias de `home`, `jimbo` y `roulette`, sincroniza vistas, toasts y navegación (`showScreen`).
- `js/home.js`: renderiza tarjetas de jugadores, modal de alta y de transferencias, modo ajustes (añadir/eliminar) y animaciones de dinero.
- `js/jimbo.js`: minijuego de batallas por turnos; calcula daño, XP y recompensas/penalizaciones. Usa `homeActions` para refrescar la vista al volver a Inicio.
- `js/roulette.js`: lógica de la ruleta; valida apuestas, ejecuta animación, aplica ganancias/pérdidas y vuelve a Inicio.
- `js/state.js`: define `state`, helpers CRUD y persistencia (`saveState`, `addPlayer`, `updatePlayerMoney`, etc.). `STORAGE_KEY = baba-poly-state-v1`.
- `js/utils.js`: utilidades compartidas (`formatMoney`, `randomBetween`).
- `css/baba-poly.css`, `css/navbar.css`, `animacion-dinero.css`: estilos principales, navegación y efectos de transferencia; revisar antes de añadir nuevos estilos.

## Persistencia y estado
- `state` es un objeto mutable exportado; cualquier cambio debe invocar `saveState()` para sincronizar con `localStorage`.
- IDs de jugadores se generan con `crypto.randomUUID()`. Mantén la estructura `{ id, name, money, pet: { level, xp } }`.
- `home.render()` vuelve a dibujar las tarjetas; útil tras mutar el estado fuera de `home.js`.

## Flujo de pantallas
- `showScreen(screenId)` alterna clases `.active` en secciones y mantiene la navegación inferior sincronizada.
- Al entrar en `jimbo` se prepara el selector (`renderPlayerSelector`) y se limpia cualquier batalla activa.
- `roulette.resetWheel()` se ejecuta al aterrizar en la ruleta para quitar animaciones previas.
- Usa `home.showMoneyAnimation(playerId, delta)` para feedback visual de transferencias o recompensas.

## Convenciones de código
- Mantén la separación por módulos: `home` para gestión de jugadores, `state` como fuente de verdad, minijuegos encapsulados.
- Evita manipular el DOM fuera de los módulos encargados; añade nuevos elementos mediante plantillas cuando sea posible.
- Los mensajes al usuario pasan por `showToast`. Añade helpers similares si necesitas feedback consistente.
- Los logs de batalla (`appendLog`) actualmente no renderizan historial; si implementas un visor, mantenlo dentro de `jimbo`.

## Desarrollo y verificación
- Ejecuta con cualquier servidor estático: `python -m http.server 5173` (o similar) desde la raíz y abre `http://localhost:5173/index.html`.
- Pruebas manuales recomendadas tras cambios:
  1. Crear/editar/eliminar jugadores y confirmar persistencia tras recargar.
  2. Transferir dinero entre dos tarjetas y validar animaciones/toasts.
  3. Jugar una batalla Jimbo (victoria y derrota) y revisar niveles/XP.
  4. Apostar en la ruleta con acierto y fallo para verificar saldos y toasts.
- Si introduces nuevo estado, asegura serialización JSON y compatibilidad con sesiones existentes (`loadState` debe manejar datos previos).

Mantén este archivo actualizado cuando cambie el flujo principal o se añadan módulos relevantes.
