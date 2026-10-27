# Backlog

Pendientes acordados, ordenados por riesgo real. No son urgentes: la app funciona.

## 1. Persistir el historial de ganadores

Hoy `winners` vive en memoria (`useRaffle`) y se pierde al recargar — el propio UI lo
avisa. El problema es la combinación con `autoRemove`, que **sí** persiste: después de
un reload los nombres ya no están en la lista, pero no queda registro de quiénes
ganaron, así que no se puede retomar un sorteo al día siguiente.

- Guardar `winners` en `localStorage` (clave propia, p. ej. `ruleta-rifas:winners:v1`).
- Mantener el botón "borrar historial" existente como forma de limpiarlo.
- Sanea al leer: ids numéricos, nombres string no vacíos, tope de entradas.

## 2. `git init` + commits

No hay repositorio: cualquier cambio se despliega sin red de seguridad. Crear el repo,
un commit inicial y después commits por unidad de trabajo (código + docs juntos).

## 3. Tests mínimos de lógica pura

Sin dependencias, con `node:test` sobre `src/lib/*`:

- `sanitizeSettings`: rangos de duración (clamp, `max >= min`), `snapSpin`, logo
  (`logoData` inválido, tope de tamaño).
- `randomSpinDuration(min, max)`: siempre dentro del rango, también con `min === max`
  y con argumentos invertidos.
- `secureRandomIndex`: valores dentro de `[0, n)` y sin sesgo evidente con `n` no
  potencia de dos.

El bug del stream reescribiendo `localStorage` lo hubiera cazado un test de saneado.

## 4. Export / Import de configuración (JSON)

Todo vive en el `localStorage` de un perfil de navegador. Al cambiar de máquina, de
perfil o al limpiar datos se pierde logo (`data:` URL), paleta, participantes y
ajustes. Un export/import JSON evita rehacerlo a mano.

## 5. Ruleta en 3D (idea, para más adelante)

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
