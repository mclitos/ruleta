# Arquitectura

App estática de una sola página, sin backend. Todo el estado de configuración vive
en `localStorage`; el stream se sincroniza entre ventanas del mismo navegador por
`BroadcastChannel`.

## Camino rápido para ubicarse

1. `src/App.jsx` — orquesta: configuración, fase del sorteo, canal y layout.
2. `src/hooks/useRaffle.js` — la máquina de estados del sorteo.
3. `src/components/Reel.jsx` — la animación.
4. `src/lib/settings.js` — defaults, límites y saneado de la configuración.
5. `src/lib/stream.js` — contrato del canal y la URL del modo stream.

## Estructura

```text
src/
  App.jsx                  estado global, atajos de teclado, layout, canal
  StreamView.jsx           ventana mínima del modo stream (sólo lectura)
  main.jsx                 montaje y elección de vista por `?view=stream`
  index.css                Tailwind, tokens, fondos del stream
  components/
    Header.jsx             marca, logo, tema, sonido, accesos a modales
    Reel.jsx               tira animada, IdleStrip, barra del medio
    SpinControls.jsx       botón principal y acciones secundarias
    WinnersPanel.jsx       historial, contadores, copiar y borrar
    SetupModal.jsx         configuración completa (identidad, participantes, paleta, ambiente)
    StreamModal.jsx        enlace, fondo y bloque de OBS
    Background.jsx         orbes y grilla de fondo
    Logo.jsx               logo con fallback si la imagen falla
    ui.jsx                 Section, Switch, botones
    icons.jsx              iconos SVG inline
  hooks/
    useLocalStorage.js     persistencia + saneado al leer
    useRaffle.js           idle → spinning → revealed
    useSound.js            synth y agenda de ticks
    useTheme.js            clase `dark` + meta theme-color
  lib/
    settings.js            defaults, presets, límites, sanitize, loadStoredSettings
    stream.js              canal, constantes, URL y parámetros
    logo.js                archivo → data URL (raster y SVG)
    utils.js               azar, color, contraste, formato, portapapeles
    audio.js               sintetizador Web Audio
    celebrate.js           confeti
```

## Flujo de datos

```text
localStorage
    │  sanitizeSettings (al leer)
    ▼
App (settings)
    ├── SetupModal ──(Guardar)──► sanitizeSettings ──► App ──► useLocalStorage
    ├── useRaffle (lee participants, autoRemove, spinMin/spinMax)
    │        │ round + duration
    │        ▼
    │      Reel ──(onComplete)──► completeSpin ──► historial + autoRemove
    └── canal ──(state / round / result)──► StreamView (settings de sólo lectura)
```

## Persistencia

| Pieza | Detalle |
| --- | --- |
| Claves | `ruleta-rifas:settings:v1` y `ruleta-rifas:winners:v1` |
| Escritura | Sólo desde la pestaña de control (`useLocalStorage`) |
| Lectura | Control y stream (`loadStoredSettings`); el stream no escribe nada |
| Saneado | Siempre al leer: rangos, booleanos, colores, logo, lista, historial |
| Historial | Persistido, tope de 500 entradas, las más recientes primero |
| Render del historial | Ventana de 80 filas; `Copiar` exporta las 500 |

El historial usa una clave propia y no va dentro de `settings` por dos motivos:
guardar la configuración reescribe el objeto entero (borraría el historial), y cada
ganador es un registro con su propia vida, no un ajuste. El `id` de cada entrada es
un UUID y no el `round.id`, porque el contador de rondas arranca en 1 en cada carga
y las claves de React colisionarían con las entradas persistidas.

El tema se aplica **antes del primer paint** con un script inline en `index.html`:
lee la configuración guardada y setea la clase `dark` y `color-scheme`, así no hay
flash del tema equivocado.

## Decisiones

**Sin backend.** Es un sorteo: no hay datos compartidos que justifiquen un servidor,
y el build estático entra en cualquier hosting o Raspberry.

**Ganador antes de animar.** El sorteo se resuelve con azar criptográfico y la
animación sólo desplaza la tira hasta la fila objetivo. Evita la clase de bug donde
el nombre que se ve no es el que se registra.

**`BroadcastChannel` en vez de WebSocket.** Cero infraestructura y latencia mínima
entre ventanas del mismo navegador. El costo es que OBS con fuente de navegador no
participa: por eso el modo stream se usa con **captura de ventana** o `--app`.

**Logo como `data:` URL.** Permite subir un archivo sin backend, con la imagen
recortada a 512 px y un tope de 600.000 caracteres para no reventar el
`localStorage`.

**Stream de sólo lectura.** La ventana del stream lee la configuración pero no la
escribe. Antes la escribía y una copia vieja podía pisar campos recién agregados
(hundía, por ejemplo, el rango de duración). Leer sin escribir elimina esa clase de
bug.

**Reel como tira, no como rueda.** Se eligió una tira vertical porque aterriza un
nombre con precisión y se lee bien en 720p. La variante 3D está en el backlog como
otro modelo visual, no como ajuste del actual.

## Nginx (runtime)

| Regla | Motivo |
| --- | --- |
| `try_files … /index.html` | SPA: cualquier ruta vuelve al HTML |
| `expires 1y` en `/assets/` | Vite emite nombres con hash: cache inmutable |
| `expires -1` en `/` | El HTML no se cachea, así el deploy se ve al instante |
| `GET /healthz` | Healthcheck del contenedor |
| `X-Content-Type-Options`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, `Permissions-Policy` | Endurecimiento básico |
| gzip | Texto, CSS, JS, JSON y SVG |
