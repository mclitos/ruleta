# AGENTS.md

Ruleta de rifas: app React de una sola página, sin backend. El estado de
configuración vive en `localStorage` y la ventana de stream se sincroniza con la
pestaña de control por `BroadcastChannel`. Documentación para humanos en
[README.md](README.md) y [docs/](docs/README.md).

## Comandos

| Comando | Para qué |
| --- | --- |
| `npm install` | Dependencias (Node 20.19+ o 22.12+, por Vite 8) |
| `npm run dev` | Desarrollo en `http://localhost:5173`, expuesto en la red local |
| `npm run build` | Genera `dist/` |
| `npm run preview` | Sirve `dist/` localmente |
| `npm test` | Tests de lógica pura en `src/lib/*.test.js` (`node:test`, sin dependencias) |
| `npm run test:e2e` | Playwright sobre la build: giro, stream, `autoRemove`, recarga |
| `npm run test:all` | Unitarios y e2e juntos |
| `docker compose up -d --build` | Deploy en `http://localhost:8125`, contenedor `ruleta-de-rifas` |

No hay lint ni CI. Hay dos capas de tests: `npm test` cubre lógica pura de
`src/lib` con `node:test` (sin dependencias) y `npm run test:e2e` cubre lo que
necesita navegador con Playwright. No agregues otra cosa de testing (ni Vitest, ni
Testing Library, ni Jest) sin que te lo pidan: entre las dos capas ya está
cubierto y `@playwright/test` es la única dependencia de desarrollo que no esbuild.

## Verificación

Después de tocar `src/`:

1. `npm test` en verde (si tocaste `src/lib`).
2. `npm run test:e2e` en verde (si tocaste `src/`, `index.html` o el flujo del giro).
   Compila y sirve la build en el puerto 4173 por su cuenta; la primera vez
   necesita `npx playwright install chromium`.
3. `npm run build` sin errores ni warnings nuevos.
4. `docker compose up -d --build`, y `docker compose ps` en `healthy`.
5. Un giro completo revela un ganador y lo registra **una sola vez**.
6. La configuración y el historial sobreviven a recargar.

Cambiar sólo `*.md` no requiere rebuild.

Para comprobar cosas que no se ven a ojo, desde la consola del navegador:

```js
// Duración realmente sorteada de cada giro
const ch = new BroadcastChannel('ruleta-stream:v1');
ch.addEventListener('message', (e) => e.data.type === 'round' && console.log(e.data.duration));

// Configuración persistida
JSON.parse(localStorage.getItem('ruleta-rifas:settings:v1'));

// Historial persistido (array, más reciente primero)
JSON.parse(localStorage.getItem('ruleta-rifas:winners:v1'));
```

El contenedor sirve `GET /healthz` para el healthcheck. Con Playwright podés abrir
`?view=stream`, girar en la pestaña de control y confirmar que revela el mismo
ganador.

## Mapa del código

| Archivo | Rol |
| --- | --- |
| `src/App.jsx` | Estado global, atajos de teclado, layout y canal |
| `src/StreamView.jsx` | Ventana de stream, sólo lectura |
| `src/hooks/useRaffle.js` | Máquina `idle → spinning → revealed`, historial, `autoRemove` |
| `src/components/Reel.jsx` | Tira animada y barra del medio |
| `src/components/SetupModal.jsx` | Configuración completa |
| `src/lib/settings.js` | Defaults, límites, `sanitizeSettings`, `loadStoredSettings` |
| `src/lib/history.js` | Clave y tope del historial, `sanitizeWinners`, `prependWinner` |
| `src/hooks/useLocalStorage.js` | Persistencia genérica con saneado al leer |
| `src/lib/stream.js` | Canal, constantes y URL del modo stream |
| `e2e/*.spec.js` | Playwright: giro, idempotencia, `autoRemove`, stream, `prefers-reduced-motion` |
| `src/lib/utils.js` | `secureRandomIndex`, color, contraste, portapapeles |

Detalle en [docs/arquitectura.md](docs/arquitectura.md) y
[docs/como-funciona.md](docs/como-funciona.md).

## Reglas que no se negocian

- **El ganador se elige antes de animar.** Usa `secureRandomIndex` (crypto con
  rechazo de muestras). `Math.random` sólo se acepta para duración, sonido y
  posiciones decorativas. Nunca decidas el ganador al frenar.
- **La animación no registra nada por su cuenta.** El cierre pasa por
  `completeSpin`, es idempotente por `round.id` y puede venir del control o del
  stream, nunca de los dos.
- **`StreamView` no escribe `localStorage`.** Lee con `loadStoredSettings`. Si le
  agregás persistencia, rompés la configuración con una copia vieja del bundle.
- **Todo lo que sale de `localStorage` pasa por `sanitizeSettings`.** Rangos,
  booleanos, colores, logo y lista se recortan siempre al leer.
- **Sin backend.** Nada de fetch a servicios propios, ni WebSocket, ni variables de
  entorno. Si un pedido parece necesitar servidor, preguntá antes.
- **Guardar otra lista cierra la ronda.** Si cambian los participantes, el control
  vuelve a `idle`, suelta el lock y manda `reset` al stream; el historial no se toca
  y `resetRound()` nunca falla por una animación en curso. No resetees por
  `autoRemove`: el ganador tiene que quedar a la vista.
- **La duración del giro es siempre aleatoria dentro del rango.** Es una decisión
  del producto, no un default: no agregues un modo "tiempo exacto". El rango usa
  paso de 0,5 s entre 1 y 15 s y el saneado fuerza `spinMax >= spinMin`.

## Gotchas

- **`autoRemove` activo borra participantes en cada giro de prueba.** Desactivalo
  antes de probar y restaurá la lista. Es la causa número uno de "perdí mis datos".
- **El historial de ganadores sí se persiste** en `ruleta-rifas:winners:v1`, con tope
  de 500. El panel renderiza las últimas 80 (`VISIBLE_LIMIT`): 500 filas animadas
  hacen que cada inserción recalcule el layout de todas.
- **El `id` del historial es un UUID, no el `round.id`.** El contador de rondas
  arranca en 1 en cada carga, así que reusarlo choca con las entradas persistidas.
- **`navigator.clipboard` no existe en HTTP plano** (por ejemplo
  `http://192.168.x.x:8125`). `copyText` cae a un `textarea` + `execCommand`.
- **La fuente de navegador de OBS no comparte sesión** del navegador, así que no
  recibe `BroadcastChannel`. El modo stream se usa con captura de ventana.
- **El tema se aplica antes del paint** con un script inline en `index.html`. Si
  agregás tokens de tema, tocá ese script además de `useTheme`.
- **No edites `dist/`**: se regenera en cada build y en la imagen Docker.
- **Los sliders de duración se empujan entre sí** (`Math.max`/`Math.min` sobre el
  otro extremo). No los cambies a límites cruzados de `min`/`max`: encierran al
  usuario en un valor y no puede salir.

## Convenciones

- Conventional Commits. Sin `Co-Authored-By` ni atribución a herramientas.
- La documentación se escribe en español; identificadores, código y claves de
  `localStorage` en inglés.
- `skills/` y `dist/` están ignorados: `skills/` es un paquete ajeno (tiene su
  propio `AGENTS.md`) y no forma parte de la ruleta.
