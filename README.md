# Baba Poly

Aplicación web single-page para gestionar jugadores y minijuegos inspirados en un tablero clásico. Permite administrar una plantilla de participantes, transferir dinero entre ellos y disputar dos minijuegos: **Jimbo**, una batalla por turnos estilo RPG, y **Ruleta**, un giro clásico con apuestas numéricas.

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

