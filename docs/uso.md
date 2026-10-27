# Uso

Cómo dejar un sorteo listo y qué hace cada ajuste. Todo se configura desde la app
y queda guardado en este navegador.

## Camino rápido

1. **Configurar** (botón del header) → pestaña de identidad y participantes.
2. Pegá un nombre por línea en **Participantes**. El contador de al lado te dice
   cuántos entraron.
3. Ajustá lo que quieras y tocá **Guardar**: se aplica al instante.
4. **Girar ruleta** o barra espaciadora.
5. Si **Quitar ganador de la lista** está activo, ese nombre sale de la lista para
   el próximo giro.

## Atajos

| Tecla | Acción | Cuándo |
| --- | --- | --- |
| `Espacio` | Gira la ruleta | Salvo que el foco esté en un input, textarea, select, botón, link o campo editable |
| `Esc` | Cierra el panel de configuración o el diálogo de stream | Con cualquiera de los dos abierto |
| `Tab` / `Enter` | Navegación y activación nativa de controles | Siempre |

Hay un *skip link* («Saltar al sorteo») para saltar el header con teclado.

## Ajustes

### Identidad

| Ajuste | Límite | Nota |
| --- | --- | --- |
| Título | 80 caracteres | Si lo dejás vacío vuelve al default «RULETA DE RIFAS» |
| Frase | 140 caracteres | Se muestra debajo del título |
| Logo | — | Ver [Logo](#logo) |
| Ocultar logo | — | Deja sólo título y frase, también en el stream |

### Logo

Acepta dos caminos y el archivo tiene prioridad sobre la URL:

- **URL**: `https://…` o una ruta interna que empiece con `/`.
- **Archivo**: hasta 8 MB. Los rasters se recortan y recodifican a 512 px (WebP,
  con intentos más chicos y JPEG como último recurso). Un SVG de hasta 64 KB se
  conserva vectorial.

Se guarda como `data:` URL en `localStorage`, con un tope de 600.000 caracteres.
Si no hay logo configurado, se usa el logo de la ruleta dibujado en la app.

### Participantes

| Regla | Valor |
| --- | --- |
| Formato | Un nombre por línea |
| Máximo de nombres | 5000 |
| Largo por nombre | 120 caracteres |
| Espacios | Se colapsan y se recorta cada línea; las líneas vacías se descartan |

No se permiten duplicados exactos sólo si vos los escribís: la app no deduplica,
así que dos «Juan» son dos participaciones.

### Paleta

- Presets: **Clásica**, **Fiesta**, **Joya**, **Neón**, **Océano**.
- Hasta **12 colores** propios, además de 12 sugeridos.
- Los colores se reparten por fila en la tira; el texto de cada barra elige blanco
  o tinta oscura según contraste real (WCAG), no por heurística.

### Ambiente

| Ajuste | Rango | Efecto |
| --- | --- | --- |
| Tema | Claro / Oscuro | Cambia también el `theme-color` del navegador |
| Sonidos | Sí / No | Ticks que aceleran, whoosh inicial y fanfarria al revelar (Web Audio, sin archivos) |
| Volumen | 0–100 % | Sólo aplica con sonidos activos |
| Confeti | Sí / No | Explosión al revelar; se apaga solo con `prefers-reduced-motion` |
| Quitar ganador de la lista | Sí / No | Borra al ganador de los participantes para el próximo giro |
| Duración del giro | 1–15 s, paso 0,5 s | Mínimo y máximo; cada giro sortea un tiempo adentro |

Sobre la **duración**: si subís el mínimo por encima del máximo, el máximo lo
acompaña, y si bajás el máximo por debajo del mínimo, baja el mínimo. Nunca queda
un rango inválido. Poné mínimo igual a máximo si querés un tiempo fijo. Con
`prefers-reduced-motion` el giro dura 1,4 s sin importar el rango.

**Restablecer todo** devuelve la configuración a los defaults, incluida la lista de
16 nombres de ejemplo.

## Historial

- Guarda cada ganador con su hora local y **sobrevive a recargar**: la clave
  `ruleta-rifas:winners:v1` guarda hasta 500 entradas, las más recientes primero.
- **Copiar** arma un texto con la lista completa para pegar donde quieras. En HTTP
  plano (por ejemplo `http://192.168.x.x:8125`) usa un fallback porque
  `navigator.clipboard` sólo existe en contexto seguro.
- **Limpiar** borra el historial guardado, sin confirmación y sin vuelta atrás.
- El panel muestra los últimos 80 para no animar 500 filas; **Copiar** exporta todo.
- Como el historial persiste y «quitar ganador» también, después de recargar siguen
  los nombres restantes y el registro de quiénes ganaron. Antes se perdía el registro
  y los nombres ya no estaban en la lista.

## Qué se guarda y dónde

| Dato | Persistencia |
| --- | --- |
| Tema, sonidos, volumen, confeti, quitar ganador | `localStorage` |
| Rango de duración, título, frase, paleta | `localStorage` |
| Logo (URL o `data:` URL) | `localStorage` |
| Participantes | `localStorage` |
| Historial de ganadores | `localStorage`, hasta 500 entradas |
| Estado del stream | Sólo en memoria (se rearma por el canal) |

Claves usadas: `ruleta-rifas:settings:v1` y `ruleta-rifas:winners:v1`. Al leer, todo
pasa por un saneado: valores fuera de rango se recortan, un color inválido se
descarta, un logo inválido se ignora, un `max` menor que el `min` se corrige y una
entrada de historial sin nombre, sin hora válida o repetida se descarta.
