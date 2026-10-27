# Modo stream

Una ventana mínima que muestra la ruleta sin header, botones ni historial, para un
segundo monitor o para grabar la transmisión.

## Puesta en marcha

1. En la pestaña de control, abrí **Modo stream** (icono de monitor en el header).
2. Elegí el fondo y tocá **Abrir en ventana**. También podés copiar el enlace y
   abrirlo donde quieras.
3. Girá desde la pestaña de control: la ventana del stream gira con vos y revela el
   mismo ganador.

Para abrirla como aplicación aparte, sin barra de navegador:

```bash
chrome --app="http://localhost:8125/?view=stream"
```

## Parámetros de la URL

| URL | Fondo |
| --- | --- |
| `?view=stream` | El del tema, con textura |
| `?view=stream&bg=transparent` | Sin fondo, para superponer en un overlay |
| `?view=stream&bg=green` | Plano `#00B140`, el verde clásico de croma |

El diálogo construye el enlace con el fondo elegido, así que no hace falta escribirlo
a mano. Cualquier otro valor de `bg` cae en el fondo del tema.

## Cómo se sincroniza

`BroadcastChannel` con el nombre `ruleta-stream:v1`. La pestaña de control manda y
la ventana del stream refleja; no hay servidor ni WebSocket.

| Mensaje | Cuándo | Para qué |
| --- | --- | --- |
| `ready` | La ventana de stream se conecta | Que el control sepa que hay un stream escuchando |
| `state` | Cambia la configuración | Propagar tema, paleta, título, logo y lista en vivo |
| `round` | Arranca un giro | Pasar la tira armada y la `duration` sorteada |
| `result` | El stream revela | Compartir el ganador ya revelado |
| `reset` | Se guarda una lista de participantes distinta | Volver al reel quieto y soltar al ganador anterior |
| `round-complete` | El stream termina la animación | Registrar la ronda cuando el control no animó |
| `heartbeat` | Cada 2 s | Detectar que la ventana sigue viva |

Si no llega heartbeat en 6 s, la ventana se considera desconectada y el diálogo lo
muestra.

## Reglas que conviene saber

- **Mismo navegador y mismo perfil.** La fuente de navegador de OBS corre en otro
  navegador, así que no participa del canal. Ver [OBS](#obs).
- **El ganador se registra una sola vez.** Si la pestaña de control está minimizada y
  su reel no anima, la ventana del stream cierra la ronda y avisa.
- **Enganche en caliente**: abrir la ventana a mitad de un giro la suma a ese giro; si
  el ganador ya está revelado, muestra ese ganador.
- **Nueva rifa**: al guardar una lista de participantes distinta, el control cierra
  la ronda y manda `reset`. Las dos ventanas vuelven a *Listo para sortear* con la
  lista nueva y el historial queda intacto. Guardar sin cambiar la lista no toca el
  ganador en pantalla.
- **Arranca con los ajustes guardados**, no con los defaults. Esto importa en OBS,
  donde la ventana suele abrir antes que la pestaña de control.
- La ventana del stream **lee** los ajustes pero **nunca los escribe**. Si escribiera,
  una copia vieja podría pisar la configuración guardada.
- Sonidos y confeti salen por la ventana del stream; la pestaña de control queda en
  silencio mientras hay un stream conectado.

## Diferencias visuales con la pestaña de control

| Detalle | Control | Stream |
| --- | --- | --- |
| Filas visibles del reel | 3 | 5 |
| Alto de barra | 90 px | 62 px |
| Tipografía de nombres | Más grande | Compacta |
| Estado del sorteo | Bloque arriba del reel | El mismo bloque, misma altura reservada |

El estado («Listo para sortear», «Que gire la suerte», el nombre del ganador) vive
**arriba** del reel, con la altura reservada desde el inicio: el reel no salta al
revelar y no hay texto debajo.

## OBS

- Usá **Captura de ventana** sobre la ventana del stream.
- La **fuente de navegador** de OBS no comparte la sesión del navegador y no puede
  hablar por `BroadcastChannel`; usarla dejaría la ruleta sin sincronizar.
- Para recortar el fondo con clave de color, elegí **Croma verde** (`#00B140`) y
  aplicá el filtro de chroma key de OBS. Con **Transparente** podés superponer la
  ventana en un overlay.
- Si preferís no capturar una ventana con bordes, abrila con `chrome --app=…`.

## Límites conocidos

- No hay relay por backend: la sincronización es dentro del mismo navegador. Para
  transmitir desde otra máquina haría falta un canal servidor (SSE/WebSocket), que
  hoy no existe por decisión de diseño.
- El fondo transparente depende del compositor del sistema: en OBS conviene el croma.
