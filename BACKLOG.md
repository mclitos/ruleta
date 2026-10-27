# Backlog

Pendientes acordados, ordenados por riesgo real. No son urgentes: la app funciona.

Hecho: historial de ganadores persistido en `localStorage`
(`ruleta-rifas:winners:v1`, tope de 500) y repo publicado en
https://github.com/mclitos/ruleta.

## 1. Tests mínimos de lógica pura

Sin dependencias, con `node:test` sobre `src/lib/*`:

- `sanitizeSettings`: rangos de duración (clamp, `max >= min`), `snapSpin`, logo
  (`logoData` inválido, tope de tamaño).
- `randomSpinDuration(min, max)`: siempre dentro del rango, también con `min === max`
  y con argumentos invertidos.
- `secureRandomIndex`: valores dentro de `[0, n)` y sin sesgo evidente con `n` no
  potencia de dos.
- `sanitizeWinners`: descarta basura, colapsa espacios, deduplica `id` y recorta al
  tope de 500.

El bug del stream reescribiendo `localStorage` lo hubiera cazado un test de saneado.

## 2. Export / Import de configuración (JSON)

Todo vive en el `localStorage` de un perfil de navegador. Al cambiar de máquina, de
perfil o al limpiar datos se pierde logo (`data:` URL), paleta, participantes y
ajustes. Un export/import JSON evita rehacerlo a mano.

## 3. Ruleta en 3D (idea, para más adelante)

Reemplazo/alternativa visual del reel vertical por una rueda que gira en perspectiva.

Notas para cuando se retome:

- Es **otro modelo visual**, no un retoque del actual: `Reel` es una tira que
  traslada verticalmente y aterriza una fila; una rueda 3D es un disco que rota y
  aterriza un sector. Comparten estado y azar, no geometría.
- Camino más barato: CSS 3D (`perspective` + `rotateX` del contenedor, `rotate` del
  disco) — sin dependencias nuevas.
- Camino más flexible: WebGL (`three.js`) — más control de luces/sectores, suma
  bundle y complejidad de render.
- Cualquiera de los dos debe conservar: ganador elegido con `crypto.getRandomValues`,
  `duration` aleatorio dentro del rango configurado, aviso `round`/`result` al stream
  y `prefers-reduced-motion`.
- Los colores por sector ya existen (`palette`), así que la rueda puede reusar la
  misma fuente de color.
