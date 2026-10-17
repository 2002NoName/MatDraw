import { MAX_IMAGE_DATA_URL } from '@matdraw/shared';

export interface PreparedImage {
  src: string;
  /** Naturalny rozmiar w pikselach (po ewentualnym zmniejszeniu). */
  width: number;
  height: number;
}

/** Najdłuższy bok obrazu zapisanego na tablicy. */
export const MAX_IMAGE_SIDE = 1600;

const readAsDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error('Nie udało się odczytać pliku.'));
    r.readAsDataURL(blob);
  });

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Nieobsługiwany lub uszkodzony obraz.'));
    img.src = src;
  });

/** Docelowy rozmiar po zmniejszeniu (zachowuje proporcje). */
export function fitSize(w: number, h: number, max = MAX_IMAGE_SIDE) {
  const k = Math.min(1, max / Math.max(w, h, 1));
  return { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) };
}

function hasTransparency(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const data = ctx.getImageData(0, 0, w, h).data;
  const step = Math.max(4, Math.floor(data.length / 4 / 20000) * 4);
  for (let i = 3; i < data.length; i += step) if (data[i]! < 250) return true;
  return false;
}

/**
 * Wczytuje plik graficzny i przygotowuje go do zapisania na tablicy:
 * zmniejsza do {@link MAX_IMAGE_SIDE} px i kompresuje (JPEG, a PNG gdy obraz ma przezroczystość).
 * Pliki SVG są przyjmowane bez zmian (wyświetlane w <image>, więc bez skryptów).
 */
export async function prepareImage(file: Blob): Promise<PreparedImage> {
  if (!file.type.startsWith('image/')) throw new Error('To nie jest plik graficzny.');
  const original = await readAsDataUrl(file);
  const img = await loadImage(original);
  const nw = img.naturalWidth || 300;
  const nh = img.naturalHeight || 150;

  if (file.type === 'image/svg+xml') {
    if (original.length > MAX_IMAGE_DATA_URL) throw new Error('Plik SVG jest za duży.');
    return { src: original, ...fitSize(nw, nh) };
  }

  const { width, height } = fitSize(nw, nh);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, width, height);

  let src: string;
  if (hasTransparency(ctx, width, height)) {
    src = canvas.toDataURL('image/png');
  } else {
    // Białe tło pod JPEG.
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    src = canvas.toDataURL('image/jpeg', 0.85);
  }
  if (src.length > MAX_IMAGE_DATA_URL) src = canvas.toDataURL('image/jpeg', 0.6);
  if (src.length > MAX_IMAGE_DATA_URL) throw new Error('Obraz jest za duży nawet po kompresji.');
  // Mały oryginał bywa lżejszy niż wynik z canvas – wtedy zostawiamy oryginał.
  if (width === nw && height === nh && original.length < src.length && /^data:image\/(png|jpeg|webp|gif);/.test(original)) src = original;
  return { src, width, height };
}

/** Rozmiar na tablicy: obraz mieści się w ~60% widoku. */
export function placeSize(width: number, height: number, viewW: number, viewH: number) {
  const k = Math.min(1, (viewW * 0.6) / width, (viewH * 0.6) / height);
  return { w: width * k, h: height * k };
}
