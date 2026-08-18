const MAX_FOTO_SIZE = 2 * 1024 * 1024;
const FOTO_TYPES = ['image/jpeg', 'image/png'];

const MAX_DIM = 1600;
const MAX_BEFORE_COMPRESS = 4 * 1024 * 1024;

export function fotoFileError(file: File): string | null {
  if (!FOTO_TYPES.includes(file.type)) {
    return 'Format foto harus JPG atau PNG';
  }
  if (file.size > MAX_FOTO_SIZE) {
    return 'Ukuran foto maksimal 2MB';
  }
  return null;
}

function loadImageBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => loadImageElement(file));
  }
  return loadImageElement(file);
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/**
 * Kompres foto sisi klien agar aman untuk upload (backend maks 5MB/file).
 * - Skip bila dimensi <= 1600px dan ukuran <= 4MB.
 * - Resize proporsional ke MAX_DIM, output JPEG (PNG transparan dilatar putih).
 * - Bila gagal (file korup dll), kembalikan file asli — petugas tidak terblokir.
 */
export async function compressImage(file: File, maxDim = MAX_DIM, quality = 0.82): Promise<File> {
  try {
    if (file.size <= MAX_BEFORE_COMPRESS) {
      return file;
    }

    const bitmap = await loadImageBitmap(file);
    const width = bitmap.width;
    const height = bitmap.height;

    const scale = Math.min(1, maxDim / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return file;
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob) {
      return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'foto';
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file;
  }
}