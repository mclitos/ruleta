# Backlog

Pendientes acordados, ordenados por riesgo real. No son urgentes: la app funciona.

Hecho: historial de ganadores persistido en `localStorage`
(`ruleta-rifas:winners:v1`, tope de 500), tests de lógica pura con `node:test`
(`npm test`) y repo publicado en https://github.com/mclitos/ruleta.

## 1. Export / Import de configuración (JSON)

Todo vive en el `localStorage` de un perfil de navegador. Al cambiar de máquina, de
perfil o al limpiar datos se pierde logo (`data:` URL), paleta, participantes y
ajustes. Un export/import JSON evita rehacerlo a mano.

## 2. Ruleta en 3D (idea, para más adelante)

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
