# Documentación

Índice de las guías del proyecto. El [README](../README.md) cuenta qué hace y cómo
levantarlo; acá está el detalle.

| Guía | Cuándo leerla |
| --- | --- |
| [uso.md](uso.md) | Vas a configurar un sorteo real y querés saber qué hace cada ajuste |
| [modo-stream.md](modo-stream.md) | Vas a transmitir o mostrar la ruleta en otra pantalla |
| [como-funciona.md](como-funciona.md) | Querés entender el sorteo, la tira y el cierre de la ronda |
| [arquitectura.md](arquitectura.md) | Vas a tocar el código y necesitás el mapa |
| [desarrollo.md](desarrollo.md) | Vas a buildear, deployar o verificar un cambio |

Pendientes y deuda conocida: [BACKLOG.md](../BACKLOG.md).

## En una frase

React 19 + Vite 8 + Tailwind 4, sin backend: el estado vive en `localStorage`, el
stream se sincroniza por `BroadcastChannel` y Nginx sirve el build estático.
