/**
 * Turns a picked image file into an inline `data:` URL that survives
 * localStorage. Everything is resized and re-encoded on the client so the app
 * keeps working as a static build with no upload backend.
 */

export const LOGO_FILE_MAX_BYTES = 8 * 1024 * 1024;
export const LOGO_INLINE_MAX_CHARS = 600_000;
export const LOGO_DATA_PATTERN = /^data:image\/(?:png|jpe?g|gif|webp|avif|svg\+xml)[;,]/i;

const SVG_MAX_CHARS = 64 * 1024;
const MAX_EDGE = 512;

const RASTER_ATTEMPTS = [
  [MAX_EDGE, 'image/webp', 0.9],
  [384, 'image/webp', 0.85],
  [256, 'image/webp', 0.8],
  [192, 'image/jpeg', 0.85],
];

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('No pudimos leer el archivo.'));
    reader.readAsText(file);
  });
}

function loadBitmap(file) {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file).catch(() => loadThroughImage(file));
  }
  return loadThroughImage(file);
}

function loadThroughImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('El archivo no parece una imagen válida.'));
    };
    image.src = url;
  });
}

function renderToDataUrl(bitmap, edge, type, quality) {
  const width = Number(bitmap.width) || 0;
  const height = Number(bitmap.height) || 0;
  if (!width || !height) throw new Error('El archivo no parece una imagen válida.');

  const scale = Math.min(1, edge / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Tu navegador no pudo procesar la imagen.');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  // Browsers quietly fall back to PNG when the requested type is unsupported.
  return canvas.toDataURL(type, quality);
}

function release(bitmap) {
  if (bitmap && typeof bitmap.close === 'function') bitmap.close();
}

/**
 * Returns a `data:` URL ready to store in settings, or throws a user-facing
 * error. SVG keeps its vector form when it is small enough; everything else is
 * rasterised down until it fits comfortably in localStorage.
 */
export async function logoFromFile(file) {
  if (!file) throw new Error('Elegí un archivo de imagen.');
  if (!/^image\//i.test(file.type || '')) {
    throw new Error('El archivo tiene que ser una imagen (png, jpg, webp, svg…).');
  }
  if (file.size > LOGO_FILE_MAX_BYTES) {
    throw new Error('La imagen pesa más de 8 MB. Probá con una más liviana.');
  }

  if (file.type === 'image/svg+xml') {
    const text = await readAsText(file);
    if (text.length > SVG_MAX_CHARS) {
      throw new Error('El SVG es demasiado grande. Probá con uno más simple.');
    }
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`;
    if (url.length > LOGO_INLINE_MAX_CHARS) {
      throw new Error('El SVG es demasiado grande. Probá con uno más simple.');
    }
    return url;
  }

  const bitmap = await loadBitmap(file);
  try {
    for (const [edge, type, quality] of RASTER_ATTEMPTS) {
      const url = renderToDataUrl(bitmap, edge, type, quality);
      if (LOGO_DATA_PATTERN.test(url) && url.length <= LOGO_INLINE_MAX_CHARS) return url;
    }
  } finally {
    release(bitmap);
  }

  throw new Error('No pudimos achicar la imagen lo suficiente. Probá con una más chica.');
}
