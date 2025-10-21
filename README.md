# Baba Poly

Aplicación web single-page para gestionar jugadores y minijuegos de una versión modificada del popular juego Monopoly. Permite administrar una plantilla de participantes, transferir dinero entre ellos y disputar dos minijuegos: **Jimbo**, una batalla por turnos estilo RPG, y **Ruleta**, un giro clásico con apuestas numéricas.

## Características principales

- **Gestión de jugadores**: crear, eliminar y mostrar saldo en tarjetas interactivas. El modo ajustes habilita edición y añade un modal para crear nuevos jugadores con control de dinero inicial.
- **Transferencias dinámicas**: seleccionar dos jugadores muestra un modal para mover monedas; las tarjetas animan las ganancias/pérdidas directamente sobre el botón.
- **Jimbo Arena**: combates por turnos donde la mascota de cada jugador sube de nivel, desbloquea ataques y recibe recompensas o penalizaciones de dinero.
- **Ruleta Baba**: apuesta por jugador y número (0-36). El giro animado devuelve ganancias multiplicadas o resta la apuesta.
- **Persistencia local**: el estado se guarda en `localStorage`, manteniendo jugadores y progresión entre sesiones.
- **Diseño responsive**: layout centrado con tarjetas, animaciones y ajustes para pantallas medianas/pequeñas.

## Estructura del proyecto

```
.
├── README.md
├── baba-poly.html        # Entrada principal (estructura HTML + carga de módulos)
├── css/
│   └── baba-poly.css     # Estilos globales y componentes
└── js/
    ├── main.js           # Punto de entrada: navegación, toasts y coordinación de módulos
    ├── home.js           # Render de jugadores, transferencias, animaciones y ajustes
    ├── jimbo.js          # Lógica del minijuego Jimbo (combates por turnos)
    ├── roulette.js       # Lógica del minijuego Ruleta
    ├── state.js          # Gestión de estado y persistencia
    └── utils.js          # Utilidades compartidas (formatos, aleatorios)
```

## Flujo de uso

1. **Inicio**: ver jugadores, activar ajustes para añadir o eliminar. Pulsar dos tarjetas para transferir dinero.
2. **Jimbo**: seleccionar jugador, combatir contra enemigos generados según nivel; volverá a Inicio mostrando la animación de dinero.
3. **Ruleta**: escoger jugador, apuesta y número; tras el giro se vuelve a Inicio con el resultado.

## Backend ligero para el avatar IA

La clave de Google Gemini **no** debe vivir en el frontend. Para mantener GitHub Pages y proteger el secreto puedes desplegar un Worker (por ejemplo en Cloudflare). En este repositorio encontrarás un ejemplo en `server/cloudflare-edit-avatar.js`.

### Pasos recomendados

1. **Crear el Worker**
   ```bash
   npm create cloudflare@latest
   # copia server/cloudflare-edit-avatar.js como src/index.js del worker
   ```
2. **Configurar secretos**
   ```bash
   npx wrangler secret put GOOGLE_AI_KEY
   # pega tu key de AI Studio cuando lo pida
   ```
3. **Desplegar**
   ```bash
   npx wrangler deploy
   ```
   La salida mostrará la URL pública del Worker (p. ej. `https://baba-poly-worker.example.workers.dev/api/edit-avatar`).
4. **Apuntar el frontend al Worker**
   En tu `index.html` define la URL antes de cargar los scripts:
   ```html
   <script>
     window.BABA_POLY_AVATAR_ENDPOINT = "https://tu-worker.workers.dev/api/edit-avatar";
   </script>
   ```

### Consideraciones

- GitHub Pages sólo sirve archivos estáticos; necesitas un servicio aparte (Cloudflare Workers, Vercel, Netlify Functions, etc.) para ejecutar el backend.
- El Worker expone CORS abierto (`Access-Control-Allow-Origin: *`). Ajusta la cabecera si quieres restringirlo a tu dominio.
- Si el backend no responde, el frontend usará la imagen original sin estilizar.
- Puedes reutilizar el mismo patrón en otros proveedores: basta con reenviar `{ image, mimeType }` a la API de Google utilizando la clave almacenada como variable de entorno.
