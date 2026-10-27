# Ruleta de Rifas

Sorteo en vivo que corre entero en el navegador: girás un reel vertical estilo
tragamonedas, frena con inercia real, el nombre que queda en el centro gana y se
celebra con confeti y fanfarria. No hay backend: la configuración se guarda en
`localStorage` y el build es un sitio estático servido por Nginx en Docker.

Sirve para rifas en streaming o en una pantalla grande, con una **ventana de
stream** sin controles pensada para OBS o un segundo monitor.

## Camino rápido

1. Levantá la app: `docker compose up --build -d` → <http://localhost:8125>
2. **Configurar**: pegá los participantes, un nombre por línea, y guardá.
3. **Girar ruleta** (o barra espaciadora).
4. Verificá: el ganador queda en la fila del centro, aparece en el bloque de
   arriba y se suma al historial con su hora.

## Qué hace

| Área | Qué resuelve |
| --- | --- |
| Reel | Tira que se desplaza con desaceleración real, desenfoque según la velocidad y filo dorado en la fila ganadora |
| Sorteo | Ganador elegido con `crypto.getRandomValues` y rechazo de muestras; nada de `Math.random` en la selección |
| Duración | Rango configurable (1–15 s, pasos de 0,5 s); cada giro sortea un tiempo adentro |
| Ambientación | Tema claro/oscuro, paleta con presets (hasta 12 colores), sonidos sintetizados, confeti |
| Identidad | Título, frase y logo propio (URL o archivo local, con opción de ocultarlo) |
| Historial | Ganadores de la sesión con hora, copiables al portapapeles |
| Modo stream | Segunda ventana sincronizada, fondo normal, transparente o croma verde |
| Accesibilidad | Teclado, `aria-live` con el ganador y `prefers-reduced-motion` respetado |

## Documentación

| Guía | Para qué sirve |
| --- | --- |
| [docs/uso.md](docs/uso.md) | Configurar el sorteo, atajos, límites de cada ajuste y qué se guarda |
| [docs/modo-stream.md](docs/modo-stream.md) | Ventana de stream, fondos, OBS y limitaciones de la sincronización |
| [docs/como-funciona.md](docs/como-funciona.md) | Algoritmo del sorteo, armado de la tira y cierre de la ronda |
| [docs/arquitectura.md](docs/arquitectura.md) | Estructura del código, flujo de datos y decisiones de diseño |
| [docs/desarrollo.md](docs/desarrollo.md) | Requisitos, scripts, Docker y verificación de cambios |
| [BACKLOG.md](BACKLOG.md) | Pendientes acordados y la idea de ruleta 3D |

## Stack

| Pieza | Versión | Rol |
| --- | --- | --- |
| React | 19 | Interfaz y estado |
| Vite | 8 | Build y dev server |
| Tailwind | 4 | Estilos |
| Framer Motion | 14 | Animación del reel |
| canvas-confetti | 1.9 | Confeti del ganador |

Sin dependencias de servidor. Las fuentes (Archivo Black y Outfit variable) se
sirven desde el propio bundle, así que no hay pedidos a Google Fonts.

## Verificación de un cambio

- [ ] `npm run build` termina sin errores.
- [ ] `docker compose up -d --build` deja el contenedor `healthy`.
- [ ] En `http://localhost:8125` el giro revela un ganador y lo registra una sola vez.
- [ ] La configuración sobrevive a recargar la página.
- [ ] Si tocaste el modo stream, la ventana sigue a la pestaña de control.

## Siguiente paso

¿Primera vez en el código? Empezá por
[docs/arquitectura.md](docs/arquitectura.md) y después por
[docs/desarrollo.md](docs/desarrollo.md).
