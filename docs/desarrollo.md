# Desarrollo

Guía para buildear, deployar y verificar cambios. La app no tiene backend ni base de
datos: el único artefacto es `dist/`.

## Requisitos

| Herramienta | Versión | Para qué |
| --- | --- | --- |
| Node | 20.19+ o 22.12+ | Lo que pide Vite 8 |
| npm | El del Node instalado | Dependencias y scripts |
| Docker + Compose | Opcional | Build y deploy como contenedor |

## Scripts

```bash
npm install
npm run dev       # http://localhost:5173 (host expuesto en la red local)
npm run build     # genera dist/
npm run preview   # sirve dist/ localmente
```

No hay script de test ni de lint. La verificación es manual y está descrita abajo;
los tests automatizados están en [BACKLOG.md](../BACKLOG.md).

## Docker

```bash
docker compose up -d --build
# http://localhost:8125
```

O sin Compose:

```bash
docker build -t ruleta-de-rifas .
docker run --rm -p 8125:80 ruleta-de-rifas
```

La imagen es multi-etapa:

| Etapa | Imagen | Qué hace |
| --- | --- | --- |
| build | `node:24-alpine` | `npm ci` y `npm run build` |
| runtime | `nginx:1.27-alpine` | Sirve `dist/` con `nginx.conf` |

Tiene healthcheck cada 30 s contra `GET /healthz`, así que `docker compose ps` debe
mostrar `healthy`. El contenedor se llama `ruleta-de-rifas` y publica `8125:80`.

Cambiar sólo documentación no requiere rebuild; cambiar `src/` sí.

## Verificación de un cambio

Checklist mínima antes de dar algo por terminado:

- [ ] `npm run build` sin errores ni warnings nuevos.
- [ ] `docker compose up -d --build` y `docker compose ps` en `healthy`.
- [ ] Un giro completo revela un ganador y lo registra **una sola vez**.
- [ ] La configuración sobrevive a recargar.
- [ ] Si tocaste el modo stream: la ventana sigue a la pestaña de control y no
      reescribe `localStorage`.

### Verificación con navegador

Con Playwright (o el navegador a mano) se puede comprobar mucho sin mirar a ojo:

| Qué | Cómo |
| --- | --- |
| Rango de duración | Abrir un `BroadcastChannel('ruleta-stream:v1')` en la página y leer `duration` del mensaje `round` |
| Stream sincronizado | Girar en la pestaña de control y ver el mismo ganador en `?view=stream` |
| Fondo croma | Leer el color de `html` o `body`: `rgb(0, 177, 64)` con `bg=green`, `rgba(0, 0, 0, 0)` con `bg=transparent` |
| Persistencia | Leer `ruleta-rifas:settings:v1` antes y después de guardar |
| Logo oculto | Buscar `span[style*="box-shadow"]` en la fila del logo; con `aria-hidden` te comés el contenedor del reel |

## Gotchas

- **`autoRemove` activo borra participantes en cada giro de prueba.** Desactivalo
  antes de probar y restaurá la lista al terminar.
- **El historial no persiste.** Si necesitás el registro de una sesión, copialo antes
  de recargar.
- **`navigator.clipboard` no existe en HTTP plano.** Por eso `copyText()` cae a un
  `textarea` + `document.execCommand('copy')` en accesos por IP de LAN.
- **Las dos ventanas del stream comparten perfil de navegador.** Otra máquina u otro
  navegador no ven el canal.
- **La fuente de navegador de OBS no sirve** para sincronizar: usá captura de ventana.
- **No edites `dist/` a mano.** Se regenera en cada build y en la imagen Docker.
- **El tema se aplica antes del paint** desde `index.html`; si agregás tokens de tema,
  revisá ese script inline además de `useTheme`.

## Deploy

No hay CI ni pipeline: el deploy es el build local más `docker compose up -d
--build` en la máquina destino. Si el puerto 8125 está ocupado, cambiá el mapeo en
`docker-compose.yml`.
