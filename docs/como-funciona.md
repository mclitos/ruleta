# Cómo funciona el sorteo

La idea central: **el ganador se elige antes de animar, y la animación sólo lo
revela**. Nunca se decide al frenar, así que lo que se ve y lo que se registra no
pueden discrepar.

## Nueva rifa

Después de un sorteo, cambiá la lista en **Configurar sorteo** y guardá. La ruleta
vuelve a *Listo para sortear* con la lista nueva, también en la ventana de stream, y
el ganador anterior queda sólo en el historial. Si guardás sin cambiar la lista, el
resultado sigue en pantalla.

## Camino rápido

1. Se sortea el índice del ganador con azar criptográfico.
2. Se arma una tira larga de nombres donde ese ganador cae siempre tres filas antes
   del final.
3. El reel se desplaza hasta esa posición con un easing de frenada.
4. Al terminar la animación se registra el ganador (una sola vez), se actualiza el
   historial y suena la fanfarria.

## 1. Elegir el ganador

`secureRandomIndex(max)` en `src/lib/utils.js`:

- Usa `crypto.getRandomValues` sobre un `Uint32Array`.
- Aplica **rechazo de muestras**: descarta valores por encima del mayor múltiplo de
  `max` que entra en 2³². Sin eso, un `módulo` simple favorece a los primeros
  índices cuando `max` no divide a 2³².
- Si el entorno no expone `crypto`, cae a `Math.random` para no romper la app.

`Math.random` sí se usa para la **duración** del giro, que no necesita ser justa.

## 2. Armar la tira

Con `n` participantes y el ganador en `winnerIndex`:

| Paso | Fórmula | Para qué |
| --- | --- | --- |
| Bloques de la lista | `min(60, max(3, ceil(60 / n)))` | Que haya suficientes vueltas aunque haya pocos nombres |
| Filas totales | `min(140, max(5, bloques * n + 2))` | Tope de trabajo para el DOM |
| Fila objetivo | `total - 3` | El ganador aterriza cerca del final |
| Nombre de la fila `i` | `lista[(base + i) % n]` con `base = (winnerIndex - filaObjetivo) mod n` | Tira cíclica continua |

El reel no necesita saber el índice ganador: sólo hay que desplazar la tira hasta
que la fila objetivo quede centrada. Con 5 filas visibles, la fila del medio es
siempre la tres antes del final.

## 3. Animar

`Reel` (`src/components/Reel.jsx`) usa Framer Motion:

- Anima `y` desde 0 hasta `-targetRow * step`, donde `step` es alto de barra + gap.
- Easing `[0.09, 0.72, 0.05, 1]`: arranque rápido y frenada larga.
- Duración = el valor sorteado por `randomSpinDuration(min, max)`, en segundos.
- El desenfoque no es un valor fijo: sale de la **velocidad** real de `y`
  (`useVelocity`), mapeada a 0–3 px de blur. Por eso el texto se ve nítido al
  frenar.
- La barra ganadora recibe filo dorado recién cuando `revealed` es verdadero.

## 4. Cerrar la ronda

`useRaffle` mantiene la máquina `idle → spinning → revealed`:

| Guarda | Para qué |
| --- | --- |
| `lockedRef` | Evita dos giros simultáneos |
| `round.id` (contador) | Un mismo giro no se completa dos veces |
| `completedRef` | Idempotencia del cierre |

Al completarse:

1. Se marca el giro como completado y se libera el lock.
2. Se agrega el ganador al historial con `Date.now()`, se le da un `id` propio y se
   persiste en `localStorage` (tope de 500, más reciente primero).
3. Si **quitar ganador** está activo, se filtra la lista por índice.
4. Se dispara la fanfarria y el confeti.

El cierre puede venir de la pestaña de control **o** de la ventana del stream: si el
control está minimizado y su animación no corre, el stream termina la ronda y manda
`round-complete`, y el control registra igual. El `round.id` evita duplicados.

## Duración configurable

| Pieza | Valor |
| --- | --- |
| Default | 3–5 s |
| Límites de la UI | 1–15 s, paso 0,5 s |
| `randomSpinDuration(min, max)` | `min + Math.random() * (max - min)`, con los extremos ordenados antes |
| Saneado al leer | `snapSpin` a múltiplos de 0,5 y `max = max(min, max)` |
| `prefers-reduced-motion` | 1,4 s fijos, sin importar el rango |

## Por qué la barra del medio y el estado no pueden discrepar

Los dos leen la misma `targetRow` de la misma ronda. El estado (`Ganador` +
nombre) no dispara su propio temporizador: espera la fase `revealed`, que sólo
cambia cuando la animación avisa.
